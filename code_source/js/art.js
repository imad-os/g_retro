/* Retro9: uniform fixed-size navigator icons (no network): every file icon matches the folder icon size and frame. */
var R9Art = (function () {
    'use strict';
    function uri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

    var FOLDER = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#232a4d"/>' +
        '<path d="M44 70h56l16 18h80v94H44z" fill="#ffd23f"/><path d="M44 100h152v82H44z" fill="#ffb703"/></svg>');

    // Fixed-size ROM file icon built on the exact same 240x240 frame and 44..196 / 70..182 bounds as FOLDER
    var FILE = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#232a4d"/>' +
        '<path d="M56 64h96l32 32v86H56z" fill="#5c7cfa"/><path d="M152 64v32h32z" fill="#91a7ff"/>' +
        '<rect x="76" y="108" width="88" height="44" rx="6" fill="#232a4d" fill-opacity="0.45"/>' +
        '<rect x="84" y="162" width="16" height="14" rx="2" fill="#ffd23f"/>' +
        '<rect x="112" y="162" width="16" height="14" rx="2" fill="#ffd23f"/>' +
        '<rect x="140" y="162" width="16" height="14" rx="2" fill="#ffd23f"/></svg>');

    var RETRY = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="18" fill="#3b2335"/>' +
        '<path d="M120 60a60 60 0 1 0 58 44" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"/><path d="M150 40l40 22-38 26z" fill="#fff"/></svg>');

    function game() {
        return FILE;
    }

    return { game: game, FILE: FILE, FOLDER: FOLDER, RETRY: RETRY };
})();
