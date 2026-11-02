---
name: lohas-rush-development
description: Develop, debug, and validate the standalone Lohas Rush React/TypeScript/React Three Fiber/Zustand 3D driving game. Use when working on driving controls, city rendering, camera, collision, destination missions, HUD, builds, or tests in lohas-rush. Never modify the separate lohas_islands project.
---

# Lohas Rush Development Skill

## Scope and source of truth

This skill applies **only** to the standalone `lohas-rush` game. The current target is **V0.1**, a browser-based 3D city driving MVP. Follow the repository's `CODEX_PROMPT.md`, `README.md`, `package.json`, and actual source code as the source of truth. Do not claim any implementation or test passed without observing it. If instructions conflict, preserve repository safety and ask before making destructive changes.

The original `lohas_islands` / 長照人生旅程 3.0 project is separate and must remain unchanged. Do not import or copy its assets or code without explicit authorization. Do not assume those assets are available.

## Mandatory preflight

1. Show the current directory (`pwd` or equivalent), repository root (`git rev-parse --show-toplevel` if Git is present), and `git status --short`.
2. Confirm that the working directory is the intended standalone `lohas-rush` repository (a versioned folder such as `lohas-rush-v0.1` is acceptable if confirmed). If not, **stop** and request the correct working directory.
3. Inspect `README.md`, `package.json`, and the `src` tree before changing files.
4. Preserve existing user changes. Never run `git reset --hard`, `git clean -fd`, force push, or broad destructive cleanup.
5. Never edit, delete, rename, move, overwrite, or push changes to `lohas_islands`.

## Technology and architectural rules

- Use React, TypeScript, Vite, Three.js through `@react-three/fiber`, optional `@react-three/drei`, and Zustand.
- Keep the first version browser-only, single-player, and client-side; do not add a backend or multiplayer.
- Put high-frequency vehicle motion and camera updates in frame-loop refs/objects, **not** Zustand state updates every frame.
- Use a bounded fixed-step driving simulation with an accumulator, a maximum substep count, and clamped frame delta. Render interpolation may be used to reduce jitter.
- Keep city geometry, building collision data, and destination metadata organized separately from game state and UI.
- Keep interactions deterministic and restartable. Remove input listeners and frame-loop resources when components unmount.
- Use low-poly primitives and modest draw calls for the V0.1 city; do not depend on unlicensed third-party assets.
- Treat WebGL initialization failure as a recoverable UI state with a clear message.

## V0.1 required behavior

- A playable 3D fictional city with streets, intersections, sidewalks, buildings, trees, and lights.
- A recognizable simplified Lohas service vehicle.
- WASD and arrow keys for forward/reverse and steering; Space to brake; R to reset.
- Acceleration, deceleration, reverse, top-speed cap, steering behavior, and drag.
- A smooth third-person chase camera with stable orientation.
- Reliable collision with static buildings and a city boundary; prevent tunneling at expected V0.1 speeds.
- Three data-defined example destinations: 樂活日照中心, 樂活診所, 樂活團膳工廠.
- An ordered arrival mission with a visible target marker, trigger radius, completion state, and HUD updates.
- HUD displaying speed, controls, current objective, completion, and restart.
- Restart restores vehicle pose and mission progress, without stale inputs.
- A gentle pastel low-poly look: cream, light green, peach, light blue, and lavender.

## Implementation workflow

1. **Inspect:** Identify actual files, current behavior, existing scripts, and any deviations from this skill. Do not assume a file or feature exists because it appears in a plan.
2. **Install and build:** Run `npm install` if dependencies are not installed, then `npm run build`. Fix TypeScript, dependency, and build failures one at a time.
3. **Driving:** Verify keydown/keyup handling, focus/blur cleanup, fixed-step updates, reverse, braking, and reset. Avoid frame-rate-dependent behavior.
4. **Camera:** Verify smooth chase behavior, heading tracking, no obvious shaking, and reasonable reset behavior.
5. **Collision:** Test head-on building approaches, corners, reversing, boundary contact, and recovery from invalid positions. Avoid pass-through.
6. **Missions:** Test all three destinations in order; confirm that arrival triggers once, HUD advances, final completion appears, and restart clears progress.
7. **Runtime:** Run `npm run dev` and test in Chrome when a browser is available. If no browser is available, explicitly mark visual/interactive tests **not tested** rather than claiming success.
8. **Document:** Update `README.md` with setup, controls, architecture, observed tests, limitations, and next steps. Report changed files and the actual command results.

## Verification checklist

- [ ] `npm install` completed successfully
- [ ] `npm run build` completed successfully
- [ ] `npm run dev` starts and serves the app
- [ ] WASD / arrow keys, Space, and R behave correctly
- [ ] Vehicle accelerates, brakes, reverses, and respects bounds
- [ ] Third-person camera follows smoothly
- [ ] Vehicle does not pass through buildings in normal play
- [ ] All three ordered missions complete correctly
- [ ] HUD reflects speed, objective, and completion
- [ ] Restart clears mission and resets vehicle
- [ ] WebGL failure shows a useful fallback
- [ ] Original `lohas_islands` remains unchanged

Only check an item after actual verification. Clearly distinguish automated checks, browser observations, and untested behaviors.

## Change boundaries

Do **not** begin V0.2 until V0.1 is stable and the user explicitly authorizes expansion. In particular, do not add a real Tainan map, multiplayer, traffic AI, a 100-cell board, extensive education quizzes, or a full rigid-body vehicle simulation as part of routine V0.1 maintenance.

If the project is missing, do not silently create or overwrite an unrelated project. Explain the missing prerequisite and ask whether to scaffold a new standalone repository.

## Final report format

Report in Traditional Chinese with these sections:

1. **工作目錄與安全確認** — repository path and original project protection
2. **本次修改** — concrete files and behavior changed
3. **測試結果** — commands run and passed/failed/not-tested status
4. **已知限制** — unresolved bugs, performance concerns, or unverified behavior
5. **下一步** — only V0.1 stabilization unless instructed otherwise
