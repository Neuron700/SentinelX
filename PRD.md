# SentinelX Product Requirements

## 1. Product summary

SentinelX is a local-first Cyber Defense Intelligence Platform for demonstrating and practicing security operations workflows. It presents a complete SOC surface - detection, triage, investigation, threat context, response, reporting, and audit - against a deterministic synthetic dataset.

The product is a demonstration and training environment. It must never imply a connection to real infrastructure or include offensive capability.

## 2. Goals

1. Provide an end-to-end SOC workflow that a reviewer can explore without setup, credentials, or external services.
2. Make every displayed metric traceable to the local dataset; no hard-coded dashboard numbers.
3. Demonstrate defensible detection engineering: rules are inspectable, testable, and affect future simulated alerts.
4. Show incident response as a lifecycle with evidence, findings, playbooks, and an audit trail.
5. Keep the experience fast, responsive, and visually credible on a single laptop.

## 3. Non-goals

- Real SIEM/EDR integrations or network collection.
- User authentication, authorization, or multi-tenant isolation.
- Offensive scanning, exploitation, or malware execution.
- Production-scale ingestion, storage, or distributed processing.
- Regulatory compliance certification.

## 4. Personas

| Persona | Needs |
| --- | --- |
| SOC analyst | Triage alerts, inspect telemetry, record notes, promote incidents |
| Detection engineer | Review rules, test conditions against telemetry, enable/disable rules |
| Incident responder | Work an incident timeline, findings, and playbook steps |
| Security lead | Review operational KPIs, severity mix, MTTA/MTTR, and audit history |
| Demo reviewer | Understand the platform quickly and verify that data is synthetic |

## 5. Functional requirements

### 5.1 Command center

- Show events analyzed, critical alerts, active incidents, monitored assets, MTTA, and MTTR for the selected time range.
- Render event volume by severity, severity mix, alert activity, event categories, host activity, and simulation status.
- Provide shortcuts to the incident queue and scenario simulator.
- All values must update when the global time range changes.

### 5.2 Event explorer

- Search by description, IP, user, host, or event ID.
- Filter by severity, event type, host, and scenario.
- Sort by timestamp and severity; paginate results.
- Open a detail drawer with core fields, detection fields, linked alerts, and raw record.
- Export the filtered view as CSV.
- Support deep links for event, severity, type, host, scenario, and search.

### 5.3 Alert queue

- Provide status tabs and summary counts for new, in review, escalated, resolved, and dismissed.
- Search by title or ID; filter by rule, assignee, and severity.
- Enforce the alert state machine: `new -> in_review -> escalated -> resolved|dismissed`.
- Support assignment, notes, incident creation, and links to related telemetry.
- Write every state change, assignment, note, and incident promotion to the audit trail.
- Require a resolution note for terminal transitions.

### 5.4 Network graph

- Derive nodes and links from events, alerts, and incidents in the selected range.
- Distinguish hosts, users, external IPs, domains, alerts, and incidents.
- Support search, hover labels, node selection, zoom/pan, and detail links.
- Avoid implying unobserved relationships.

### 5.5 Incidents

- List incidents with severity, status, assignee, and linked alert counts.
- Create a manual incident or promote an alert.
- Provide overview, timeline, findings, and playbook tabs.
- Enforce the incident state machine: `open -> investigating -> contained|resolved|closed`, with allowed reopen paths.
- Support notes/findings, assignment, playbook step completion, and deep links to tabs.

### 5.6 Assets

- Inventory hosts, servers, applications, gateways, and identity assets.
- Show composite risk score, risk factors, tags, related alerts, and recent telemetry.
- Derive last-observed time from actual events, not a static value.
- Link to filtered events, graph, and related alerts.

### 5.7 Threat intelligence

- List indicators with type, risk rating, confidence, source, related alerts, and last seen.
- Filter by type and risk; search by value, source, or description.
- Allow analyst notes to be saved locally and audited.
- Link indicators to matching telemetry, alerts, assets, and graph views.

### 5.8 Detection rules

- List rule name, description, severity, type, conditions, alert count, and last fired.
- Enable or disable rules; persist the change and audit it.
- Provide a test bench that evaluates a rule against the selected time range without creating alerts.
- Show linked alerts and support deep links to the alert queue.
- Threshold rules must only count events that satisfy the rule's own match conditions.

### 5.9 Playbooks

- Provide reusable response procedures with ordered steps, types, required flags, and time estimates.
- Show linked incidents and allow the incident workspace to track progress.
- Persist step completion and notes.

### 5.10 Scenario simulator

- Offer five scenarios with difficulty, category, objectives, expected findings, and evaluation questions.
- Run in a Web Worker with configurable speed and deterministic seed.
- Show progress, simulated clock, events generated, alerts raised, and completion summary.
- Persist scenario results for reports and history.
- Simulated events and alerts must be labelled as synthetic and linked to the scenario.

### 5.11 Reports

- Provide range-scoped KPIs, severity distribution, alert pipeline, top rules, top hosts, event type breakdown, and scenario runs.
- Export a JSON report, alerts CSV, events CSV, and print view.
- Export filenames include a timestamp.

### 5.12 Settings and audit

- Configure theme, table density, default time range, simulation speed, notifications, and analyst identity.
- Show local data counts; export all data; reset demo data; reset preferences.
- Record settings changes in the audit trail.
- Provide a searchable, filterable audit trail with CSV export and entry details.

### 5.13 Global experience

- Command palette with `Ctrl/Cmd+K` for navigation and dataset search.
- Global time range picker with presets.
- Notification panel for recent alerts/events.
- Persistent synthetic-data banner.
- Responsive layout for laptop and tablet widths.
- Loading, error, empty, and not-found states.
- Light and dark themes with accessible contrast.

## 6. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Privacy | No outbound network calls for telemetry; no secrets or credentials |
| Determinism | Same scenario + seed + speed + step sequence yields the same output |
| Traceability | Dashboard and report metrics derive from repositories, not constants |
| Performance | Initial route render under a few seconds on a modern laptop; interactions remain responsive |
| Accessibility | Keyboard-operable dialogs/palette, visible focus states, labelled controls, non-color severity cues |
| Resilience | Global error, loading, and not-found boundaries; failed actions surface toasts and do not corrupt state |
| Auditability | User actions append immutable local audit entries without blocking the primary action |
| Maintainability | Typed domain models, Zod validation, repository boundaries, feature modules |

## 7. Acceptance criteria

- All routes load with seeded data and no browser console/page errors.
- Time range changes affect dashboard, explorer, and report metrics.
- Event search/filter/detail/export work.
- Alert lifecycle transitions are enforced and audited.
- Alert promotion creates a linked incident.
- Incident tabs, timeline, findings, and playbook progress work and persist.
- Graph renders and selection reveals entity details.
- Rule enable/disable persists; the test bench reports matching events and groups.
- Scenario run completes with deterministic events and alerts.
- Reports export valid JSON/CSV and print.
- Reset demo restores the seed world.
- Typecheck, lint, unit tests, production build, and Playwright flows pass.

## 8. Success metrics

- A new reviewer can explain the product and navigate the core flow within five minutes.
- Every visible KPI can be traced to a repository-backed query.
- No dead controls; every action has a visible outcome or explicit disabled reason.
- Synthetic data is labelled on every relevant surface.

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Synthetic data feels disconnected | Consistent seed world, entity IDs, and cross-links |
| Detection logic is cosmetic | Shared rule evaluator, test bench, deterministic simulation |
| IndexedDB state drifts during demos | Reset demo, seed versioning, export all data |
| Graph becomes unreadable | Degree-aware labels, deterministic layout, search/selection |
| Audit noise | Filterable audit explorer and capped tables |

## 10. Out of scope

- Real connectors, ingestion pipelines, or enrichment services.
- Authentication, RBAC, approvals, or multi-user collaboration.
- Automated response actions against real systems.
- Mobile-first layouts below tablet width.
- Machine-learning detection or model training.
