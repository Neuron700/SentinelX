# SentinelX

A local-first Cyber Defense Intelligence Platform for practicing SOC workflows against realistic, fully synthetic telemetry.

SentinelX is a Next.js application that runs entirely in the browser. It ships with a fictional company, Meridian Logistics, and a seven-day dataset of events, alerts, incidents, assets, indicators, detection rules, and response playbooks. Every number in the interface is derived from that local dataset. Nothing is connected to a real network, and no offensive tooling is included.

## Highlights

- **Command center** with live KPIs, event volume, severity mix, alert activity, event categories, host activity, and simulation status.
- **Event explorer** with search, severity/type/host/scenario filters, sorting, pagination, detail drawer, deep links, and CSV export.
- **Alert lifecycle** with acknowledgement, escalation, resolution/dismissal, assignment, notes, incident promotion, and an auditable trail.
- **Incident workspace** with overview, chronological timeline, findings, and playbook progress across four seeded investigations.
- **Entity relationship graph** built with D3: hosts, identities, external infrastructure, domains, alerts, and incidents.
- **Threat intelligence** with confidence scoring, risk ratings, analyst notes, and links to matching telemetry and alerts.
- **Detection engineering** with ten rules, enable/disable controls, a test bench that evaluates rules against the selected dataset, and linked alerts.
- **Deterministic scenario simulator** running in a Web Worker with five scenarios, configurable seed/speed, progress reporting, and result history.
- **Reports** with range-scoped KPIs, severity and pipeline breakdowns, top rules/hosts, event types, scenario runs, and JSON/CSV/print export.
- **Settings and audit** covering theme, table density, default time range, simulation speed, notifications, analyst identity, data export, demo reset, and a searchable audit trail.
- **Global shell** with command palette (`Ctrl/Cmd+K`), time range picker, notification panel, light/dark themes, density modes, and synthetic-data labelling.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Command center and overview |
| `/events` | Security event explorer |
| `/alerts` | Alert queue and triage lifecycle |
| `/network` | Entity relationship graph |
| `/incidents` | Incident queue |
| `/incidents/[id]` | Incident investigation workspace |
| `/assets` | Asset inventory and risk |
| `/intelligence` | Threat indicator explorer |
| `/rules` | Detection rule management and test bench |
| `/playbooks` | Response playbook library |
| `/scenarios` | Deterministic scenario simulator |
| `/reports` | Operational reporting and exports |
| `/settings` | Preferences, data management, and demo reset |
| `/audit` | Audit trail |

## Tech stack

- Next.js 15 App Router, React 19, TypeScript strict mode
- Tailwind CSS with custom tactical design tokens
- Dexie (IndexedDB) for browser-local persistence
- Zustand for UI, settings, time range, and simulation state
- Zod for domain validation
- D3 for the relationship graph; Recharts for dashboard charts
- Web Worker for scenario simulation
- Vitest for unit/integration tests; Playwright for browser flows

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The database is seeded automatically on first load.

For a production check:

```bash
npm run build
npm run start
```

The E2E suite expects the app on port `3100`; Playwright starts or reuses that server automatically.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run Next.js ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run Vitest unit/integration tests |
| `npm run test:e2e` | Run Playwright browser tests |

## Data and privacy

- All telemetry is generated locally and stored in IndexedDB.
- External IPs use documentation ranges (`198.51.100.0/24`, `203.0.113.0/24`, `192.0.2.0/24`).
- No analytics, connectors, credentials, or outbound API calls are required.
- "Reset demo data" in Settings restores the seeded world; export options let you inspect or back up local data first.
- The seed version is tracked in the local `meta` table so a changed seed dataset is reloaded automatically.

## Determinism

Scenario runs use a seeded `mulberry32` PRNG. The same scenario, seed, speed, and step sequence produce the same event descriptions, timestamps, and alert evidence. Scenario cards expose their default seed, and the completion summary reports events, alerts, and seed.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The repository includes unit tests for validation, PRNG, graph construction, dashboard derivations, simulation determinism/detection, seed integrity, and browser E2E coverage for navigation, event filtering, alert lifecycle, command palette, scenario completion, and report export. See [docs/testing.md](docs/testing.md).

## Project structure

```text
src/
  app/            Next.js routes, layout, loading/error/not-found states
  components/     Shared shell, dashboard widgets, and UI primitives
  features/       Feature modules (events, alerts, incidents, graph, rules, ...)
  domain/         Models, state machines, and Zod schemas
  data/           Dexie repositories and the synthetic seed world
  simulation/     PRNG, detection engine, scenario engine, worker, runner
  store/          Zustand stores
  hooks/          Live Dexie query hooks
  lib/            Time, export, audit, and storage helpers
e2e/              Playwright smoke and flow tests
docs/             Architecture, data model, and testing notes
```

## Limitations

- This is a demonstration environment, not a production SOC platform.
- Data is synthetic and browser-local; there is no server API, authentication, or multi-user sync.
- Connectors, alert ingestion, and real threat intelligence are intentionally out of scope.
- Clearing browser storage removes local changes unless exported first.
- The relationship graph is optimized for the seeded dataset size, not internet-scale graphs.

## Documentation

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [Testing](docs/testing.md)
- [Product requirements](PRD.md)
- [Design specification](docs/superpowers/specs/2026-10-21-sentinelx-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-21-sentinelx-implementation.md)
