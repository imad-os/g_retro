/* Retro9: what is kept between sessions.
 *   - small things (recently played, favourites) with MyPC.save: per My PC profile and backed up by My PC
 *   - game saves (battery saves and save states) in IndexedDB on this site: they are far bigger than MyPC.save's 64 KB,
 *     so they stay on this device. Keys carry the My PC profile id, so each profile has its own saves.
 * Slots: 'sram' (the game's own battery save, restored at every start), 'auto' (state when leaving a game), 'quick'. */
var R9Saves = (function () {
    'use strict';
    var MAX_RECENT = 12, MAX_FAV = 60, prefs = { recent: [], fav: [] }, dbp = null, profile = 'p';

    function entry(g) { return { u: g.url, n: g.name, s: g.system, a: /^data:/.test(g.art || '') ? '' : (g.art || ''), p: g.path || '' }; }
    function game(e) { return { url: e.u, name: e.n, system: e.s, art: e.a, path: e.p }; }
    function store() { MyPC.save('lib', { recent: prefs.recent, fav: prefs.fav }); }

    function db() {
        if (dbp) return dbp;
        dbp = new Promise(function (resolve, reject) {
            if (!window.indexedDB) return reject(new Error('no IndexedDB'));
            var req = indexedDB.open('retro9', 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('saves'); };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
        dbp.catch(function () { dbp = null; });
        return dbp;
    }
    function key(url, slot) { return profile + '|' + url + '|' + slot; }
    function tx(mode, fn) {
        return db().then(function (d) {
            return new Promise(function (resolve, reject) {
                var t = d.transaction('saves', mode), r = fn(t.objectStore('saves'));
                t.oncomplete = function () { resolve(r && r.result); };
                t.onerror = t.onabort = function () { reject(t.error); };
            });
        });
    }

    return {
        init: function (info) {
            profile = (info && info.profile && info.profile.id) || 'p';
            var v = MyPC.load('lib', null);
            if (v && Array.isArray(v.recent)) prefs.recent = v.recent.slice(0, MAX_RECENT);
            if (v && Array.isArray(v.fav)) prefs.fav = v.fav.slice(0, MAX_FAV);
        },
        recent: function () { return prefs.recent.map(game); },
        favourites: function () { return prefs.fav.map(game); },
        played: function (g) {
            prefs.recent = [entry(g)].concat(prefs.recent.filter(function (e) { return e.u !== g.url; })).slice(0, MAX_RECENT);
            store();
        },
        isFav: function (g) { return prefs.fav.some(function (e) { return e.u === g.url; }); },
        toggleFav: function (g) {
            var on = !this.isFav(g);
            prefs.fav = on ? [entry(g)].concat(prefs.fav).slice(0, MAX_FAV) : prefs.fav.filter(function (e) { return e.u !== g.url; });
            store();
            return on;
        },
        // { sram, state, t } or null
        get: function (url, slot) { return tx('readonly', function (s) { return s.get(key(url, slot)); }).catch(function () { return null; }); },
        put: function (url, slot, value) { value.t = Date.now(); return tx('readwrite', function (s) { return s.put(value, key(url, slot)); }); },
        remove: function (url) {
            return tx('readwrite', function (s) { ['sram', 'auto', 'quick'].forEach(function (k) { s.delete(key(url, k)); }); });
        }
    };
})();
