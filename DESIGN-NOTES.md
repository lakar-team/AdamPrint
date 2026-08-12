# AdamPrint — Design Notes & Data-Flow (working preferences, not rules)

> **How to read this doc.** Everything here is *current thinking and preference*,
> not law. It's meant to give a builder (human or AI) a running start and a
> shared vocabulary — not to box anyone in. Where it says "lean", "probably",
> "a good starting point", that softness is deliberate: if a better idea shows
> up while building, take it and update this file. Please don't treat "prefer"
> as "must", and don't get stuck defending a choice here that reality has
> outgrown. Names, message shapes, and command lists especially are meant to be
> revised freely. The only things worth holding onto firmly are the couple of
> items flagged **(safety-leaning)** — and even those are open to a better way
> of achieving the same protection.

## The idea in one line

AdamPrint is a set of 3D-printing tools for the FlashForge Adventurer 5M (and
eventually any printer). The **site is the brain and the router**; a **thin
local installer is just "hands"** that let the site reach things a browser
can't — local model files and the printer on the home LAN. "Dumb client, smart
cloud."

## Roles (the mental model I'm leaning on)

- **Browser** — where the user actually works; it's the site's UI. Holds no
  authority of its own; it asks the hub for things.
- **Cloud hub (the site)** — the router + registry + auth. Decides, coordinates,
  and passes messages between the browser and the right agent. Source of truth.
- **Agent (the installer)** — thin local proxy on the user's PC. Exposes local
  capabilities (files, slicing, the printer) and does what the hub relays. Tries
  to keep as little of its own logic as possible, so it can stay small and be
  updated from the server side without reinstalling.
- **Printer** — FlashForge 5M, reached over the LAN (Moonraker preferred; the
  stock FlashForge protocol on port 8899 is a fine no-root fallback).

## How they connect (transport leanings)

- **Browser ↔ hub:** a WebSocket over TLS for live control, carrying the user's
  logged-in session. Plain HTTPS is fine for one-off requests.
- **Agent ↔ hub:** the agent **dials out** to the hub over WSS and keeps that
  connection open. This is the whole trick for getting past home NAT/firewalls —
  nothing ever connects *in* to the printer.
- **Webcam/video:** strong preference to keep this **browser ↔ agent
  peer-to-peer (WebRTC)**, with the hub only helping them find each other.
  Routing video through the hub would get expensive fast, so I'd avoid it unless
  there's a compelling reason.

## Message envelope (a starting shape, very much editable)

A simple, self-describing envelope has felt right so far. Treat field names as
suggestions:

```json
{
  "id": "req_01H...",         // correlate requests with their replies
  "type": "command|event|reply",
  "action": "print.start",     // dotted names read nicely; group by area
  "printer": "prn_abc",        // which printer/agent this concerns
  "payload": { },              // action-specific data
  "ts": 1700000000000          // pass timestamps in; don't generate blindly
}
```

Replies would echo the `id`. That's about it — resist over-formalizing early.

## Command vocabulary (a reasonable first set — add/rename freely)

Browser → (hub) → agent:

- `files.list`, `files.meta`, `files.delete` — the local model library.
- `slice.run` — turn an STL/3MF into G-code with a chosen profile.
- `job.upload`, `job.start`, `job.pause`, `job.resume`, `job.cancel`.
- `printer.status`, `printer.temps` — and later `printer.setTemp`,
  `printer.home`, `printer.move` if hands-on control is wanted.

None of these are sacred; they're just a vocabulary to start speaking in.

## Telemetry / events (agent → hub → browser)

- `printer.status` snapshots, `printer.temps` updates, `job.progress`,
  `job.done`, `job.error`.
- `agent.online` / `agent.offline`, `files.changed`.

Preference: push these as they happen over the open socket rather than making
the browser poll, but polling is an acceptable simplification early on.

## Pairing (how an agent binds to an account)

A flow that seems friendly for non-technical users:

1. User signs in on the site, clicks "Add printer".
2. Hub shows a short-lived **pairing code**.
3. User runs the agent and enters the code (or the agent pops a browser to
   confirm).
4. Agent trades the code for a long-lived **agent token** bound to that account,
   and the hub records it in the registry.

Other approaches are fine; this is just the one I'd try first.

## Auth (leanings — the two **(safety-leaning)** bits)

- Browser carries the user's **session** (Supabase Auth token feels natural
  since ADAMTOOL already uses Supabase).
- Agent carries its **own token**, scoped to that account's printer(s).
- **(safety-leaning)** The hub would ideally only ever route between a browser
  and an agent that belong to the **same account** — cross-account routing is
  the thing most worth preventing. Open to any mechanism that guarantees this.
- **(safety-leaning)** Keep the printer off the public internet entirely; the
  outbound-agent design already gives us that for free, and it's worth keeping.

## Data & preferences (the local-first split)

- **Model/G-code files** stay on the user's PC, at a **folder they choose** in
  the agent's settings. The cloud holds only lightweight *metadata* (names,
  history, small thumbnails) — never the big files. This is the main cost/strain
  saver and worth protecting.
- **Preferences** (units, default filament, favorite printers, chosen folder)
  live locally, and the non-sensitive ones can **sync to the cloud tied to the
  login** so settings follow the user across machines.

## Where the pieces would probably live (tech leanings, all swappable)

- **Frontend:** Cloudflare Pages (already running as `adamprint.pages.dev`).
- **Router/relay:** a Cloudflare Worker + Durable Object (one DO per printer/
  session feels like a natural home for the live connection).
- **Auth + registry:** Supabase (reusing the ADAMTOOL setup).
- **Installer/agent:** leaning Tauri (small, reuses the web UI, native file &
  config access); Electron is the heavier all-JS fallback. Slicing could be a
  bundled headless engine (CuraEngine / PrusaSlicer console) so users install
  nothing extra.
- **Printer link:** Moonraker (after rooting the 5M) preferred; stock FlashForge
  LAN protocol (port 8899) as a no-root first step.

## Slicing engine (leaning CuraEngine, embedded — not home-grown)

Writing a slicing engine from scratch isn't worth it — it's one of the hardest
parts of the whole domain, and mature engines have a decade-plus head start.
The lean is to **embed CuraEngine**: it's headless-first (unlike Orca's
GUI-with-a-CLI-bolted-on, which wouldn't apply filament settings for us) and it
**compiles to WASM**, so the *same* engine can run in the browser (site-side),
in a Worker (server-side, for agents that have no browser), and in the desktop
agent. One engine, three homes — this is what makes both "use the site" and
"MCP for agents" work off shared code.

Open bits: we'd build/port an Adventurer 5M definition + PETG/PLA profiles for
CuraEngine (Orca already ships these — port the start/end G-code, temps,
retraction). And **licensing**: CuraEngine is AGPL, which for a commercial SaaS
implies a source-availability obligation over the network — worth deciding
early. Orca (GUI) is a fine stopgap until this lands.

## MCP-friendly / API-first (so agents can use the site)

Preference: build each capability as a clean **tool-function** with a typed
input/output — `find_model`, `slice`, `estimate_cost`, `list_printers`,
`printer_status`, `send_print`, `pause`/`resume`/`cancel`, `list_files`. Then
expose those *same* functions through several front doors:

- the **web UI** (humans on the site),
- a plain **JSON API**,
- an **MCP server** (agents) — the hub Worker is a natural home; Cloudflare
  supports remote MCP on Workers, with OAuth.

They're thin adapters over one core, so a human clicking "Slice" and an agent
calling the `slice` MCP tool run the same code. Because agents have no browser,
anything an agent must do server-side (like slicing) wants a server-side path
too — CuraEngine-WASM in the Worker mirrors the browser build and covers it.

- Auth: MCP's OAuth → a user account → tools scoped to that user's printers/
  files (reuse the Supabase identity).
- **(safety-leaning)** Tools that move the physical machine (send/start/stop)
  want auth + guardrails so a confused or runaway agent can't burn filament or
  damage the printer — same-account-only, plus sensible rate/confirmation limits.
- Caveat: heavy slices may exceed a Worker's CPU/memory budget; big jobs might
  need offloading (a queue/container) or pushing to the agent. Keep the tool
  interface stable regardless of where the compute actually runs.

## Build order I'd suggest (so effort matches what's testable)

1. **Now:** browser-only tools (calculators, G-code analyzer, viewers) — real
   value, zero infra. And keep this doc current.
2. **When the printer arrives:** prove a thin agent ↔ Moonraker on the LAN, no
   hub yet (even browser↔localhost is fine to start). This is where the real
   message list gets learned.
3. **Then:** stand up the hub (Worker + DO + Supabase) and point the thin agent
   at it — the routed design above.
4. **After that:** monitoring (WebRTC webcam + failure alerts), print queue,
   filament tracking.

## Genuinely open (don't over-commit here)

- Exact message/envelope shape and command names — expect these to change once
  a real printer is talking.
- Whether to ever add a **hybrid** local-fast path (direct localhost when the
  browser and agent are on the same LAN) for offline/low-latency use, versus
  staying purely cloud-routed. Cloud-routed is simpler; hybrid is a later
  optimization if the site-dependency ever chafes.
- Tauri vs Electron; Moonraker vs FlashForge protocol.
- How much the agent caches/knows when the hub is unreachable.
- Where agent-facing slicing actually runs (in-Worker CuraEngine-WASM vs. a
  container/queue vs. handed to the local agent) — depends on how heavy real
  models get.
- The AGPL licensing decision for embedding CuraEngine in a paid SaaS.
- Exact MCP tool surface (names, arg shapes, which actions are agent-exposed vs.
  human-only) — expect it to firm up as the tool-functions get built.
