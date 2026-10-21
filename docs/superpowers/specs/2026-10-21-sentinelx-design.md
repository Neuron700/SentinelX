# SentinelX — Cyber Defense Intelligence Platform

## Design Specification

**Version:** 1.0  
**Date:** 2026-10-21  
**Status:** Approved for Implementation

---

## 1. Overview

SentinelX is a cybersecurity training and demonstration platform simulating Security Operations Center (SOC) workflows. It provides interactive visualization, event correlation, incident investigation, and incident response simulation using synthetic datasets.

**Core Philosophy:** Every visualization and metric derives from actual application data — no fake numbers, no decorative-only charts. Simulation runs locally with deterministic, reproducible scenarios.

---

## 2. Architecture

### 2.1 High-Level Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Shared UI components (shadcn/ui based)
├── features/               # Feature modules
│   ├── events/
│   ├── alerts/
│   ├── incidents/
│   ├── network/
│   ├── scenarios/
│   └── reports/
├── domain/                 # Pure domain logic (no React deps)
│   ├── models/             # TypeScript types + Zod schemas
│   ├── validation/         # Zod validators
│   ├── detection/          # Detection rule engine
│   ├── correlation/        # Event correlation logic
│   └── investigation/      # Investigation workflow logic
├── simulation/             # Simulation engine (Web Worker)
│   ├── engine.ts
│   ├── scenarioRunner.ts
│   ├── eventGenerator.ts
│   ├── detectionEngine.ts
│   └── scenarios/
├── data/                   # Data layer
│   ├── seed/
│   ├── fixtures/
│   └── repositories/
├── store/                  # Zustand stores
├── lib/                    # Utilities
│   ├── storage/            # Dexie.js database setup
│   ├── export/             # Report generators
│   ├── time/               # date-fns utilities
│   └── utils/
├── hooks/                  # Custom React hooks
└── test/                   # Test utilities
```

### 2.2 Architectural Principles

1. **Domain-Driven:** Business logic in `domain/` — framework-agnostic, unit-testable
2. **Repository Pattern:** Data access abstracted behind interfaces (swap local → API later)
3. **Worker Isolation:** Simulation runs in Web Worker; main thread receives events via `postMessage`
4. **Single Source of Truth:** Repositories → Zustand stores → Components
5. **Explicit Dependencies:** No circular imports; dependency direction: UI → Store → Repository → Domain

---

## 3. Data Layer

### 3.1 Database Schema (Dexie.js / IndexedDB)

```typescript
// Core Entities
interface SecurityEvent {
  id: string;
  timestamp: string;           // ISO 8601
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  sourceHostId: string | null;
  destinationHostId: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  userId: string | null;
  description: string;
  relatedAlertIds: string[];
  scenarioId: string | null;
}

interface Alert {
  id: string;
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_review' | 'escalated' | 'resolved' | 'dismissed';
  confidence: number;          // 0-100
  ruleId: string;
  firstSeen: string;
  lastSeen: string;
  relatedEventIds: string[];
  relatedAssetIds: string[];
  incidentId: string | null;
  assignedTo: string | null;
  notes: AlertNote[];
}

interface AlertNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  alertIds: string[];
  eventIds: string[];
  assetIds: string[];
  timeline: TimelineEntry[];
  findings: Finding[];
  playbookProgress: PlaybookProgress[];
}

interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'event' | 'alert' | 'action' | 'note' | 'status_change';
  title: string;
  description: string;
  entityId: string;
  entityType: 'event' | 'alert' | 'incident' | 'asset';
  actor?: string;
  metadata?: Record<string, unknown>;
}

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  evidenceIds: string[];       // event/alert IDs supporting this finding
  createdAt: string;
  author: string;
}

interface PlaybookProgress {
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
}

interface Asset {
  id: string;
  name: string;
  type: 'workstation' | 'server' | 'application' | 'user_account' | 'gateway' | 'endpoint';
  environment: string;
  os: string | null;
  riskScore: number;           // 0-100
  lastSeen: string;
  relatedAlertIds: string[];
  tags: string[];
}

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  detectionType: 'threshold' | 'pattern' | 'anomaly' | 'correlation';
  conditions: RuleCondition[];
  logSources: string[];
}

interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex' | 'in' | 'nin';
  value: unknown;
  timeWindow?: number;         // seconds
  groupBy?: string;
  threshold?: number;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  events: SecurityEvent[];     // Pre-defined or generator config
  rules: DetectionRule[];
  expectedFindings: string[];
  successCriteria: string[];
  estimatedDurationMinutes: number;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: 'event' | 'alert' | 'incident' | 'asset' | 'rule' | 'scenario' | 'settings';
  entityId: string;
  details: Record<string, unknown>;
  userId: string;              // 'demo-user' for MVP
}

interface Settings {
  key: string;
  value: unknown;
}
```

### 3.2 Repository Interfaces

```typescript
// Base repository contract
interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, changes: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  query(filter: QueryFilter<T>): Promise<T[]>;
  subscribe(callback: (entities: T[]) => void): () => void;
}

// Specialized repositories
interface EventRepository extends Repository<SecurityEvent> {
  getByTimeRange(start: Date, end: Date): Promise<SecurityEvent[]>;
  getByScenario(scenarioId: string): Promise<SecurityEvent[]>;
  getByHost(hostId: string): Promise<SecurityEvent[]>;
  search(query: string, filters: EventFilters): Promise<SecurityEvent[]>;
  getCountBySeverity(timeRange?: TimeRange): Promise<Record<Severity, number>>;
  getTimelineData(timeRange: TimeRange, interval: string): Promise<TimeSeriesData[]>;
}

interface AlertRepository extends Repository<Alert> {
  getByStatus(status: AlertStatus): Promise<Alert[]>;
  getByRule(ruleId: string): Promise<Alert[]>;
  getUnassigned(): Promise<Alert[]>;
  linkToIncident(alertId: string, incidentId: string): Promise<void>;
  unlinkFromIncident(alertId: string): Promise<void>;
}

interface IncidentRepository extends Repository<Incident> {
  getByStatus(status: IncidentStatus): Promise<Incident[]>;
  getByAssignedTo(userId: string): Promise<Incident[]>;
  addTimelineEntry(incidentId: string, entry: TimelineEntry): Promise<void>;
  addFinding(incidentId: string, finding: Finding): Promise<void>;
  updatePlaybookProgress(incidentId: string, progress: PlaybookProgress): Promise<void>;
}
```

### 3.3 Repository Implementation (Dexie.js)

```typescript
// Dexie database definition
class SentinelXDatabase extends Dexie {
  events!: Dexie.Table<SecurityEvent, string>;
  alerts!: Dexie.Table<Alert, string>;
  incidents!: Dexie.Table<Incident, string>;
  assets!: Dexie.Table<Asset, string>;
  detectionRules!: Dexie.Table<DetectionRule, string>;
  scenarios!: Dexie.Table<Scenario, string>;
  auditLog!: Dexie.Table<AuditEntry, string>;
  settings!: Dexie.Table<Settings, string>;

  constructor() {
    super('SentinelXDB');
    this.version(1).stores({
      events: 'id, timestamp, eventType, severity, sourceHostId, scenarioId, [severity+timestamp]',
      alerts: 'id, title, severity, status, ruleId, incidentId, firstSeen, [status+severity]',
      incidents: 'id, title, severity, status, assignedTo, createdAt, [status+updatedAt]',
      assets: 'id, name, type, environment, riskScore, [type+environment]',
      detectionRules: 'id, name, enabled, severity, detectionType',
      scenarios: 'id, title, difficulty',
      auditLog: 'id, timestamp, action, entityType, entityId, [entityType+entityId]',
      settings: 'key'
    });
  }
}
```

---

## 4. State Management (Zustand)

### 4.1 Store Definitions

```typescript
// Event store
interface EventState {
  events: SecurityEvent[];
  filteredEvents: SecurityEvent[];
  filters: EventFilters;
  pagination: PaginationState;
  selectedEvent: SecurityEvent | null;
  loading: boolean;
  error: string | null;
  // Actions
  setEvents: (events: SecurityEvent[]) => void;
  setFilters: (filters: Partial<EventFilters>) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  selectEvent: (event: SecurityEvent | null) => void;
  applyFilters: () => void;
}

interface EventFilters {
  timeRange: TimeRange | null;
  severities: Severity[];
  eventTypes: string[];
  hostIds: string[];
  userIds: string[];
  searchQuery: string;
}

// Alert store
interface AlertState {
  alerts: Alert[];
  filteredAlerts: Alert[];
  filters: AlertFilters;
  selectedAlert: Alert | null;
  loading: boolean;
  // Actions
  acknowledgeAlert: (alertId: string, userId: string) => Promise<void>;
  assignAlert: (alertId: string, userId: string) => Promise<void>;
  escalateAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, resolution: string) => Promise<void>;
  dismissAlert: (alertId: string, reason: string) => Promise<void>;
  createIncidentFromAlert: (alertId: string, incidentData: Partial<Incident>) => Promise<Incident>;
  linkToIncident: (alertId: string, incidentId: string) => Promise<void>;
}

// Incident store
interface IncidentState {
  incidents: Incident[];
  selectedIncident: Incident | null;
  investigationMode: boolean;
  // Actions
  createIncident: (data: CreateIncidentData) => Promise<Incident>;
  updateIncident: (id: string, changes: Partial<Incident>) => Promise<void>;
  addTimelineEntry: (incidentId: string, entry: TimelineEntry) => Promise<void>;
  addFinding: (incidentId: string, finding: Finding) => Promise<void>;
  updatePlaybookStep: (incidentId: string, stepId: string, completed: boolean, notes?: string) => Promise<void>;
  changeStatus: (incidentId: string, status: IncidentStatus, reason: string) => Promise<void>;
}

// Network graph store
interface NetworkState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  focusedIncident: string | null;
  filters: GraphFilters;
  layout: 'force' | 'hierarchical' | 'circular';
  // Actions
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  selectNode: (node: GraphNode | null) => void;
  focusIncident: (incidentId: string | null) => void;
  setFilters: (filters: Partial<GraphFilters>) => void;
  setLayout: (layout: NetworkState['layout']) => void;
}

// Scenario store
interface ScenarioState {
  scenarios: Scenario[];
  runningScenario: RunningScenario | null;
  simulationSpeed: number;     // 0.1 - 10
  isPaused: boolean;
  // Actions
  startScenario: (scenarioId: string) => Promise<void>;
  pauseScenario: () => void;
  resumeScenario: () => void;
  stopScenario: () => void;
  setSpeed: (speed: number) => void;
  stepScenario: () => Promise<void>;
}

interface RunningScenario {
  scenarioId: string;
  startTime: Date;
  eventsGenerated: number;
  alertsGenerated: number;
  currentPhase: string;
}

// Settings store
interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  timeRange: TimeRange;
  tableDensity: 'compact' | 'normal' | 'comfortable';
  notificationsEnabled: boolean;
  simulationSpeed: number;
  // Actions
  updateSettings: (settings: Partial<SettingsState>) => void;
  resetToDefaults: () => void;
}
```

### 4.2 Cross-Store Synchronization

Repositories push changes via Dexie's `liveQuery` or manual subscription → stores update → components re-render. Each store subscribes only to its relevant repository.

```typescript
// Example: Event store subscription
const useEventStore = create<EventState>((set, get) => ({
  // ... state
  initialize: () => {
    eventRepository.subscribe((events) => {
      set({ events });
      get().applyFilters();
    });
  }
}));
```

---

## 5. Simulation Engine (Web Worker)

### 5.1 Worker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MAIN THREAD                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Scenario    │    │ Event       │    │ Alert       │     │
│  │ Store       │◄───│ Repository  │◄───│ Repository  │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Simulation Worker Bridge               │   │
│  │  postMessage / onmessage handler                    │   │
│  └────────────────────────────┬────────────────────────┘   │
└───────────────────────────────│─────────────────────────────┘
                                │ postMessage
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      WEB WORKER                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Scenario    │    │ Event       │    │ Detection   │     │
│  │ Runner      │───►│ Generator   │───►│ Engine      │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │             │
│                                                ▼             │
│                                         ┌─────────────┐     │
│                                         │ Alert       │     │
│                                         │ Generator   │     │
│                                         └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Worker Message Protocol

```typescript
// Main → Worker
type WorkerCommand =
  | { type: 'START'; payload: { scenarioId: string; speed: number; seed: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'STEP' }
  | { type: 'SET_SPEED'; payload: { speed: number } }
  | { type: 'UPDATE_RULES'; payload: { rules: DetectionRule[] } };

// Worker → Main
type WorkerEvent =
  | { type: 'EVENTS'; payload: { events: SecurityEvent[]; timestamp: number } }
  | { type: 'ALERTS'; payload: { alerts: Alert[]; timestamp: number } }
  | { type: 'PROGRESS'; payload: { phase: string; eventsGenerated: number; alertsGenerated: number } }
  | { type: 'COMPLETED'; payload: { summary: ScenarioSummary } }
  | { type: 'ERROR'; payload: { message: string; stack?: string } }
  | { type: 'LOG'; payload: { level: 'info' | 'warn' | 'error'; message: string } };
```

### 5.3 Event Generator

```typescript
interface EventGeneratorConfig {
  scenarioId: string;
  seed: number;
  baseEventRate: number;       // events per simulated minute
  eventTemplates: EventTemplate[];
  hostPool: HostConfig[];
  userPool: UserConfig[];
  ipPool: IpConfig[];
}

interface EventTemplate {
  type: string;
  weight: number;              // relative probability
  severityDistribution: Record<Severity, number>;
  generate: (context: GenerationContext) => Partial<SecurityEvent>;
}

interface GenerationContext {
  currentTime: Date;
  previousEvents: SecurityEvent[];
  activeAlerts: Alert[];
  scenarioProgress: number;    // 0-1
}
```

### 5.4 Detection Engine

```typescript
interface DetectionEngine {
  evaluate(event: SecurityEvent, rules: DetectionRule[]): Alert[];
}

function evaluateRule(event: SecurityEvent, rule: DetectionRule, recentEvents: SecurityEvent[]): Alert | null {
  // 1. Check if event matches rule conditions
  // 2. For threshold/correlation rules, query recent events from buffer
  // 3. If matched, create alert with correlation context
  // 4. Return alert or null
}
```

### 5.5 Deterministic Replay

- Seed-based PRNG (mulberry32 or similar) for reproducible event generation
- Scenario stores initial seed; replay uses same seed
- Event timestamps are simulated time, not wall-clock time
- Speed multiplier affects emission rate, not event timestamps

---

## 6. Network Graph (D3.js Force-Directed)

### 6.1 Graph Data Model

```typescript
interface GraphNode {
  id: string;
  type: 'host' | 'user' | 'ip' | 'domain' | 'alert' | 'incident' | 'asset';
  label: string;
  severity?: Severity;
  riskScore?: number;
  metadata: Record<string, unknown>;
  // Visual
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'network_connection' | 'authentication' | 'process' | 'file_access' | 'alert_triggered' | 'incident_contains' | 'asset_related';
  weight: number;
  timestamp?: string;
  metadata: Record<string, unknown>;
}
```

### 6.2 Force Simulation Configuration

```typescript
const simulation = d3.forceSimulation<GraphNode>(nodes)
  .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
    .id(d => d.id)
    .distance(d => 100 / Math.max(1, d.weight))
    .strength(0.7))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 10))
  .force('x', d3.forceX(width / 2).strength(0.1))
  .force('y', d3.forceY(height / 2).strength(0.1))
  .alphaDecay(0.02)
  .velocityDecay(0.4);
```

### 6.3 Rendering Strategy

| Node Count | Renderer |
|------------|----------|
| < 200 | SVG (full interactivity) |
| 200-1000 | Canvas (nodes) + SVG (edges/labels) |
| > 1000 | Canvas only (WebGL via regl if needed) |

### 6.4 Interactions

- **Zoom/Pan:** D3 zoom behavior on container
- **Node Click:** Select → highlight connected edges (1-hop) → open detail panel
- **Node Drag:** Fix position (fx/fy); double-click to release
- **Hover:** Tooltip with entity summary
- **Search:** Filter nodes by label/type; matched nodes highlighted
- **Incident Focus:** Filter to show only nodes connected to selected incident
- **Legend:** Click to toggle node types

---

## 7. Feature Implementation Details

### 7.1 Cyber Command Center (Dashboard)

**KPI Cards** (computed from repositories):
- Total Events: `eventRepository.getCount()`
- Critical Alerts: `alertRepository.getCountBySeverity('critical')`
- Active Incidents: `incidentRepository.getByStatus('investigating').length`
- Assets Monitored: `assetRepository.getAll().length`
- MTTA: Mean time from alert creation to first acknowledgment (calculated from audit trail)
- MTTR: Mean time from incident creation to resolution (for closed incidents)

**Charts:**
- Event Timeline: Area chart (events/hour) — Recharts `AreaChart`
- Severity Distribution: Donut chart — Recharts `PieChart`
- Alert Trend: Line chart (alerts/day by severity) — Recharts `LineChart`
- Top Attack Vectors: Bar chart (event types) — Recharts `BarChart`
- Host Activity: Heatmap (host vs hour) — Custom or Recharts `Heatmap`
- Recent Incidents: Table (last 10)
- Unhandled Alerts: Table (status = new, sorted by severity + time)

**Controls:** Time range picker (last 1h/6h/24h/7d/30d/custom), simulation pause/resume, reset demo

### 7.2 Security Event Explorer

**Table:** TanStack Table v8 with:
- Virtualized rows (react-window)
- Column sorting, resizing, reordering
- Column visibility toggle
- Global search + column filters
- Server-side (IndexedDB) pagination
- Row click → detail drawer

**Filters:**
- Time range (presets + custom)
- Severity multi-select
- Event type multi-select
- Source/Destination host
- User/Account
- Free text search (description, IPs, IDs)

**Detail Drawer:**
- Full event JSON (syntax highlighted)
- Related alerts (clickable)
- Related incident (clickable)
- Host context (asset link)
- Timeline context (±10 events)

**Export:** Current filter → CSV/JSON

### 7.3 Alert Management

**Alert List:** Grouped by status (New, In Review, Escalated, Resolved, Dismissed)

**Detail View:**
- Alert metadata
- Triggering events (linked, clickable)
- Affected assets
- Detection rule details
- Notes thread (add/edit/delete)
- Status actions (buttons per current status)

**Status Transitions:**
```
NEW → IN_REVIEW (acknowledge)
IN_REVIEW → ESCALATED (escalate)
IN_REVIEW → RESOLVED (resolve with notes)
IN_REVIEW → DISMISSED (dismiss with mandatory reason)
ESCALATED → RESOLVED / DISMISSED
RESOLVED / DISMISSED → terminal (can reopen via new alert)
```

**Audit:** Every transition logged with actor, timestamp, previous/new state

### 7.4 Incident Investigation Workspace

**Tabs:**
1. **Overview** — Summary, severity, status, assigned, related counts
2. **Timeline** — Chronological merged view (events, alerts, actions, notes)
3. **Evidence** — Linked events/alerts/assets with tagging
4. **Findings** — Structured findings with evidence links
5. **Playbook** — Checklist with progress tracking
6. **Graph** — Network view focused on this incident

**Timeline Features:**
- Filter by type (event/alert/action/note)
- Expand/collapse entries
- Jump to event/alert detail
- Replay mode: time slider animates timeline entries

**Actions:**
- Add note (timestamped, attributed)
- Link evidence (multi-select events/alerts)
- Create finding (title, description, severity, evidence refs)
- Update playbook step
- Change status (with mandatory reason)

### 7.5 Asset Inventory

**Views:** Table + Graph focus button per asset

**Asset Detail:**
- Basic info
- Risk score breakdown (factors)
- Related alerts (last 30 days)
- Related incidents
- Network connections (graph subset)

### 7.6 Threat Intelligence Explorer

**Search:** By indicator (IP, domain, hash, username, hostname)

**Indicator Detail:**
- Basic info
- First/last observed
- Confidence/risk rating
- Related events (table)
- Related alerts
- Related assets
- Graph relationships
- Analyst notes

### 7.7 Detection Rule Explorer

**Rule List:** Enabled/disabled toggle, severity badge, type

**Rule Detail:**
- Conditions (visual builder for threshold rules)
- Example matching events
- Generated alerts (recent)
- Enable/disable (affects future detection only)

### 7.8 Scenario Simulator

**Scenario List:** Cards with difficulty, duration, objectives

**Running Scenario View:**
- Scenario description
- Live event feed (streaming)
- Alert panel (new alerts highlight)
- Progress bar (phases)
- Controls: Pause, Resume, Speed (0.1x-10x), Step, Stop
- Current phase indicator

**Scenario Definition (JSON):**
```json
{
  "id": "scenario-suspicious-login",
  "title": "Suspicious Login Activity",
  "description": "Detect and investigate anomalous authentication patterns",
  "difficulty": "beginner",
  "learningObjectives": [
    "Identify brute force patterns",
    "Correlate failed/successful logins",
    "Create incident from alerts"
  ],
  "estimatedDurationMinutes": 15,
  "phases": [
    {
      "name": "Reconnaissance",
      "durationSeconds": 60,
      "eventRate": 5,
      "eventTypes": ["failed_login", "port_scan"]
    },
    {
      "name": "Initial Access",
      "durationSeconds": 120,
      "eventRate": 10,
      "eventTypes": ["failed_login", "successful_login", "privilege_escalation"]
    },
    {
      "name": "Discovery",
      "durationSeconds": 180,
      "eventRate": 8,
      "eventTypes": ["process_creation", "network_connection", "file_access"]
    }
  ],
  "rules": ["rule-brute-force", "rule-impossible-travel", "rule-suspicious-process"],
  "expectedFindings": [
    "Attacker IP identified",
    "Compromised account identified",
    "Lateral movement path traced"
  ],
  "successCriteria": [
    "All expected findings documented",
    "Incident created with correct severity",
    "Playbook completed to containment"
  ]
}
```

### 7.9 Incident Response Playbooks

**Playbook Definition:**
```typescript
interface Playbook {
  id: string;
  name: string;
  description: string;
  applicableIncidentTypes: string[];
  steps: PlaybookStep[];
}

interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'action' | 'decision' | 'documentation' | 'verification';
  required: boolean;
  estimatedMinutes: number;
  // For decision steps
  options?: { label: string; nextStepId: string }[];
}
```

**Default Playbooks:**
- "Initial Triage"
- "Credential Compromise Response"
- "Malware Containment"
- "Data Exfiltration Response"
- "Insider Threat Investigation"

### 7.10 Report Generator

**Templates:** Handlebars-like templating for Markdown

**Export Formats:**
- Markdown (primary)
- JSON (structured data)
- CSV (timeline, evidence, findings tables)

**Report Sections:**
1. Incident Identity
2. Executive Summary
3. Severity & Status
4. Timeline (chronological)
5. Affected Entities
6. Related Alerts
7. Investigation Findings
8. Actions Taken
9. Outstanding Items
10. Resolution Summary
11. Appendix: Raw Events/Alerts

**Print CSS:** `@media print` styles for PDF via browser

---

## 8. UI/UX Specification

### 8.1 Design System: "Dark Tactical Intelligence"

**Color Palette:**
```css
:root {
  /* Base */
  --bg-primary: #0a0f1a;        /* Near-black navy */
  --bg-secondary: #111827;      /* Dark slate */
  --bg-tertiary: #1e293b;       /* Slate 800 */
  --bg-card: #1e293b;
  --border: #334155;            /* Slate 700 */
  --border-hover: #475569;      /* Slate 600 */

  /* Text */
  --text-primary: #f1f5f9;      /* Slate 100 */
  --text-secondary: #94a3b8;    /* Slate 400 */
  --text-muted: #64748b;        /* Slate 500 */

  /* Accents */
  --accent-primary: #06b6d4;    /* Cyan 500 */
  --accent-primary-dim: #0891b2; /* Cyan 600 */
  --accent-secondary: #8b5cf6;  /* Violet 500 */

  /* Severity */
  --sev-critical: #ef4444;      /* Red 500 */
  --sev-high: #f97316;          /* Orange 500 */
  --sev-medium: #fbbf24;        /* Amber 500 */
  --sev-low: #3b82f6;           /* Blue 500 */
  --sev-info: #22c55e;          /* Green 500 */

  /* Semantic */
  --success: #22c55e;
  --warning: #fbbf24;
  --danger: #ef4444;
  --focus: #06b6d4;
}
```

**Typography:**
- Font: `IBM Plex Mono` (monospace) + `IBM Plex Sans` (UI)
- Scale: `text-xs` (12px) → `text-sm` (14px) → `text-base` (16px) → `text-lg` (18px) → `text-xl` (20px) → `text-2xl` (24px) → `text-3xl` (30px)
- Monospace for: IDs, timestamps, IPs, hashes, code, JSON

**Spacing:** 4px base unit (Tailwind default)

**Border Radius:** `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs, `rounded-full` for badges

**Shadows:** Subtle — `shadow-sm` for cards, `shadow-lg` for drawers/modals

### 8.2 Layout

**Sidebar (280px collapsed → 64px):**
```
SentinelX Logo
├── Overview (Command Center)
├── Events
├── Alerts
├── Network Graph
├── Incidents
├── Assets
├── Threat Intelligence
├── Detection Rules
├── Scenarios
├── Playbooks
├── Reports
└── Settings
```

**Top Bar (64px):**
- Global search (Cmd+K)
- Time range picker
- Dataset mode badge (DEMO / SIMULATION / LIVE)
- Simulation controls (pause/resume/speed)
- Notifications bell
- User menu (future)

**Main Canvas:** Flexible grid, responsive down to 1024px

### 8.3 Component Standards

- **Tables:** Sticky header, row hover highlight, selected row accent border
- **Drawers:** Slide from right, 400-600px width, backdrop blur
- **Modals:** Centered, max-w-3xl, scrollable content
- **Tooltips:** 200ms delay, offset 8px, arrow pointing to trigger
- **Badges:** Severity colors + text label (never color-only)
- **Loading:** Skeleton matching content shape
- **Empty States:** Illustration + description + primary action
- **Error States:** Inline (forms), toast (actions), full-page (critical)

### 8.4 Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| ≥ 1440px | Full sidebar, 3-column dashboard |
| 1024-1439px | Full sidebar, 2-column dashboard |
| 768-1023px | Collapsed sidebar (icons only), stacked dashboard |
| < 768px | Drawer sidebar, single column, simplified tables |

---

## 9. Non-Functional Requirements

### 9.1 Performance Targets

| Metric | Target |
|--------|--------|
| Initial load (cached) | < 2s |
| Time to interactive | < 3s |
| Event table render (10k rows) | < 200ms (virtualized) |
| Graph render (500 nodes) | < 500ms |
| Filter application | < 100ms |
| Simulation event throughput | 100 events/sec |
| Bundle size (gzipped) | < 500KB |

### 9.2 Reliability

- Unhandled errors caught by Error Boundary → toast + log to audit
- Worker crashes → auto-restart with state recovery
- IndexedDB quota exceeded → LRU eviction of oldest events
- Network partition (future) → offline queue with sync

### 9.3 Accessibility (WCAG 2.1 AA)

- Keyboard navigation: all interactive elements reachable
- Focus indicators: visible, 3px outline in `--focus`
- Color contrast: 4.5:1 minimum (severity badges include text)
- ARIA labels: all icon buttons, dynamic regions
- Screen reader: live regions for streaming events/alerts
- Reduced motion: respects `prefers-reduced-motion`

### 9.4 Security

- No secrets in client bundle
- Input sanitization: DOMPurify for any HTML rendering
- CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:`
- No eval/Function constructor in simulation
- Content validation: Zod schemas on all repository writes

### 9.5 Transparency

- All demo data labeled: "Synthetic Data — Demonstration Only"
- Simulation badge: "SIMULATION" in top bar when running
- No claims of live detection or real threat intelligence
- Export includes metadata: `{ generatedBy: 'SentinelX', version, timestamp, dataSource: 'synthetic' }`

---

## 10. Acceptance Criteria (MVP)

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | All core pages accessible via sidebar | Manual nav test |
| 2 | Dashboard KPIs compute from data | Unit test + visual |
| 3 | Time range filters charts/tables | Integration test |
| 4 | Event explorer: search, filter, paginate, detail | E2E test |
| 5 | Alert lifecycle: all transitions work | E2E test |
| 6 | Create incident from alert | E2E test |
| 7 | Network graph renders from data | Visual + unit test |
| 8 | Node selection shows correct detail | Integration test |
| 9 | Incident timeline chronological | Unit test |
| 10 | Incident status/notes persist reload | E2E test |
| 11 | Scenario runs deterministically (same seed) | Unit test |
| 12 | Rules affect new alerts only | Integration test |
| 13 | Playbook steps persist | E2E test |
| 14 | Reports export MD/JSON/CSV | Unit test |
| 15 | Audit trail records user actions | Unit test |
| 16 | Reset demo restores seed data | E2E test |
| 17 | Empty/loading/error states present | Visual audit |
| 18 | No non-functional decorative buttons | Code review |
| 19 | Production build succeeds | `npm run build` |
| 20 | Core user flows pass E2E | Playwright suite |

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Next.js + TypeScript + Tailwind + shadcn/ui setup
- [ ] Design system components (Button, Card, Badge, Table, Drawer, etc.)
- [ ] Layout: Sidebar, TopBar, responsive behavior
- [ ] Domain models + Zod schemas
- [ ] Dexie database + repository interfaces
- [ ] Seed dataset (events, alerts, assets, rules, scenarios)
- [ ] Demo environment indicator

### Phase 2: Command Center (Week 2-3)
- [ ] Dashboard page with KPI cards
- [ ] Recharts integration (Area, Pie, Line, Bar)
- [ ] Time range filter + global state
- [ ] Recent alerts/incidents tables
- [ ] Loading/error/empty states

### Phase 3: Events & Alerts (Week 3-4)
- [ ] Event Explorer (TanStack Table + virtualization)
- [ ] Filter system (multi-select, date range, search)
- [ ] Event detail drawer
- [ ] Alert list with status groups
- [ ] Alert detail + status actions
- [ ] Audit trail logging

### Phase 4: Network Graph (Week 4-5)
- [ ] D3 force-directed implementation
- [ ] Canvas/SVG hybrid renderer
- [ ] Node/edge data from repositories
- [ ] Interactions: zoom, pan, select, hover
- [ ] Filtering by type, incident focus
- [ ] Detail panel integration

### Phase 5: Incident Investigation (Week 5-6)
- [ ] Incident list + detail workspace
- [ ] Tabbed interface (Overview, Timeline, Evidence, Findings, Playbook, Graph)
- [ ] Timeline component with replay mode
- [ ] Evidence linking (multi-select events/alerts)
- [ ] Findings management
- [ ] Status transitions with reasons

### Phase 6: Simulation Engine (Week 6-8)
- [ ] Web Worker setup + TypeScript compilation
- [ ] Scenario runner with phases
- [ ] Event generator (seeded PRNG)
- [ ] Detection engine (rule evaluation)
- [ ] Alert generation from rules
- [ ] Worker ↔ Main thread messaging
- [ ] Pause/resume/speed/step controls
- [ ] Scenario definitions (5 scenarios)

### Phase 7: Playbooks & Reports (Week 8-9)
- [ ] Playbook definitions + step components
- [ ] Playbook progress persistence
- [ ] Report templates (Markdown)
- [ ] Export: MD, JSON, CSV
- [ ] Print-friendly CSS

### Phase 8: Polish & QA (Week 9-10)
- [ ] TypeScript strict mode clean
- [ ] ESLint + Prettier clean
- [ ] Unit tests (domain, detection, repositories)
- [ ] Integration tests (stores, repositories)
- [ ] E2E tests (Playwright: core flows)
- [ ] Performance profiling
- [ ] Accessibility audit
- [ ] Production build verification
- [ ] Documentation (README, architecture, data model)

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| D3.js integration complexity | Medium | High | Prototype graph early; fallback to React Flow if needed |
| Web Worker TypeScript setup | Low | Medium | Use `worker-loader` or Vite plugin; test early |
| IndexedDB performance at scale | Low | Medium | Profile with 50k+ events; add pagination/indexes |
| State synchronization bugs | Medium | High | Single-source repositories; integration tests |
| Scenario determinism | Low | High | Fixed seed PRNG; snapshot testing |
| Bundle size growth | Medium | Medium | Code splitting; dynamic imports for heavy features |

---

## 13. Out of Scope (MVP)

- Authentication / multi-user
- Real SIEM integrations
- Live threat intelligence feeds
- Custom rule editor (UI for creating rules)
- RBAC / enterprise audit logging
- Mobile app
- Offline-first (beyond local IndexedDB)
- Collaborative investigation
- ML-based anomaly detection

---

## 14. Appendix: File Structure Reference

```
sentinelx/
├── public/
│   ├── favicon.svg
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Command Center
│   │   ├── globals.css
│   │   ├── events/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── network/page.tsx
│   │   ├── incidents/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── intelligence/page.tsx
│   │   ├── rules/page.tsx
│   │   ├── scenarios/page.tsx
│   │   ├── playbooks/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   ├── events/
│   │   ├── alerts/
│   │   ├── network/
│   │   ├── incidents/
│   │   ├── assets/
│   │   ├── intelligence/
│   │   ├── scenarios/
│   │   ├── playbooks/
│   │   ├── reports/
│   │   └── ui/                   # shadcn/ui components
│   ├── features/
│   │   ├── events/
│   │   ├── alerts/
│   │   ├── incidents/
│   │   ├── network/
│   │   ├── scenarios/
│   │   └── reports/
│   ├── domain/
│   │   ├── models/
│   │   ├── validation/
│   │   ├── detection/
│   │   ├── correlation/
│   │   └── investigation/
│   ├── simulation/
│   │   ├── engine.ts
│   │   ├── scenarioRunner.ts
│   │   ├── eventGenerator.ts
│   │   ├── detectionEngine.ts
│   │   └── scenarios/
│   ├── data/
│   │   ├── seed/
│   │   ├── fixtures/
│   │   └── repositories/
│   ├── store/
│   ├── lib/
│   │   ├── storage/
│   │   ├── export/
│   │   ├── time/
│   │   └── utils/
│   ├── hooks/
│   └── test/
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   └── testing.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── README.md
└── PRD.md
```

---

**Next Step:** Invoke `writing-plans` skill to create detailed implementation plan with tasks, dependencies, and estimates.