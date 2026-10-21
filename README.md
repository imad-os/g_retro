# Retro9

A retro game library browser and player for **My PC** (Samsung Smart TVs 2024+, browsers, phones), built on
[EmulatorJS](https://emulatorjs.org). It is made for a **game controller or the My PC phone controller**.

Site: `https://imad-os.github.io/g_retro/` (paste it into the App Store Manager, https://imad-os.github.io/g/installer/).

## Controls

| Where | Control | Does |
|---|---|---|
| Library | D-pad / left stick | move |
| | bottom face button (Xbox A, PlayStation Cross, phone B) | open folder / play |
| | right face button (Xbox B, PlayStation Circle, phone A) | up one folder |
| | left face button (X) or Start | options: play, continue, quick save, favourite, delete saves |
| | top face button (Y) | favourite on / off |
| | Select (or My PC's menu > Settings) | speed settings |
| | LB / RB | switch library |
| In a game | every button, both triggers, both sticks | the emulated pad (up to 4 controllers, one player each) |
| | hold Start + Select 1 s (or the TV remote's Back) | My PC's pause menu: Save state, Load state, Press Start, Press Select, Restart game, Exit to library |

## Libraries (app config)

Set in the App Store Manager → Config (defaults are in `mypc-app.json`):

| Key | Default | What |
|---|---|---|
| `repos` | `[{ "name": "My ROMs", "url": "https://f2cfpkjp8z-alt.github.io/emulatorjs_rom_test/" }]` | libraries, switched with LB / RB |
| `default_repo` | `0` | the library shown first (index in `repos`) |
| `autoload_last_save` | `"ask"` | `"ask"`, `true` (always continue) or `false` (always start fresh) |
| `systems_enabled` | `nes snes gb gbc gba segaMD segaMS segaGG` | add `n64`, `nds`, `arcade` to try the heavy systems (slow on TVs) |
| `emulator_cdn` | `https://cdn.emulatorjs.org/4.2.3/data/` | EmulatorJS files, pinned so an upstream update cannot break the TV app |
| `save_states` | `true` | `false` keeps only the games' own battery saves |

A library address is read in this order:

1. a game list `roms.json` (or `index.json`, `manifest.json`) at the address, or the address itself if it ends in `.json`
2. a GitHub repository: `https://github.com/owner/repo` or its GitHub Pages site `https://owner.github.io/repo/`
   (the whole tree in one request; files are downloaded from the Pages site or raw.githubusercontent.com)
3. an HTML page of links (a web server that lists its folders)

GitHub Pages never lists folders, so a game list is the most reliable. Make one with
`node tools/make-roms-json.mjs <library folder>`:

```json
{ "name": "My ROMs", "games": [
  { "file": "snes/Some Game.sfc", "name": "Some Game", "art": "snes/Some Game.png" },
  { "file": "genesis/Other.bin", "system": "segaMD" }
] }
```

Folders come from the paths. `system` is only needed when the extension does not say it (`.bin`, `.zip`), and a folder
named after the system (`genesis/`, `snes/`, `gba/`...) also says it. A picture with the same name, or in a `boxart/`,
`covers/` or `images/` folder next to the game, becomes its art; otherwise a card is drawn.

## Speed settings

Select in the library opens them; they are kept per My PC profile and apply to the next game started.

| Setting | Values (lightest first, default in bold) | What it changes |
|---|---|---|
| Picture size | **50%**, 75%, 100% | how many pixels the emulator draws before it is stretched to the screen |
| Audio buffer | 64, **128**, 192, 256 ms | RetroArch `audio_latency`: bigger = fewer crackles, a little more delay |
| Sync to audio | **on**, off | RetroArch `audio_sync`: off lets the picture run free of the sound |
| Sound | **on**, off | RetroArch `audio_enable`: off saves the sound work entirely |
| VSync | **on**, off | EmulatorJS `vsync` |
| WebGL 2 | **off**, on | EmulatorJS picks the WebGL 1 (legacy) or WebGL 2 build of the core |
| SNES sound filter | off, **light**, best | snes9x `snes9x_audio_interpolation` (none / linear / gaussian) |
| NES, Mega Drive, Master System emulator | **FCEUmm** / Nestopia, **PicoDrive** / Genesis Plus GX, **SMS Plus** / PicoDrive / Genesis Plus GX | the core used |
| Show FPS | **off**, on | the frame rate in a corner, to compare settings |

Not possible here: threaded cores (they need COOP/COEP headers, which GitHub Pages cannot send), another SNES core
(EmulatorJS only ships snes9x) and frame skip (this snes9x build has no such option).

## Saves

- Recently played and favourites: `MyPC.save` (per My PC profile, backed up by My PC).
- Battery saves and save states: IndexedDB on this site, keyed by My PC profile. They are too big for `MyPC.save`
  (64 KB per app), so they stay on the device and are not backed up.
- The game is saved when you leave it and every time My PC's pause menu opens (so quitting from that menu keeps it).

## How it is built

- `index.html` + `js/app.js`: the library screen and the My PC lifecycle (SDK loaded from imad-os.github.io).
- `js/player.js`: runs each game in a nested frame (`player.html`) and feeds it the controllers with
  `gameManager.simulateInput`. Leaving a game removes the frame, the only way to free EmulatorJS's memory.
- `player.html`: EmulatorJS with its own keyboard, gamepad, menus and touch pad turned off.
- `js/library.js`: the three library readers. Requests go through `MyPC.net.fetch`.
- Release: bump `version` in `mypc-app.json` and every `?v=` in `index.html` and `js/app.js` (`VERSION`).
