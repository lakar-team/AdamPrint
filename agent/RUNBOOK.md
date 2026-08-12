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
   - `C:\Users\adamm\AdamPrint\library\`  (models)
   - `C:\Users\adamm\AdamPrint\sliced\`   (print-ready G-code)
   - `C:\Users\adamm\AdamPrint\profiles\` (slicer profiles)
3. **Slice** — turn the model into 5M-ready G-code with Orca-Flashforge
   (Adventurer 5M machine profile, PETG or PLA filament profile). Output → `sliced\`.
4. **Send** — push the G-code to the printer with `send.js`.

## Ready now (before the printer arrives)

- Workspace + a test model: `library\calibration-cube-20mm.stl`.
- `send.js` — the Moonraker upload/start path (Node built-ins, no installs).
- Orca-Flashforge slicer (installing / installed) with the 5M profile.

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
   node agent/send.js "C:\Users\adamm\AdamPrint\sliced\<file>.gcode"
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
