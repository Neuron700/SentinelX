import type { Scenario } from "@/domain/models/scenario";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Severity } from "@/domain/models/common";
import type { DetectionRule } from "@/domain/models/rule";
import { createPRNG, type PRNG } from "./prng";
import { DetectionEngine } from "./detection";

export interface EngineBatch {
  events: SecurityEvent[];
  alerts: Alert[];
  phaseIndex: number;
  phaseName: string;
  progress: number;
  simulatedClock: string;
  eventsGenerated: number;
  alertsGenerated: number;
  done: boolean;
}

export interface ScenarioEngineOptions {
  scenario: Scenario;
  rules?: DetectionRule[];
  seed?: number;
  startTime?: Date;
  runId: string;
}

const HOSTS = {
  workstation: "asset-ws-fin-014",
  workstationAlt: "asset-ws-eng-022",
  server: "asset-fs-01",
  vpn: "asset-vpn-01",
  dc: "asset-dc-01",
  jump: "asset-jump-01",
  mail: "asset-mail-01",
};

const EXTERNAL_IPS = ["198.51.100.23", "203.0.113.77", "192.0.2.45"];
const DOMAINS = ["update-check.example", "cdn-storage.example", "telemetry-sync.example"];
const PROCESSES = ["powershell-encoded", "certutil-download", "wmic-remote", "rundll32-unusual"];

export class ScenarioEngine {
  private readonly scenario: Scenario;
  private readonly rng: PRNG;
  private readonly detection: DetectionEngine;
  private readonly runId: string;
  private readonly clock: Date;
  private readonly totalDurationMs: number;

  private phaseIndex = 0;
  private phaseElapsedMs = 0;
  private totalElapsedMs = 0;
  private eventAccumulator = 0;
  private eventSequence = 0;
  private eventsGenerated = 0;
  private alertsGenerated = 0;
  private completed = false;

  constructor(options: ScenarioEngineOptions) {
    this.scenario = options.scenario;
    this.rng = createPRNG(options.seed ?? options.scenario.seed);
    this.runId = options.runId;
    this.clock = options.startTime ? new Date(options.startTime) : new Date();
    this.totalDurationMs = this.scenario.phases.reduce(
      (sum, phase) => sum + phase.durationSeconds * 1000,
      0
    );
    this.detection = new DetectionEngine(
      options.rules ?? this.scenario.rules,
      {
        runId: this.runId,
        scenarioId: this.scenario.id,
        scenarioTitle: this.scenario.title,
      }
    );
  }

  get isComplete(): boolean {
    return this.completed;
  }

  currentPhaseName(): string {
    return this.scenario.phases[this.phaseIndex]?.name ?? "Complete";
  }

  progress(): number {
    if (this.totalDurationMs <= 0) return 1;
    return Math.min(1, this.totalElapsedMs / this.totalDurationMs);
  }

  step(deltaMs: number): EngineBatch {
    const events: SecurityEvent[] = [];
    const alerts: Alert[] = [];

    if (this.completed) {
      return this.batch(events, alerts);
    }

    let remaining = Math.max(0, deltaMs);
    const startTime = this.clock.getTime();

    while (remaining > 0 && this.phaseIndex < this.scenario.phases.length) {
      const phase = this.scenario.phases[this.phaseIndex];
      const phaseDurationMs = phase.durationSeconds * 1000;
      const phaseRemaining = phaseDurationMs - this.phaseElapsedMs;
      const slice = Math.min(remaining, phaseRemaining);
      this.eventAccumulator += (slice / 60_000) * phase.eventRatePerMinute;

      const count = Math.min(40, Math.floor(this.eventAccumulator));
      const sliceStartElapsed = this.totalElapsedMs;
      for (let i = 0; i < count; i += 1) {
        const offset = ((i + 0.5) / Math.max(count, 1)) * slice;
        const timestamp = new Date(startTime + sliceStartElapsed + offset);
        events.push(this.createEvent(phase, timestamp));
        this.eventAccumulator -= 1;
      }

      this.phaseElapsedMs += slice;
      this.totalElapsedMs += slice;
      this.clock.setTime(this.clock.getTime() + slice);
      remaining -= slice;

      if (this.phaseElapsedMs >= phaseDurationMs - 0.001) {
        this.phaseIndex += 1;
        this.phaseElapsedMs = 0;
        this.eventAccumulator = Math.max(0, this.eventAccumulator - 0.2);
      }
    }

    if (this.phaseIndex >= this.scenario.phases.length) {
      this.completed = true;
    }

    if (events.length > 0) {
      alerts.push(...this.detection.process(events));
    }

    return this.batch(events, alerts);
  }

  private batch(events: SecurityEvent[], alerts: Alert[]): EngineBatch {
    this.eventsGenerated += events.length;
    this.alertsGenerated += alerts.length;
    return {
      events,
      alerts,
      phaseIndex: Math.min(this.phaseIndex, this.scenario.phases.length - 1),
      phaseName: this.currentPhaseName(),
      progress: this.progress(),
      simulatedClock: this.clock.toISOString(),
      eventsGenerated: this.eventsGenerated,
      alertsGenerated: this.alertsGenerated,
      done: this.completed,
    };
  }

  private createEvent(
    phase: Scenario["phases"][number],
    timestamp: Date
  ): SecurityEvent {
    this.eventSequence += 1;
    const prototypes = this.scenario.sampleEvents.filter((event) =>
      phase.eventTypes.includes(event.eventType)
    );
    const prototype =
      prototypes.length > 0
        ? this.rng.pick(prototypes)
        : this.scenario.sampleEvents[0];
    const eventType =
      this.rng.chance(0.65) && phase.eventTypes.length > 0
        ? this.rng.pick(phase.eventTypes)
        : eventTypeFromPrototype(prototype);

    const userId =
      prototype?.userId ??
      this.rng.pick(["a.dewi", "b.santoso", "c.rahman", "svc-backup"]);
    const externalIp =
      prototype?.sourceIp && !prototype.sourceIp.startsWith("10.")
        ? prototype.sourceIp
        : this.rng.pick(EXTERNAL_IPS);
    const domain = this.rng.pick(DOMAINS);
    const processName = this.rng.pick(PROCESSES);

    const base: SecurityEvent = {
      id: `evt-${this.runId}-${this.eventSequence}`,
      timestamp: timestamp.toISOString(),
      eventType,
      severity: severityFor(eventType),
      sourceHostId: prototype?.sourceHostId ?? null,
      destinationHostId: prototype?.destinationHostId ?? null,
      sourceIp: prototype?.sourceIp ?? null,
      destinationIp: prototype?.destinationIp ?? null,
      userId,
      description: "",
      relatedAlertIds: [],
      scenarioId: this.scenario.id,
      details: { ...(prototype?.details ?? {}), synthetic: true },
    };

    switch (eventType) {
      case "authentication_failure":
      case "authentication_success": {
        base.sourceHostId = null;
        base.destinationHostId = HOSTS.vpn;
        base.sourceIp = externalIp;
        base.destinationIp = "203.0.113.10";
        base.severity = eventType === "authentication_success" ? "high" : "medium";
        base.details = {
          ...base.details,
          reason:
            eventType === "authentication_failure"
              ? this.rng.pick(["invalid_credentials", "expired_session", "mfa_timeout"])
              : undefined,
          authMethod: eventType === "authentication_success" ? "password+otp" : undefined,
        };
        base.description =
          eventType === "authentication_success"
            ? `VPN sign-in succeeded for ${userId} from ${externalIp}`
            : `VPN sign-in failed for ${userId} from ${externalIp}`;
        break;
      }
      case "process_creation": {
        base.sourceHostId = this.rng.pick([HOSTS.workstation, HOSTS.workstationAlt]);
        base.destinationHostId = null;
        base.sourceIp = "10.10.2.14";
        base.destinationIp = null;
        base.details = { ...base.details, processName, parent: "explorer.exe" };
        base.description = `Process ${processName} launched on ${base.sourceHostId!.replace("asset-", "")} by ${userId}`;
        break;
      }
      case "dns_query": {
        base.sourceHostId = this.rng.pick([HOSTS.workstation, HOSTS.workstationAlt]);
        base.destinationHostId = HOSTS.dc;
        base.sourceIp = "10.10.2.14";
        base.destinationIp = "10.10.0.10";
        base.details = { ...base.details, domain, queryType: "A", response: "NOERROR" };
        base.description = `DNS query for ${domain} from ${base.sourceHostId!.replace("asset-", "")}`;
        break;
      }
      case "network_connection": {
        base.sourceHostId = this.rng.pick([HOSTS.workstation, HOSTS.workstationAlt]);
        base.destinationHostId = this.rng.pick([HOSTS.server, HOSTS.mail, HOSTS.dc]);
        base.sourceIp = "10.10.2.14";
        base.destinationIp = this.rng.pick(["10.10.1.20", "10.10.0.10", "10.10.1.30"]);
        base.details = { ...base.details, port: this.rng.pick([443, 445, 3389, 8080]) };
        base.description = `Outbound connection from ${base.sourceHostId!.replace("asset-", "")} to ${base.destinationHostId!.replace("asset-", "")}`;
        break;
      }
      case "file_access": {
        base.sourceHostId = HOSTS.workstation;
        base.destinationHostId = HOSTS.server;
        base.sourceIp = "10.10.2.14";
        base.destinationIp = "10.10.1.20";
        base.details = {
          ...base.details,
          path: "\\\\corp-fs-01\\finance\\FY26\\forecast.xlsx",
          segment: "finance",
          afterHours: true,
        };
        base.description = `Finance share accessed by ${userId} outside business hours`;
        base.severity = "medium";
        break;
      }
      case "data_transfer": {
        const bytesOut = this.rng.int(120, 320) * 1024 * 1024;
        base.sourceHostId = HOSTS.workstation;
        base.destinationHostId = null;
        base.sourceIp = "10.10.2.14";
        base.destinationIp = externalIp;
        base.details = { ...base.details, bytesOut, destination: externalIp };
        base.severity = "critical";
        base.description = `${Math.round(bytesOut / 1024 / 1024)} MB transferred to ${externalIp} by ${userId}`;
        break;
      }
      case "port_scan_simulated": {
        base.sourceHostId = null;
        base.destinationHostId = HOSTS.server;
        base.sourceIp = externalIp;
        base.destinationIp = "10.10.1.20";
        base.details = { ...base.details, portsAttempted: this.rng.int(20, 60) };
        base.severity = "medium";
        base.description = `Simulated port sweep from ${externalIp} against corp-fs-01`;
        break;
      }
      case "privilege_escalation": {
        base.sourceHostId = HOSTS.workstation;
        base.destinationHostId = null;
        base.userId = userId;
        base.details = { ...base.details, suspicious: true, target: "local admin" };
        base.severity = "high";
        base.description = `Suspicious privilege elevation by ${userId}`;
        break;
      }
      case "malware_detected": {
        base.sourceHostId = HOSTS.workstation;
        base.details = {
          ...base.details,
          signature: "Synthetic.Trojan.Demo",
          action: "quarantined",
        };
        base.severity = "critical";
        base.description = `Synthetic malware signature detected on ${base.sourceHostId.replace("asset-", "")}`;
        break;
      }
      default: {
        base.description =
          prototype?.description ??
          `${eventType} observed during ${phase.name}`;
        break;
      }
    }

    if (eventType === "authentication_failure" && base.severity === "medium") {
      base.details = { ...base.details, afterHours: true };
    }
    base.description = `${base.description} [sim]`;
    return base;
  }
}

function eventTypeFromPrototype(event: SecurityEvent | undefined): string {
  return event?.eventType ?? "system_alert";
}

function severityFor(eventType: string): Severity {
  switch (eventType) {
    case "data_transfer":
    case "malware_detected":
      return "critical";
    case "authentication_success":
    case "process_creation":
    case "privilege_escalation":
      return "high";
    case "authentication_failure":
    case "port_scan_simulated":
    case "file_access":
    case "configuration_change":
      return "medium";
    case "dns_query":
    case "network_connection":
      return "low";
    default:
      return "info";
  }
}
