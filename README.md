# KESSLER REACH
*A frontier skilling RPG in a 3D open world, for the browser. No installs, no build step, no servers.*

**▶ Play now: https://stobieee-bit.github.io/kessler-reach/**

Fifty years ago an orbital cascade — **the Shatter** — chewed the Reach's sky into a permanent
storm of wreckage. You just crash-landed in the bones of the hauler *Meridian*. Salvage, drill,
trawl, fabricate, hack and fly your way from castaway to legend.

## How to play

**Option 1 — just open it:** double-click `index.html`. That's it.

**Option 2 — local server (recommended for development):**
```
python -m http.server 5173 --directory kessler-reach
```
then open http://localhost:5173

### Controls
| Input | Action |
|---|---|
| **Left-click ground** | Walk there (click marker shows the spot) |
| **Left-click anything glowing** | Walk over and use it — nodes, machines, terminals, NPCs, enemies |
| **WASD** | Direct movement (camera-relative) |
| **Drag / arrow keys** | Orbit the camera |
| **Scroll** | Zoom |
| **Esc** | Close panels |

The world is one continuous landmass: seven authored regions joined by valley passes, with
energy gates that open as you meet Piloting levels or finish missions. No teleports — you walk,
like it's 2004. Hover anything to see what it is and what it needs.

Your game saves automatically to your browser (localStorage) every 15 seconds and on tab close —
including your position in the world. Leave a gathering action running and it keeps producing
for up to 6 hours while you're away.
Use **⚙ Settings** to export/import your save as a string.

## What's in the game

| System | Details |
|---|---|
| **15 original skills** | Salvaging, Extraction, Xenobotany, Trawling, Fabrication, Synthesis, Chemistry, Engineering, Kinetics, Marksmanship, Psionics, Resilience, Vitality, Hacking, Piloting |
| **Levels 1–100, no dead ranges** | Original XP curve (9% compounding); content at every tier including the 60–90 stretch (obsidite gear, brinemetal, echo blooms, phasefin, singularity shards) |
| **9 regions, 5 settlements, 1 town** | The Meridian camp; the Rustflats with scavver-built **Driftrock**; **Ashvale**, the burning valley on the southern ring road; Glasswood Verge with **Verdant Hollow**'s tree-platforms; **Haven Station**'s market plaza; **The Crown**, the wind-scoured summit; stilt-village **Brinemoor** on Cinder Sound; Kelvin Deep with **Borehole 9**; the Undervault and **Threshold Camp** at its door |
| **13 named NPCs** | Roaming, authored characters — quartermasters, chemists, archivists, village elders, scavver kids — with quest-state-aware dialogue |
| **98 items / 16 hostiles** | 7-tier gathering & gear chains; Scrap Hounds to Rust Titans, Echo Shades, Shard Golems and the boss WARDEN-7 |
| **11 missions** | Survival opening → village arcs (Driftrock Debt, Tides of Brinemoor) → the Undervault campaign → a post-boss revelation arc about what the Shatter really was, ending at the title "Reachwarden" |
| **3 combat styles + specials** | Kinetics / Marksmanship / Psionics weapons; adrenaline builds in combat and unleashes style specials — Graviton Slam, Storm Volley, Stasis Lock (Space) |
| **Installable & offline** | Full PWA: add it to your desktop or home screen, keep playing without a connection after the first visit |
| **A living world** | 8 rotating regional events (meteor showers, lumen blooms, echo tides…) boost skills where they land; ★ Alpha elites roll on every respawn with triple loot; the market drifts daily by category |
| **Endless goals** | Work orders for every trade (cull / supply / fabricate, rerolled on claim), total-level milestones with account-wide perks, masterwork crafting crits, **22 feats to earn** |
| **A real product** | Title screen with Continue/New, loading splash, HUD local-scan minimap + quest tracker, gear comparison tooltips, generative score + per-action SFX with a 3-channel volume mixer, help & credits screen, keyboard shortcuts (1–5, H), touch & pinch support, rolling save backup |
| **Quality of life** | Auto-eat, offline progress (6h), skill guides, export/import saves |

### The loop
1. **Gather** in the field (salvage wrecks, drill ore, pick flora, trawl the ion shallows)
2. **Process** at facilities (smelt alloys, cook meals, brew stims, assemble gadgets)
3. **Fight** for credits and rare drops — eat meals, inject stims, upgrade gear
4. **Fly & hack** to unlock farther zones and richer targets
5. **Missions** stitch it together and gate the endgame

Dying is gentle: you're recalled to the Meridian with full hull and lose 5% of your credits (capped).

### The world
- **7 authored regions** on one walkable continent: the Meridian crash site, the Rustflats,
  Glasswood Verge, Haven Station, Cinder Sound, Kelvin Deep, and the Undervault
- **52 placed resource nodes**, 8 crafting facilities, 4 hack terminals, a hangar pad,
  a shop NPC, a contract board, 5 requirement gates, and 32 wandering hostiles
  (including the boss WARDEN-7)
- Click an enemy and it fights you where it stands — hit splats, HP bars, projectiles for
  ranged/psionic styles, auto-retarget to the next one nearby
- **Deep-zone hostiles are aggressive**: Kelvin's horrors and everything in the Undervault
  attack on sight and chase (and leash back home if you outrun them)
- **Contract board** at Haven: three rolling kill-bounties scaled to your combat level —
  the repeatable endgame loop. Claim pays credits + Vitality XP and rerolls the slot
- **Exploration XP**: first footfall in each region charts it for +150 Piloting XP
- A debris ring and shattered moon hang in the sky; the Shatter is always watching
- Combat pauses while the tab is hidden (no off-screen deaths); gathering keeps running

### The story
You crash alone; your suit AI walks you through survival. Fixing the Meridian's beacon puts you
on Haven Station's map — and in debt to Driftrock, whose scavvers once pulled you out of the sky.
Brinemoor's lantern festival marks fifty years since the Shatter. Archivist Nyx hears the
Undervault whispering, and what starts as a salvage run ends with the truth: the sky was broken
on purpose, to seal something in orbit. Quests are offered and turned in face-to-face; villagers'
dialogue shifts as your reputation grows.

### Verified front-to-end
The campaign has been play-tested in-browser: missions completed through real dialogue
(accept and turn in by talking to givers), village shops unlocking on reputation, gates opened
by leveling, ambushes survived, WARDEN-7 defeated at tier-4 gear exactly on the combat model,
and every placement checked by an automated walkability validator. Zero console errors.

## Files
- `index.html` — page shell
- `css/style.css` — UI theme + world overlay (nameplates, splats, hints)
- `js/data.js` — all content (skills, items, actions, enemies, zones, missions, world layout)
- `js/world.js` — the 3D engine: terrain, sky, entities, click-to-move, camera, labels, minimap
- `js/game.js` — game systems: skills, combat math, missions, economy, saves, HUD panels
- `lib/three.min.js` — Three.js r147 (MIT), vendored locally so the game works offline
- `validate.js` — dev tool: `node validate.js` checks every content cross-reference

## On legal distinctness

This game is genre-inspired (skill-grind MMORPGs broadly) but everything *expressive* in it is
original to this project:

- **All names are invented or generic**: skills, items, creatures, zones, missions, lore, and the
  title share no names or text with any existing game. Game *mechanics* (XP curves, gathering →
  crafting chains, tick combat) are unprotectable ideas used across the whole genre — what
  copyright protects is expression, and the expression here is new.
- **Original formulas**: the XP curve (9% compounding, base 80, cap 100), combat math, and all
  balance numbers were designed for this project.
- **No assets copied**: the UI is hand-written CSS; icons are standard Unicode emoji.
- The title was checked against existing games (nearest neighbors: "Kessler Syndrome",
  "Kessler Effect" — different names, different games).

**Disclaimer:** this is engineering diligence, not legal advice. If you ever plan to publish or
monetize, have a games/IP attorney run a real trademark search and review.

## Roadmap ideas
- Contracts board (repeatable bounties), a Robotics skill with a companion drone
- Hydroponics (real-time crop growing), galactic exchange with drifting prices
- Tile-based world map with click-to-move, more questlines past the Undervault
- Cloud saves / multiplayer trading post
