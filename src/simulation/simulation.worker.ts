import { ScenarioEngine } from "./engine";
import type {
  WorkerInbound,
  WorkerOutbound,
  WorkerBatch,
} from "./protocol";

const TICK_MS = 1000;

interface WorkerScope {
  postMessage: (message: WorkerOutbound) => void;
  onmessage: ((event: MessageEvent<WorkerInbound>) => void) | null;
}

const scope = self as unknown as WorkerScope;

let engine: ScenarioEngine | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let speed = 1;
let paused = false;
let scenarioId = "";
let scenarioTitle = "";
let seed = 0;
let startedAt = "";
let phaseIndex = 0;
let phaseName = "";
let simulatedClock = "";
let eventsGenerated = 0;
let alertsGenerated = 0;
let progress = 0;

function stopTimer() {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}

function currentBatch(status: string): WorkerBatch {
  return {
    events: [],
    alerts: [],
    phaseIndex,
    phaseName,
    progress,
    simulatedClock,
    eventsGenerated,
    alertsGenerated,
    done: status === "completed",
  };
}

function tick() {
  if (!engine || paused) return;
  const batch = engine.step(TICK_MS * speed);
  phaseIndex = batch.phaseIndex;
  phaseName = batch.phaseName;
  progress = batch.progress;
  simulatedClock = batch.simulatedClock;
  eventsGenerated = batch.eventsGenerated;
  alertsGenerated = batch.alertsGenerated;

  if (batch.done) {
    stopTimer();
    scope.postMessage({ type: "completed", batch });
    return;
  }

  scope.postMessage({ type: "batch", batch });
}

scope.onmessage = (event: MessageEvent<WorkerInbound>) => {
  const message = event.data;
  switch (message.type) {
    case "start": {
      stopTimer();
      scenarioId = message.scenario.id;
      scenarioTitle = message.scenario.title;
      seed = message.seed;
      speed = message.speed;
      startedAt = message.startedAt;
      paused = false;
      engine = new ScenarioEngine({
        scenario: message.scenario,
        rules: message.rules,
        seed: message.seed,
        startTime: new Date(message.startedAt),
        runId: message.runId,
      });
      phaseIndex = 0;
      phaseName = message.scenario.phases[0]?.name ?? "Starting";
      simulatedClock = message.startedAt;
      progress = 0;
      eventsGenerated = 0;
      alertsGenerated = 0;
      scope.postMessage({
        type: "started",
        running: {
          scenarioId,
          scenarioTitle,
          startedAt,
          simulatedClock,
          phaseIndex,
          phaseName,
          eventsGenerated,
          alertsGenerated,
          progress,
          status: "running",
          errorMessage: null,
          seed,
          speed,
        },
      });
      timer = setInterval(tick, TICK_MS);
      break;
    }
    case "pause":
      paused = true;
      scope.postMessage({ type: "status", status: "paused" });
      break;
    case "resume":
      paused = false;
      scope.postMessage({ type: "status", status: "running" });
      break;
    case "setSpeed":
      speed = message.speed;
      scope.postMessage({ type: "status", status: paused ? "paused" : "running" });
      break;
    case "stop":
      stopTimer();
      paused = true;
      scope.postMessage({ type: "stopped", batch: currentBatch("stopped") });
      engine = null;
      break;
    default:
      break;
  }
};

