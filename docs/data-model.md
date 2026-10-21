# SentinelX Data Model

All data is stored in the browser's IndexedDB through Dexie. Entity IDs are stable strings and cross-references are validated by tests. The seed world is fictional; external IPs use RFC 5737 documentation ranges.

## 1. Tables and indexes

| Table | Primary key | Indexes |
| --- | --- | --- |
| `events` | `id` | `timestamp`, `eventType`, `severity`, `sourceHostId`, `destinationHostId`, `userId`, `scenarioId`, `[severity+timestamp]` |
| `alerts` | `id` | `title`, `severity`, `status`, `ruleId`, `incidentId`, `firstSeen`, `scenarioId`, `[status+severity]` |
| `incidents` | `id` | `title`, `severity`, `status`, `assignedTo`, `createdAt`, `updatedAt`, `[status+updatedAt]` |
| `assets` | `id` | `name`, `type`, `environment`, `riskScore`, `[type+environment]` |
| `detectionRules` | `id` | `name`, `enabled`, `severity`, `detectionType` |
| `scenarios` | `id` | `title`, `difficulty` |
| `auditLog` | `id` | `timestamp`, `action`, `entityType`, `entityId`, `[entityType+entityId]` |
| `settings` | `key` | - |
| `indicators` | `id` | `type`, `value`, `riskRating` |
| `playbooks` | `id` | `name` |
| `scenarioResults` | `id` | `scenarioId`, `completedAt` |
| `meta` | `key` | - |

`settings` and `meta` are key/value tables. `meta` currently stores `seed-version`.

## 2. Entities

### 2.1 SecurityEvent

```ts
interface SecurityEvent {
  id: string;
  timestamp: string;              // ISO 8601
  eventType: string;              // authentication_success, dns_query, ...
  severity: "info" | "low" | "medium" | "high" | "critical";
  sourceHostId: string | null;
  destinationHostId: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  userId: string | null;
  description: string;
  relatedAlertIds: string[];
  scenarioId: string | null;
  details?: Record<string, unknown>; // detection fields, e.g. bytesOut, processName
}
```

Detection-relevant fields such as `bytesOut`, `processName`, `domain`, `suspicious`, `afterHours`, and `segment` live in `details`. Rules reference them as `details.<field>`.

### 2.2 Alert

```ts
interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: "new" | "in_review" | "escalated" | "resolved" | "dismissed";
  confidence: number;             // 0-100
  ruleId: string;
  firstSeen: string;
  lastSeen: string;
  relatedEventIds: string[];
  relatedAssetIds: string[];
  relatedEntityIds: string[];     // users, IPs, hostnames
  incidentId: string | null;
  assignedTo: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  notes: AlertNote[];
  scenarioId: string | null;
}
```

Alert lifecycle:

```text
new ──> in_review ──> escalated ──> resolved
 |          |             |
 +──────────+─────────────+──────> dismissed
```

Terminal statuses (`resolved`, `dismissed`) cannot be reopened. `acknowledgedAt` is set on `in_review`; `resolvedAt` and `resolution` are set on terminal transitions.

### 2.3 Incident

```ts
interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: "open" | "investigating" | "contained" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  alertIds: string[];
  eventIds: string[];
  assetIds: string[];
  timeline: TimelineEntry[];
  findings: Finding[];
  playbookId: string | null;
  playbookProgress: PlaybookProgress[];
  falsePositive: boolean;
  closedReason: string | null;
  resolutionSummary: string | null;
}
```

Incident lifecycle:

```text
open ──> investigating ──> contained ──> resolved ──> closed
  |            |                |
  +────────────+────────────────+──────────────> closed
               ^                    |
               +────── reopen ──────+  (resolved/contained -> investigating)
```

`TimelineEntry` records type, title, description, entity type/id, actor, and optional metadata. `Finding` records title, description, severity, evidence event IDs, author, and timestamp. `PlaybookProgress` records step completion, who completed it, when, and notes.

### 2.4 Asset

```ts
interface Asset {
  id: string;
  name: string;
  type: "workstation" | "server" | "application" | "gateway" | "identity";
  environment: string;
  os: string;
  ipAddress: string;
  riskScore: number;              // 0-100
  riskFactors: string[];
  lastSeen: string;
  relatedAlertIds: string[];
  tags: string[];
}
```

The asset explorer derives last-observed time from the newest event involving the asset, falling back to `lastSeen`.

### 2.5 DetectionRule

```ts
interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  detectionType: "threshold" | "pattern" | "correlation" | "anomaly";
  conditions: RuleCondition[];
  logSources: string[];
  origin: "demo" | "custom";
  lastFiredAt: string | null;
  alertCount: number;
}

interface RuleCondition {
  field: string;                  // event property or details.<field>
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "nin";
  value: string | number | string[];
  timeWindowSeconds?: number;
  groupBy?: string;
  threshold?: number;
}
```

A condition with `threshold` is both a predicate and a window/grouping instruction. The engine evaluates all conditions as predicates, then applies the threshold per group within the window. `lastFiredAt` and `alertCount` are derived from alerts for display.

### 2.6 ThreatIndicator

```ts
interface ThreatIndicator {
  id: string;
  type: "ip" | "domain" | "file_hash" | "username" | "hostname";
  value: string;
  source: string;
  confidence: number;             // 0-100
  riskRating: "low" | "medium" | "high" | "critical";
  firstSeen: string;
  lastSeen: string;
  description: string;
  relatedEventIds: string[];
  relatedAlertIds: string[];
  relatedAssetIds: string[];
  analystNotes: string;
  synthetic: true;
}
```

Indicator notes are editable in the drawer. Saving writes an `indicator.notes_updated` audit entry.

### 2.7 Playbook

```ts
interface Playbook {
  id: string;
  name: string;
  description: string;
  applicableTo: string[];
  steps: PlaybookStep[];
}

interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: "action" | "decision" | "documentation" | "verification";
  required: boolean;
  estimatedMinutes: number;
}
```

Incidents reference a playbook and store per-step progress. Completion percentage is computed from completed steps.

### 2.8 Scenario and ScenarioResult

```ts
interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  learningObjectives: string[];
  estimatedDurationMinutes: number;
  seed: number;
  phases: ScenarioPhase[];
  ruleIds: string[];
  expectedFindings: string[];
  successCriteria: string[];
  evaluationQuestions: { question: string; expectedAnswerHint: string }[];
  sampleEvents: SecurityEvent[];
  rules: DetectionRule[];
  severity: Severity;
}

interface ScenarioResult {
  id: string;
  scenarioId: string;
  completedAt: string;
  eventsGenerated: number;
  alertsGenerated: number;
  durationSeconds: number;
  checkedCriteria: number[];
  notes: string;
}
```

Scenario results are persisted on completion and shown in reports and the scenarios page.

### 2.9 AuditEntry

```ts
interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;                 // alert.acknowledged, rule.updated, ...
  entityType:
    | "event" | "alert" | "incident" | "asset" | "rule"
    | "indicator" | "playbook" | "scenario" | "settings"
    | "report" | "system";
  entityId: string;
  entityLabel: string;
  details: Record<string, unknown>;
  userId: string;
}
```

Audit entries are append-only from the UI's perspective. They record alert transitions, assignments, notes, incident creation/updates, rule toggles, indicator notes, settings changes, scenario runs, and demo resets.

### 2.10 AppSettings

```ts
interface AppSettings {
  theme: "dark" | "light" | "system";
  tableDensity: "compact" | "normal" | "comfortable";
  simulationSpeed: number;
  notificationsEnabled: boolean;
  defaultTimeRange: "1h" | "6h" | "24h" | "7d" | "30d";
  analystName: string;
}
```

## 3. Relationships

```text
Scenario 1 ──< SecurityEvent >── 1 Alert (via rule + event links)
                     │
                     ├──< relatedAlertIds >── Alert
                     └──< relatedEventIds >── Incident

DetectionRule 1 ──< Alert
Alert * ──< incidentId >── 1 Incident
Incident * ──< alertIds/eventIds/assetIds >── Assets/Events/Alerts
Incident * ──< playbookId >── 1 Playbook
ThreatIndicator * ──< relatedEventIds/relatedAlertIds/relatedAssetIds >── Events/Alerts/Assets
AuditEntry * ──< entityType/entityId >── Any entity
```

Seed links are verified in both directions by `src/data/seed/__tests__/seed.test.ts`: alert-to-event, event-to-alert, incident-to-alert/event/asset, incident-to-alert backlinks, and indicator-to-event/alert/asset references must all resolve.

## 4. Invariants

- Every ID is unique within its table.
- Every alert has at least one related event in the seed dataset.
- Every event's `relatedAlertIds` resolves to an existing alert.
- Every incident's alert/event/asset IDs resolve; its timeline is chronological.
- Alert and incident transitions must be allowed by their state machines.
- Terminal alerts cannot be reopened.
- Rule conditions must resolve against the event shape they target (`details.*` for nested telemetry fields).
- Seeded telemetry never has a timestamp after the seed anchor.
- Settings and `meta` rows are keyed by string.
- Scenario results reference an existing scenario by ID.

## 5. Seed world

The seed dataset models Meridian Logistics over the previous seven days:

- ~700+ events across authentication, network, DNS, file access, process creation, data transfer, configuration, and malware event types
- 18 alerts across the full lifecycle
- 4 incidents (`INC-2026-014`, `INC-2026-013`, `INC-2026-011`, `INC-2026-009`)
- 20 assets (workstations, servers, applications, gateways, identities)
- 10 detection rules
- 4 response playbooks
- 12 threat indicators
- 5 scenarios with seeds `101`, `202`, `303`, `404`, `505`

The seed version is stored in `meta` under `seed-version`. Bumping it causes the next load to reseed the demo dataset.

## 6. Validation

`src/domain/validation/schemas.ts` defines Zod schemas for events, alerts, incidents, assets, rules, indicators, audit entries, timeline entries, and findings. Repositories parse writes before persisting, so malformed records fail at the boundary. Tests cover valid and invalid payloads.
