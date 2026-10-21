import { toast } from "sonner";
import type { Scenario, RunningScenario } from "@/domain/models/scenario";
import type { WorkerBatch, WorkerInbound, WorkerOutbound } from "./protocol";
import { getRepositories } from "@/data/repositories";
import { useSimulationStore } from "@/store/simulation-store";
import { recordAudit } from "@/lib/audit";

let worker: Worker | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let activeRunId: string | null = null;

export function isSimulationSupported(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function send(message: WorkerInbound) {
  worker?.postMessage(message);
}

async function persistBatch(batch: WorkerBatch): Promise<void> {
  if (batch.events.length === 0 && batch.alerts.length === 0) return;
  const { events, alerts } = getRepositories();
  if (batch.events.length > 0) {
    await events.bulkCreate(batch.events);
  }
  if (batch.alerts.length > 0) {
    await alerts.bulkCreate(batch.alerts);
    const eventById = new Map(batch.events.map((event) => [event.id, event]));
    for (const alert of batch.alerts) {
      for (const eventId of alert.relatedEventIds) {
        const event = eventById.get(eventId);
        if (!event) continue;
        const merged = [...new Set([...event.relatedAlertIds, alert.id])];
        await events.update(eventId, { relatedAlertIds: merged });
      }
    }
  }
}

function queueBatch(batch: WorkerBatch): Promise<void> {
  writeQueue = writeQueue
    .then(() => persistBatch(batch))
    .catch((error) => {
      console.error("Failed to persist simulation batch", error);
      toast.error("Simulation batch could not be saved", {
        description:
          error instanceof Error ? error.message : "Unknown IndexedDB error",
      });
    });
  return writeQueue;
}

async function finalizeRun(
  batch: WorkerBatch,
  status: "completed" | "stopped"
): Promise<void> {
  const state = useSimulationStore.getState();
  const running = state.running;
  if (!running) return;
  const finished: RunningScenario = {
    ...running,
    progress: status === "completed" ? 1 : batch.progress,
    phaseName: status === "completed" ? "Complete" : batch.phaseName,
    eventsGenerated: batch.eventsGenerated,
    alertsGenerated: batch.alertsGenerated,
    simulatedClock: batch.simulatedClock,
    status,
  };
  state.setRunning(finished);

  if (status === "completed") {
    try {
      const { scenarios } = getRepositories();
      await scenarios.saveResult({
        id: `result-${activeRunId}`,
        scenarioId: finished.scenarioId,
        completedAt: new Date().toISOString(),
        eventsGenerated: finished.eventsGenerated,
        alertsGenerated: finished.alertsGenerated,
        durationSeconds: Math.round(
          (Date.now() - new Date(finished.startedAt).getTime()) / 1000
        ),
        checkedCriteria: [],
        notes: "Automated simulation run.",
      });
      await recordAudit({
        action: "scenario.completed",
        entityType: "scenario",
        entityId: finished.scenarioId,
        entityLabel: finished.scenarioTitle,
        details: {
          runId: activeRunId,
          seed: finished.seed,
          events: finished.eventsGenerated,
          alerts: finished.alertsGenerated,
        },
      });
      toast.success("Scenario completed", {
        description: `${finished.eventsGenerated} events and ${finished.alertsGenerated} alerts generated.`,
      });
    } catch (error) {
      console.error("Failed to save scenario result", error);
    }
  } else {
    await recordAudit({
      action: "scenario.stopped",
      entityType: "scenario",
      entityId: finished.scenarioId,
      entityLabel: finished.scenarioTitle,
      details: {
        runId: activeRunId,
        events: finished.eventsGenerated,
        alerts: finished.alertsGenerated,
      },
    });
    toast.message("Scenario stopped", {
      description: "Generated data remains available in the dataset.",
    });
  }

  terminateWorker();
  activeRunId = null;
}

export function startScenarioSimulation(
  scenario: Scenario,
  speed: number
): boolean {
  if (!isSimulationSupported()) {
    toast.error("Web Workers are unavailable", {
      description: "This browser cannot run the scenario simulator.",
    });
    return false;
  }
  if (activeRunId) {
    toast.error("A scenario is already running", {
      description: "Stop the current run before starting another.",
    });
    return false;
  }

  const runId = `sim-${Date.now().toString(36)}`;
  activeRunId = runId;
  const startedAt = new Date().toISOString();
  const bootstrap: RunningScenario = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    startedAt,
    simulatedClock: startedAt,
    phaseIndex: 0,
    phaseName: scenario.phases[0]?.name ?? "Starting",
    eventsGenerated: 0,
    alertsGenerated: 0,
    progress: 0,
    status: "running",
    errorMessage: null,
    seed: scenario.seed,
    speed,
  };
  useSimulationStore.getState().setRunning(bootstrap);

  try {
    worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
      type: "module",
      name: "sentinelx-simulation",
    });
  } catch (error) {
    activeRunId = null;
    useSimulationStore.getState().patchRunning({
      status: "error",
      errorMessage:
        error instanceof Error ? error.message : "Worker failed to start",
    });
    toast.error("Could not start the simulation worker");
    return false;
  }

  worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
    const message = event.data;
    const store = useSimulationStore.getState();
    switch (message.type) {
      case "started":
        store.setRunning(message.running);
        break;
      case "batch":
        store.patchRunning({
          progress: message.batch.progress,
          phaseIndex: message.batch.phaseIndex,
          phaseName: message.batch.phaseName,
          simulatedClock: message.batch.simulatedClock,
          eventsGenerated: message.batch.eventsGenerated,
          alertsGenerated: message.batch.alertsGenerated,
          status: "running",
        });
        void queueBatch(message.batch);
        break;
      case "completed":
        void queueBatch(message.batch).then(() => finalizeRun(message.batch, "completed"));
        break;
      case "stopped":
        void finalizeRun(message.batch ?? {
          events: [],
          alerts: [],
          phaseIndex: 0,
          phaseName: "Stopped",
          progress: 0,
          simulatedClock: startedAt,
          eventsGenerated: 0,
          alertsGenerated: 0,
          done: false,
        }, "stopped");
        break;
      case "status":
        if (message.status === "paused" || message.status === "running") {
          store.patchRunning({ status: message.status });
        }
        break;
      case "error":
        store.patchRunning({
          status: "error",
          errorMessage: message.message,
        });
        terminateWorker();
        activeRunId = null;
        toast.error("Simulation error", { description: message.message });
        break;
      default:
        break;
    }
  };

  worker.onerror = (event) => {
    useSimulationStore.getState().patchRunning({
      status: "error",
      errorMessage: event.message || "Simulation worker error",
    });
    terminateWorker();
    activeRunId = null;
    toast.error("Simulation worker crashed", {
      description: event.message,
    });
  };

  worker.postMessage({
    type: "start",
    scenario,
    rules: scenario.rules,
    seed: scenario.seed,
    speed,
    runId,
    startedAt,
  } satisfies WorkerInbound);

  void recordAudit({
    action: "scenario.started",
    entityType: "scenario",
    entityId: scenario.id,
    entityLabel: scenario.title,
    details: { runId, seed: scenario.seed, speed },
  });

  return true;
}

export function pauseSimulation() {
  send({ type: "pause" });
}

export function resumeSimulation() {
  send({ type: "resume" });
}

export function stopSimulation() {
  send({ type: "stop" });
}

export function setSimulationSpeed(speed: number) {
  if (worker) {
    send({ type: "setSpeed", speed });
  }
  useSimulationStore.getState().patchRunning({ speed });
}

export function dismissSimulationSummary() {
  terminateWorker();
  activeRunId = null;
  useSimulationStore.getState().clear();
}
