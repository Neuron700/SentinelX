import { z } from "zod";

export const severitySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export const alertStatusSchema = z.enum([
  "new",
  "in_review",
  "escalated",
  "resolved",
  "dismissed",
]);

export const incidentStatusSchema = z.enum([
  "open",
  "investigating",
  "contained",
  "resolved",
  "closed",
]);

export const assetTypeSchema = z.enum([
  "workstation",
  "server",
  "application",
  "user_account",
  "gateway",
  "endpoint",
]);

export const timelineTypeSchema = z.enum([
  "event",
  "alert",
  "action",
  "note",
  "status_change",
]);

export const eventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  eventType: z.string().min(1),
  severity: severitySchema,
  sourceHostId: z.string().nullable(),
  destinationHostId: z.string().nullable(),
  sourceIp: z.string().nullable(),
  destinationIp: z.string().nullable(),
  userId: z.string().nullable(),
  description: z.string().min(1),
  relatedAlertIds: z.array(z.string()),
  scenarioId: z.string().nullable(),
  details: z.record(z.unknown()).optional(),
});

export const alertNoteSchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1),
  timestamp: z.string().datetime(),
  content: z.string().min(1),
});

export const alertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: severitySchema,
  status: alertStatusSchema,
  confidence: z.number().min(0).max(100),
  ruleId: z.string().min(1),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  relatedEventIds: z.array(z.string()),
  relatedAssetIds: z.array(z.string()),
  relatedEntityIds: z.array(z.string()),
  incidentId: z.string().nullable(),
  assignedTo: z.string().nullable(),
  acknowledgedAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolution: z.string().nullable(),
  notes: z.array(alertNoteSchema),
  scenarioId: z.string().nullable(),
});

export const timelineEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  type: timelineTypeSchema,
  title: z.string().min(1),
  description: z.string(),
  entityId: z.string(),
  entityType: z.enum(["event", "alert", "incident", "asset", "playbook"]),
  actor: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const findingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  severity: severitySchema,
  evidenceIds: z.array(z.string()),
  createdAt: z.string().datetime(),
  author: z.string().min(1),
});

export const playbookProgressSchema = z.object({
  stepId: z.string().min(1),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  completedBy: z.string().nullable(),
  notes: z.string(),
});

export const incidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  severity: severitySchema,
  status: incidentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  assignedTo: z.string().nullable(),
  alertIds: z.array(z.string()),
  eventIds: z.array(z.string()),
  assetIds: z.array(z.string()),
  timeline: z.array(timelineEntrySchema),
  findings: z.array(findingSchema),
  playbookId: z.string().nullable(),
  playbookProgress: z.array(playbookProgressSchema),
  falsePositive: z.boolean(),
  closedReason: z.string().nullable(),
  resolutionSummary: z.string().nullable(),
});

export const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: assetTypeSchema,
  environment: z.string().min(1),
  os: z.string().nullable(),
  ipAddress: z.string().nullable(),
  riskScore: z.number().min(0).max(100),
  riskFactors: z.array(z.string()),
  lastSeen: z.string().datetime(),
  relatedAlertIds: z.array(z.string()),
  tags: z.array(z.string()),
});

export const ruleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "in",
    "nin",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  timeWindowSeconds: z.number().positive().optional(),
  groupBy: z.string().optional(),
  threshold: z.number().int().positive().optional(),
});

export const detectionRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  severity: severitySchema,
  enabled: z.boolean(),
  detectionType: z.enum(["threshold", "pattern", "anomaly", "correlation"]),
  conditions: z.array(ruleConditionSchema).min(1),
  logSources: z.array(z.string()),
  origin: z.enum(["demo", "custom"]),
  lastFiredAt: z.string().datetime().nullable(),
  alertCount: z.number().int().min(0),
});

export const auditEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  action: z.string().min(1),
  entityType: z.enum([
    "event",
    "alert",
    "incident",
    "asset",
    "rule",
    "indicator",
    "playbook",
    "scenario",
    "settings",
    "report",
    "system",
  ]),
  entityId: z.string(),
  entityLabel: z.string(),
  details: z.record(z.unknown()),
  userId: z.string().min(1),
});

export const indicatorSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["ip", "domain", "file_hash", "username", "hostname"]),
  value: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().min(0).max(100),
  riskRating: z.enum(["low", "medium", "high", "critical"]),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  description: z.string(),
  relatedEventIds: z.array(z.string()),
  relatedAlertIds: z.array(z.string()),
  relatedAssetIds: z.array(z.string()),
  analystNotes: z.string(),
  synthetic: z.literal(true),
});

export class ValidationError extends Error {
  constructor(
    public readonly entity: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(
      `Invalid ${entity}: ${issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
    this.name = "ValidationError";
  }
}

export function validate<T>(
  schema: z.ZodType<T>,
  entity: string,
  input: unknown
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(entity, result.error.issues);
  }
  return result.data;
}

export const schemas = {
  event: eventSchema,
  alert: alertSchema,
  incident: incidentSchema,
  asset: assetSchema,
  rule: detectionRuleSchema,
  audit: auditEntrySchema,
  indicator: indicatorSchema,
  timelineEntry: timelineEntrySchema,
  finding: findingSchema,
};
