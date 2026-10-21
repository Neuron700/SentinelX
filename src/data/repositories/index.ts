import { getDB } from "@/lib/storage/db";
import { EventRepository } from "./event-repository";
import { AlertRepository } from "./alert-repository";
import { IncidentRepository } from "./incident-repository";
import { AssetRepository } from "./asset-repository";
import { RuleRepository } from "./rule-repository";
import { ScenarioRepository } from "./scenario-repository";
import { AuditRepository } from "./audit-repository";
import { SettingsRepository } from "./settings-repository";
import { IndicatorRepository } from "./indicator-repository";
import { PlaybookRepository } from "./playbook-repository";

export interface Repositories {
  events: EventRepository;
  alerts: AlertRepository;
  incidents: IncidentRepository;
  assets: AssetRepository;
  rules: RuleRepository;
  scenarios: ScenarioRepository;
  audit: AuditRepository;
  settings: SettingsRepository;
  indicators: IndicatorRepository;
  playbooks: PlaybookRepository;
}

let instance: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!instance) {
    const db = getDB();
    instance = {
      events: new EventRepository(db),
      alerts: new AlertRepository(db),
      incidents: new IncidentRepository(db),
      assets: new AssetRepository(db),
      rules: new RuleRepository(db),
      scenarios: new ScenarioRepository(db),
      audit: new AuditRepository(db),
      settings: new SettingsRepository(db),
      indicators: new IndicatorRepository(db),
      playbooks: new PlaybookRepository(db),
    };
  }
  return instance;
}

export function createRepositories(db: ConstructorParameters<
  typeof EventRepository
>[0]): Repositories {
  return {
    events: new EventRepository(db),
    alerts: new AlertRepository(db),
    incidents: new IncidentRepository(db),
    assets: new AssetRepository(db),
    rules: new RuleRepository(db),
    scenarios: new ScenarioRepository(db),
    audit: new AuditRepository(db),
    settings: new SettingsRepository(db),
    indicators: new IndicatorRepository(db),
    playbooks: new PlaybookRepository(db),
  };
}

export {
  EventRepository,
  AlertRepository,
  IncidentRepository,
  AssetRepository,
  RuleRepository,
  ScenarioRepository,
  AuditRepository,
  SettingsRepository,
  IndicatorRepository,
  PlaybookRepository,
};
