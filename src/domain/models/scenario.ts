import type { Severity } from "./common";
import type { SecurityEvent } from "./event";
import type { DetectionRule } from "./rule";

export interface ScenarioPhase {
  name: string;
  description: string;
  durationSeconds: number;
  eventRatePerMinute: number;
  eventTypes: string[];
}

export interface ScenarioEvaluation {
  question: string;
  expectedAnswerHint: string;
}

export interface Scenario {
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
  evaluationQuestions: ScenarioEvaluation[];
  sampleEvents: SecurityEvent[];
  rules: DetectionRule[];
  severity: Severity;
}

export interface RunningScenario {
  scenarioId: string;
  scenarioTitle: string;
  startedAt: string;
  simulatedClock: string;
  phaseIndex: number;
  phaseName: string;
  eventsGenerated: number;
  alertsGenerated: number;
  progress: number;
  status: "running" | "paused" | "completed" | "stopped" | "error";
  errorMessage: string | null;
  seed: number;
  speed: number;
}

export interface ScenarioResult {
  scenarioId: string;
  completedAt: string;
  eventsGenerated: number;
  alertsGenerated: number;
  durationSeconds: number;
  checkedCriteria: number[];
  notes: string;
}
