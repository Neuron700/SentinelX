import type { Scenario, RunningScenario } from "@/domain/models/scenario";
import type { DetectionRule } from "@/domain/models/rule";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";

export interface WorkerStartMessage {
  type: "start";
  scenario: Scenario;
  rules: DetectionRule[];
  seed: number;
  speed: number;
  runId: string;
  startedAt: string;
}

export type WorkerInbound =
  | WorkerStartMessage
  | { type: "pause" }
  | { type: "resume" }
  | { type: "setSpeed"; speed: number }
  | { type: "stop" };

export interface WorkerBatch {
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

export type WorkerOutbound =
  | { type: "started"; running: RunningScenario }
  | { type: "batch"; batch: WorkerBatch }
  | { type: "completed"; batch: WorkerBatch }
  | { type: "stopped"; batch: WorkerBatch | null }
  | { type: "status"; status: RunningScenario["status"]; errorMessage?: string }
  | { type: "error"; message: string };
