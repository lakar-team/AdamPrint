# 3DPrint

Standalone repo for Adam's 3D-printing web tools for the **FlashForge
Adventurer 5M**. Static site on Cloudflare Pages, its own repo/site (not inside
`lifeApp`), with a thin ADAMTOOL `public/apps/3dprint/` entry planned later —
same split as [[pdf-to-dxf]]. Repo: github.com/lakar-team/3DPrint.

For full context see [[3dprint]] in the wiki — check before non-trivial work.

## Operational constraints

- **`main` is production.** Cloudflare Pages deploys from `main` (Framework
  preset None, no build command, output dir `public/`). Don't push
  half-finished work to `main` — it publishes to the live site.
- **All tools are client-side.** Anything that must reach the physical
  printer or webcam on the LAN (send / pause / stop / live monitor) cannot run
  from the public HTTPS page (mixed-content + Private-Network-Access blocks) —
  it needs a separate local bridge or a companion Worker. Keep that out of the
  Pages static build.
- **Local dev:** `launch.bat` serves `public/` locally; `LocalGitRepo/` is the
  local Git Studio time-machine (gitignored, never deployed).

## Code changes — fix root causes, not symptoms

Drive-wide rule (see root `CLAUDE.md`): prefer a structural fix over a symptom
patch, and say so explicitly if a quick patch really is the right call.

<!-- wiki-chain
id: 3dprint-claude
status: New standalone 3D-printing tool set for the FlashForge Adventurer 5M — Cloudflare Pages, own repo github.com/lakar-team/3DPrint, output dir public/. Client-side only (filament/G-code/model calculators, viewers, parametric generators); live-printer control deferred to a later local bridge/Worker. Scaffolded 2026-08-12; thin ADAMTOOL public/apps/3dprint/ entry planned (pdf-to-dxf split).
updated: 2026-08-12
links: [3dprint, ai-platforms-claude, adamtool, pdf-to-dxf]
-->
