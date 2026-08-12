# AdamPrint — Print Runbook (working notes, not rules)

> Soft doc, same spirit as `../DESIGN-NOTES.md`. This is *roughly how "print
> this design" happens today*, written so it can be executed and improved.
> Change anything a better idea — or the real printer — contradicts.

## The pipeline

```
find  →  manage  →  slice  →  send
```

1. **Find / make the model** — download an STL/3MF into the local library, or
   generate one.
2. **Manage** — models live in `library\`, sliced output in `sliced\`. This
   workspace is on the **C: drive, off Google Drive**, so big files don't sync:
   - `G:\My Drive\Art\3d Print\library\`  (models)
   - `G:\My Drive\Art\3d Print\sliced\`   (print-ready G-code)
   - `G:\My Drive\Art\3d Print\profiles\` (slicer profiles)

   (This is *your* data folder — set per-user in the console; the build/code
   lives separately under `G:\My Drive\AI Platforms\AdamPrint`. Never mix them,
   and nothing lives on C:.)
3. **Slice** — turn the model into 5M-ready G-code with Orca-Flashforge
   (Adventurer 5M machine + PETG/PLA filament + process). Output → `sliced\`.
   **Use the GUI for this right now** (dropdowns resolve printer/filament/process
   correctly). See the slicing note below.
4. **Send** — push the G-code to the printer with `send.js`.

## Ready now (before the printer arrives)

- Workspace + a test model: `library\calibration-cube-20mm.stl`.
- `send.js` — the Moonraker upload/start path (Node built-ins, no installs).
- Orca-Flashforge installed, with the Adventurer 5M + PETG/PLA/ABS/ASA profiles.

## Slicing status (honest, 2026-08-12)

- The slicer is installed and its **geometry** slicing via CLI works (correct
  bed size, layer count, start G-code).
- **Known snag:** driving the CLI headlessly does **not** apply the *filament*
  profile in this build — every CLI slice falls back to a PLA-ish default
  (~200°C nozzle), regardless of the material requested. So headless CLI slicing
  is **not material-safe yet** and isn't used.
- **For real prints, slice in the Orca-Flashforge GUI** — pick printer
  (Adventurer 5M 0.4), filament (e.g. PETG), and quality from the dropdowns;
  it resolves everything correctly. Export the G-code to `sliced\`, then `send.js`.
- Fully-headless CLI slicing is a later refinement, best cracked (and validated
  on real prints) once the printer is here. See `../DESIGN-NOTES.md`.

## On arrival — one-time setup (~15 min)

1. Power on the 5M, join it to Wi-Fi, and note its **IP** (printer screen →
   network settings).
2. Choose the control path:
   - **Moonraker (recommended):** root the 5M to expose Moonraker on port 7125.
     Documented, reliable, and unlocks the full API + future monitoring.
   - **Stock LAN (no root):** the built-in networking on port 8899 — less
     documented; `send.js`'s stock path still needs confirming on the real unit.
3. Copy `config.example.json` → `config.json`; set `printerIp` (and `mode`).
4. Smoke test:
   ```
   node agent/send.js "G:\My Drive\Art\3d Print\sliced\<file>.gcode"
   ```
   Add `--start` when you actually want it to begin printing.

## "Print this design" (once set up)

Just tell me the design. I will:
1. **find/generate** the STL → `library\`
2. **slice** it for the 5M + your filament → `sliced\`
3. **send** it with `send.js` (and `--start` if you say go).

## Notes / open bits

- First real print should be the **calibration cube** (or a Benchy) — confirm
  dimensions and bed adhesion before anything ambitious.
- The stock-8899 sender is **unproven on the 5M**; Moonraker is the safe bet.
- For now this is *me-as-operator* running the steps. Later it becomes the
  installed agent + site (see `../DESIGN-NOTES.md`).
