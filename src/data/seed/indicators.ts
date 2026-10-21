import type { ThreatIndicator, IndicatorType, IndicatorRisk } from "@/domain/models/indicator";
import type { SecurityEvent } from "@/domain/models/event";
import { addMinutes } from "date-fns";

interface IndicatorDefinition {
  id: string;
  type: IndicatorType;
  value: string;
  confidence: number;
  riskRating: IndicatorRisk;
  description: string;
  clusters: string[];
  alertIds: string[];
  assetIds: string[];
  analystNotes: string;
}

const DEFINITIONS: IndicatorDefinition[] = [
  {
    id: "ind-0001",
    type: "ip",
    value: "198.51.100.23",
    confidence: 90,
    riskRating: "critical",
    description:
      "Synthetic external address associated with repeated credential-stuffing bursts and a suspicious VPN session.",
    clusters: ["credential-stuffing", "impossible-travel", "vpn-burst-2", "backup-exfil"],
    alertIds: ["alert-0001", "alert-0002", "alert-0003", "alert-0009", "alert-0017", "alert-0018"],
    assetIds: ["asset-vpn-01", "asset-user-a-dewi"],
    analystNotes:
      "Reserved documentation range used for the demo. Treat as suspicious within the simulation only.",
  },
  {
    id: "ind-0002",
    type: "ip",
    value: "203.0.113.77",
    confidence: 86,
    riskRating: "high",
    description:
      "Synthetic destination for the ERP transfer and source of a simulated port sweep against web-01.",
    clusters: ["data-exfil", "port-scan", "encoded-powershell"],
    alertIds: ["alert-0004", "alert-0006", "alert-0008"],
    assetIds: ["asset-app-erp", "asset-web-01", "asset-backup-01"],
    analystNotes:
      "Observed in two unrelated patterns — likely a shared synthetic infrastructure node for the scenario.",
  },
  {
    id: "ind-0003",
    type: "ip",
    value: "192.0.2.45",
    confidence: 58,
    riskRating: "medium",
    description:
      "Synthetic address that produced RDP failures and a simulated mail sweep; one case was verified as authorized testing.",
    clusters: ["jump-failures", "certutil-eng", "port-scan-mail"],
    alertIds: ["alert-0007", "alert-0013", "alert-0016"],
    assetIds: ["asset-jump-01", "asset-mail-01"],
    analystNotes:
      "Documented infrastructure test range. Context-dependent risk — verify maintenance windows before escalation.",
  },
  {
    id: "ind-0004",
    type: "domain",
    value: "update-check.example",
    confidence: 82,
    riskRating: "high",
    description:
      "Lookalike update domain queried by ws-fin-014 immediately after encoded PowerShell execution.",
    clusters: ["encoded-powershell"],
    alertIds: ["alert-0004"],
    assetIds: ["asset-ws-fin-014"],
    analystNotes: "Not on the corporate allowlist. Synthetic domain used only for the demo.",
  },
  {
    id: "ind-0005",
    type: "domain",
    value: "cdn-storage.example",
    confidence: 77,
    riskRating: "medium",
    description:
      "Domain receiving sequential beacon-style subdomain queries from ws-eng-022 and referenced by the ERP transfer.",
    clusters: ["dns-tunneling", "data-exfil"],
    alertIds: ["alert-0006", "alert-0012"],
    assetIds: ["asset-ws-eng-022", "asset-app-erp"],
    analystNotes: "Synthetic beaconing target. No live DNS resolution occurs in this platform.",
  },
  {
    id: "ind-0006",
    type: "file_hash",
    value: "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
    confidence: 94,
    riskRating: "high",
    description:
      "SHA-256 of the harmless EICAR test artifact used as a synthetic malware signature in the demo.",
    clusters: ["encoded-powershell"],
    alertIds: ["alert-0005"],
    assetIds: ["asset-ws-fin-014"],
    analystNotes:
      "EICAR is a standard antivirus test string and is not malicious. Included only to exercise signature workflows.",
  },
  {
    id: "ind-0007",
    type: "username",
    value: "a.dewi",
    confidence: 70,
    riskRating: "medium",
    description:
      "Finance account observed in the credential burst and the suspicious VPN session.",
    clusters: ["credential-stuffing", "impossible-travel", "encoded-powershell"],
    alertIds: ["alert-0001", "alert-0003", "alert-0009", "alert-0011"],
    assetIds: ["asset-user-a-dewi", "asset-ws-fin-014"],
    analystNotes: "Synthetic identity — no real person is represented.",
  },
  {
    id: "ind-0008",
    type: "hostname",
    value: "ws-fin-014",
    confidence: 80,
    riskRating: "high",
    description:
      "Finance workstation with encoded PowerShell execution and a synthetic malware quarantine.",
    clusters: ["encoded-powershell"],
    alertIds: ["alert-0004", "alert-0005", "alert-0011"],
    assetIds: ["asset-ws-fin-014"],
    analystNotes: "Host marked simulated-isolated in the local workspace.",
  },
  {
    id: "ind-0009",
    type: "username",
    value: "svc-backup",
    confidence: 83,
    riskRating: "high",
    description:
      "Non-interactive service account responsible for both large outbound transfers in the dataset.",
    clusters: ["data-exfil", "backup-exfil"],
    alertIds: ["alert-0006", "alert-0017"],
    assetIds: ["asset-user-svc-backup", "asset-backup-01", "asset-app-erp"],
    analystNotes: "Service account has no MFA in the synthetic configuration.",
  },
  {
    id: "ind-0010",
    type: "hostname",
    value: "ws-eng-022",
    confidence: 65,
    riskRating: "medium",
    description:
      "Engineering workstation with DNS beaconing and a certutil download event.",
    clusters: ["dns-tunneling", "certutil-eng"],
    alertIds: ["alert-0012", "alert-0013"],
    assetIds: ["asset-ws-eng-022"],
    analystNotes: "Owner c.rahman. Pending endpoint review in the simulation.",
  },
  {
    id: "ind-0011",
    type: "domain",
    value: "meridian-logistics.example",
    confidence: 30,
    riskRating: "low",
    description:
      "Synthetic corporate domain — expected in normal business traffic. Included for context.",
    clusters: [],
    alertIds: [],
    assetIds: ["asset-mail-01"],
    analystNotes: "Benign baseline indicator.",
  },
  {
    id: "ind-0012",
    type: "hostname",
    value: "vpn-gw-01",
    confidence: 61,
    riskRating: "medium",
    description:
      "Remote access gateway targeted by all credential-stuffing bursts in the demo.",
    clusters: ["credential-stuffing", "impossible-travel", "vpn-burst-2"],
    alertIds: ["alert-0001", "alert-0002", "alert-0003", "alert-0009", "alert-0018"],
    assetIds: ["asset-vpn-01"],
    analystNotes: "Legacy password-only profile should be disabled in the simulation.",
  },
];

export function buildSeedIndicators(
  events: SecurityEvent[],
  clusters: Record<string, string[]>
): ThreatIndicator[] {
  const eventById = new Map(events.map((e) => [e.id, e]));

  return DEFINITIONS.map((def) => {
    const eventIds = def.clusters.flatMap((cluster) => clusters[cluster] ?? []);
    const timestamps = eventIds
      .map((id) => eventById.get(id)?.timestamp)
      .filter((t): t is string => !!t)
      .sort();
    const now = new Date().toISOString();
    const firstSeen = timestamps[0] ?? addMinutes(new Date(now), -1440).toISOString();
    const lastSeen = timestamps[timestamps.length - 1] ?? now;

    return {
      id: def.id,
      type: def.type,
      value: def.value,
      source: "SentinelX Demo Intelligence (synthetic)",
      confidence: def.confidence,
      riskRating: def.riskRating,
      firstSeen,
      lastSeen,
      description: def.description,
      relatedEventIds: [...new Set(eventIds)],
      relatedAlertIds: def.alertIds,
      relatedAssetIds: def.assetIds,
      analystNotes: def.analystNotes,
      synthetic: true,
    } satisfies ThreatIndicator;
  });
}
