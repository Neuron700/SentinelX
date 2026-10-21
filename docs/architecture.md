# SentinelX Architecture

## 1. Overview

SentinelX is a browser-local Next.js application. There is no backend service: the Next.js server only serves the application shell and static assets. All domain data lives in IndexedDB, and all derivation, detection, and simulation run in the browser.

```text
+--------------------------- Browser ----------------------------+
|                                                                |
|  Next.js App Router (React 19)                                 |
|    routes -> feature modules -> shared UI                      |
|            |                                                   |
|            v                                                   |
|  Live hooks (dexie-react-hooks)                                |
|            |                                                   |
|            v                                                   |
|  Repositories (typed, Zod-validated)                           |
|            |                                                   |
|            v                                                   |
|  Dexie / IndexedDB  <--- seed world (deterministic)            |
|            ^                                                   |
|            | writes                                            |
|  Actions (lifecycle, notes, settings, audit)                   |
|                                                                |
|  Web Worker: scenario engine + detection engine                |
|    PRNG -> events -> alerts -> main thread persistence         |
+----------------------------------------------------------------+
```

## 2. Layers

### 2.1 Routes and shell

- `src/app/layout.tsx` mounts the application shell, theme bootstrap, toast provider, and global styles.
- `src/app/*/page.tsx` files are thin route wrappers: metadata, page header, Suspense boundary, and a feature component.
- The shell (`src/components/layout/`) contains the sidebar, topbar, synthetic-data banner, time range picker, notification panel, command palette, and reset dialog.
- Global states live in `src/app/loading.tsx`, `error.tsx`, and `not-found.tsx`.

### 2.2 Feature modules

Feature modules under `src/features/` own their UI, local state, derivations, and actions:

- `overview` - dashboard KPIs, chart derivations, simulation panel
- `events` - explorer, filters, detail drawer
- `alerts` - queue, lifecycle drawer, actions
- `graph` - graph builder, D3 renderer, explorer
- `incidents` - list, workspace, timeline, findings, playbook
- `assets` - inventory and asset drawer
- `intelligence` - indicator explorer and notes
- `rules` - rule explorer and test bench
- `playbooks` - playbook library
- `reports` - report view and exports
- `settings` - preferences and data management
- `audit` - audit explorer

### 2.3 Domain

`src/domain/models/` defines the entity types and state machines. `src/domain/validation/schemas.ts` defines Zod schemas used by repositories before writes. Validation failures surface as typed errors rather than silently corrupting local state.

Key state machines:

- Alerts: `new -> in_review -> escalated -> resolved | dismissed`
- Incidents: `open -> investigating -> contained | resolved | closed`, with reopen paths from `resolved`/`contained`

### 2.4 Persistence

`src/lib/storage/db.ts` defines the Dexie database and indexes. `src/data/repositories/` wraps each table with typed operations:

- `events` - time range, host, scenario, search, severity/type counts, timeline series
- `alerts` - status/rule/assignee filters, lifecycle updates
- `incidents` - transitions, findings, playbook progress
- `assets`, `rules`, `indicators`, `playbooks`, `scenarios`, `scenarioResults`, `auditLog`, `settings`, `meta`

Repositories validate writes with Zod and return domain objects. `createRepositories(db)` enables isolated test databases; the app uses a singleton `getRepositories()`.

### 2.5 Live data

`src/hooks/use-live-data.ts` exposes `useLiveEvents`, `useLiveAlerts`, `useLiveIncidents`, `useLiveAssets`, `useLiveRules`, `useLiveIndicators`, `useLivePlaybooks`, `useLiveScenarios`, `useLiveScenarioResults`, and `useLiveAudit`. They wrap Dexie live queries, so any write updates every subscribed view without manual cache invalidation.

### 2.6 Client state

Zustand stores handle state that is not persisted as domain data:

- `time-range-store` - selected global range and presets
- `settings-store` - theme, density, simulation speed, notifications, analyst identity
- `simulation-store` - active run, progress, logs, completion state
- `ui-store` - palette, notification panel, and shell UI state

Settings are persisted through the settings repository; the theme/density are reflected on the document element and table wrappers.

### 2.7 Simulation

The simulator is split into:

- `prng.ts` - deterministic `mulberry32` generator
- `engine.ts` - scenario clock, phases, event generation, progress
- `detection.ts` - shared rule matching, grouping, and threshold evaluation
- `protocol.ts` - typed worker messages
- `simulation.worker.ts` - runs the engine off the main thread
- `runner.ts` - starts/stops the worker, throttles persistence, records results

Flow:

1. The scenarios page sends `start` with scenario, rules, seed, speed, and start time.
2. The worker advances a simulated clock, emits batches of synthetic events, and evaluates enabled rules.
3. The main thread persists events, alerts, and the scenario result, then updates the simulation store.
4. The UI shows progress, simulated clock, event/alert counts, and a completion summary.

Determinism is guaranteed by the seeded PRNG and a stable step sequence. Speed affects wall-clock pacing, not generated content.

Detection rules are shared with the rules test bench. Threshold conditions are evaluated both as predicates and as window/grouping instructions, so a rule such as "8 authentication failures per source IP in 10 minutes" cannot count unrelated event types.

### 2.8 Graph

`build-graph.ts` derives a typed graph from events, alerts, and incidents in the selected range. Nodes carry metadata and degree; links carry relation labels and last-seen timestamps. `network-graph.tsx` renders with D3 force simulation:

- deterministic golden-angle initial positions
- degree-aware labels and opacity
- search-driven label reveal
- hover/selection detail
- zoom, pan, and drag

The graph is derived data only; it never creates relationships that are not present in the dataset.

### 2.9 Time

`src/lib/time/time.ts` provides range presets, in-range checks, relative/absolute formatting, and duration formatting. The global range is applied consistently:

- dashboard series and KPIs
- event/alert/graph/incident/asset/intelligence/report views
- rule test bench
- audit filters (where applicable)

Chart buckets are aligned to bucket boundaries so labels and counts do not drift.

### 2.10 Audit

`recordAudit()` appends an entry with action, entity type/id/label, details, and the current analyst. Audit writes never block the primary action; failures are logged without rolling back the user's change. The audit explorer provides search, entity/action filters, CSV export, and a JSON detail drawer.

## 3. Routing

All routes are statically prerendered except `/incidents/[id]`, which is dynamic. Pages that use `useSearchParams` are wrapped in Suspense:

- `/events` - `event`, `severity`, `type`, `host`, `scenario`, `search`
- `/alerts` - `scenario`, `rule`, `alert`
- `/network` - `node`, `search`
- `/rules` - `rule`
- `/assets` - `asset`
- `/intelligence` - `indicator`
- `/incidents/[id]` - `tab=overview|timeline|findings|playbook`

Deep links allow other views to hand off context without duplicating state.

## 4. Design system

- CSS variables define surfaces, borders, text, accent, and severity colors.
- `.light` on the document element switches the token set.
- IBM Plex Sans/Mono are used for UI and telemetry.
- Severity is always conveyed with text labels, not color alone.
- Table density is applied through `data-density` on table shells and CSS rules.
- Shared primitives live in `src/components/ui/`: button, input, select, dialog/drawer, tabs, table, progress, switch, badges, skeleton, empty state, KPI card.

## 5. Error handling and resilience

- Route-level `error.tsx` catches render failures with a retry action.
- `not-found.tsx` handles unknown routes and missing entities.
- `loading.tsx` and Suspense skeletons cover initial data reads.
- Action failures show a toast with a description and leave state unchanged.
- Invalid lifecycle transitions are rejected before writes.
- Repository writes are validated with Zod.

## 6. Performance

- Event tables paginate; audit tables cap at 300 rows.
- Derivations are memoized with `useMemo` and scoped by range.
- Graph simulation only runs on the network page.
- Dashboard charts use small, range-scoped series.
- The simulation worker keeps event generation off the main thread.
- IndexedDB indexes cover timestamp, severity, host, user, scenario, and compound severity/timestamp queries.

## 7. Security and privacy

- No telemetry leaves the browser.
- No secrets, tokens, or connector credentials are required.
- External addresses use RFC 5737 documentation ranges.
- All datasets are labelled synthetic.
- The product contains no offensive tooling or real exploit content.

## 8. Directory map

```text
src/
  app/                  routes and global states
  components/
    layout/             shell, topbar, palette, time range, notifications
    dashboard/          overview widgets
    ui/                 primitives
  data/
    repositories/       typed Dexie access
    seed/               world, events, alerts, incidents, rules, ...
  domain/
    models/             entity types and state machines
    validation/         Zod schemas
  features/             feature modules
  hooks/                live queries
  lib/                  time, export, audit, storage, utils
  simulation/           PRNG, engine, detection, worker, runner
  store/                Zustand stores
e2e/                    Playwright tests
docs/                   architecture, data model, testing
```
