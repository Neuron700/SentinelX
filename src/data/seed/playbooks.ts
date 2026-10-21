import type { Playbook } from "@/domain/models/playbook";

export const SEED_PLAYBOOKS: Playbook[] = [
  {
    id: "playbook-credential",
    name: "Credential Compromise Response",
    description:
      "Structured checklist for investigating suspected account compromise and credential abuse.",
    applicableTo: ["credential", "authentication", "vpn"],
    steps: [
      {
        id: "cred-1",
        order: 1,
        title: "Validate the alert",
        description:
          "Confirm the alert is not a known benign pattern. Review the triggering events and the detection rule that fired.",
        type: "verification",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "cred-2",
        order: 2,
        title: "Identify affected accounts",
        description:
          "List every account referenced by related alerts and events. Note privilege level and MFA status.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "cred-3",
        order: 3,
        title: "Review related events",
        description:
          "Inspect the event timeline for the affected accounts, including source IPs and sign-in outcomes.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "cred-4",
        order: 4,
        title: "Determine incident scope",
        description:
          "Decide whether other accounts, hosts, or segments are involved. Record the scope in findings.",
        type: "decision",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "cred-5",
        order: 5,
        title: "Record findings",
        description:
          "Document each finding with supporting evidence IDs so the report can cite them.",
        type: "documentation",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "cred-6",
        order: 6,
        title: "Select a simulated containment action",
        description:
          "Choose the containment action to simulate locally (for example: simulated session revocation). No real systems are touched.",
        type: "decision",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "cred-7",
        order: 7,
        title: "Verify simulated outcome",
        description:
          "Confirm that the local simulation state reflects the containment action and that the timeline records it.",
        type: "verification",
        required: false,
        estimatedMinutes: 5,
      },
      {
        id: "cred-8",
        order: 8,
        title: "Resolve or escalate",
        description:
          "Move the incident to resolved or escalate to the next tier with a written reason.",
        type: "decision",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "cred-9",
        order: 9,
        title: "Generate the incident report",
        description:
          "Export the incident report in Markdown, JSON, or CSV and attach it to the case.",
        type: "documentation",
        required: true,
        estimatedMinutes: 5,
      },
    ],
  },
  {
    id: "playbook-malware",
    name: "Malware Containment",
    description:
      "Checklist for containing and investigating a suspicious process or synthetic malware detection.",
    applicableTo: ["malware", "endpoint", "process"],
    steps: [
      {
        id: "mal-1",
        order: 1,
        title: "Validate the detection",
        description:
          "Check the detection signature, process tree, and whether the event is synthetic.",
        type: "verification",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "mal-2",
        order: 2,
        title: "Identify the affected host",
        description:
          "Confirm the host asset record, owner, environment, and current risk score.",
        type: "action",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "mal-3",
        order: 3,
        title: "Correlate neighbouring activity",
        description:
          "Review process creation, file access, DNS queries, and outbound connections around the detection.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "mal-4",
        order: 4,
        title: "Determine the blast radius",
        description:
          "Identify other hosts or accounts that share indicators or connections with the affected host.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "mal-5",
        order: 5,
        title: "Document findings",
        description:
          "Record findings with evidence links and severity.",
        type: "documentation",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "mal-6",
        order: 6,
        title: "Simulate host isolation",
        description:
          "Mark the host as simulated-isolated in the local workspace. This does not touch any real machine.",
        type: "action",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "mal-7",
        order: 7,
        title: "Verify the simulated containment",
        description:
          "Confirm the status change is recorded and reflected in the incident timeline.",
        type: "verification",
        required: false,
        estimatedMinutes: 5,
      },
      {
        id: "mal-8",
        order: 8,
        title: "Resolve and report",
        description:
          "Move to resolved/closed with a reason and export the report.",
        type: "documentation",
        required: true,
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: "playbook-exfil",
    name: "Data Exfiltration Response",
    description:
      "Checklist for investigating unusual outbound transfers and data movement.",
    applicableTo: ["exfiltration", "data_transfer", "service_account"],
    steps: [
      {
        id: "exf-1",
        order: 1,
        title: "Validate the transfer",
        description:
          "Confirm the volume, direction, account, and destination of the transfer.",
        type: "verification",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "exf-2",
        order: 2,
        title: "Identify the data owner",
        description:
          "Map the source application or account to the responsible team and data classification.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "exf-3",
        order: 3,
        title: "Establish the transfer window",
        description:
          "Compare the transfer timestamp with the expected backup or integration window.",
        type: "action",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "exf-4",
        order: 4,
        title: "Trace destination infrastructure",
        description:
          "Review threat indicators for the destination IP or domain. All indicators are synthetic.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "exf-5",
        order: 5,
        title: "Document findings",
        description: "Record each finding with supporting evidence.",
        type: "documentation",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "exf-6",
        order: 6,
        title: "Simulate integration suspension",
        description:
          "Mark the integration as suspended in the local simulation state.",
        type: "action",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "exf-7",
        order: 7,
        title: "Verify simulated outcome",
        description: "Confirm the simulated suspension appears in the timeline.",
        type: "verification",
        required: false,
        estimatedMinutes: 5,
      },
      {
        id: "exf-8",
        order: 8,
        title: "Resolve and report",
        description:
          "Close the case with a written summary and export the report.",
        type: "documentation",
        required: true,
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: "playbook-triage",
    name: "Initial Triage",
    description:
      "Generic first-pass checklist for any new alert or incident.",
    applicableTo: ["generic", "triage"],
    steps: [
      {
        id: "tri-1",
        order: 1,
        title: "Validate the alert",
        description:
          "Read the detection rule and confirm the alert is worth investigating.",
        type: "verification",
        required: true,
        estimatedMinutes: 3,
      },
      {
        id: "tri-2",
        order: 2,
        title: "Assign severity",
        description:
          "Confirm or adjust the severity using the affected assets and account privilege.",
        type: "decision",
        required: true,
        estimatedMinutes: 3,
      },
      {
        id: "tri-3",
        order: 3,
        title: "Review related entities",
        description:
          "Check related events, alerts, accounts, and hosts before escalating.",
        type: "action",
        required: true,
        estimatedMinutes: 10,
      },
      {
        id: "tri-4",
        order: 4,
        title: "Record initial findings",
        description: "Note the initial assessment and open questions.",
        type: "documentation",
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: "tri-5",
        order: 5,
        title: "Decide: incident or dismissal",
        description:
          "Create an incident, link to an existing one, or dismiss with a mandatory reason.",
        type: "decision",
        required: true,
        estimatedMinutes: 3,
      },
      {
        id: "tri-6",
        order: 6,
        title: "Record the outcome",
        description:
          "Ensure the decision is visible on the timeline and in the audit trail.",
        type: "verification",
        required: true,
        estimatedMinutes: 2,
      },
    ],
  },
];

export const PLAYBOOK_BY_ID = new Map(SEED_PLAYBOOKS.map((p) => [p.id, p]));
