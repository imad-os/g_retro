/* Retro9: generated card art (no network): a plain card with the game's name and its system's label. */
var R9Art = (function () {
    'use strict';
    var cache = {};
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function lines(title) {
        var words = String(title).split(/\s+/), out = [], cur = '';
        for (var i = 0; i < words.length && out.length < 3; i++) {
            var next = cur ? cur + ' ' + words[i] : words[i];
            if (next.length > 14 && cur) { out.push(cur); cur = words[i]; } else cur = next;
        }
        if (cur && out.length < 3) out.push(cur);
        return out.map(function (l) { return l.length > 16 ? l.slice(0, 15) + '…' : l; });
    }
    function uri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

    function game(title, sysId) {
        var key = sysId + '|' + title;
        if (cache[key]) return cache[key];
        var sys = R9Systems.get(sysId) || { label: '?', color: '#555' }, ls = lines(title), y = 120 - (ls.length - 1) * 16, t = '';
        for (var i = 0; i < ls.length; i++) t += '<text x="120" y="' + (y + i * 32) + '" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">' + esc(ls[i]) + '</text>';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" font-family="Arial, sans-serif">' +
            '<rect width="240" height="240" rx="18" fill="' + sys.color + '"/>' +
            '<rect x="18" y="52" width="204" height="136" rx="10" fill="#000" fill-opacity="0.28"/>' + t +
            '<text x="120" y="222" font-size="20" font-weight="700" fill="#fff" fill-opacity="0.85" text-anchor="middle">' + esc(sys.label) + '</text></svg>';
        return (cache[key] = uri(svg));
    }
    var FOLDER = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#232a4d"/>' +
        '<path d="M44 70h56l16 18h80v94H44z" fill="#ffd23f"/><path d="M44 100h152v82H44z" fill="#ffb703"/></svg>');
    var RETRY = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#3b2335"/>' +
        '<path d="M120 60a60 60 0 1 0 58 44" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"/><path d="M150 40l40 22-38 26z" fill="#fff"/></svg>');
    return { game: game, FOLDER: FOLDER, RETRY: RETRY };
})();
