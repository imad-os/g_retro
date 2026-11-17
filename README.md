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

## Libraries: USB and Google Drive

Games are read only through My PC's own functions; there is no web address or GitHub repository to set up.
LB / RB switch between the two sources:

- **USB**: the USB drives plugged into the TV (`MyPC.usb`, TV only). Browse the folders and open a game.
- **Google Drive**: your whole Drive and "Shared with me" (`MyPC.drive`). Sign in once from the app (or in My PC,
  Control Panel > Google Drive). Files up to 200 MB.

A folder named after the system (`nes/`, `snes/`, `genesis/`, `gba/`...) or a known file extension tells Retro9 which
emulator to use. A source that My PC cannot offer (no USB drives on a phone) is hidden.

Set in the App Store Manager → Config (defaults are in `mypc-app.json`):

| Key | Default | What |
|---|---|---|
| `default_source` | `"usb"` | the source shown first: `"usb"` or `"drive"` |
| `autoload_last_save` | `"ask"` | `"ask"`, `true` (always continue) or `false` (always start fresh) |
| `systems_enabled` | `nes snes gb gbc gba segaMD segaMS segaGG` | add `n64`, `nds`, `arcade` to try the heavy systems (slow on TVs) |
| `emulator_cdn` | `https://cdn.emulatorjs.org/4.2.3/data/` | EmulatorJS files, pinned so an upstream update cannot break the TV app |
| `save_states` | `true` | `false` keeps only the games' own battery saves |

## Icon size

Settings (Select) > **Icon size**: Large (5 per row), Medium (7), Small (9, default), Tiny (11); on a phone 2 / 3 / 4 / 5.
Every game and folder icon has the same size.

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

- **My PC (per profile, synced by My PC like every app):** recently played, favourites, settings and every game's
  **battery save** (the game's own in-game save), compressed: a SNES battery save is about 20 bytes to a few KB.
  My PC keeps 64 KB per app and silently drops a save that goes over, so Retro9 lets go of the battery saves played
  longest ago before it gets there.
- **This device:** save states (auto-save on exit, quick save). A SNES state is about 80 KB even compressed, more than
  My PC's whole 64 KB, so states cannot go to My PC. They go to IndexedDB, or localStorage when IndexedDB is blocked
  inside My PC, and always stay in memory while Retro9 is open (save / load works in the session even on a device that
  keeps nothing; the toast says so).
- The game is saved when you leave it and every time My PC's pause menu opens (so quitting from that menu keeps it).

## How it is built

- `index.html` + `js/app.js`: the library screen and the My PC lifecycle (SDK loaded from imad-os.github.io).
- `js/player.js`: runs each game in a nested frame (`player.html`) and feeds it the controllers with
  `gameManager.simulateInput`. Leaving a game removes the frame, the only way to free EmulatorJS's memory.
- `player.html`: EmulatorJS with its own keyboard, gamepad, menus and touch pad turned off.
- `js/library.js`: the three library readers. Requests go through `MyPC.net.fetch`.
- Release: bump `version` in `mypc-app.json` and every `?v=` in `index.html` and `js/app.js` (`VERSION`).
