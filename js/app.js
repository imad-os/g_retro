/* Retro9: the library screen and the My PC lifecycle. Controller first:
 *   D-pad / left stick move, bottom button opens, right button goes back, left button (X) options, top button (Y) favourite,
 *   LB / RB switch library, Start options. In a game every button goes to the emulator; My PC's pause menu
 *   (hold Start + Select, or the remote's Back) has Save state, Load state, Press Start / Select, Restart, Exit to library. */
(function () {
    'use strict';
    var VERSION = '0.3.0', CHUNK = 60;
    var DEFAULTS = {
        repos: [{ name: 'My ROMs', url: 'https://f2cfpkjp8z-alt.github.io/emulatorjs_rom_test/' }],
        systems: ['nes', 'snes', 'gb', 'gbc', 'gba', 'segaMD', 'segaMS', 'segaGG'],
        cdn: 'https://cdn.emulatorjs.org/4.2.3/data/'
    };
    var t = R9Text.en, lang = 'en', info = null, cfg = null, volume = 0.7, unsub = [];
    var repo = 0, path = '', listing = null, listState = 'loading', listErr = '', loadSeq = 0;
    var sections = [], focus = { s: 0, i: 0 }, remembered = {}, dialog = null, toastTimer = 0;

    function el(id) { return document.getElementById(id); }
    function make(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
    function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] !== undefined ? o[k] : m; }); }
    function cols() { return window.innerWidth < window.innerHeight ? 2 : 5; }

    /* ---------- config (MyPC.app_config, with defaults) ---------- */
    function readConfig() {
        var c = MyPC.app_config || {}, list = c.repos || c.repositories;
        if (typeof list === 'string') list = [list];
        if (!Array.isArray(list) && typeof c.default_repo_url === 'string') list = [c.default_repo_url];
        if (!Array.isArray(list)) list = DEFAULTS.repos;
        var repos = [];
        list.forEach(function (r) {
            if (typeof r === 'string') r = { url: r };
            if (!r || typeof r.url !== 'string' || !/^https?:\/\//i.test(r.url)) return;
            var name = typeof r.name === 'string' && r.name ? r.name : r.url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/').pop();
            repos.push({ name: name.slice(0, 40), url: r.url });
        });
        var auto = c.autoload_last_save;
        var cdn = typeof c.emulator_cdn === 'string' && /^https:\/\//.test(c.emulator_cdn) ? c.emulator_cdn : DEFAULTS.cdn;
        return {
            repos: repos,
            first: Math.max(0, Math.min(repos.length - 1, +c.default_repo || 0)),
            autoload: auto === true || auto === false ? auto : 'ask',
            systems: Array.isArray(c.systems_enabled) ? c.systems_enabled.map(String) : DEFAULTS.systems,
            cdn: /\/$/.test(cdn) ? cdn : cdn + '/',
            saveStates: c.save_states !== false
        };
    }

    /* ---------- toast and dialog ---------- */
    function toast(msg) {
        var e = el('toast');
        e.textContent = msg; e.hidden = false;
        MyPC.announce(msg);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { e.hidden = true; }, 2600);
    }
    // options: [{ label, fn }]; onCancel when B / Esc
    function showDialog(title, text, options, onCancel, cls) {
        var box = el('dialog');
        box.textContent = '';
        var inner = make('div', 'box' + (cls ? ' ' + cls : ''));
        inner.appendChild(make('h2', '', title));
        if (text) inner.appendChild(make('p', '', text));
        var rows = options.map(function (o) { var r = make('div', 'opt', o.label); inner.appendChild(r); return r; });
        box.appendChild(inner);
        box.hidden = false;
        dialog = { options: options, rows: rows, i: 0, onCancel: onCancel };
        rows[0].classList.add('focus');
        MyPC.announce(title + '. ' + options[0].label);
    }
    function closeDialog() { dialog = null; el('dialog').hidden = true; el('dialog').textContent = ''; }
    function dialogInput(action) {
        var d = dialog;
        var o = d.options[d.i];
        if (o.key && (action === 'left' || action === 'right' || action === 'confirm')) {
            R9Settings.step(o.key, action === 'left' ? -1 : 1);
            o.label = settingLabel(o.key);
            d.rows[d.i].textContent = o.label;
            MyPC.announce(o.label);
            return;
        }
        if (action === 'up' || action === 'down') {
            d.rows[d.i].classList.remove('focus');
            d.i = (d.i + (action === 'up' ? d.options.length - 1 : 1)) % d.options.length;
            d.rows[d.i].classList.add('focus');
            MyPC.announce(d.options[d.i].label);
        } else if (action === 'confirm') {
            var fn = d.options[d.i].fn; closeDialog(); if (fn) fn();
        } else if (action === 'cancel') {
            var c = d.onCancel; closeDialog(); if (c) c();
        }
    }

    /* ---------- the library screen ---------- */
    function currentRepo() { return cfg.repos[repo] || null; }
    function load() {
        var r = currentRepo(), seq = ++loadSeq;
        listing = null; listErr = '';
        if (!r) { listState = 'none'; render(); return; }
        listState = 'loading'; render();
        R9Library.list(r, path).then(function (l) {
            if (seq !== loadSeq) return;
            listing = l; listState = 'ok'; render();
            MyPC.announce((path ? path.split('/').pop() : r.name) + '. ' + (l.folders.length + l.games.length));
        }, function (e) {
            if (seq !== loadSeq) return;
            console.warn('[Retro9] library', e);
            listState = 'error'; listErr = (e && (e.status || e.code)) || ''; render();
        });
    }
    function buildSections() {
        var out = [], enabled = function (g) { return cfg.systems.indexOf(g.system) >= 0; };
        if (!path) {
            var rec = R9Saves.recent().filter(enabled), fav = R9Saves.favourites().filter(enabled);
            if (rec.length) out.push({ title: t.recent, row: true, items: rec.map(function (g) { return { type: 'game', g: g }; }) });
            if (fav.length) out.push({ title: t.fav, row: true, items: fav.map(function (g) { return { type: 'game', g: g }; }) });
        }
        var items = [];
        if (listState === 'ok') {
            listing.folders.forEach(function (f) { items.push({ type: 'folder', f: f }); });
            listing.games.filter(enabled).forEach(function (g) { items.push({ type: 'game', g: g }); });
        } else if (listState === 'error') {
            items.push({ type: 'retry' });
        }
        out.push({ title: path ? path.split('/').pop() : (currentRepo() ? currentRepo().name : t.library), row: false, items: items, shown: 0 });
        return out;
    }
    function card(it) {
        var c = make('div', 'card'), art = make('div', 'art'), img = make('img');
        img.decoding = 'async'; img.alt = '';
        if (it.type === 'folder') { img.src = R9Art.FOLDER; c.appendChild(art); art.appendChild(img); c.appendChild(make('div', 'name', it.f.name)); c.appendChild(make('div', 'sys', ' ')); return c; }
        if (it.type === 'retry') { img.src = R9Art.RETRY; c.appendChild(art); art.appendChild(img); c.appendChild(make('div', 'name', t.retry)); c.appendChild(make('div', 'sys', String(listErr))); return c; }
        var g = it.g, fallback = R9Art.game(g.name, g.system);
        img.loading = 'lazy';
        img.src = g.art || fallback;
        img.onerror = function () { img.onerror = null; img.src = fallback; };
        art.appendChild(img);
        if (R9Saves.isFav(g)) art.appendChild(make('span', 'fav', '★'));
        c.appendChild(art);
        c.appendChild(make('div', 'name', g.name));
        c.appendChild(make('div', 'sys', (R9Systems.get(g.system) || {}).label || ''));
        return c;
    }
    // grids are drawn in chunks: a folder of 2000 games never puts 2000 cards on the page
    function growGrid(s, upTo) {
        var sec = sections[s];
        if (sec.row || sec.shown >= sec.items.length || upTo < sec.shown) return;
        var end = Math.min(sec.items.length, Math.max(upTo + 1, sec.shown + CHUNK));
        for (var i = sec.shown; i < end; i++) sec.box.appendChild(sec.cards[i] = card(sec.items[i]));
        sec.shown = end;
    }
    function render() {
        var keep = remembered[repo + '|' + path] || { s: 99, i: 0 };
        sections = buildSections();
        // header: library tabs and where we are
        var tabs = el('tabs'); tabs.textContent = '';
        if (cfg.repos.length > 1) {
            tabs.appendChild(make('span', 'key', 'LB'));
            cfg.repos.forEach(function (r, i) { tabs.appendChild(make('span', 'tab' + (i === repo ? ' on' : ''), r.name)); });
            tabs.appendChild(make('span', 'key', 'RB'));
        }
        var crumb = el('crumb'); crumb.textContent = '';
        var r = currentRepo(), parts = path ? path.split('/') : [];
        crumb.appendChild(make('b', '', r ? r.name : t.library));
        parts.forEach(function (p) { crumb.appendChild(document.createTextNode('  ›  ' + p)); });
        // sections
        var rows = el('rows'); rows.textContent = '';
        sections.forEach(function (sec) {
            rows.appendChild(make('div', 'sec-title', sec.title));
            sec.box = make('div', sec.row ? 'row' : 'grid');
            sec.cards = [];
            if (sec.row) sec.items.forEach(function (it) { sec.box.appendChild(card(it)); sec.cards.push(sec.box.lastChild); });
            else sec.box.style.setProperty('--cols', cols());
            rows.appendChild(sec.box);
        });
        var grid = sections[sections.length - 1];
        if (!grid.items.length) {
            var msg = listState === 'loading' ? t.loading : listState === 'none' ? t.noRepos : listState === 'error' ? t.noLib : t.empty;
            rows.appendChild(make('div', 'empty', msg));
        }
        // focus: where it was in this folder, else the first card
        var s = Math.min(keep.s, sections.length - 1);
        while (s > 0 && !sections[s].items.length) s--;
        if (!sections[s].items.length) for (s = 0; s < sections.length && !sections[s].items.length; s++);
        if (s >= sections.length) { focus = { s: -1, i: 0 }; el('scroller').scrollTop = 0; return; }
        if (!sections[sections.length - 1].row) growGrid(sections.length - 1, keep.i);
        setFocus(s, Math.min(keep.s === s ? keep.i : 0, sections[s].items.length - 1), true);
    }
    function setFocus(s, i, quiet) {
        var old = focus.s >= 0 && sections[focus.s] && sections[focus.s].cards[focus.i];
        if (old) old.classList.remove('focus');
        growGrid(s, i + CHUNK / 2);
        focus = { s: s, i: i };
        remembered[repo + '|' + path] = { s: s, i: i };
        var c = sections[s].cards[i];
        if (!c) return;
        c.classList.add('focus');
        // keep it in view (layout is read only when the focus moves)
        var sc = el('scroller'), top = c.offsetTop, h = c.offsetHeight, pad = window.innerHeight * 0.06;
        if (s === 0 && i < (sections[0].row ? 1e9 : cols())) sc.scrollTop = 0;
        else if (top - pad * 1.6 < sc.scrollTop) sc.scrollTop = Math.max(0, top - pad * 1.6);
        else if (top + h + pad > sc.scrollTop + sc.clientHeight) sc.scrollTop = top + h + pad - sc.clientHeight;
        if (sections[s].row) {
            var row = sections[s].box, left = c.offsetLeft - row.offsetLeft;
            if (left - 20 < row.scrollLeft) row.scrollLeft = Math.max(0, left - 20);
            else if (left + c.offsetWidth + 20 > row.scrollLeft + row.clientWidth) row.scrollLeft = left + c.offsetWidth + 20 - row.clientWidth;
        }
        if (!quiet) MyPC.announce(label(sections[s].items[i]));
    }
    function label(it) { return it.type === 'folder' ? it.f.name : it.type === 'retry' ? t.retry : it.g.name + ', ' + ((R9Systems.get(it.g.system) || {}).label || ''); }
    function focused() { return focus.s >= 0 && sections[focus.s] ? sections[focus.s].items[focus.i] : null; }

    function move(dir) {
        if (focus.s < 0) return;
        var s = focus.s, i = focus.i, sec = sections[s], n = sec.items.length, c = sec.row ? n : cols();
        if (dir === 'left' || dir === 'right') {
            var rtl = info && info.rtl, step = (dir === 'right') !== !!rtl ? 1 : -1, j = i + step;
            if (j >= 0 && j < n && (sec.row || Math.floor(j / c) === Math.floor(i / c))) setFocus(s, j);
            return;
        }
        if (dir === 'down') {
            if (!sec.row && i + c < n) return setFocus(s, i + c);
            if (!sec.row && Math.floor(i / c) < Math.floor((n - 1) / c)) return setFocus(s, n - 1);
            for (var k = s + 1; k < sections.length; k++) if (sections[k].items.length) return setFocus(k, Math.min(sec.row ? 0 : i % c, sections[k].items.length - 1));
            return;
        }
        if (dir === 'up') {
            if (!sec.row && i - c >= 0) return setFocus(s, i - c);
            for (k = s - 1; k >= 0; k--) if (sections[k].items.length) return setFocus(k, sections[k].row ? Math.min(i % c, sections[k].items.length - 1) : sections[k].items.length - 1);
        }
    }
    function activate() {
        var it = focused();
        if (!it) return;
        if (it.type === 'retry') { R9Library.forget(currentRepo()); load(); }
        else if (it.type === 'folder') { path = it.f.path; load(); }
        else launch(it.g, null);
    }
    function back() {
        if (!path) return;
        var i = path.lastIndexOf('/');
        path = i < 0 ? '' : path.slice(0, i);
        load();
    }
    function switchRepo(d) {
        if (cfg.repos.length < 2) return;
        repo = (repo + d + cfg.repos.length) % cfg.repos.length;
        path = '';
        load();
    }
    function toggleFav(g) {
        toast(R9Saves.toggleFav(g) ? t.favOn : t.favOff);
        render();
    }
    function options() {
        var it = focused();
        if (!it || it.type !== 'game') return;
        var g = it.g;
        Promise.all([R9Saves.get(g.url, 'auto'), R9Saves.get(g.url, 'quick')]).then(function (s) {
            var opts = [{ label: t.play, fn: function () { launch(g, 'fresh'); } }];
            if (s[0] && s[0].state) opts.push({ label: t.cont, fn: function () { launch(g, s[0].state); } });
            if (s[1] && s[1].state) opts.push({ label: t.loadQuick, fn: function () { launch(g, s[1].state); } });
            opts.push({ label: R9Saves.isFav(g) ? t.remFav : t.addFav, fn: function () { toggleFav(g); } });
            opts.push({ label: t.delSaves, fn: function () { R9Saves.remove(g.url).then(function () { toast(t.deleted); }); } });
            opts.push({ label: t.cancel, fn: null });
            showDialog(g.name, (R9Systems.get(g.system) || {}).label || '', opts, null);
        });
    }

    /* ---------- settings ---------- */
    function settingLabel(k) { var n = R9Settings.name(k); return t['set_' + k] + ':  ' + (t[n] || n); }
    function openSettings() {
        var opts = R9Settings.LIST.map(function (s) { return { key: s.key, label: settingLabel(s.key) }; });
        opts.push({ label: t.resetSet, fn: function () { R9Settings.reset(); openSettings(); } });
        opts.push({ label: t.done, fn: null });
        showDialog(t.settings, t.setHint, opts, null, 'compact');
    }

    /* ---------- playing ---------- */
    var GAME_MENU, LIB_MENU;
    function menus() {
        GAME_MENU = [{ id: 'qsave', label: t.qsave }, { id: 'qload', label: t.qload }, { id: 'start', label: t.pstart },
                     { id: 'select', label: t.pselect }, { id: 'restart', label: t.restart }, { id: 'exit', label: t.exit }];
        LIB_MENU = [{ id: 'settings', label: t.settings }, { id: 'reload', label: t.reload }];
    }
    // state: null = follow the autoload setting, 'fresh' = no state, or a state to load
    function launch(g, state) {
        if (cfg.systems.indexOf(g.system) < 0 || !R9Systems.get(g.system)) { toast(t.off); return; }
        if (MyPC.apiLevel < 9) toast(t.update);
        el('loading').textContent = fill(t.loadingGame, { name: g.name });
        el('player').hidden = false;
        el('app').style.display = 'none';          // nothing of the library is drawn under the game
        MyPC.announce(fill(t.loadingGame, { name: g.name }));
        var rom = R9Net.get(g.url, 'arraybuffer', 180000).catch(function (e) {
            if (e && e.code === 'too-big') return null;          // over 32 MB: the emulator downloads it itself
            throw e;
        });
        Promise.all([rom, R9Saves.get(g.url, 'sram'), state === null ? R9Saves.get(g.url, 'auto') : Promise.resolve(null)]).then(function (r) {
            var data = r[0], sram = r[1] && r[1].sram, auto = r[2];
            var go = function (st) {
                var sr = st && st === (auto && auto.state) && auto.sram ? auto.sram : sram;
                MyPC.setMenu(GAME_MENU);
                R9Player.start(g, data, { sram: sr, state: st && st !== 'fresh' ? st : null }, {
                    cdn: cfg.cdn, volume: volume, perf: R9Settings.all(), saveStates: cfg.saveStates, version: VERSION, loadingText: fill(t.loadingGame, { name: g.name }),
                    onStarted: function () { R9Saves.played(g); },
                    onExit: function (err) {
                        MyPC.setMenu(LIB_MENU);
                        el('app').style.display = '';
                        if (err) toast(err === 'timeout' || err === 'emulator' ? t.failEmu : t.failRom);
                        render();
                    }
                });
            };
            if (state !== null) return go(state);
            if (!auto || !auto.state || !cfg.saveStates || cfg.autoload === false) return go(null);
            if (cfg.autoload === true) return go(auto.state);
            showDialog(t.contTitle, fill(t.contText, { date: new Date(auto.t).toLocaleString(lang) }),
                [{ label: t.cont, fn: function () { go(auto.state); } }, { label: t.fresh, fn: function () { go(null); } }],
                function () { el('player').hidden = true; el('app').style.display = ''; });
        }, function (e) {
            console.warn('[Retro9] rom', e);
            el('player').hidden = true;
            el('app').style.display = '';
            toast(t.failRom);
        });
    }

    /* ---------- input ---------- */
    function onInput(action, pressed, repeat, dev) {
        if (pressed && R9Player.active()) R9Player.unlockAudio();
        if (dialog) { if (pressed) dialogInput(action); return; }
        if (R9Player.active()) { R9Player.onAction(action, pressed, repeat, dev); return; }
        if (!el('player').hidden || !pressed) return;              // a game is loading
        if (action === 'up' || action === 'down' || action === 'left' || action === 'right') move(action);
        else if (repeat) return;
        else if (action === 'confirm') activate();
        else if (action === 'cancel') back();
        else if (action === 'menu' && !/^pad/.test(dev || '')) options();
    }
    function onButton(i, pressed, value, dev) {
        if (R9Player.active() && !dialog) { R9Player.onButton(i, pressed, value, dev); return; }
        if (!pressed || dialog || !el('player').hidden) return;
        var it = focused();
        if (i === 2 || i === 9) options();                            // X (left button) or Start
        else if (i === 8) openSettings();                             // Select
        else if (i === 3 && it && it.type === 'game') toggleFav(it.g); // Y (top button)
        else if (i === 4) switchRepo(-1);                             // LB
        else if (i === 5) switchRepo(1);                              // RB
    }
    function onAxes(a, dev) { if (R9Player.active() && !dialog) R9Player.onAxes(a, dev); }

    function legend() {
        // the face buttons drawn by position (bottom, right, left, top), whatever the controller prints on them
        function diamond(pos) {
            var spots = { top: [12, 4], left: [4, 12], right: [20, 12], bottom: [12, 20] }, svg = '';
            Object.keys(spots).forEach(function (k) { svg += '<circle cx="' + spots[k][0] + '" cy="' + spots[k][1] + '" r="3.6" fill="' + (k === pos ? '#ffd23f' : '#4a5288') + '"/>'; });
            var img = make('img'); img.alt = ''; img.style.height = '3.6vh'; img.style.verticalAlign = 'middle'; img.style.marginRight = '0.6vw';
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + svg + '</svg>');
            return img;
        }
        var f = el('legend'); f.textContent = '';
        [['bottom', t.open], ['right', t.back], ['left', t.options], ['top', t.favourite]].forEach(function (p) {
            var s = make('span'); s.appendChild(diamond(p[0])); s.appendChild(document.createTextNode(p[1])); f.appendChild(s);
        });
        if (cfg.repos.length > 1) { var s = make('span'); s.appendChild(make('span', 'key', 'LB')); s.appendChild(document.createTextNode(' ')); s.appendChild(make('span', 'key', 'RB')); s.appendChild(document.createTextNode(' ' + t.switchLib)); f.appendChild(s); }
        var st = make('span'); st.appendChild(make('span', 'key', 'Select')); st.appendChild(document.createTextNode(' ' + t.settings)); f.appendChild(st);
    }

    function onResize() { if (!R9Player.active()) render(); }

    MyPC.init({
        ownMenu: true,           // Start alone: options here, Start in a game; hold Start + Select for My PC's menu
        onInit: function (i) {
            info = i;
            lang = R9Text[i.lang] ? i.lang : 'en';
            t = R9Text[lang];
            document.documentElement.lang = lang;
            volume = i.volume ? i.volume.music : 0.7;
            cfg = readConfig();
            repo = cfg.first;
            R9Saves.init(i);
            R9Settings.init();
            menus();
            MyPC.setMenu(LIB_MENU);
            if (MyPC.gamepad && MyPC.gamepad.on) {
                unsub.push(MyPC.gamepad.on('button', onButton));
                unsub.push(MyPC.gamepad.on('axes', onAxes));
            }
            window.addEventListener('resize', onResize);
            legend();
            listState = 'loading';
            render();
            MyPC.ready();
        },
        onStart: function () { load(); },
        onPause: function () { if (R9Player.active()) R9Player.pause(); },
        onResume: function () { if (R9Player.active()) R9Player.resume(); },
        onDestroy: function () {
            R9Player.destroy();
            unsub.forEach(function (f) { f(); });
            window.removeEventListener('resize', onResize);
            clearTimeout(toastTimer);
        },
        onInput: onInput,
        onMenu: function (id) {
            if (id === 'settings') { if (!R9Player.active()) openSettings(); return; }
            if (id === 'reload') { R9Library.forget(currentRepo() || {}); load(); return; }
            if (!R9Player.active()) return;
            if (id === 'qsave') R9Player.quickSave().then(function (r) { toast(!r ? t.notSaved : r.device ? t.saved : t.savedSession); });
            else if (id === 'qload') R9Player.quickLoad().then(function (ok) { toast(ok ? t.loaded : t.noQuick); });
            else if (id === 'start') R9Player.pressStart();
            else if (id === 'select') R9Player.pressSelect();
            else if (id === 'restart') R9Player.restart();
            else if (id === 'exit') R9Player.exit();
        },
        onVolume: function (v) { volume = v.music; R9Player.setVolume(volume); }
    });
})();
