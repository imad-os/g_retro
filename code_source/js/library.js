/* Retro9: game libraries. A library is an address set in the app config; it is read in one of three ways:
 *   1. a JSON list of games (roms.json, index.json or manifest.json next to the address, or the address itself if it ends in .json)
 *   2. a GitHub repository (github.com/owner/repo, or its GitHub Pages site): the whole file tree in one request
 *   3. an HTML page of links (any web server that lists folders), read folder by folder
 * Every way ends as list(path) -> { folders: [{ name, path }], games: [{ name, url, art, system, path }] }. */
var R9Net = (function () {
    'use strict';
    function viaBrowser(url, type, timeout) {
        var ctl = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, timeout) : 0;
        return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
            clearTimeout(timer);
            if (!r.ok) { var e = new Error('HTTP ' + r.status); e.code = 'http'; e.status = r.status; throw e; }
            return type === 'arraybuffer' ? r.arrayBuffer() : type === 'json' ? r.json() : r.text();
        }, function (e) { clearTimeout(timer); e.code = e.code || 'network'; throw e; });
    }
    // a request to another site: through My PC (no CORS limit on the TV), or the browser's own fetch on an older My PC
    function get(url, type, timeout) {
        timeout = timeout || 30000;
        if (!window.MyPC || !MyPC.net || MyPC.apiLevel < 10) return viaBrowser(url, type, timeout);
        return MyPC.net.fetch(url, { responseType: type || 'text', timeout: timeout }).then(function (r) {
            if (!r.ok) { var e = new Error('HTTP ' + r.status); e.code = 'http'; e.status = r.status; throw e; }
            return r.body;
        }, function (e) {
            var standalone = MyPC.info() && MyPC.info().standalone;
            if (e && (e.code === 'unsupported' || (standalone && e.code === 'blocked'))) return viaBrowser(url, type, timeout);
            throw e;
        });
    }
    return { get: get };
})();

var R9Library = (function () {
    'use strict';
    var sources = {};                 // repo url -> source

    function slash(u) { return /\/$/.test(u) ? u : u + '/'; }
    function base(path) { var n = path.split('/').pop(); return n.replace(/\.[^.]+$/, ''); }
    function dir(path) { var i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i); }
    function nice(name) { return name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    function abs(u, from) { try { return new URL(u, from).href; } catch (e) { return ''; } }
    function enc(path) { return path.split('/').map(encodeURIComponent).join('/'); }

    /* ---------- a full tree (JSON list or GitHub): built once, then listed folder by folder ---------- */
    function treeSource(entries) {
        // entries: [{ path, url, name?, system?, art? }] of games, plus images [{ path, url }] for box art
        var games = [], images = {}, folders = {};
        entries.forEach(function (e) {
            if (e.image) { images[e.path.toLowerCase().replace(/\.[^.]+$/, '')] = e.url; return; }
            var sys = R9Systems.detect(e.path, e.system);
            if (!sys) return;
            games.push({ name: e.name || nice(base(e.path)), url: e.url, art: e.art || '', system: sys, path: e.path, dir: dir(e.path) });
        });
        games.forEach(function (g) {
            if (!g.art) {
                var k = g.path.toLowerCase().replace(/\.[^.]+$/, ''), d = dir(k), b = k.slice(d ? d.length + 1 : 0);
                g.art = images[k] || ['boxart', 'covers', 'images', 'art', 'media'].reduce(function (f, sub) {
                    return f || images[(d ? d + '/' : '') + sub + '/' + b] || '';
                }, '');
            }
            for (var d = g.dir; d; d = dir(d)) folders[d] = true;     // only folders that hold games, at any depth
        });
        return {
            list: function (path) {
                var out = { folders: [], games: [] }, seen = {};
                Object.keys(folders).forEach(function (f) {
                    if (dir(f) === path && !seen[f]) { seen[f] = 1; out.folders.push({ name: nice(f.split('/').pop()), path: f }); }
                });
                games.forEach(function (g) { if (g.dir === path) out.games.push(g); });
                out.folders.sort(function (a, b) { return a.name.localeCompare(b.name); });
                out.games.sort(function (a, b) { return a.name.localeCompare(b.name); });
                return Promise.resolve(out);
            }
        };
    }

    function fromManifest(json, url) {
        var list = Array.isArray(json) ? json : (json.games || json.roms || json.files || []), entries = [];
        list.forEach(function (it) {
            if (typeof it === 'string') it = { file: it };
            if (!it || typeof it !== 'object') return;
            var file = String(it.file || it.path || it.url || '');
            if (!file) return;
            var path = /^https?:/i.test(file) ? (it.folder ? it.folder + '/' : '') + decodeURIComponent(file.split('/').pop()) : file.replace(/^\.?\//, '');
            entries.push({ path: path, url: abs(/^https?:/i.test(file) ? file : enc(path), url), name: it.name ? String(it.name) : '',
                           system: it.system ? String(it.system) : '', art: it.art ? abs(String(it.art), url) : '' });
        });
        return treeSource(entries);
    }

    // github.com/owner/repo[/tree/branch/sub] or owner.github.io/repo/ -> { owner, repo, ref, sub, files: base url of the files }
    function githubInfo(u) {
        var m = /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:\/tree\/([^/]+)\/?(.*))?/i.exec(u);
        if (m) {
            var ref = m[3] || 'HEAD', sub = (m[4] || '').replace(/\/$/, '');
            return { owner: m[1], repo: m[2].replace(/\.git$/, ''), ref: ref, sub: sub,
                     files: 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2].replace(/\.git$/, '') + '/' + ref + '/' };
        }
        m = /^https?:\/\/([^.]+)\.github\.io\/([^/#?]*)/i.exec(u);
        if (m) {
            var owner = m[1], repo = m[2] || owner + '.github.io';
            return { owner: owner, repo: repo, ref: 'HEAD', sub: '', files: 'https://' + owner + '.github.io/' + (m[2] ? m[2] + '/' : '') };
        }
        return null;
    }
    function fromGithub(gh) {
        var api = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/git/trees/' + gh.ref + '?recursive=1';
        return R9Net.get(api, 'json').then(function (j) {
            if (!j || !Array.isArray(j.tree)) throw Object.assign(new Error('not a repository'), { code: 'empty' });
            var entries = [], pre = gh.sub ? gh.sub + '/' : '';
            j.tree.forEach(function (t) {
                if (t.type !== 'blob' || (pre && t.path.indexOf(pre) !== 0)) return;
                var path = t.path.slice(pre.length);
                entries.push({ path: path, url: gh.files + enc(t.path), image: R9Systems.isImage(path) });
            });
            return treeSource(entries);
        });
    }

    /* ---------- an HTML page of links, read folder by folder ---------- */
    function htmlSource(root) {
        var pages = {};
        function read(path) {
            if (pages[path]) return pages[path];
            var url = root + (path ? enc(path) + '/' : '');
            return (pages[path] = R9Net.get(url, 'text').then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html'), links = doc.querySelectorAll('a[href]'), entries = [], folders = [];
                for (var i = 0; i < links.length; i++) {
                    var href = links[i].getAttribute('href'), full = abs(href, url);
                    if (!full || full.indexOf(url) !== 0 || full === url) continue;           // stay inside this folder
                    var rest = decodeURIComponent(full.slice(url.length).split(/[?#]/)[0]);
                    if (!rest || rest.indexOf('..') === 0) continue;
                    if (/\/$/.test(rest) && rest.indexOf('/') === rest.length - 1) folders.push(rest.slice(0, -1));
                    else if (rest.indexOf('/') < 0) entries.push({ path: (path ? path + '/' : '') + rest, url: full, image: R9Systems.isImage(rest) });
                }
                return treeSource(entries).list(path).then(function (out) {
                    out.folders = folders.filter(function (f, i) { return folders.indexOf(f) === i; }).sort().map(function (f) {
                        return { name: nice(f), path: (path ? path + '/' : '') + f };
                    });
                    return out;
                });
            }, function (e) { delete pages[path]; throw e; }));
        }
        return { list: read };
    }

    // find out how a library address is read, once per address
    function open(repo) {
        var url = String(repo.url || '').trim();
        if (sources[url]) return sources[url];
        var p;
        if (/\.json([?#].*)?$/i.test(url)) {
            p = R9Net.get(url, 'json').then(function (j) { return fromManifest(j, url); });
        } else {
            var root = slash(url), gh = githubInfo(url), names = ['roms.json', 'index.json', 'manifest.json'];
            var tryList = function (i) {
                if (i >= names.length) {
                    if (gh) return fromGithub(gh);
                    return Promise.resolve(htmlSource(root));
                }
                if (/^https?:\/\/github\.com\//i.test(url)) return fromGithub(gh);
                return R9Net.get(root + names[i], 'json').then(function (j) {
                    if (!j || (typeof j !== 'object')) throw new Error('bad list');
                    return fromManifest(j, root + names[i]);
                }, function () { return tryList(i + 1); });
            };
            p = tryList(0);
        }
        sources[url] = p.catch(function (e) { delete sources[url]; throw e; });
        return sources[url];
    }

    return {
        list: function (repo, path) { return open(repo).then(function (s) { return s.list(path || ''); }); },
        forget: function (repo) { delete sources[String(repo.url || '').trim()]; }
    };
})();
