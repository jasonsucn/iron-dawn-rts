# IRON DAWN — implementation plan

1. **Playable simulation first.** Data-driven factions/tech tree; fixed-step world; A* navigation and separation; economy, three funded production queues, placement, harvesters, armor/combat, fog, victory, and an independently funded building/attacking AI. Keep simulation browser-independent for automated tests.
2. **Procedural battlefield.** Shared, layered beveled industrial models with articulated turrets/limbs/harvest arms; terrain, roads, water, ore, instanced foliage, dusk sky/shadows; pooled particles, ballistics, wrecks, fog texture, bloom/FXAA with quality fallback.
3. **Complete interaction.** Live 3D title scene; faction/difficulty; RTS selection/orders/groups/camera; right-side 3D build catalog, placement/range preview, queues, minimap, selection commands, tutorial, settings, pause/results. No UI event leakage.
4. **Sound and lifecycle.** Interaction-unlocked procedural music/SFX and optional radio; one RAF and fixed accumulator; reusable renderer/assets, clean world/UI/audio reset, readable error overlay; documented QA debug API.
5. **Verification and polish.** Syntax-check every source, run deterministic simulation and navigation tests (including long AI games), check static server/resources, and perform available browser smoke checks. Record actual results and remaining limitations, without claiming unmeasured FPS or browser acceptance.

No bundler, package installation, runtime internet assets, or changes to the supplied server. Run with `node server.mjs` at `http://127.0.0.1:4173/`.
