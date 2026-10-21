/* Retro9: the systems it can play, how a file is matched to one, and how a controller maps to EmulatorJS.
 * EmulatorJS input indices (gameManager.simulateInput): 0 B, 1 Y, 2 Select, 3 Start, 4 Up, 5 Down, 6 Left, 7 Right,
 * 8 A, 9 X, 10 L, 11 R, 12 L2, 13 R2, 14 L3, 15 R3, 16..19 left stick X+ X- Y+ Y-, 20..23 right stick. */
var R9Systems = (function () {
    'use strict';
    var LIST = {
        nes:    { label: 'NES',           core: 'nes',    ext: ['nes', 'unf', 'unif'], color: '#c8434b' },
        snes:   { label: 'SNES',          core: 'snes',   ext: ['sfc', 'smc'],         color: '#6c5ce7' },
        gb:     { label: 'Game Boy',      core: 'gb',     ext: ['gb'],                 color: '#7a8b3a' },
        gbc:    { label: 'Game Boy Color', core: 'gb',    ext: ['gbc'],                color: '#2e9e8f' },
        gba:    { label: 'GBA',           core: 'gba',    ext: ['gba'],                color: '#4b5bd6' },
        segaMD: { label: 'Mega Drive',    core: 'segaMD', ext: ['md', 'gen', 'smd'],   color: '#2b2d42' },
        segaMS: { label: 'Master System', core: 'segaMS', ext: ['sms'],                color: '#3a6ea5' },
        segaGG: { label: 'Game Gear',     core: 'segaGG', ext: ['gg'],                 color: '#355070' },
        n64:    { label: 'N64',           core: 'n64',    ext: ['n64', 'z64', 'v64'],  color: '#2a9d8f', analog: true },
        nds:    { label: 'DS',            core: 'nds',    ext: ['nds'],                color: '#6d6875' },
        arcade: { label: 'Arcade',        core: 'arcade', ext: [],                     color: '#e76f51' }
    };
    // folder names that say which system the files inside belong to (needed for .bin and .zip)
    var HINTS = {
        nes: 'nes', famicom: 'nes', fc: 'nes',
        snes: 'snes', sfc: 'snes', superfamicom: 'snes', supernes: 'snes',
        gb: 'gb', gameboy: 'gb', gbc: 'gbc', gameboycolor: 'gbc', gba: 'gba', gameboyadvance: 'gba',
        genesis: 'segaMD', megadrive: 'segaMD', md: 'segaMD', segamd: 'segaMD', segagenesis: 'segaMD',
        sms: 'segaMS', mastersystem: 'segaMS', segams: 'segaMS', gg: 'segaGG', gamegear: 'segaGG', segagg: 'segaGG',
        n64: 'n64', nintendo64: 'n64', nds: 'nds', ds: 'nds',
        arcade: 'arcade', mame: 'arcade', fbneo: 'arcade', fba: 'arcade'
    };
    var BY_EXT = {};
    Object.keys(LIST).forEach(function (id) { LIST[id].ext.forEach(function (e) { BY_EXT[e] = id; }); });
    var IMAGE = { png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1 };

    function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
    function hint(path) {
        var parts = (path || '').toLowerCase().split('/');
        for (var i = parts.length - 2; i >= 0; i--) {
            var h = HINTS[parts[i].replace(/[^a-z0-9]/g, '')];
            if (h) return h;
        }
        return '';
    }
    // the system id for a file path, or '' when it is not a game we can play
    function detect(path, given) {
        if (given && LIST[given]) return given;
        var e = ext(path);
        if (BY_EXT[e]) return BY_EXT[e];
        if (e === 'bin' || e === 'zip' || e === '7z') return hint(path);
        return '';
    }

    // standard gamepad button index -> EmulatorJS index, by position (bottom face button = RetroPad B, right = A...)
    var PAD = [0, 8, 1, 9, 10, 11, 12, 13, 2, 3, 14, 15, 4, 5, 6, 7];

    return {
        LIST: LIST,
        get: function (id) { return LIST[id] || null; },
        detect: detect,
        ext: ext,
        isImage: function (path) { return !!IMAGE[ext(path)]; },
        padIndex: function (i) { return i < PAD.length ? PAD[i] : -1; }
    };
})();
