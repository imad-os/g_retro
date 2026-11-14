/* Retro9: game libraries. Games come from two places, both reached only through My PC's own functions (no web address):
 *   usb   - USB drives plugged into the TV (MyPC.usb, API level 16, TV only)
 *   drive - the signed-in Google Drive (MyPC.drive, API level 14)
 * Every source ends as list(src, loc, names) -> { folders: [{ name, path }], games: [{ name, url, system, path, size }] }.
 * A game's url is 'usb:<path on the drive>' or 'drive:<file id>': it only identifies the game (saves, favourites)
 * and says where its bytes are read by read(). */
var R9Library = (function () {
    'use strict';
    var USB_STEP = 8 * 1024 * 1024, DRIVE_MAX = 200 * 1024 * 1024, DRIVE_LIMIT = 5000;

    function fail(code, message) { var e = new Error(message || code); e.code = code; return e; }
    function nice(name) { return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    function niceFolder(name) { return name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    function safe(name) { return String(name || '').replace(/\//g, '_'); }
    function byName(a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); }

    // which sources this My PC can offer: [{ id, name key }]
    function available() {
        var out = [], lvl = (window.MyPC && MyPC.apiLevel) || 0, i = (MyPC.info && MyPC.info()) || {}, br = i.bridges || {};
        if (lvl >= 16 && MyPC.usb && br.usb === 1) out.push('usb');
        if (lvl >= 14 && MyPC.drive && (!i.bridges || br.drive)) out.push('drive');
        return out;
    }

    /* ---------- USB ---------- */
    function usbList(loc) {
        if (!loc) {
            return MyPC.usb.drives().then(function (drives) {
                return { folders: drives.map(function (d) { return { name: d.name || niceFolder(d.path.split('/').pop()), path: d.path }; }), games: [] };
            });
        }
        return MyPC.usb.list(loc).then(function (items) {
            var out = { folders: [], games: [] };
            items.forEach(function (it) {
                if (it.dir) { out.folders.push({ name: niceFolder(it.name), path: it.path }); return; }
                var sys = R9Systems.detect(it.path);
                if (!sys) return;
                out.games.push({ name: nice(it.name), url: 'usb:' + it.path, art: '', system: sys, path: it.path, size: it.size || 0 });
            });
            out.folders.sort(byName); out.games.sort(byName);
            return out;
        });
    }
    function usbRead(g, onProgress) {
        var path = g.url.slice(4);
        return MyPC.usb.stat(path).then(function (st) {
            if (!st || !st.exists || st.dir) throw fail('not-found');
            var size = st.size, buf = new Uint8Array(size), pos = 0;
            function next() {
                if (pos >= size) return buf.buffer;
                var end = Math.min(size, pos + USB_STEP) - 1;
                return MyPC.usb.read(path, pos, end).then(function (r) {
                    var u = new Uint8Array(r.buf);
                    if (!u.length) throw fail('read');
                    buf.set(u, pos); pos += u.length;
                    if (onProgress) onProgress(pos / size);
                    return next();
                });
            }
            return next();
        });
    }

    /* ---------- Google Drive ---------- */
    function driveReady() {
        return MyPC.drive.status().then(function (st) {
            if (!st.configured) throw fail('noconfig');
            if (!st.signedIn || st.needsSignIn) throw fail('signed-out');
        });
    }
    function driveAll(opts) {
        var files = [];
        function page(token) {
            var o = { pageSize: 1000, orderBy: 'name' };
            for (var k in opts) o[k] = opts[k];
            if (token) o.pageToken = token;
            return MyPC.drive.list(o).then(function (r) {
                files = files.concat(r.files || []);
                return r.next && files.length < DRIVE_LIMIT ? page(r.next) : files;
            });
        }
        return page('');
    }
    function driveList(loc, names) {
        return driveReady().then(function () {
            var shared = loc === 'shared';
            return driveAll(shared ? { q: 'sharedWithMe = true and trashed = false' } : { folder: loc || 'root', q: 'trashed = false' });
        }).then(function (files) {
            var out = { folders: [], games: [] };
            if (!loc) out.folders.push({ name: '', path: 'shared', shared: true });
            files.forEach(function (f) {
                if (f.mimeType === MyPC.drive.FOLDER) { out.folders.push({ name: niceFolder(f.name), path: f.id }); return; }
                var full = (names ? names + '/' : '') + safe(f.name), sys = R9Systems.detect(full);
                if (!sys) return;
                out.games.push({ name: nice(f.name), url: 'drive:' + f.id, art: '', system: sys, path: full, size: +f.size || 0 });
            });
            out.folders.sort(function (a, b) { return a.shared ? -1 : b.shared ? 1 : byName(a, b); });
            out.games.sort(byName);
            return out;
        });
    }
    function driveRead(g, onProgress) {
        return driveReady().then(function () {
            return MyPC.drive.download(g.url.slice(6), { max: DRIVE_MAX, onProgress: onProgress });
        }).then(function (r) { return r.buf; });
    }

    return {
        available: available,
        // src: 'usb' | 'drive'; loc: '' (top), a USB path or a Drive folder id; names: the folder names walked so far
        list: function (src, loc, names) {
            if (src === 'usb') return usbList(loc || '');
            return driveList(loc || '', names || '');
        },
        // the bytes of a game (ArrayBuffer); onProgress(0..1)
        read: function (g, onProgress) {
            if (/^usb:/.test(g.url)) return usbRead(g, onProgress);
            if (/^drive:/.test(g.url)) return driveRead(g, onProgress);
            return Promise.reject(fail('bad-request'));
        },
        signIn: function () { return MyPC.drive.signIn(); }
    };
})();
