/* Retro9: emulator speed and visual settings, kept with MyPC.save ('settings'). They apply from the next game started.
 * Defaults are the light choices for 2024 TVs; each entry lists its values from the lightest. */
var R9Settings = (function () {
    'use strict';
    var LIST = [
        { key: 'scale',       values: [0.5, 0.75, 1],                                                       def: 0.5,        names: ['50%', '75%', '100%'] },
        { key: 'shader',      values: ['disabled', 'crt-easymode.glslp', 'crt-aperture.glslp', 'crt-geom.glslp'], def: 'disabled', names: ['vOff', 'shEasy', 'shAperture', 'shGeom'] },
        { key: 'fastForward', values: [false, true],                                                        def: false,      names: ['vOff', 'vOn'] },
        { key: 'rewind',      values: [false, true],                                                        def: false,      names: ['vOff', 'vOn'] },
        { key: 'latency',     values: [64, 128, 192, 256],                                                  def: 128,        names: ['64 ms', '128 ms', '192 ms', '256 ms'] },
        { key: 'audioSync',   values: [true, false],                                                        def: true,       names: ['vOn', 'vOff'] },
        { key: 'sound',       values: [true, false],                                                        def: true,       names: ['vOn', 'vOff'] },
        { key: 'vsync',       values: [true, false],                                                        def: true,       names: ['vOn', 'vOff'] },
        { key: 'webgl2',      values: [false, true],                                                        def: false,      names: ['vOff', 'vOn'] },
        { key: 'snesAudio',   values: ['none', 'linear', 'gaussian'],                                       def: 'linear',   names: ['snesNone', 'snesLinear', 'snesBest'] },
        { key: 'coreNES',     values: ['fceumm', 'nestopia'],                                               def: 'fceumm',   names: ['FCEUmm', 'Nestopia'] },
        { key: 'coreMD',      values: ['picodrive', 'genesis_plus_gx'],                                     def: 'picodrive', names: ['PicoDrive', 'Genesis Plus GX'] },
        { key: 'coreMS',      values: ['smsplus', 'picodrive', 'genesis_plus_gx'],                          def: 'smsplus',  names: ['SMS Plus', 'PicoDrive', 'Genesis Plus GX'] },
        { key: 'fps',         values: [false, true],                                                        def: false,      names: ['vOff', 'vOn'] }
    ];
    var cur = {};

    function reset() { LIST.forEach(function (s) { cur[s.key] = s.def; }); }
    reset();
    return {
        LIST: LIST,
        init: function () {
            var v = MyPC.load('settings', null);
            if (v && typeof v === 'object') LIST.forEach(function (s) { if (s.values.indexOf(v[s.key]) >= 0) cur[s.key] = v[s.key]; });
        },
        all: function () { var o = {}; for (var k in cur) o[k] = cur[k]; return o; },
        get: function (k) { return cur[k]; },
        // move a setting by one value (d = 1 or -1), wrapping around
        step: function (k, d) {
            var s = LIST.filter(function (x) { return x.key === k; })[0], i = s.values.indexOf(cur[k]);
            cur[k] = s.values[(i + d + s.values.length) % s.values.length];
            MyPC.save('settings', cur);
        },
        name: function (k) { var s = LIST.filter(function (x) { return x.key === k; })[0]; return s.names[s.values.indexOf(cur[k])]; },
        reset: function () { reset(); MyPC.save('settings', cur); }
    };
})();
