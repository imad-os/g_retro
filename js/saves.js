/* Retro9: what is kept between sessions.
 *   - with MyPC.save (per My PC profile, kept in My PC's cloud): recently played, favourites, settings and every game's
 *     battery save (the game's own save, compressed: a few bytes to a few KB). My PC keeps 64 KB per app and drops a
 *     save that goes over, so the oldest battery saves are let go first to stay under BUDGET.
 *   - save states are far bigger (a SNES state is about 80 KB compressed), so they stay on this device: IndexedDB, or
 *     localStorage when IndexedDB is blocked; and always in memory for the session, so saving and loading work even
 *     where the device keeps nothing.
 * Slots: 'sram' (battery save, restored at every start), 'auto' (state when leaving a game), 'quick'. */
var R9Saves = (function () {
    'use strict';
    var MAX_RECENT = 12, MAX_FAV = 40, BUDGET = 56000;
    var prefs = { recent: [], fav: [] }, profile = 'p', mem = {}, cloud = {}, tier = null;

    function entry(g) { return { u: g.url, n: g.name, s: g.system, a: /^data:/.test(g.art || '') ? '' : (g.art || ''), p: g.path || '' }; }
    function game(e) { return { url: e.u, name: e.n, system: e.s, art: e.a, path: e.p }; }
    function storePrefs() { MyPC.save('lib', { recent: prefs.recent, fav: prefs.fav }); }
    // a short key for a game: FNV-1a of its address
    function rk(url) { var h = 0x811c9dc5; for (var i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }

    /* ---------- bytes <-> compressed base64 ---------- */
    function b64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
    function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
    function pipe(u8, stream) { return new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
    function pack(u8) {
        if (!u8) return Promise.resolve('');
        if (typeof CompressionStream !== 'function') return Promise.resolve('r' + b64(u8));
        return pipe(u8, new CompressionStream('deflate')).then(function (z) { return 'z' + b64(z); });
    }
    function unpack(s) {
        if (!s) return Promise.resolve(null);
        var u = unb64(s.slice(1));
        return s[0] === 'z' ? pipe(u, new DecompressionStream('deflate')) : Promise.resolve(u);
    }

    /* ---------- My PC (cloud): battery saves ---------- */
    function used() {
        return JSON.stringify({ lib: MyPC.load('lib', null), settings: MyPC.load('settings', null), sv: cloud }).length + 64;
    }
    function storeCloud() {
        // over the budget: let go of the battery saves played longest ago (they stay on this device if it keeps data)
        var keys = Object.keys(cloud).sort(function (a, b) { return cloud[a].t - cloud[b].t; });
        while (keys.length > 1 && used() > BUDGET) delete cloud[keys.shift()];
        if (used() > BUDGET) { delete cloud[keys.shift()]; }
        MyPC.save('sv', cloud);
    }

    /* ---------- this device: IndexedDB, else localStorage ---------- */
    var dbp = null;
    function idb() {
        if (dbp) return dbp;
        dbp = new Promise(function (resolve, reject) {
            if (!window.indexedDB) return reject(new Error('no IndexedDB'));
            var req;
            try { req = indexedDB.open('retro9', 2); } catch (e) { return reject(e); }
            req.onupgradeneeded = function () { var d = req.result; if (!d.objectStoreNames.contains('saves')) d.createObjectStore('saves'); };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
            req.onblocked = function () { reject(new Error('blocked')); };
            setTimeout(function () { reject(new Error('timeout')); }, 3000);
        });
        return dbp;
    }
    function idbDo(mode, fn) {
        return idb().then(function (d) {
            return new Promise(function (resolve, reject) {
                var t = d.transaction('saves', mode), r = fn(t.objectStore('saves'));
                t.oncomplete = function () { resolve(r && r.result); };
                t.onerror = t.onabort = function () { reject(t.error); };
            });
        });
    }
    function lsOk() { try { localStorage.setItem('r9_test', '1'); localStorage.removeItem('r9_test'); return true; } catch (e) { return false; } }
    // which device store works here (found once)
    function device() {
        if (tier) return tier;
        tier = idbDo('readwrite', function (s) { return s.put(1, 'probe'); }).then(function () { return 'idb'; }, function (e) {
            console.warn('[Retro9] IndexedDB unavailable', e);
            return lsOk() ? 'ls' : 'none';
        });
        return tier;
    }
    function lkey(k) { return 'r9|' + k; }
    function devPut(k, v) {
        return device().then(function (t) {
            if (t === 'idb') return idbDo('readwrite', function (s) { return s.put(v, k); }).then(function () { return true; });
            if (t !== 'ls') return false;
            return Promise.all([pack(v.sram), pack(v.state)]).then(function (p) {
                var val = JSON.stringify({ s: p[0], st: p[1], t: v.t });
                try { localStorage.setItem(lkey(k), val); return true; } catch (e) {
                    // full: drop the oldest states on this device and try once more
                    var old = [];
                    for (var i = 0; i < localStorage.length; i++) { var n = localStorage.key(i); if (n.indexOf('r9|') === 0 && n !== lkey(k)) old.push(n); }
                    old.slice(0, Math.ceil(old.length / 2)).forEach(function (n) { localStorage.removeItem(n); });
                    try { localStorage.setItem(lkey(k), val); return true; } catch (e2) { return false; }
                }
            });
        }).catch(function (e) { console.warn('[Retro9] device save failed', e); return false; });
    }
    function devGet(k) {
        return device().then(function (t) {
            if (t === 'idb') return idbDo('readonly', function (s) { return s.get(k); });
            if (t !== 'ls') return null;
            var raw = null;
            try { raw = localStorage.getItem(lkey(k)); } catch (e) {}
            if (!raw) return null;
            var o = JSON.parse(raw);
            return Promise.all([unpack(o.s), unpack(o.st)]).then(function (u) { return { sram: u[0], state: u[1], t: o.t }; });
        }).catch(function () { return null; });
    }
    function devDel(k) {
        return device().then(function (t) {
            if (t === 'idb') return idbDo('readwrite', function (s) { return s.delete(k); });
            if (t === 'ls') try { localStorage.removeItem(lkey(k)); } catch (e) {}
        }).catch(function () {});
    }

    function key(url, slot) { return profile + '|' + url + '|' + slot; }

    return {
        init: function (info) {
            profile = (info && info.profile && info.profile.id) || 'p';
            var v = MyPC.load('lib', null);
            if (v && Array.isArray(v.recent)) prefs.recent = v.recent.slice(0, MAX_RECENT);
            if (v && Array.isArray(v.fav)) prefs.fav = v.fav.slice(0, MAX_FAV);
            var c = MyPC.load('sv', null);
            cloud = c && typeof c === 'object' ? c : {};
            device();
        },
        recent: function () { return prefs.recent.map(game); },
        favourites: function () { return prefs.fav.map(game); },
        played: function (g) {
            prefs.recent = [entry(g)].concat(prefs.recent.filter(function (e) { return e.u !== g.url; })).slice(0, MAX_RECENT);
            storePrefs();
        },
        isFav: function (g) { return prefs.fav.some(function (e) { return e.u === g.url; }); },
        toggleFav: function (g) {
            var on = !this.isFav(g);
            prefs.fav = on ? [entry(g)].concat(prefs.fav).slice(0, MAX_FAV) : prefs.fav.filter(function (e) { return e.u !== g.url; });
            storePrefs();
            return on;
        },
        // { sram, state, t } or null
        get: function (url, slot) {
            var k = key(url, slot);
            if (mem[k]) return Promise.resolve(mem[k]);
            var c = slot === 'sram' && cloud[rk(url)];
            if (c) return unpack(c.s).then(function (u) { return u ? (mem[k] = { sram: u, state: null, t: c.t }) : devGet(k); }, function () { return devGet(k); });
            return devGet(k).then(function (v) { if (v) mem[k] = v; return v; });
        },
        // resolves to { device: bool, cloud: bool }: where it was kept besides this session's memory
        put: function (url, slot, value) {
            var k = key(url, slot), out = { device: false, cloud: false };
            value.t = Date.now();
            mem[k] = value;
            var jobs = [devPut(k, value).then(function (ok) { out.device = ok; })];
            if (slot === 'sram' && value.sram) {
                jobs.push(pack(value.sram).then(function (s) {
                    cloud[rk(url)] = { s: s, t: value.t };
                    storeCloud();
                    out.cloud = !!cloud[rk(url)];
                }).catch(function (e) { console.warn('[Retro9] battery save not sent to My PC', e); }));
            }
            return Promise.all(jobs).then(function () { return out; });
        },
        remove: function (url) {
            ['sram', 'auto', 'quick'].forEach(function (s) { delete mem[key(url, s)]; });
            if (cloud[rk(url)]) { delete cloud[rk(url)]; MyPC.save('sv', cloud); }
            return Promise.all(['sram', 'auto', 'quick'].map(function (s) { return devDel(key(url, s)); }));
        },
        // for the options screen: which saves exist
        where: function () { return device(); }
    };
})();
