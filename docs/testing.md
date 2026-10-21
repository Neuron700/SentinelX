# SentinelX Testing

## 1. Strategy

SentinelX uses three layers:

1. **Unit tests** for pure logic: validation, PRNG determinism, graph construction, dashboard derivations, rule matching, and seed integrity.
2. **Integration tests** for the simulation engine and the seeded database, including cross-entity references.
3. **Browser E2E tests** for navigation and the core analyst flows.

The app is browser-local, so tests avoid network mocks. Vitest runs in a jsdom environment with `fake-indexeddb` for repository tests. Playwright drives the production build in system Chrome.

## 2. Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright expects the app on `http://localhost:3100`. Its config starts `npm run start -- -p 3100` or reuses an existing server. Build the app before running E2E if a server is not already running.

## 3. Unit and integration coverage

| Suite | File | What it verifies |
| --- | --- | --- |
| Validation | `src/domain/__tests__/validation.test.ts` | Zod accepts valid entities and rejects invalid severity/status/fields |
| PRNG | `src/simulation/__tests__/prng.test.ts` | Same seed yields the same sequence; different seeds diverge; ranges are respected |
| Graph | `src/features/graph/__tests__/build-graph.test.ts` | Nodes/links derive from events, alerts, and incidents; deduplication; metadata |
| Dashboard derivations | `src/features/overview/__tests__/derive.test.ts` | KPIs, severity counts, series bucketing, bucket alignment, alert series |
| Simulation engine | `src/simulation/__tests__/engine.test.ts` | Determinism, synthetic labelling, threshold firing, completion, clock |
| Detection | `src/simulation/__tests__/detection.test.ts` | Threshold predicates, unrelated events excluded, rule test bench, seed rule integration |
| Seed integrity | `src/data/seed/__tests__/seed.test.ts` | Entity counts, alert/event/incident/indicator references, chronological timelines, no future telemetry, determinism |

Run a single suite:

```bash
npx vitest run src/simulation/__tests__/detection.test.ts
```

## 4. E2E coverage

Playwright runs seven tests in one Chrome worker:

| Test | Flow |
| --- | --- |
| Route smoke | Visits every route and asserts the page heading and zero console/page errors |
| Incident deep link | Opens `/incidents/INC-2026-014?tab=findings` and verifies the selected tab |
| Event explorer | Filters by `powershell`, verifies matching rows, opens/closes the detail drawer |
| Alert lifecycle | Acknowledges, escalates, and resolves an alert; verifies toasts and audit entries |
| Command palette | Opens with `Ctrl+K`, searches, navigates to Assets |
| Scenario simulator | Runs a scenario at 8x, waits for completion, verifies generated events/alerts |
| Report export | Exports JSON and checks the suggested filename |

Run a single test:

```bash
npx playwright test e2e/flows.spec.ts --grep "alert lifecycle"
```

## 5. Verification results

At the time of delivery:

- `npm run typecheck` - clean
- `npm run lint` - no warnings or errors
- `npm test` - 41 tests across 7 files passing
- `npm run build` - 16 routes generated successfully
- `npm run test:e2e` - 7 Playwright tests passing
- Manual production QA - all routes rendered with no browser console/page errors; scenario completed with deterministic output; theme toggle, command palette, drawers, filters, and exports verified

## 6. Manual QA checklist

For a release candidate, verify:

- [ ] Dashboard KPIs and charts change with the global time range.
- [ ] Event search, severity/type/host/scenario filters, sorting, pagination, drawer, and CSV export.
- [ ] Alert acknowledge/escalate/resolve/dismiss transitions and audit entries.
- [ ] Alert promotion creates a linked incident and opens its workspace.
- [ ] Incident timeline is chronological; findings and playbook progress persist after reload.
- [ ] Graph search, selection, hover labels, zoom, and detail links.
- [ ] Asset last-observed time is derived from events and is never in the future.
- [ ] Indicator notes save and appear in audit.
- [ ] Rule enable/disable persists; test bench reports matching events and groups.
- [ ] Scenario runs to completion; events/alerts are labelled synthetic.
- [ ] Reports JSON/CSV/print exports contain the selected range.
- [ ] Settings changes persist; reset demo restores the seed world.
- [ ] Light theme and table density apply across tables and drawers.
- [ ] Command palette, notifications, and time range picker work with the keyboard.

## 7. Test data

- Vitest uses unique IndexedDB database names per test and deletes them afterward.
- Playwright creates a fresh browser context per test, so IndexedDB starts empty and reseeds automatically.
- Tests do not depend on the order of the seed's random picks except where determinism is explicitly asserted with a fixed anchor/seed.
- Seed timestamps are clamped to the anchor so relative-time assertions are stable.

## 8. Known gaps

- No visual regression snapshots.
- No accessibility automation beyond semantic selectors and keyboard flows.
- No load testing at 50k+ events; pagination and indexes are in place but not benchmarked.
- No cross-browser matrix; E2E runs in system Chrome.
- Playwright uses the installed Chrome channel rather than downloading a bundled browser.
