# Retro9 — Dev Server Fix, Navigator Icons, .zip ROM Support & EmulatorJS Menu

Fixes the missing development server configuration so the application serves immediately on port `3000`, while unifying directory and file navigator icons into fixed-size cards, adding smart `.zip` ROM detection with an interactive system selector fallback, exposing the native EmulatorJS settings overlay from the My PC menu, and resolving layout and storage bugs in full compliance with the My PC SDK specification.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Why the Dev Server Didn't Start**: The imported repository is a static GitHub Pages project with no `package.json` or port `3000` server configured, and Planning Mode blocks code/server changes until you click **Proceed**. As soon as you approve this plan (**Proceed**), the port `3000` dev server will be configured and started alongside all requested features.

- **Confirmed Decision 0 — Dev Server Startup Fix (Port 3000)**: Configure a zero-build static web server on `0.0.0.0:3000` so the live preview runs immediately in AI Studio while keeping all root files (`index.html`, `player.html`, `mypc-app.json`, `css/`, `js/`) 100% compatible with GitHub Pages and My PC.
- **Confirmed Decision 1 — Uniform File & Folder Navigator Icons**: All game files in the directory and file navigator use a fixed-size ROM file/cartridge SVG icon matching the exact dimensions, proportions, and container behavior of the folder icon (`1:1` aspect frame with centered fixed-scale icon), plus CSS grid `min-width: 0` protection so long filenames never stretch columns.
- **Confirmed Decision 2 — Smart `.zip` ROM Support**: `.zip` (and `.7z` / `.bin`) archives are always listed in the navigator even when placed outside system-named folders. Retro9 auto-detects the console system from folder hints, double extensions (e.g., `.nes.zip`, `.sfc.zip`), or by inspecting the ZIP header directory when downloaded; if the system remains ambiguous (such as an unmarked `.zip` or Arcade ROM), Retro9 prompts the player with a controller-navigable system picker dialog before booting.
- **Confirmed Decision 3 — EmulatorJS Native Settings in My PC Menu**: Adds `"EmulatorJS"` to the My PC menu during gameplay (keeping within the My PC SDK's 6-item `MyPC.setMenu` limit), which opens and focuses EmulatorJS's built-in settings modal (`.ejs_settings_parent` / `EJS_Buttons.settings`) so players can adjust core options, shaders, and controls live.
- **Confirmed Decision 4 — Expanded Systems & Performance/Shader Options**: Enables **Arcade**, **N64**, and **Nintendo DS** by default alongside the 8 classic consoles, and adds **CRT Shader**, **Fast-Forward**, and **Rewind** options to the Retro9 Settings dialog.

---

## 1. Overview & Core Concept

- **What It Does**: Retro9 lets players browse remote or local ROM libraries on a TV, phone, or browser using a game controller or TV remote, and play classic console and arcade games powered by EmulatorJS with cloud-synced battery saves (`MyPC.save`) and local save states.
- **Target Audience / Persona**: Living-room TV and couch-gaming players on My PC using Xbox, PlayStation, Switch Pro, 8BitDo, phone controllers, or TV remotes.
- **Key Value**: Restores the live preview dev server on port `3000`, delivers a consistent directory navigator where folders and ROM files share uniform iconography, adds seamless `.zip` ROM compatibility regardless of folder naming, and provides direct access to both Retro9's lightweight TV settings and EmulatorJS's built-in settings menu.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Directory & File Navigation**: Players browse library folders and ROM files in a 5-column (landscape) or 2-column (portrait) grid. Both folders and ROM files render with fixed-size, high-contrast vector icons inside a locked `1:1` art frame, with single-line truncated titles and subtle system labels below.
  2. **Launching `.zip` ROMs**: Selecting a `.zip` file downloads the archive via `MyPC.net`. If the target system wasn't already known from the folder or filename, Retro9 inspects the zip's internal filenames (e.g., `.nes`, `.sfc`, `.gba`, `.md`, `.z64`, `.nds`) to pick the right core automatically. If the zip contains arcade ROMs or raw binaries without a clear extension, a controller-friendly dialog asks the player which system to boot.
  3. **Triggering EmulatorJS Settings from My PC Menu**: While playing a game, opening the My PC pause menu (Hold Start + Select or press Back) displays `"EmulatorJS"` alongside `"Save state"`, `"Load state"`, `"Press Start"`, `"Restart game"`, and `"Exit to library"`. Selecting `"EmulatorJS"` resumes the player view and opens EmulatorJS's built-in settings modal.
  4. **Configuring Shaders, Rewind & Fast-Forward**: Pressing `Select` (or choosing `"Settings"` in the My PC menu from the library) opens the compact settings dialog where Left/Right steps through Picture Size, CRT Shader (`Off`, `CRT Easymode`, `CRT Aperture`, `CRT Geom`), Fast-Forward (`Off`, `On`), Rewind (`Off`, `On`), Audio Buffer, VSync, WebGL 2, and Core selection.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Purpose-built 10-foot TV console interface — zero blur, zero heavy shadows, compositor-only `transform` transitions (`scale(1.05)` in `120ms`) for 60fps performance on Tizen 8 / Chromium 108 TVs.
  - *Color Palette & Mood*:
    - **60% Dominant Canvas**: Deep midnight navy (`#10132a`).
    - **30% Structural Surfaces**: Slate indigo card surfaces (`#1e2447`) and icon wells (`#232a4d`) with muted periwinkle metadata (`#b9bfe6`).
    - **10% Focal Accent**: High-visibility arcade gold (`#ffd23f`) for focus outlines, folder highlights, and active dialog rows, paired with coral brand mark (`#ff5d73`).
  - *Typography & Hierarchy*: Clean system sans-serif sized in viewport-height units (`vh`) for consistent legibility across 720p, 1080p, and 4K TVs, with strict single-line ellipsis truncation and RTL support for Arabic.
- **Interactive Feedback & Motion**:
  - Immediate focus ring and `scale(1.05)` transform on D-pad movement.
  - Screen-reader / TV Voice Guide announcements via `MyPC.announce` on every focus change, folder load, setting step, and toast notification.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 0: Lightweight Static Dev Server on Port 3000**
  - *Chosen Approach*: Configure `package.json` with a zero-transpile static server on `0.0.0.0:3000` (`vite` or Node static server) and `.gitignore` `node_modules` so local preview works immediately while GitHub Pages continues serving the root static files untouched.
  - *Why*: Fixes the "dev server didn't start" issue in AI Studio without introducing any build step that would violate the My PC static deployment model.
- **Decision 1: Uniform Fixed-Size File Icons Matching Folder Icons**
  - *Chosen Approach*: Use a crisp, fixed-size file/cartridge SVG icon constructed on the exact same `240x240` viewBox and inner geometry (`44..196` bounds) as `R9Art.FOLDER` for all ROM files in the directory and file navigator, and enforce `min-width: 0` and fixed icon sizing in CSS.
  - *Why*: Ensures every item in the directory and file navigator has an identical visual footprint and icon scale, preventing layout shifts or mismatched card proportions.
  - *Alternatives Considered*: Rendering full-bleed scraped covers or multi-line SVG text banners, which created visual inconsistency next to folder icons.
- **Decision 2: Two-Stage `.zip` ROM Detection (Header Inspection + Dialog Fallback)**
  - *Chosen Approach*: Allow all `.zip`, `.7z`, and `.bin` files into the library listing (using `auto` when no folder/filename hint exists). At launch, once the `.zip` buffer is fetched, scan its ZIP local file headers (`0x04034b50`) for inner file extensions (e.g., `.smc`, `.nes`, `.gba`, `.md`, `.nds`). If no inner extension matches (e.g., MAME/FBNeo arcade sets) or the file is >32 MB, prompt the user with a system selection dialog and remember their choice for that ROM URL.
  - *Why*: Works seamlessly for both single-ROM console zips and multi-rom Arcade zips without requiring users to reorganize their folders.
- **Decision 3: Exposing EmulatorJS Built-in Settings Without Breaking My PC's 6-Item Menu Cap**
  - *Chosen Approach*: Keep `GAME_MENU` at 6 items (`Save state`, `Load state`, `EmulatorJS`, `Press Start`, `Restart game`, `Exit to library`) to respect the My PC SDK `setMenu` maximum of 6 items. In the player frame, keep the bottom toolbar hidden during normal play, but allow `.ejs_settings_parent` / `.ejs_popup_container` to display cleanly on top of the canvas when triggered via `R9P.openSettings()`.
  - *Why*: Respects the My PC SDK contract (`up to 6 extra pause-menu items`) and avoids cluttering the game screen while making EmulatorJS's native settings menu fully accessible.
- **Decision 4: Bug Fixes Found During Audit**
  - *Chosen Approach*:
    1. Fix `.card` grid overflow by adding `min-width: 0` and explicit fixed icon dimensions inside `.art`.
    2. Fix `R9Saves` IndexedDB `idb()` timeout timer leak and rejected-promise caching so transient IndexedDB blocks recover cleanly.
    3. Fix initial focus selection in `render()` so opening the root library focuses the first available section naturally instead of defaulting to `s: 99`.
    4. Fix `make-roms-json.mjs` so root-level `.zip` files are also indexed into `roms.json`.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        My PC Host / Standalone SDK                      │
│   MyPC.init · MyPC.setMenu · MyPC.gamepad · MyPC.net · MyPC.save/load   │
└───────────────────┬─────────────────────────────────────┬───────────────┘
                    │ Lifecycle / Input / Menu            │ Fetch / Storage
                    ▼                                     ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────┐
│         Navigator & App Shell          │   │   Library & Save Manager    │
│  • Header Tabs & Breadcrumb           │   │  • Manifest / GitHub / HTML │
│  • Fixed-Size Folder & File Icon Grid │◄──┤  • .zip Extension & Header  │
│  • Retro9 Settings & System Picker    │   │    Inspector + System Cache │
│  • 4-Language i18n (EN, FR, ES, AR)   │   │  • Cloud SRAM + IDB States  │
└───────────────────┬───────────────────┘   └─────────────────────────────┘
                    │ R9Player.start / openSettings
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Nested Player Frame (player.html)                   │
│  • R9P Bridge: boot(), input(), snapshot(), openSettings(), kill()      │
│  • EmulatorJS 4.2.3 Loader + RetroArch Config Patcher                   │
│  • Native EmulatorJS Settings Modal (.ejs_settings_parent) Toggle       │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Game Entry**: `{ name, url, art, system, path, dir }` where `system` can be a known system ID (`nes`, `snes`, `gb`, `gbc`, `gba`, `segaMD`, `segaMS`, `segaGG`, `n64`, `nds`, `arcade`) or `'auto'` for `.zip`/`.7z`/`.bin` files awaiting inspection or user selection.
  - **Settings Store (`MyPC.save('settings', cur)`)**: Persists `scale`, `shader` (`disabled`, `crt-easymode.glslp`, `crt-aperture.glslp`, `crt-geom.glslp`), `fastForward` (`disabled`, `enabled`), `rewind` (`disabled`, `enabled`), `latency`, `audioSync`, `sound`, `vsync`, `webgl2`, `snesAudio`, `coreNES`, `coreMD`, `coreMS`, and `fps`.
- **Interactive Component & State Mapping**:
  - **Navigator Cards**: Rendering a folder or game file creates a `.card` with a `.art` container holding the fixed-size `R9Art.FOLDER` or `R9Art.FILE` icon SVG.
  - **`.zip` Launch Flow**:
    1. If `g.system === 'auto'`, `R9Systems.detectFromFilename(g.path)` checks for secondary extensions or bracket tags (e.g. `(NES)`, `[SNES]`, `.gba.zip`).
    2. After downloading the ArrayBuffer, if still `'auto'`, `R9Systems.detectZipBuffer(data)` parses the ZIP local file headers to match inner ROM extensions.
    3. If still unresolved, `showDialog` presents enabled systems (Arcade, NES, SNES, GBA, Mega Drive, N64, DS, etc.) for the user to pick, then proceeds directly to `R9Player.start`.
  - **EmulatorJS Menu Trigger**:
    1. Selecting `"EmulatorJS"` in the My PC menu calls `R9Player.openSettings()`.
    2. Inside `player.html`, `R9P.openSettings()` enables the settings popup visibility and clicks the EmulatorJS `.ejs_settings_button` (or toggles `.ejs_settings_parent`), allowing full interaction with EmulatorJS's built-in settings menu.
- **Version & Cache Busting**:
  - Bump `version` in `mypc-app.json`, `VERSION` in `js/app.js`, and all `?v=` query strings in `index.html` from `0.3.0` to `0.4.0` per Section 10 & 11 of the My PC Guide.
