/* Retro9: runs one game at a time in a nested frame (player.html) and feeds it the controllers.
 * Input: MyPC.gamepad for every controller (pads 'pad0'..'pad3', phone controllers 'pad101'...), one emulator player per
 * controller in the order they are first used; the keyboard / touch pad actions (onInput) drive player 1. */
var R9Player = (function () {
    'use strict';
    var DEAD = 0.25, STICK = 0x7fff;
    var frame = null, game = null, cfg = null, on = false, ready = false, paused = false, opts = {}, bootTimer = 0;
    var players = {}, nPlayers = 0;
    // per player: D-pad held from buttons, from the left stick, from keys/touch; and what was last sent
    var dpad = [], stick = [], keys = [], sent = [], axesSent = [];
    for (var p = 0; p < 4; p++) { dpad.push([0, 0, 0, 0]); stick.push([0, 0, 0, 0]); keys.push([0, 0, 0, 0]); sent.push([0, 0, 0, 0]); axesSent.push([0, 0, 0, 0, 0, 0, 0, 0]); }

    function el(id) { return document.getElementById(id); }
    function api() { try { return frame && frame.contentWindow && frame.contentWindow.R9P; } catch (e) { return null; } }
    function send(pl, idx, v) { var a = api(); if (a && ready) a.input(pl, idx, v); }
    function playerOf(dev) {
        if (players[dev] !== undefined) return players[dev];
        if (nPlayers >= 4) return -1;
        return (players[dev] = nPlayers++);
    }
    function resetInput() {
        for (var p = 0; p < 4; p++) for (var d = 0; d < 4; d++) { dpad[p][d] = stick[p][d] = keys[p][d] = sent[p][d] = 0; }
        for (p = 0; p < 4; p++) for (d = 0; d < 8; d++) axesSent[p][d] = 0;
    }
    // directions 0 up 1 down 2 left 3 right -> EmulatorJS 4..7
    function flushDir(pl) {
        for (var d = 0; d < 4; d++) {
            var v = dpad[pl][d] || stick[pl][d] || keys[pl][d] ? 1 : 0;
            if (v !== sent[pl][d]) { sent[pl][d] = v; send(pl, 4 + d, v); }
        }
    }
    function tap(idx) { send(0, idx, 1); setTimeout(function () { send(0, idx, 0); }, 160); }
    function ejsMenuOpen() { var a = api(); return !!(a && ready && a.isSettingsOpen && a.isSettingsOpen()); }

    var PAD_DIRS = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
    function onButton(i, pressed, value, dev) {
        if (!on || paused) return;
        if (ejsMenuOpen()) {
            if (!pressed) return;
            var a = api();
            if (PAD_DIRS[i]) a.settingsInput(PAD_DIRS[i]);
            else if (i === 0) a.settingsInput('confirm');
            else if (i === 1 || i === 8 || i === 9) a.settingsInput('cancel');
            return;
        }
        var pl = playerOf(dev);
        if (pl < 0 || i === 16) return;                                 // 16 = Home: My PC's
        if (i >= 12 && i <= 15) { dpad[pl][i - 12] = pressed ? 1 : 0; flushDir(pl); return; }
        var idx = R9Systems.padIndex(i);
        if (idx >= 0) send(pl, idx, pressed ? 1 : 0);
    }
    function onAxes(a, dev) {
        if (!on || paused || ejsMenuOpen()) return;
        var pl = playerOf(dev);
        if (pl < 0) return;
        var sys = R9Systems.get(game.system);
        if (sys && sys.analog) {
            // analog sticks: EmulatorJS 16..19 (left X+ X- Y+ Y-), 20..23 (right)
            for (var s = 0; s < 2; s++) {
                var x = a[s * 2] || 0, y = a[s * 2 + 1] || 0;
                if (Math.abs(x) < DEAD) x = 0; if (Math.abs(y) < DEAD) y = 0;
                var vals = [x > 0 ? x : 0, x < 0 ? -x : 0, y > 0 ? y : 0, y < 0 ? -y : 0];
                for (var k = 0; k < 4; k++) {
                    var v = Math.round(vals[k] * STICK), slot = s * 4 + k;
                    if (v !== axesSent[pl][slot]) { axesSent[pl][slot] = v; send(pl, 16 + slot, v); }
                }
            }
            return;
        }
        // digital systems: the left stick is a second D-pad (with a little hysteresis)
        var lx = a[0] || 0, ly = a[1] || 0, st = stick[pl];
        st[0] = ly < -(st[0] ? 0.35 : 0.5) ? 1 : 0; st[1] = ly > (st[1] ? 0.35 : 0.5) ? 1 : 0;
        st[2] = lx < -(st[2] ? 0.35 : 0.5) ? 1 : 0; st[3] = lx > (st[3] ? 0.35 : 0.5) ? 1 : 0;
        flushDir(0 + pl);
    }
    // keyboard (standalone), TV remote arrows and My PC's touch pad: player 1
    var DIRS = { up: 0, down: 1, left: 2, right: 3 };
    function onAction(action, pressed, repeat, dev) {
        if (!on || paused) return;
        if (ejsMenuOpen()) {
            if (pressed && !/^pad/.test(dev || '')) api().settingsInput(action);
            return;
        }
        if (repeat || /^pad/.test(dev || '')) return;                   // controllers come through onButton
        if (DIRS[action] !== undefined) { keys[0][DIRS[action]] = pressed ? 1 : 0; flushDir(0); return; }
        if (action === 'confirm') send(0, 0, pressed ? 1 : 0);          // bottom button / OK
        else if (action === 'cancel') send(0, 8, pressed ? 1 : 0);      // right button
        else if (action === 'menu' && pressed) tap(3);                  // touch pad X / Start
    }

    function close() {
        clearTimeout(bootTimer);
        var a = api();
        if (a) { try { a.kill(); } catch (e) {} }
        if (frame) { try { frame.src = 'about:blank'; } catch (e) {} frame.parentNode.removeChild(frame); }
        frame = null; ready = false; on = false; game = null; cfg = null;
        el('player').hidden = true;
    }
    function fail(msg) {
        var cb = opts.onExit;
        close();
        if (cb) cb(msg);
    }

    // the page inside the frame calls this
    window.R9Host = {
        event: function (ev, data) {
            if (ev === 'frame') {
                var a = api();
                if (a && cfg) a.boot(cfg);
            } else if (ev === 'started') {
                clearTimeout(bootTimer);
                ready = true;
                el('loading').textContent = '';
                if (paused) api().pause();
                if (opts.onStarted) opts.onStarted();
            } else if (ev === 'error') {
                fail('emulator');
            }
        }
    };

    function autosave() {
        // battery save always; a state too when the setting allows it
        var a = api();
        if (!a || !ready || !game) return Promise.resolve();
        var snap = a.snapshot(opts.saveStates), url = game.url, jobs = [];
        if (snap.sram) jobs.push(R9Saves.put(url, 'sram', { sram: snap.sram }));
        if (snap.state) jobs.push(R9Saves.put(url, 'auto', { state: snap.state, sram: snap.sram }));
        return Promise.all(jobs).catch(function (e) { console.warn('[Retro9] save failed', e); });
    }

    return {
        onButton: onButton,
        onAxes: onAxes,
        onAction: onAction,
        active: function () { return on; },
        game: function () { return game; },
        // g: game, data: ArrayBuffer (or null to let the emulator download g.url), saves: { sram, state }, o: { cdn, volume, saveStates, loadingText, onStarted, onExit }
        start: function (g, data, saves, o) {
            close();
            opts = o; game = g; on = true; ready = false; resetInput();
            var sys = R9Systems.get(g.system);
            cfg = { core: sys.core, data: data, url: data ? '' : g.url, name: decodeURIComponent(g.url.split('/').pop().split(/[?#]/)[0]),
                    cdn: o.cdn, volume: o.volume, perf: o.perf, sram: saves.sram || null, state: saves.state || null };
            el('loading').textContent = o.loadingText;
            el('player').hidden = false;
            frame = document.createElement('iframe');
            frame.setAttribute('allow', 'autoplay; gamepad');
            frame.src = 'player.html?v=' + o.version;
            // a lower picture size: the frame is made smaller and stretched back to full screen, so the emulator renders
            // fewer pixels (it sizes its canvas from the frame's own window)
            var sc = o.perf && o.perf.scale;
            if (sc > 0 && sc < 1) {
                frame.style.width = (sc * 100) + '%'; frame.style.height = (sc * 100) + '%';
                frame.style.transformOrigin = '0 0'; frame.style.transform = 'scale(' + (1 / sc) + ')';
            }
            el('player').appendChild(frame);
            bootTimer = setTimeout(function () { if (!ready) fail('timeout'); }, 90000);
        },
        openEjsMenu: function () {
            var a = api();
            if (a && ready && a.openSettings) return a.openSettings();
            return false;
        },
        pause: function () {
            // let go of everything held, so nothing stays pressed when the game comes back
            if (ready) {
                for (var pl = 0; pl < Math.max(1, nPlayers); pl++) {
                    for (var i = 0; i < 24; i++) send(pl, i, 0);
                    for (var d = 0; d < 4; d++) { dpad[pl][d] = stick[pl][d] = keys[pl][d] = sent[pl][d] = 0; }
                    for (d = 0; d < 8; d++) axesSent[pl][d] = 0;
                }
            }
            paused = true;
            var a = api();
            if (a && ready) a.pause();
            return autosave();
        },
        resume: function () { paused = false; var a = api(); if (a && ready) a.resume(); },
        setVolume: function (v) { var a = api(); if (a && ready) a.setVolume(v); },
        unlockAudio: function () { var a = api(); if (a && ready) a.unlockAudio(); },
        pressStart: function () { setTimeout(function () { tap(3); }, 350); },
        pressSelect: function () { setTimeout(function () { tap(2); }, 350); },
        restart: function () { var a = api(); if (a && ready) a.restart(); },
        quickSave: function () {
            var a = api();
            if (!a || !ready) return Promise.resolve(false);
            var snap = a.snapshot(true);
            if (!snap.state) return Promise.resolve(false);
            var jobs = [R9Saves.put(game.url, 'quick', { state: snap.state, sram: snap.sram })];
            if (snap.sram) jobs.push(R9Saves.put(game.url, 'sram', { sram: snap.sram }));
            return Promise.all(jobs).then(function (r) { return { device: r[0].device }; }, function () { return false; });
        },
        quickLoad: function () {
            var a = api(), url = game && game.url;
            if (!a || !ready) return Promise.resolve(false);
            return R9Saves.get(url, 'quick').then(function (s) { return !!(s && s.state && api() && api().loadState(s.state)); });
        },
        // leave the game: save, then remove the frame (frees the emulator's memory)
        exit: function () {
            var cb = opts.onExit;
            return autosave().then(function () { close(); if (cb) cb(''); });
        },
        destroy: close
    };
})();
