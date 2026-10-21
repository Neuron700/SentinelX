import type { Scenario } from "@/domain/models/scenario";
import type { SecurityEvent } from "@/domain/models/event";
import type { DetectionRule } from "@/domain/models/rule";
import { SEED_RULES } from "./rules";
import { addMinutes } from "date-fns";

function rulesFor(ids: string[]): DetectionRule[] {
  return ids.map((id) => {
    const rule = SEED_RULES.find((r) => r.id === id);
    if (!rule) throw new Error(`Unknown seed rule: ${id}`);
    return rule;
  });
}

function sample(
  anchor: Date,
  minutesAgo: number,
  partial: Omit<SecurityEvent, "id" | "timestamp" | "relatedAlertIds" | "scenarioId">
): SecurityEvent {
  return {
    ...partial,
    id: `sample-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: addMinutes(anchor, -minutesAgo).toISOString(),
    relatedAlertIds: [],
    scenarioId: null,
  };
}

export function buildSeedScenarios(anchor: Date): Scenario[] {
  return [
    {
      id: "scenario-a-suspicious-login",
      title: "Suspicious Login",
      description:
        "A synthetic external address attempts a small set of sign-ins and then succeeds. Practice correlating failures, success, and post-authentication activity.",
      difficulty: "beginner",
      category: "Authentication",
      learningObjectives: [
        "Distinguish a failure burst from a single bad password",
        "Correlate a successful sign-in with preceding failures",
        "Decide whether to open an incident from the alert chain",
      ],
      estimatedDurationMinutes: 12,
      seed: 101,
      phases: [
        {
          name: "Initial attempts",
          description: "A small number of failed VPN sign-ins from one external address.",
          durationSeconds: 45,
          eventRatePerMinute: 10,
          eventTypes: ["authentication_failure"],
        },
        {
          name: "Successful sign-in",
          description: "A sign-in succeeds from the same address.",
          durationSeconds: 30,
          eventRatePerMinute: 6,
          eventTypes: ["authentication_success"],
        },
        {
          name: "Post-authentication activity",
          description: "Endpoint and DNS telemetry from the account's workstation.",
          durationSeconds: 75,
          eventRatePerMinute: 8,
          eventTypes: ["process_creation", "dns_query", "network_connection", "file_access"],
        },
      ],
      ruleIds: ["rule-suspicious-login", "rule-impossible-travel"],
      rules: rulesFor(["rule-suspicious-login", "rule-impossible-travel"]),
      expectedFindings: [
        "External address identified",
        "Account that succeeded identified",
        "Post-authentication activity summarized",
      ],
      successCriteria: [
        "Alert acknowledged and reviewed",
        "Related events linked as evidence",
        "Incident created with a written summary",
      ],
      evaluationQuestions: [
        {
          question: "Which external address produced the failures and the success?",
          expectedAnswerHint: "198.51.100.23 (synthetic)",
        },
        {
          question: "Which account established the session?",
          expectedAnswerHint: "a.dewi",
        },
      ],
      sampleEvents: [
        sample(anchor, 30, {
          eventType: "authentication_failure",
          severity: "medium",
          sourceHostId: null,
          destinationHostId: "asset-vpn-01",
          sourceIp: "198.51.100.23",
          destinationIp: "203.0.113.10",
          userId: "a.dewi",
          description: "VPN sign-in failed for a.dewi from 198.51.100.23",
          details: { reason: "invalid_credentials" },
        }),
        sample(anchor, 22, {
          eventType: "authentication_success",
          severity: "high",
          sourceHostId: null,
          destinationHostId: "asset-vpn-01",
          sourceIp: "198.51.100.23",
          destinationIp: "203.0.113.10",
          userId: "a.dewi",
          description: "VPN sign-in succeeded for a.dewi from 198.51.100.23",
          details: { authMethod: "password+otp" },
        }),
      ],
      severity: "high",
    },
    {
      id: "scenario-b-failed-auth",
      title: "Repeated Authentication Failures",
      description:
        "A sustained burst of synthetic authentication failures exercises the threshold detection rule and the escalation path.",
      difficulty: "beginner",
      category: "Authentication",
      learningObjectives: [
        "Observe how threshold rules accumulate events",
        "Identify when the alert threshold is reached",
        "Document a false-positive decision with a reason",
      ],
      estimatedDurationMinutes: 8,
      seed: 202,
      phases: [
        {
          name: "Probing",
          description: "Low-rate failures from a single address.",
          durationSeconds: 40,
          eventRatePerMinute: 8,
          eventTypes: ["authentication_failure"],
        },
        {
          name: "Sustained burst",
          description: "Failure rate increases and crosses the rule threshold.",
          durationSeconds: 60,
          eventRatePerMinute: 18,
          eventTypes: ["authentication_failure"],
        },
      ],
      ruleIds: ["rule-brute-force"],
      rules: rulesFor(["rule-brute-force"]),
      expectedFindings: [
        "Source address responsible for the burst",
        "Accounts targeted",
        "Threshold time reached",
      ],
      successCriteria: [
        "Brute-force alert generated by the rule",
        "Alert acknowledged with a note",
        "Decision recorded as incident or dismissal",
      ],
      evaluationQuestions: [
        {
          question: "How many failures within the rule window triggered the alert?",
          expectedAnswerHint: "The rule threshold (8) within 10 minutes",
        },
      ],
      sampleEvents: [
        sample(anchor, 15, {
          eventType: "authentication_failure",
          severity: "medium",
          sourceHostId: null,
          destinationHostId: "asset-vpn-01",
          sourceIp: "198.51.100.23",
          destinationIp: "203.0.113.10",
          userId: "a.dewi",
          description: "VPN sign-in failed for a.dewi from 198.51.100.23",
          details: { reason: "invalid_credentials" },
        }),
      ],
      severity: "high",
    },
    {
      id: "scenario-c-suspicious-process",
      title: "Suspicious Process Activity",
      description:
        "Synthetic endpoint telemetry shows an encoded PowerShell launch followed by file access, DNS queries, and a malware quarantine event.",
      difficulty: "intermediate",
      category: "Endpoint",
      learningObjectives: [
        "Recognize encoded PowerShell in process telemetry",
        "Correlate process, file, DNS, and network events",
        "Practice the malware containment playbook",
      ],
      estimatedDurationMinutes: 12,
      seed: 303,
      phases: [
        {
          name: "Execution",
          description: "Encoded PowerShell and an elevation attempt on a finance workstation.",
          durationSeconds: 45,
          eventRatePerMinute: 6,
          eventTypes: ["process_creation", "privilege_escalation"],
        },
        {
          name: "Follow-on activity",
          description: "File access, DNS queries, outbound connection, and malware quarantine.",
          durationSeconds: 90,
          eventRatePerMinute: 8,
          eventTypes: ["file_access", "dns_query", "network_connection", "malware_detected"],
        },
      ],
      ruleIds: ["rule-suspicious-process", "rule-privilege-escalation", "rule-malware-detected"],
      rules: rulesFor([
        "rule-suspicious-process",
        "rule-privilege-escalation",
        "rule-malware-detected",
      ]),
      expectedFindings: [
        "Encoded PowerShell command identified",
        "Affected workstation and account",
        "Malware signature and quarantine status",
      ],
      successCriteria: [
        "All endpoint alerts linked to one incident",
        "Findings documented with evidence",
        "Playbook advanced through simulated containment",
      ],
      evaluationQuestions: [
        {
          question: "Which process name triggered the suspicious-process rule?",
          expectedAnswerHint: "powershell-encoded",
        },
      ],
      sampleEvents: [
        sample(anchor, 40, {
          eventType: "process_creation",
          severity: "high",
          sourceHostId: "asset-ws-fin-014",
          destinationHostId: null,
          sourceIp: "10.10.4.14",
          destinationIp: null,
          userId: "a.dewi",
          description: "Encoded PowerShell launched on ws-fin-014",
          details: { processName: "powershell-encoded" },
        }),
      ],
      severity: "critical",
    },
    {
      id: "scenario-d-unusual-network",
      title: "Unusual Network Connections",
      description:
        "A simulated port sweep followed by DNS beaconing from an engineering workstation. Exercises network-focused rules.",
      difficulty: "intermediate",
      category: "Network",
      learningObjectives: [
        "Interpret a simulated port sweep",
        "Recognize beaconing-style DNS patterns",
        "Use the network graph to trace relationships",
      ],
      estimatedDurationMinutes: 10,
      seed: 404,
      phases: [
        {
          name: "Sweep",
          description: "Rapid connection attempts against the public web server.",
          durationSeconds: 50,
          eventRatePerMinute: 26,
          eventTypes: ["network_connection"],
        },
        {
          name: "Beaconing",
          description: "Sequential DNS lookups to a synthetic suspicious domain.",
          durationSeconds: 80,
          eventRatePerMinute: 20,
          eventTypes: ["dns_query"],
        },
      ],
      ruleIds: ["rule-port-scan", "rule-dns-tunneling"],
      rules: rulesFor(["rule-port-scan", "rule-dns-tunneling"]),
      expectedFindings: [
        "Sweep source and target",
        "Beaconing host and domain",
        "Graph path between the entities",
      ],
      successCriteria: [
        "Both network alerts reviewed",
        "Graph used to inspect relationships",
        "Findings recorded",
      ],
      evaluationQuestions: [
        {
          question: "Which rule fired on the connection attempts?",
          expectedAnswerHint: "rule-port-scan (threshold 20 in 5 minutes)",
        },
      ],
      sampleEvents: [
        sample(anchor, 25, {
          eventType: "network_connection",
          severity: "info",
          sourceHostId: null,
          destinationHostId: "asset-web-01",
          sourceIp: "203.0.113.77",
          destinationIp: "10.10.2.10",
          userId: null,
          description: "Simulated connection attempt against web-01",
          details: { port: 1041, blocked: true },
        }),
      ],
      severity: "medium",
    },
    {
      id: "scenario-e-multi-stage",
      title: "Multi-Stage Incident",
      description:
        "Reconnaissance, credential abuse, endpoint execution, and a large outbound transfer in one continuous scenario. Build the full investigation narrative.",
      difficulty: "advanced",
      category: "Multi-stage",
      learningObjectives: [
        "Correlate alerts across authentication, endpoint, and network domains",
        "Build a single incident timeline from multiple evidence sources",
        "Complete a full response playbook and export a report",
      ],
      estimatedDurationMinutes: 18,
      seed: 505,
      phases: [
        {
          name: "Reconnaissance",
          description: "Simulated sweep and DNS probing against the DMZ.",
          durationSeconds: 45,
          eventRatePerMinute: 20,
          eventTypes: ["network_connection", "dns_query"],
        },
        {
          name: "Initial access",
          description: "Credential failures followed by a successful sign-in.",
          durationSeconds: 45,
          eventRatePerMinute: 12,
          eventTypes: ["authentication_failure", "authentication_success"],
        },
        {
          name: "Execution",
          description: "Encoded PowerShell and an unapproved elevation.",
          durationSeconds: 45,
          eventRatePerMinute: 8,
          eventTypes: ["process_creation", "privilege_escalation"],
        },
        {
          name: "Collection and exfiltration",
          description: "File access, large transfer, and beaconing DNS.",
          durationSeconds: 60,
          eventRatePerMinute: 10,
          eventTypes: ["file_access", "data_transfer", "dns_query", "malware_detected"],
        },
      ],
      ruleIds: [
        "rule-port-scan",
        "rule-brute-force",
        "rule-suspicious-login",
        "rule-suspicious-process",
        "rule-privilege-escalation",
        "rule-data-exfil",
        "rule-malware-detected",
        "rule-dns-tunneling",
      ],
      rules: rulesFor([
        "rule-port-scan",
        "rule-brute-force",
        "rule-suspicious-login",
        "rule-suspicious-process",
        "rule-privilege-escalation",
        "rule-data-exfil",
        "rule-malware-detected",
        "rule-dns-tunneling",
      ]),
      expectedFindings: [
        "Attack path from reconnaissance to exfiltration",
        "Accounts and hosts involved at each stage",
        "Data volume and destination",
      ],
      successCriteria: [
        "Single incident contains all related alerts",
        "Timeline shows every stage in order",
        "Report exported with findings and response actions",
      ],
      evaluationQuestions: [
        {
          question: "Which stage produced the most alerts?",
          expectedAnswerHint: "Answers vary — justify with the generated alert count",
        },
      ],
      sampleEvents: [
        sample(anchor, 60, {
          eventType: "network_connection",
          severity: "info",
          sourceHostId: null,
          destinationHostId: "asset-web-01",
          sourceIp: "203.0.113.77",
          destinationIp: "10.10.2.10",
          userId: null,
          description: "Simulated reconnaissance against web-01",
          details: { port: 1100, blocked: true },
        }),
      ],
      severity: "critical",
    },
  ];
}
