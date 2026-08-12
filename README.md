# 3DPrint

Web tools for 3D printing with the **FlashForge Adventurer 5M** — filament &
print calculators, G-code / model analysis and viewers, and parametric model
generation. All client-side, no build step (pure HTML/CSS/JS).

- **Live:** Cloudflare Pages (deploys from `main`).
- **Repo:** github.com/lakar-team/3DPrint
- **Output dir:** `public/` (Framework preset: None, no build command)

## Structure

```
3DPrint/
├── public/          ← the static site Cloudflare serves (index.html + assets)
├── LocalGitRepo/     ← local Git Studio time-machine (gitignored, not deployed)
├── CLAUDE.md         ← project context + wiki-chain node
└── launch.bat        ← local preview of public/
```

## Scope note

Anything that must reach the physical printer or webcam on the local network
(send a job, pause/stop, live monitoring) can **not** run from the public HTTPS
page — it needs a separate local bridge or a companion Cloudflare Worker, added
later. The Pages site stays purely client-side.
