/* Retro9: the systems it can play, how a file is matched to one (including automatic .zip/.7z/.bin inspection), and how a controller maps to EmulatorJS.
 * EmulatorJS input indices (gameManager.simulateInput): 0 B, 1 Y, 2 Select, 3 Start, 4 Up, 5 Down, 6 Left, 7 Right,
 * 8 A, 9 X, 10 L, 11 R, 12 L2, 13 R2, 14 L3, 15 R3, 16..19 left stick X+ X- Y+ Y-, 20..23 right stick. */
var R9Systems = (function () {
    'use strict';
    var LIST = {
        nes:    { label: 'NES',            core: 'nes',    ext: ['nes', 'unf', 'unif', 'fds'], color: '#c8434b' },
        snes:   { label: 'SNES',           core: 'snes',   ext: ['sfc', 'smc'],                color: '#6c5ce7' },
        gb:     { label: 'Game Boy',       core: 'gb',     ext: ['gb'],                        color: '#7a8b3a' },
        gbc:    { label: 'Game Boy Color', core: 'gb',     ext: ['gbc'],                       color: '#2e9e8f' },
        gba:    { label: 'GBA',            core: 'gba',    ext: ['gba'],                       color: '#4b5bd6' },
        segaMD: { label: 'Mega Drive',     core: 'segaMD', ext: ['md', 'gen', 'smd'],          color: '#2b2d42' },
        segaMS: { label: 'Master System',  core: 'segaMS', ext: ['sms'],                       color: '#3a6ea5' },
        segaGG: { label: 'Game Gear',      core: 'segaGG', ext: ['gg'],                        color: '#355070' },
        n64:    { label: 'N64',            core: 'n64',    ext: ['n64', 'z64', 'v64'],         color: '#2a9d8f', analog: true },
        nds:    { label: 'DS',             core: 'nds',    ext: ['nds'],                       color: '#6d6875' },
        arcade: { label: 'Arcade',         core: 'arcade', ext: [],                            color: '#e76f51' }
    };
    // folder names and filename tags that say which system the files belong to
    var HINTS = {
        nes: 'nes', famicom: 'nes', fc: 'nes',
        snes: 'snes', sfc: 'snes', smc: 'snes', superfamicom: 'snes', supernes: 'snes',
        gb: 'gb', gameboy: 'gb', gbc: 'gbc', gameboycolor: 'gbc', gba: 'gba', gameboyadvance: 'gba', agb: 'gba',
        genesis: 'segaMD', megadrive: 'segaMD', md: 'segaMD', segamd: 'segaMD', segagenesis: 'segaMD',
        sms: 'segaMS', mastersystem: 'segaMS', segams: 'segaMS', gg: 'segaGG', gamegear: 'segaGG', segagg: 'segaGG',
        n64: 'n64', nintendo64: 'n64', z64: 'n64', v64: 'n64',
        nds: 'nds', ds: 'nds', nintendods: 'nds',
        arcade: 'arcade', mame: 'arcade', fbneo: 'arcade', fba: 'arcade', neogeo: 'arcade', cps1: 'arcade', cps2: 'arcade', cps3: 'arcade'
    };
    // title patterns for common ROMs stored in flat folders without a system subfolder
    var TITLE_RULES = [
        { sys: 'nds',    re: /\b(new super mario bros|mario kart ds|nintendo ds|psyfer|xenophobia|trashman|pokemon (diamond|pearl|platinum|heartgold|soulsilver|black|white)|castlevania.*(dawn|portrait|ecclesia)|animal crossing.*wild world|metroid prime hunters|zelda.*(phantom hourglass|spirit tracks))\b/i },
        { sys: 'gba',    re: /\b(game boy advance|super mario advance|grand theft auto advance|advance wars|minish cap|metroid (fusion|zero mission)|pokemon (ruby|sapphire|emerald|firered|leafgreen)|golden sun|fire emblem|warioware|mario\s*&\s*luigi.*superstar|castlevania.*(aria|harmony|circle of the moon)|sonic advance|mother 3|menace)\b/i },
        { sys: 'snes',   re: /\b(super mario (world|all-stars|rpg|kart)|bs mario|link to the past|super metroid|chrono trigger|donkey kong country|earthbound|yoshi'?s island|street fighter 5|final fantasy (ii|iii|iv|v|vi|4|5|6)|mega man x|secret of mana|contra iii|super castlevania|star fox|f-zero|kirby super star)\b/i },
        { sys: 'n64',    re: /\b(super mario 64|mario kart 64|ocarina of time|majora'?s mask|goldeneye|super smash bros|banjo-kazooie|banjo-tooie|star fox 64|diddy kong racing|paper mario|donkey kong 64|perfect dark|wave race 64|f-zero x|pokemon stadium)\b/i },
        { sys: 'segaMD', re: /\b(sonic the hedgehog|sonic\s*&\s*knuckles|streets of rage|golden axe|revenge of shinobi|shinobi iii|phantasy star|gunstar heroes|contra hard corps|castlevania bloodlines|comix zone|altered beast|vectorman|toejam|shining force)\b/i },
        { sys: 'gbc',    re: /\b(pokemon (gold|silver|crystal)|link'?s awakening dx|oracle of (ages|seasons)|wario land (ii|3)|metal gear solid)\b/i },
        { sys: 'gb',     re: /\b(super mario land|pokemon (red|blue|yellow)|kirby'?s dream land|tetris|gargoyle'?s quest)\b/i },
        { sys: 'arcade', re: /\b(mspacman|ms\.?\s*pac-?man|pac-?man|cadillacs and dinosaurs|metal slug|king of fighters|kof\d+|street fighter (ii|alpha|zero|iii)|final fight|marvel vs|x-men vs|capcom vs|galaga|dig\s*dug|frogger|tmnt|simpsons|194[1234]|ghosts'?n goblins|ghouls'?n ghosts|snow bros|bubble bobble|out\s*run|double dragon|mortal kombat)\b/i },
        { sys: 'nes',    re: /\b(contra|super mario bros|mega man [1-6]|duck\s*tales|punch-out|ninja gaiden|kirby'?s adventure|zelda ii|excitebike|ice climber|battletoads|castlevania (ii|iii))\b/i }
    ];
    var BY_EXT = {};
    Object.keys(LIST).forEach(function (id) { LIST[id].ext.forEach(function (e) { BY_EXT[e] = id; }); });
    var IMAGE = { png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1 };

    function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
    function subExt(name) {
        var stem = String(name || '').replace(/\.[a-z0-9]+$/i, '');
        return ext(stem);
    }
    function hint(path) {
        var parts = (path || '').toLowerCase().split('/');
        for (var i = parts.length - 2; i >= 0; i--) {
            var h = HINTS[parts[i].replace(/[^a-z0-9]/g, '')];
            if (h) return h;
        }
        var file = (parts[parts.length - 1] || '').replace(/\.[a-z0-9]+$/, '');
        var tokens = file.split(/[\s_()\[\]\-.]+/);
        for (var j = 0; j < tokens.length; j++) {
            var t = HINTS[tokens[j].replace(/[^a-z0-9]/g, '')];
            if (t) return t;
        }
        for (var k = 0; k < TITLE_RULES.length; k++) {
            if (TITLE_RULES[k].re.test(file)) return TITLE_RULES[k].sys;
        }
        return '';
    }
    // the system id for a file path, 'auto' when an archive needs binary inspection on launch, or '' when not a game
    function detect(path, given) {
        if (given && LIST[given]) return given;
        var e = ext(path);
        if (BY_EXT[e]) return BY_EXT[e];
        if (e === 'zip' || e === '7z' || e === 'rar' || e === 'bin') {
            var se = subExt(path);
            if (BY_EXT[se]) return BY_EXT[se];
            return hint(path) || 'auto';
        }
        return '';
    }

    // checks if a downloaded buffer is actually an HTML error/challenge page (e.g. Cloudflare 403/503 page saved as .zip)
    function isHtmlPage(u8) {
        if (!u8 || u8.length < 14) return false;
        var i = 0;
        while (i < u8.length && i < 32 && (u8[i] === 0x20 || u8[i] === 0x09 || u8[i] === 0x0a || u8[i] === 0x0d || u8[i] === 0xef || u8[i] === 0xbb || u8[i] === 0xbf)) i++;
        if (u8[i] !== 0x3c) return false; // '<'
        try {
            var head = new TextDecoder().decode(u8.subarray(i, Math.min(u8.length, i + 96))).toLowerCase();
            return head.indexOf('<!doctype html') === 0 || head.indexOf('<html') === 0 || head.indexOf('<head') === 0;
        } catch (e) { return false; }
    }

    // inspects raw uncompressed ROM bytes for console header signatures
    function detectRawBytes(u8) {
        if (!u8 || u8.length < 16) return '';
        // NES iNES ("NES\x1a") or FDS ("FDS\x1a")
        if ((u8[0] === 0x4e && u8[1] === 0x45 && u8[2] === 0x53 && u8[3] === 0x1a) ||
            (u8[0] === 0x46 && u8[1] === 0x44 && u8[2] === 0x53 && u8[3] === 0x1a)) return 'nes';
        // N64 big-endian / byte-swapped / little-endian magic
        if ((u8[0] === 0x80 && u8[1] === 0x37 && u8[2] === 0x12 && u8[3] === 0x40) ||
            (u8[0] === 0x37 && u8[1] === 0x80 && u8[2] === 0x40 && u8[3] === 0x12) ||
            (u8[0] === 0x40 && u8[1] === 0x12 && u8[2] === 0x37 && u8[3] === 0x80)) return 'n64';
        // GBA Nintendo logo at 0x04
        if (u8.length > 0xb0 && u8[4] === 0x24 && u8[5] === 0xff && u8[6] === 0xae && u8[7] === 0x51 && u8[0xb2] === 0x96) return 'gba';
        // NDS Nintendo logo at 0xC0
        if (u8.length > 0x160 && u8[0xc0] === 0x24 && u8[0xc1] === 0xff && u8[0xc2] === 0xae && u8[0xc3] === 0x51) return 'nds';
        // Mega Drive / Genesis "SEGA" at 0x100
        if (u8.length > 0x108 && u8[0x100] === 0x53 && u8[0x101] === 0x45 && u8[0x102] === 0x47 && u8[0x103] === 0x41) return 'segaMD';
        // Game Boy / Game Boy Color Nintendo logo at 0x104
        if (u8.length > 0x150 && u8[0x104] === 0xce && u8[0x105] === 0xed && u8[0x106] === 0x66 && u8[0x107] === 0x66) {
            return (u8[0x143] === 0x80 || u8[0x143] === 0xc0) ? 'gbc' : 'gb';
        }
        return '';
    }

    // inspects a downloaded ROM ArrayBuffer (.zip, .7z, or raw) + file path to automatically determine the system
    // returns a valid key of LIST, or 'invalid' if the buffer is an HTML error page
    function detectRom(buf, path) {
        var fromPath = path ? detect(path) : '';
        var validPathSys = (fromPath && fromPath !== 'auto' && LIST[fromPath]) ? fromPath : '';
        if (!buf || buf.byteLength < 16) return validPathSys || 'nes';
        var u8 = new Uint8Array(buf), view = new DataView(buf), len = u8.length;
        if (isHtmlPage(u8)) return 'invalid';

        // 1. ZIP archive (PK\x03\x04 or PK\x05\x06)
        if (u8[0] === 0x50 && u8[1] === 0x4b) {
            var names = [], i, nLen, xLen, cLen;
            // Scan Central Directory headers (PK\x01\x02) from end of file (up to last 256 KB)
            var cdStart = Math.max(0, len - 262144);
            for (i = cdStart; i <= len - 46; i++) {
                if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x01 && u8[i + 3] === 0x02) {
                    nLen = view.getUint16(i + 28, true);
                    xLen = view.getUint16(i + 30, true);
                    cLen = view.getUint16(i + 32, true);
                    if (i + 46 + nLen <= len) {
                        try { names.push(new TextDecoder().decode(u8.subarray(i + 46, i + 46 + nLen))); } catch (e) {}
                    }
                    i += 45 + nLen + xLen + cLen;
                }
            }
            // Also check Local File Headers (PK\x03\x04) in the first 256 KB
            var lfEnd = Math.min(len - 30, 262144);
            for (i = 0; i <= lfEnd; i++) {
                if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x03 && u8[i + 3] === 0x04) {
                    var method = view.getUint16(i + 8, true);
                    var compSize = view.getUint32(i + 18, true);
                    nLen = view.getUint16(i + 26, true);
                    xLen = view.getUint16(i + 28, true);
                    if (i + 30 + nLen <= len) {
                        try { names.push(new TextDecoder().decode(u8.subarray(i + 30, i + 30 + nLen))); } catch (e) {}
                    }
                    var dataOffset = i + 30 + nLen + xLen;
                    if (method === 0 && compSize >= 16 && dataOffset + 512 <= len) {
                        var rawSys = detectRawBytes(u8.subarray(dataOffset, dataOffset + 512));
                        if (rawSys) return rawSys;
                    }
                    if (compSize > 0 && compSize < 0xffffffff) i = dataOffset + compSize - 1;
                    else break;
                }
            }
            for (i = 0; i < names.length; i++) {
                var e = ext(names[i]);
                if (BY_EXT[e]) return BY_EXT[e];
            }
            if (validPathSys) return validPathSys;
            for (i = 0; i < names.length; i++) {
                var h = hint(names[i]);
                if (h) return h;
            }
            // Valid ZIP with ROM chip files (no console extension, e.g. mspacman.zip: pacman.6e, 5e, u5) -> Arcade (MAME / FBNeo)
            if (names.length > 0) return 'arcade';
        }

        // 2. 7z archive (37 7A BC AF 27 1C)
        if (u8[0] === 0x37 && u8[1] === 0x7a && u8[2] === 0xbc && u8[3] === 0xaf && u8[4] === 0x27 && u8[5] === 0x1c) {
            var tail = u8.subarray(Math.max(0, len - 16384), len);
            var ascii = '';
            for (var k = 0; k < tail.length; k++) {
                if (tail[k] >= 32 && tail[k] < 127) ascii += String.fromCharCode(tail[k]);
            }
            var m = /\.(nds|gba|sfc|smc|nes|n64|z64|v64|md|gen|smd|gbc|gb|sms|gg)\b/i.exec(ascii);
            if (m && BY_EXT[m[1].toLowerCase()]) return BY_EXT[m[1].toLowerCase()];
            if (validPathSys) return validPathSys;
            return len > 4 * 1024 * 1024 ? 'nds' : 'gba';
        }

        // 3. Raw uncompressed ROM bytes
        var raw = detectRawBytes(u8);
        if (raw) return raw;
        if (validPathSys) return validPathSys;
        if (ext(path) === 'bin') return 'segaMD';
        return 'nes';
    }

    // standard gamepad button index -> EmulatorJS index, by position (bottom face button = RetroPad B, right = A...)
    var PAD = [0, 8, 1, 9, 10, 11, 12, 13, 2, 3, 14, 15, 4, 5, 6, 7];

    return {
        LIST: LIST,
        get: function (id) { return LIST[id] || null; },
        detect: detect,
        detectZip: detectRom,
        detectRom: detectRom,
        ext: ext,
        isImage: function (path) { return !!IMAGE[ext(path)]; },
        padIndex: function (i) { return i < PAD.length ? PAD[i] : -1; }
    };
})();
