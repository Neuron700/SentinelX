# SentinelX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SentinelX — a cyber defense intelligence platform with SOC dashboard, event explorer, alert lifecycle, D3 network graph, incident investigation, deterministic scenario simulation, playbooks, and report export.

**Architecture:** Next.js App Router + TypeScript strict, Dexie/IndexedDB repositories behind interfaces, Zustand stores as the single client state, Web Worker simulation engine streaming events, D3 force-directed network graph, Zod validation at all boundaries.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components, Zustand, Dexie, Zod, Recharts, D3, TanStack Table, date-fns, Lucide, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-sentinelx-design.md`

## Global Constraints

- TypeScript strict mode; no unnecessary `any`.
- All demo data labeled synthetic; no live-network claims.
- No offensive capabilities: no scanning, no exploitation, no real-target traffic.
- Severity always shown with text label, never color alone.
- Every visible button performs an action or is disabled with reason.
- Consistent entity IDs and cross-references across all modules.
- Local persistence via IndexedDB (Dexie); settings may use localStorage.
- Deterministic simulation via seeded PRNG.
- Production build must pass (`npm run build`), typecheck and lint clean.

---

## Phase 1 — Foundation

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Steps:**
1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack`
2. Install deps: `zustand dexie dexie-react-hooks zod recharts d3 @tanstack/react-table date-fns lucide-react clsx tailwind-merge class-variance-authority sonner`
3. Install dev deps: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/d3 @types/node`
4. Add scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch`.
5. Configure tsconfig strict + path alias.
6. Create `src/lib/utils/cn.ts` with `cn()` helper.
7. Verify: `npm run typecheck` passes.
8. Commit: `chore: scaffold SentinelX with Next.js, TypeScript, Tailwind, Vitest`.

**Interfaces produced:** `cn(...inputs: ClassValue[]): string`.

---

### Task 2: Design system foundation

**Files:**
- Create: `src/app/globals.css` (dark tactical palette, severity tokens, scrollbar, print styles base)
- Create: `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `checkbox.tsx`, `dialog.tsx`, `drawer.tsx`, `tabs.tsx`, `table.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `skeleton.tsx`, `empty-state.tsx`, `progress.tsx`, `textarea.tsx`, `switch.tsx`, `separator.tsx`, `scroll-area.tsx`
- Create: `src/components/ui/severity-badge.tsx`, `status-badge.tsx`, `kpi-card.tsx`, `page-header.tsx`
- Create: `src/components/ui/toast.tsx` (or use sonner)

**Steps:**
1. Define CSS variables for palette (`--background`, `--surface`, `--border`, `--cyan`, `--violet`, `--sev-*`).
2. Set fonts via `next/font` (IBM Plex Sans + IBM Plex Mono).
3. Build primitives with CVA variants, forwardRef, accessible focus rings.
4. `SeverityBadge` maps severity → token color + text label + icon.
5. `StatusBadge` for alert/incident statuses.
6. `KpiCard` with label, value, delta, tooltip, icon, click-through href.
7. Verify typecheck + visual sanity in dev.

**Interfaces produced:** `<Button variant size>`, `<Badge variant>`, `<Card>`, `<SeverityBadge severity>`, `<StatusBadge kind status>`, `<KpiCard label value icon href tooltip>`.

---

### Task 3: Domain models + Zod schemas

**Files:**
- Create: `src/domain/models/common.ts` (Severity, TimeRange, Pagination, SortDirection)
- Create: `src/domain/models/event.ts`, `alert.ts`, `incident.ts`, `asset.ts`, `rule.ts`, `scenario.ts`, `playbook.ts`, `audit.ts`, `settings.ts`, `indicator.ts`, `graph.ts`
- Create: `src/domain/validation/schemas.ts` (Zod schemas mirroring models)
- Create: `src/domain/models/index.ts` (re-exports)

**Steps:**
1. Define all entity types exactly per spec §3.1 (including `indicator.ts` for threat intel: id, type, value, source, confidence, firstSeen, lastSeen, riskRating, notes, relatedEntityIds).
2. Define enums as const objects + union types: `SEVERITIES`, `ALERT_STATUSES`, `INCIDENT_STATUSES`, `ASSET_TYPES`, `EVENT_TYPES`, `RULE_TYPES`, `TIMELINE_TYPES`.
3. Zod schemas for each entity + `parse` helpers that throw typed errors.
4. Unit tests: valid/invalid entity fixtures parse correctly.
5. Commit: `feat(domain): add entity models and Zod validation`.

**Interfaces produced:** all entity types, `Severity`, `AlertStatus`, `IncidentStatus`, and `schemas.event`, `schemas.alert`, ... with `validate<Entity>(input)`.

---

### Task 4: Dexie database + repositories

**Files:**
- Create: `src/lib/storage/db.ts` (SentinelXDatabase class, v1 schema, migration hook)
- Create: `src/data/repositories/base-repository.ts`
- Create: `src/data/repositories/event-repository.ts`, `alert-repository.ts`, `incident-repository.ts`, `asset-repository.ts`, `rule-repository.ts`, `scenario-repository.ts`, `audit-repository.ts`, `settings-repository.ts`, `indicator-repository.ts`, `playbook-repository.ts`
- Create: `src/data/repositories/index.ts` (singleton instances)
- Create: `src/data/repositories/__tests__/repositories.test.ts` (fake-indexeddb)

**Steps:**
1. Install `fake-indexeddb` dev dep.
2. Implement `BaseRepository<T>` with getAll/getById/create/update/delete/query/subscribe (listener set triggered on writes).
3. Implement specialized methods per spec §3.2 + `count()`, `bulkCreate()`, `getByTimeRange()` for events.
4. Audit repo appends; settings repo key/value.
5. Tests: CRUD, filtering, subscription fires on create/update, cross-repo ID integrity.
6. Commit: `feat(data): Dexie database and repository layer`.

**Interfaces produced:** `repositories.events`, `.alerts`, `.incidents`, `.assets`, `.rules`, `.scenarios`, `.audit`, `.settings`, `.indicators`, `.playbooks`.

---

### Task 5: Seed dataset (consistent synthetic world)

**Files:**
- Create: `src/data/seed/assets.ts` (~24 assets: workstations, servers, gateway, app, accounts)
- Create: `src/data/seed/rules.ts` (~10 detection rules)
- Create: `src/data/seed/events.ts` (generator over 7 days, ~600 events, deterministic seed 1337)
- Create: `src/data/seed/alerts.ts` (~18 alerts derived from events, mixed statuses)
- Create: `src/data/seed/incidents.ts` (4 incidents with timelines/findings/playbook progress)
- Create: `src/data/seed/indicators.ts` (~12 indicators)
- Create: `src/data/seed/playbooks.ts` (3 playbooks)
- Create: `src/data/seed/index.ts` (`loadSeed()`, `resetDemo()`)
- Create: `src/data/seed/__tests__/seed.test.ts` (cross-reference integrity)

**Steps:**
1. Define host universe: `corp-dc-01`, `corp-fs-01`, `web-01`, `ws-fin-014`, `ws-eng-022`, `vpn-gw-01`, `hr-app`, accounts `a.dewi`, `b.santoso`, `svc-backup`, etc.
2. Events reference existing host/user/asset IDs; alerts reference existing event IDs; incidents reference existing alert/event/asset IDs.
3. Use fixed anchor date relative to "now" (now - 7d..now) so timeline always looks live; IDs stable (`evt-0001`).
4. Tests assert every relation resolves both ways.
5. Commit: `feat(data): seed synthetic SOC dataset with cross-references`.

---

### Task 6: App shell (sidebar, topbar, demo banner, theme)

**Files:**
- Create: `src/components/layout/app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `demo-banner.tsx`, `nav-items.ts`, `mobile-nav.tsx`, `command-palette.tsx`
- Create: `src/components/layout/time-range-picker.tsx`, `simulation-controls.tsx`, `notification-panel.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/store/settings-store.ts` (persist to localStorage via zustand persist)
- Create: `src/store/ui-store.ts` (sidebar collapsed, palette open, drawer state)
- Create: `src/hooks/use-demo-dataset.ts` (loads seed on first run, exposes reset)

**Steps:**
1. Sidebar with all 12 routes, icons, active state, collapse on <1024px to icon rail, drawer on <768px.
2. Topbar: global search (opens command palette), time range picker, DATASET: DEMO badge, simulation controls slot, notifications, reset demo button.
3. Demo banner strip: "Synthetic data — demonstration only. No live systems connected."
4. Theme toggle dark/light with persisted setting; dark default.
5. Command palette (Cmd+K): search across nav, events, alerts, incidents.
6. Verify all routes resolve (placeholder pages initially).
7. Commit: `feat(shell): sidebar, topbar, command palette, demo banner`.

---

## Phase 2 — Command Center

### Task 7: Dashboard KPI + charts

**Files:**
- Create: `src/features/overview/use-dashboard-data.ts` (derives KPIs, series, distributions from repositories + time range)
- Create: `src/components/dashboard/kpi-grid.tsx`, `event-timeline-chart.tsx`, `severity-donut.tsx`, `alert-trend-chart.tsx`, `event-type-bar.tsx`, `host-activity-heatmap.tsx`, `recent-incidents.tsx`, `open-alerts.tsx`, `scenario-status-card.tsx`
- Modify: `src/app/page.tsx`

**Steps:**
1. KPI derivation: total events, critical alerts (open), active incidents, monitored assets, MTTA (avg firstSeen→first ack from audit), MTTR (avg resolved incidents) — display "—" with tooltip when insufficient data.
2. Charts consume filtered data; time range applies to all.
3. Empty states when no data; skeletons while loading.
4. KPI click navigates to filtered module (`/events?severity=critical` etc.).
5. Commit: `feat(dashboard): command center with live-derived KPIs and charts`.

---

## Phase 3 — Events & Alerts

### Task 8: Event explorer

**Files:**
- Create: `src/store/event-store.ts`
- Create: `src/features/events/use-event-query.ts` (filter/search/paginate/sort)
- Create: `src/components/events/event-table.tsx`, `event-filters.tsx`, `event-detail-drawer.tsx`, `event-json-view.tsx`, `event-context-timeline.tsx`
- Create: `src/app/events/page.tsx`
- Create: `src/lib/export/export-events.ts`

**Steps:**
1. URL-synced filters (searchParams) so KPI deep links work.
2. Virtualized table ≤ 200ms/10k rows; columns per PRD.
3. Drawer: formatted JSON, related alerts/incident links, host context, ±10 neighbor events.
4. Export current filtered set to CSV + JSON (Blob download, filename with timestamp).
5. Tests: filter logic unit tests, export serializer tests.
6. Commit: `feat(events): explorer with filters, drawer, export`.

---

### Task 9: Alert management

**Files:**
- Create: `src/store/alert-store.ts`
- Create: `src/features/alerts/alert-transitions.ts` (state machine + guards)
- Create: `src/components/alerts/alert-list.tsx`, `alert-filters.tsx`, `alert-detail.tsx`, `alert-actions.tsx`, `alert-notes.tsx`, `create-incident-dialog.tsx`, `dismiss-dialog.tsx`
- Create: `src/app/alerts/page.tsx`
- Create: `src/lib/audit/audit-logger.ts`

**Steps:**
1. State machine per spec §7.3; invalid transitions disabled with reason tooltip.
2. Actions: acknowledge, assign (analyst picker), note, escalate, resolve (note required), dismiss (reason required), create incident (prefilled severity/assets/events), link existing incident.
3. Every transition writes audit entry + updates alert repo + store.
4. Detail shows triggering events, assets, rule, notes thread.
5. Tests: transition matrix unit tests + audit entries emitted.
6. Commit: `feat(alerts): lifecycle management with audit trail`.

---

## Phase 4 — Network Graph

### Task 10: Graph data builder

**Files:**
- Create: `src/features/network/build-graph.ts` (events/alerts/incidents/assets/indicators → nodes/edges, dedup)
- Create: `src/features/network/__tests__/build-graph.test.ts`

**Steps:**
1. Node kinds: asset, user (from assets of type user_account + event userIds), ip, domain (parse descriptions/metadata), alert, incident, indicator.
2. Edge kinds: connection (src→dst host), auth (user→host), triggered (event→alert), contains (incident→alert), observed (indicator→event entity), related (asset↔alert).
3. Filters: incidentId focus, node types, severity floor, search text.
4. Tests: counts, no dangling edges, incident focus subgraph correctness.
5. Commit: `feat(network): derived graph model builder`.

---

### Task 11: D3 graph visualization

**Files:**
- Create: `src/components/network/network-graph.tsx` (SVG force sim, zoom/pan/drag)
- Create: `src/components/network/graph-legend.tsx`, `graph-controls.tsx`, `graph-detail-panel.tsx`, `graph-search.tsx`, `graph-filters.tsx`
- Create: `src/app/network/page.tsx`
- Create: `src/store/network-store.ts`

**Steps:**
1. Force sim with collision, link distance by weight, charge by node type.
2. Interactions: click select (highlight neighbors, dim rest), drag pin, double-click unpin, zoom/pan/fit/reset, hover tooltip.
3. Detail panel: node metadata, related entities, "open event/alert/incident" actions.
4. Filters: type toggles, severity floor, search, incident focus dropdown (from `?incident=` param).
5. Empty state when filters yield nothing; loading state.
6. Commit: `feat(network): interactive force-directed threat graph`.

---

## Phase 5 — Incidents

### Task 12: Incident list + workspace

**Files:**
- Create: `src/store/incident-store.ts`
- Create: `src/app/incidents/page.tsx`, `src/app/incidents/[id]/page.tsx`
- Create: `src/components/incidents/incident-list.tsx`, `incident-header.tsx`, `incident-overview-tab.tsx`, `incident-timeline-tab.tsx`, `incident-evidence-tab.tsx`, `incident-findings-tab.tsx`, `incident-playbook-tab.tsx`, `incident-graph-tab.tsx`
- Create: `src/components/incidents/add-note-form.tsx`, `link-evidence-dialog.tsx`, `add-finding-form.tsx`, `status-change-dialog.tsx`
- Create: `src/features/incidents/build-timeline.ts`

**Steps:**
1. List with status/severity filters, search, sort.
2. Workspace tabs per spec §7.4; timeline merged chronological with type filters and replay slider (reveals entries up to timestamp).
3. Actions: note, link new evidence, finding create with evidence refs, status change with mandatory reason, false-positive flag.
4. All mutations persist + audit + update dashboard via stores.
5. Timeline unit tests (ordering, merge dedupe).
6. Commit: `feat(incidents): investigation workspace with timeline and evidence`.

---

## Phase 6 — Simulation Engine

### Task 13: Simulation engine (worker-compatible core)

**Files:**
- Create: `src/simulation/prng.ts` (mulberry32)
- Create: `src/simulation/eventGenerator.ts`
- Create: `src/simulation/detectionEngine.ts`
- Create: `src/simulation/scenarioRunner.ts`
- Create: `src/simulation/engine.ts` (class wiring runner→generator→detection, emits batches)
- Create: `src/simulation/__tests__/determinism.test.ts`, `detection.test.ts`
- Create: `src/simulation/scenarios/` five scenario definitions (A–E) + index

**Steps:**
1. Seeded PRNG; generator uses simulated clock, host/user pool, phase-weighted templates.
2. Detection engine evaluates structured conditions (threshold with time window/groupBy, field match, set membership) over event buffer; emits alert drafts with relatedEventIds.
3. Runner phases per scenario JSON; completion when phases done.
4. Tests: same seed ⇒ identical event IDs/timestamps/sequence; different seed ⇒ different; threshold rule fires exactly at N; disabled rule never fires; scenario E yields expected alert chain.
5. Commit: `feat(simulation): deterministic engine, rules, five scenarios`.

---

### Task 14: Worker bridge + scenario UI

**Files:**
- Create: `src/workers/simulation.worker.ts`
- Create: `src/store/simulation-store.ts`
- Create: `src/hooks/use-simulation.ts`
- Create: `src/app/scenarios/page.tsx`
- Create: `src/components/scenarios/scenario-grid.tsx`, `scenario-runner.tsx`, `live-event-feed.tsx`, `live-alert-panel.tsx`, `scenario-progress.tsx`, `scenario-results.tsx`
- Create: `src/components/layout/simulation-controls.tsx` (topbar integration)

**Steps:**
1. Worker instantiates engine; message protocol per spec §5.2; heartbeats; error boundary and auto-stop.
2. Main thread persists batches via repositories (bulkCreate), triggers audit.
3. Controls: start/pause/resume/stop/step/speed (0.1–10×); state mirrored in store and topbar badge "SIMULATION RUNNING".
4. Scenario results panel: user marks success criteria, records findings; results persist.
5. Guard: only one scenario at a time; cleanup on unmount (terminate worker).
6. Commit: `feat(simulation): web worker bridge, runner UI, live feeds`.

---

### Task 15: Detection rule explorer

**Files:**
- Create: `src/app/rules/page.tsx`
- Create: `src/components/rules/rule-table.tsx`, `rule-detail.tsx`, `rule-conditions-view.tsx`, `rule-toggle.tsx`
- Create: `src/store/rule-store.ts`

**Steps:**
1. Table: name, severity, type, source, enabled, last fired.
2. Detail: human-readable condition renderer, example matching events (query by sample), generated alerts.
3. Toggle enable/disable → persists, audit entry; affects only future detection (documented inline).
4. Commit: `feat(rules): detection rule explorer with toggles`.

---

## Phase 7 — Assets, Threat Intel, Playbooks, Reports

### Task 16: Asset inventory

**Files:**
- Create: `src/app/assets/page.tsx`
- Create: `src/components/assets/asset-table.tsx`, `asset-detail-drawer.tsx`, `risk-score-breakdown.tsx`
- Create: `src/store/asset-store.ts`

**Steps:**
1. Table: name, type, environment, OS, risk score (with breakdown tooltip), last seen, tags, related alerts count.
2. Drawer: relations, related alerts/incidents, "View in graph" (→ `/network?asset=<id>`).
3. Filters: type, environment, risk range, search.
4. Commit: `feat(assets): inventory with risk breakdown and graph links`.

---

### Task 17: Threat intelligence explorer

**Files:**
- Create: `src/app/intelligence/page.tsx`
- Create: `src/components/intelligence/indicator-search.tsx`, `indicator-table.tsx`, `indicator-detail.tsx`, `demo-intel-banner.tsx`
- Create: `src/store/indicator-store.ts`

**Steps:**
1. Prominent "DEMO INTELLIGENCE — synthetic indicators, no live feeds" banner.
2. Search by value; filter type/risk; table with first/last seen, confidence, source label.
3. Detail: related events/alerts/assets/incidents, analyst notes, graph link.
4. Commit: `feat(intel): synthetic threat indicator explorer`.

---

### Task 18: Playbooks

**Files:**
- Create: `src/app/playbooks/page.tsx`
- Create: `src/components/playbooks/playbook-list.tsx`, `playbook-detail.tsx`, `playbook-step.tsx`, `playbook-progress-ring.tsx`
- Create: `src/store/playbook-store.ts`

**Steps:**
1. Templates with ordered steps (title, description, type, required, est. minutes).
2. Attach to incident (from incident workspace or playbooks page); progress persisted per incident.
3. Step completion → timeline entry + audit; completion ring per incident.
4. Commit: `feat(playbooks): IR checklists with per-incident progress`.

---

### Task 19: Reports

**Files:**
- Create: `src/app/reports/page.tsx`, `src/app/reports/[incidentId]/page.tsx`, `src/app/reports/[incidentId]/print/page.tsx`
- Create: `src/lib/export/markdown-report.ts`, `json-report.ts`, `csv-report.ts`, `download.ts`
- Create: `src/components/reports/report-preview.tsx`, `report-export-bar.tsx`, `report-section.tsx`
- Create: `src/app/reports/print.css` (or scoped styles)

**Steps:**
1. Report assembles all spec §7.12 sections from incident data.
2. Exports: Markdown, JSON, CSV (zip-free separate files; timeline/evidence/findings as CSV sections in one `.csv`? → use three CSVs bundled via multiple downloads or single flattened CSV; choose single flattened CSV with `section` column).
3. Print page: clean typography, page breaks, no chrome; browser print → PDF.
4. Audit entry on each export.
5. Tests: markdown snapshot, JSON shape, CSV row counts.
6. Commit: `feat(reports): incident reports with MD/JSON/CSV export and print view`.

---

## Phase 8 — Settings, Audit, QA

### Task 20: Settings + audit trail page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/settings/theme-toggle.tsx`, `simulation-settings.tsx`, `table-density.tsx`, `time-range-default.tsx`, `notifications-settings.tsx`, `reset-demo-card.tsx`, `about-card.tsx`
- Create: `src/app/audit/page.tsx` (route reachable via settings + topbar menu; not in main nav)
- Create: `src/components/audit/audit-table.tsx`

**Steps:**
1. Settings persist; theme applies live; density affects tables (row height classes).
2. Reset demo: confirmation dialog → wipe DB → reload seed → toast.
3. Audit page: filter by entity type/action/date, "Local demo audit trail — not tamper-proof" notice.
4. Commit: `feat(settings): preferences, reset demo, audit trail viewer`.

---

### Task 21: Global states + resilience

**Files:**
- Create: `src/components/layout/error-boundary.tsx`, `src/app/error.tsx`, `src/app/loading.tsx`, `src/app/not-found.tsx`
- Create: `src/components/ui/empty-state.tsx` usage audit
- Modify: pages for empty/loading states

**Steps:**
1. Route-level error boundary with retry; logging to audit (non-sensitive).
2. Shared skeletons per module type (table/card/graph).
3. 404 page with nav back.
4. Commit: `feat(ux): error boundaries, loading skeletons, empty states`.

---

### Task 22: Tests + build verification

**Files:**
- Create: `src/**/__tests__/*.test.ts(x)` for domain, detection, simulation, exports, timeline
- Create: `e2e/smoke.spec.ts`, `e2e/flows.spec.ts`, `playwright.config.ts`
- Create: `README.md`, `PRD.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/testing.md`, `.env.example`

**Steps:**
1. Install Playwright; write E2E: navigate all routes, filter events, alert acknowledge→incident→note→status, run scenario (fast speed) ⇒ alerts appear, export report downloads.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test`.
3. Fix all failures.
4. Write docs incl. honest limitations section.
5. Final commit: `docs: project documentation; test: E2E smoke and flows`.

---

## Acceptance Checklist (must all pass before completion)

- [ ] All 12 nav pages load with real data
- [ ] Dashboard KPIs reflect DB; time range filter changes charts
- [ ] Event explorer search/filter/sort/paginate/drawer/export
- [ ] Alert lifecycle all transitions + audit
- [ ] Create incident from alert works end-to-end
- [ ] Graph builds from data; selection detail correct; incident focus works
- [ ] Incident timeline chronological + replay slider
- [ ] Persistence across reload (IndexedDB)
- [ ] Scenario deterministic (same seed) and produces expected alerts
- [ ] Rule toggle affects future detection only
- [ ] Playbook progress persists
- [ ] Reports export MD/JSON/CSV + print page
- [ ] Audit trail records actions
- [ ] Reset demo restores seed
- [ ] Empty/loading/error states on every data view
- [ ] No decorative dead buttons
- [ ] `npm run build` succeeds
- [ ] Unit + E2E tests pass
