import type { SecurityEvent } from "@/domain/models/event";
import type { Severity } from "@/domain/models/common";
import { createPRNG } from "@/simulation/prng";
import {
  DOMAINS,
  EXTERNAL_IPS,
  HOSTS,
  HOST_BY_ID,
  HOST_BY_NAME,
  INTERNAL_IPS,
  USER_NAMES,
  WORKSTATION_IDS,
} from "./world";
import { addMinutes, setHours, setMinutes, startOfHour } from "date-fns";

export interface SeedEventResult {
  events: SecurityEvent[];
  clusters: Record<string, string[]>;
}

type DraftEvent = Omit<SecurityEvent, "id" | "relatedAlertIds"> & {
  relatedAlertIds?: string[];
  __cluster?: string;
};

const BENIGN_PROCESSES = [
  "outlook.exe",
  "chrome.exe",
  "teams.exe",
  "code",
  "node",
  "excel.exe",
  "explorer.exe",
  "python3",
];

const BENIGN_DOMAINS = [
  DOMAINS.corporate,
  DOMAINS.mail,
  DOMAINS.intranet,
  "login.microsoftonline.example",
  "time-sync.example",
  "cdn-assets.example",
];

const SHARES: Record<string, string> = {
  "asset-fs-01": "finance",
  "asset-dc-01": "sysvol",
  "asset-backup-01": "backups",
};

const FILES = [
  "quarterly-close.xlsx",
  "payroll-march.xlsx",
  "vendor-invoices.csv",
  "network-diagram.pdf",
  "onboarding-checklist.docx",
  "budget-forecast.xlsx",
  "design-spec.md",
  "release-notes.txt",
];

function severityFor(prng: () => number): Severity {
  const roll = prng();
  if (roll < 0.45) return "info";
  if (roll < 0.75) return "low";
  if (roll < 0.93) return "medium";
  if (roll < 0.99) return "high";
  return "critical";
}

function internalIpFor(hostId: string | null): string | null {
  if (!hostId) return null;
  const host = HOST_BY_ID.get(hostId);
  if (host?.ip) return host.ip;
  return INTERNAL_IPS[0];
}

export function buildSeedEvents(anchor: Date): SeedEventResult {
  const prng = createPRNG(1337);
  const random = () => prng.next();
  const anchorHour = startOfHour(anchor);
  const drafts: DraftEvent[] = [];

  const base = (
    timestamp: Date,
    partial: Partial<DraftEvent> &
      Pick<DraftEvent, "eventType" | "severity" | "description">
  ): DraftEvent => ({
    timestamp: timestamp.toISOString(),
    sourceHostId: null,
    destinationHostId: null,
    sourceIp: null,
    destinationIp: null,
    userId: null,
    relatedAlertIds: [],
    scenarioId: null,
    ...partial,
  });

  // ---- Baseline activity over the last 7 days -------------------------------
  for (let day = 6; day >= 0; day--) {
    const eventsToday = 84 + prng.int(0, 12);
    for (let i = 0; i < eventsToday; i++) {
      const dayStart = startOfHour(addMinutes(anchorHour, -day * 24 * 60));
      const hourRoll = random();
      const hour =
        hourRoll < 0.62
          ? 8 + prng.int(0, 9)
          : hourRoll < 0.85
            ? 18 + prng.int(0, 5)
            : prng.int(0, 23);
      const ts = setMinutes(setHours(dayStart, hour), prng.int(0, 59));
      if (ts.getTime() > anchor.getTime()) continue;
      const typeRoll = random();

      if (typeRoll < 0.2) {
        const user = prng.pick(USER_NAMES);
        const dst = prng.pick([
          "asset-dc-01",
          "asset-vpn-01",
          "asset-jump-01",
          "asset-app-crm",
        ]);
        drafts.push(
          base(ts, {
            eventType: "authentication_success",
            severity: severityFor(random),
            sourceHostId: prng.pick(WORKSTATION_IDS),
            destinationHostId: dst,
            sourceIp: prng.pick(INTERNAL_IPS),
            destinationIp: internalIpFor(dst),
            userId: user,
            description: `${user} signed in to ${HOST_BY_ID.get(dst)?.name} from the internal network`,
            details: { authMethod: prng.pick(["password", "sso", "password+otp"]) },
          })
        );
      } else if (typeRoll < 0.34) {
        const user = prng.pick(USER_NAMES);
        const dst = prng.pick(["asset-vpn-01", "asset-jump-01", "asset-app-crm"]);
        drafts.push(
          base(ts, {
            eventType: "authentication_failure",
            severity: severityFor(random),
            sourceHostId: null,
            destinationHostId: dst,
            sourceIp: prng.pick(INTERNAL_IPS),
            destinationIp: internalIpFor(dst),
            userId: user,
            description: `Failed sign-in for ${user} on ${HOST_BY_ID.get(dst)?.name} (bad password)`,
            details: { reason: "invalid_credentials" },
          })
        );
      } else if (typeRoll < 0.52) {
        const src = prng.pick(WORKSTATION_IDS);
        const dst = prng.pick([
          "asset-dc-01",
          "asset-fs-01",
          "asset-app-crm",
          "asset-app-erp",
          "asset-mail-01",
          "asset-backup-01",
        ]);
        const port = prng.pick([443, 445, 3389, 1433, 8080, 53]);
        drafts.push(
          base(ts, {
            eventType: "network_connection",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: dst,
            sourceIp: internalIpFor(src),
            destinationIp: internalIpFor(dst),
            userId: prng.pick(USER_NAMES),
            description: `Outbound session from ${HOST_BY_ID.get(src)?.name} to ${HOST_BY_ID.get(dst)?.name} on port ${port}`,
            details: { port, protocol: port === 53 ? "UDP" : "TCP" },
          })
        );
      } else if (typeRoll < 0.64) {
        const src = prng.pick(WORKSTATION_IDS);
        const domain = prng.pick(BENIGN_DOMAINS);
        drafts.push(
          base(ts, {
            eventType: "dns_query",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: "asset-dc-01",
            sourceIp: internalIpFor(src),
            destinationIp: "10.10.1.10",
            userId: prng.pick(USER_NAMES),
            description: `DNS query for ${domain} from ${HOST_BY_ID.get(src)?.name}`,
            details: { domain },
          })
        );
      } else if (typeRoll < 0.76) {
        const src = prng.pick(WORKSTATION_IDS);
        const user = prng.pick(USER_NAMES);
        const dst = prng.pick(["asset-fs-01", "asset-dc-01"]);
        const share = SHARES[dst] ?? "shared";
        drafts.push(
          base(ts, {
            eventType: "file_access",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: dst,
            sourceIp: internalIpFor(src),
            destinationIp: internalIpFor(dst),
            userId: user,
            description: `${user} read \\\\${HOST_BY_ID.get(dst)?.name}\\${share}\\${prng.pick(FILES)}`,
            details: { share, segment: share === "finance" ? "finance" : "general" },
          })
        );
      } else if (typeRoll < 0.86) {
        const src = prng.pick(WORKSTATION_IDS);
        const proc = prng.pick(BENIGN_PROCESSES);
        drafts.push(
          base(ts, {
            eventType: "process_creation",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: null,
            sourceIp: internalIpFor(src),
            destinationIp: null,
            userId: prng.pick(USER_NAMES),
            description: `${prng.pick(USER_NAMES)} launched ${proc} on ${HOST_BY_ID.get(src)?.name}`,
            details: { processName: proc },
          })
        );
      } else if (typeRoll < 0.92) {
        const src = prng.pick(["asset-backup-01", "asset-app-erp", "asset-app-crm"]);
        const bytes = prng.int(200_000, 25_000_000);
        drafts.push(
          base(ts, {
            eventType: "data_transfer",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: "asset-backup-01",
            sourceIp: internalIpFor(src),
            destinationIp: "10.10.1.50",
            userId: prng.pick(["svc-backup", "b.santoso"]),
            description: `${HOST_BY_ID.get(src)?.name} transferred ${(bytes / 1_048_576).toFixed(1)} MB to the internal backup target`,
            details: { bytesOut: bytes, destination: "backup-01" },
          })
        );
      } else if (typeRoll < 0.96) {
        const src = prng.pick(["asset-dc-01", "asset-web-01", "asset-jump-01"]);
        drafts.push(
          base(ts, {
            eventType: "configuration_change",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: null,
            sourceIp: internalIpFor(src),
            destinationIp: null,
            userId: prng.pick(["b.santoso", "svc-backup"]),
            description: `Configuration change on ${HOST_BY_ID.get(src)?.name}: ${prng.pick(["audit policy updated", "service restarted", "agent policy refreshed"])}`,
            details: { changeType: "maintenance" },
          })
        );
      } else if (typeRoll < 0.985) {
        const src = prng.pick(WORKSTATION_IDS);
        drafts.push(
          base(ts, {
            eventType: "privilege_escalation",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: null,
            sourceIp: internalIpFor(src),
            destinationIp: null,
            userId: prng.pick(["b.santoso", "svc-backup"]),
            description: `${prng.pick(["b.santoso", "svc-backup"])} performed an approved elevation on ${HOST_BY_ID.get(src)?.name}`,
            details: { suspicious: false, method: "approved-task" },
          })
        );
      } else {
        const src = prng.pick(HOSTS.filter((h) => h.type !== "user_account").map((h) => h.id));
        drafts.push(
          base(ts, {
            eventType: "system_alert",
            severity: severityFor(random),
            sourceHostId: src,
            destinationHostId: null,
            sourceIp: internalIpFor(src),
            destinationIp: null,
            userId: null,
            description: `${HOST_BY_ID.get(src)?.name} reported a routine health check`,
            details: { status: "healthy" },
          })
        );
      }
    }
  }

  const at = (minutesAgo: number) => addMinutes(anchor, -minutesAgo);

  // ---- Cluster 1: credential stuffing against the VPN gateway ---------------
  for (let i = 0; i < 12; i++) {
    const user = i % 3 === 0 ? "b.santoso" : "a.dewi";
    drafts.push(
      base(new Date(at(3000).getTime() + i * 40_000), {
        eventType: "authentication_failure",
        severity: i < 7 ? "medium" : "high",
        sourceHostId: null,
        destinationHostId: "asset-vpn-01",
        sourceIp: EXTERNAL_IPS.alpha,
        destinationIp: EXTERNAL_IPS.vpn,
        userId: user,
        description: `VPN sign-in failed for ${user} from ${EXTERNAL_IPS.alpha} (invalid password)`,
        details: { reason: "invalid_credentials", geo: "synthetic-region-7" },
        __cluster: "credential-stuffing",
      })
    );
  }
  drafts.push(
    base(addMinutes(at(3000), 9), {
      eventType: "authentication_success",
      severity: "high",
      sourceHostId: null,
      destinationHostId: "asset-vpn-01",
      sourceIp: EXTERNAL_IPS.alpha,
      destinationIp: EXTERNAL_IPS.vpn,
      userId: "a.dewi",
      description: `VPN sign-in succeeded for a.dewi from ${EXTERNAL_IPS.alpha} after repeated failures`,
      details: { authMethod: "password+otp", geo: "synthetic-region-7" },
      __cluster: "credential-stuffing",
    })
  );

  // ---- Cluster 2: encoded PowerShell on a finance workstation ---------------
  drafts.push(
    base(at(1800), {
      eventType: "process_creation",
      severity: "high",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: null,
      sourceIp: "10.10.4.14",
      destinationIp: null,
      userId: "a.dewi",
      description:
        "Encoded PowerShell launched on ws-fin-014 (powershell.exe -nop -w hidden -enc …)",
      details: {
        processName: "powershell-encoded",
        commandLine:
          "powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA…",
      },
      __cluster: "encoded-powershell",
    })
  );
  drafts.push(
    base(addMinutes(at(1800), 2), {
      eventType: "file_access",
      severity: "medium",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: "asset-fs-01",
      sourceIp: "10.10.4.14",
      destinationIp: "10.10.1.20",
      userId: "a.dewi",
      description:
        "a.dewi read \\\\corp-fs-01\\finance\\quarterly-close.xlsx from ws-fin-014",
      details: { share: "finance", segment: "finance", afterHours: false },
      __cluster: "encoded-powershell",
    })
  );
  drafts.push(
    base(addMinutes(at(1800), 6), {
      eventType: "privilege_escalation",
      severity: "high",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: null,
      sourceIp: "10.10.4.14",
      destinationIp: null,
      userId: "a.dewi",
      description: "Unapproved privilege elevation attempted on ws-fin-014",
      details: { suspicious: true, method: "token-manipulation-sim" },
      __cluster: "encoded-powershell",
    })
  );
  for (let i = 0; i < 6; i++) {
    drafts.push(
      base(addMinutes(at(1800), 3 + i), {
        eventType: "dns_query",
        severity: "medium",
        sourceHostId: "asset-ws-fin-014",
        destinationHostId: "asset-dc-01",
        sourceIp: "10.10.4.14",
        destinationIp: "10.10.1.10",
        userId: "a.dewi",
        description: `DNS query for update-check.example from ws-fin-014`,
        details: { domain: DOMAINS.update },
        __cluster: "encoded-powershell",
      })
    );
  }
  drafts.push(
    base(addMinutes(at(1800), 9), {
      eventType: "network_connection",
      severity: "high",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: null,
      sourceIp: "10.10.4.14",
      destinationIp: EXTERNAL_IPS.bravo,
      userId: "a.dewi",
      description: `Outbound TLS session from ws-fin-014 to ${EXTERNAL_IPS.bravo}:8443`,
      details: { port: 8443, protocol: "TCP", destinationDomain: DOMAINS.update },
      __cluster: "encoded-powershell",
    })
  );
  drafts.push(
    base(addMinutes(at(1800), 12), {
      eventType: "malware_detected",
      severity: "critical",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: null,
      sourceIp: "10.10.4.14",
      destinationIp: null,
      userId: "a.dewi",
      description:
        "Synthetic malware signature Win.Test.EICAR-SIM detected and quarantined on ws-fin-014",
      details: { signature: "Win.Test.EICAR-SIM", quarantined: true },
      __cluster: "encoded-powershell",
    })
  );

  // ---- Cluster 3: large outbound transfer from the ERP integration ----------
  drafts.push(
    base(at(6010), {
      eventType: "authentication_success",
      severity: "medium",
      sourceHostId: "asset-backup-01",
      destinationHostId: "asset-app-erp",
      sourceIp: "10.10.1.50",
      destinationIp: "10.10.1.41",
      userId: "svc-backup",
      description: "svc-backup authenticated to erp-app for scheduled integration",
      details: { authMethod: "service-token" },
      __cluster: "data-exfil",
    })
  );
  drafts.push(
    base(at(6000), {
      eventType: "data_transfer",
      severity: "critical",
      sourceHostId: "asset-app-erp",
      destinationHostId: null,
      sourceIp: "10.10.1.41",
      destinationIp: EXTERNAL_IPS.bravo,
      userId: "svc-backup",
      description: `erp-app transferred 180.0 MB to ${EXTERNAL_IPS.bravo} outside the backup window`,
      details: {
        bytesOut: 188_743_680,
        destination: "external",
        integration: "erp-outbound-sync",
      },
      __cluster: "data-exfil",
    })
  );
  drafts.push(
    base(addMinutes(at(6000), 1), {
      eventType: "network_connection",
      severity: "critical",
      sourceHostId: "asset-app-erp",
      destinationHostId: null,
      sourceIp: "10.10.1.41",
      destinationIp: EXTERNAL_IPS.bravo,
      userId: "svc-backup",
      description: `Persistent outbound session from erp-app to ${EXTERNAL_IPS.bravo}:443`,
      details: { port: 443, protocol: "TCP" },
      __cluster: "data-exfil",
    })
  );
  for (let i = 0; i < 3; i++) {
    drafts.push(
      base(addMinutes(at(6000), 2 + i), {
        eventType: "dns_query",
        severity: "medium",
        sourceHostId: "asset-app-erp",
        destinationHostId: "asset-dc-01",
        sourceIp: "10.10.1.41",
        destinationIp: "10.10.1.10",
        userId: "svc-backup",
        description: "DNS query for cdn-storage.example from erp-app",
        details: { domain: DOMAINS.cdn },
        __cluster: "data-exfil",
      })
    );
  }

  // ---- Cluster 4: repeated failures on the jump host ------------------------
  for (let i = 0; i < 9; i++) {
    drafts.push(
      base(new Date(at(7200).getTime() + i * 95_000), {
        eventType: "authentication_failure",
        severity: "medium",
        sourceHostId: null,
        destinationHostId: "asset-jump-01",
        sourceIp: EXTERNAL_IPS.charlie,
        destinationIp: "10.10.1.30",
        userId: "b.santoso",
        description: `RDP sign-in failed for b.santoso on jump-01 from ${EXTERNAL_IPS.charlie}`,
        details: { reason: "invalid_credentials", protocol: "RDP" },
        __cluster: "jump-failures",
      })
    );
  }

  // ---- Cluster 5: simulated port sweep against the web server ---------------
  for (let i = 0; i < 24; i++) {
    drafts.push(
      base(new Date(at(4200).getTime() + i * 9_000), {
        eventType: "network_connection",
        severity: i % 3 === 0 ? "low" : "info",
        sourceHostId: null,
        destinationHostId: "asset-web-01",
        sourceIp: EXTERNAL_IPS.bravo,
        destinationIp: "10.10.2.10",
        userId: null,
        description: `Simulated connection attempt from ${EXTERNAL_IPS.bravo} to web-01 on port ${1000 + i * 37}`,
        details: { port: 1000 + i * 37, protocol: "TCP", blocked: true },
        __cluster: "port-scan",
      })
    );
  }
  drafts.push(
    base(addMinutes(at(4200), 4), {
      eventType: "port_scan_simulated",
      severity: "medium",
      sourceHostId: null,
      destinationHostId: "asset-web-01",
      sourceIp: EXTERNAL_IPS.bravo,
      destinationIp: "10.10.2.10",
      userId: null,
      description: `Simulated port sweep detected from ${EXTERNAL_IPS.bravo} against web-01`,
      details: { distinctPorts: 24, windowSeconds: 300 },
      __cluster: "port-scan",
    })
  );

  // ---- Cluster 6: impossible-travel style sign-in ---------------------------
  drafts.push(
    base(at(1205), {
      eventType: "authentication_success",
      severity: "low",
      sourceHostId: "asset-ws-fin-014",
      destinationHostId: "asset-dc-01",
      sourceIp: "10.10.4.14",
      destinationIp: "10.10.1.10",
      userId: "a.dewi",
      description: "a.dewi signed in to corp-dc-01 from ws-fin-014",
      details: { authMethod: "sso", location: "internal" },
      __cluster: "impossible-travel",
    })
  );
  drafts.push(
    base(at(1200), {
      eventType: "authentication_success",
      severity: "high",
      sourceHostId: null,
      destinationHostId: "asset-vpn-01",
      sourceIp: EXTERNAL_IPS.alpha,
      destinationIp: EXTERNAL_IPS.vpn,
      userId: "a.dewi",
      description: `a.dewi signed in to the VPN from ${EXTERNAL_IPS.alpha} 5 minutes after an internal session`,
      details: { authMethod: "password+otp", location: "synthetic-external" },
      __cluster: "impossible-travel",
    })
  );

  // ---- Cluster 7: DNS beaconing from an engineering workstation -------------
  for (let i = 0; i < 42; i++) {
    drafts.push(
      base(new Date(at(900).getTime() + i * 70_000), {
        eventType: "dns_query",
        severity: i % 5 === 0 ? "low" : "info",
        sourceHostId: "asset-ws-eng-022",
        destinationHostId: "asset-dc-01",
        sourceIp: "10.10.5.22",
        destinationIp: "10.10.1.10",
        userId: "c.rahman",
        description: `DNS query for ${`beacon-${i}.cdn-storage.example`} from ws-eng-022`,
        details: { domain: DOMAINS.cdn, subdomain: `beacon-${i}` },
        __cluster: "dns-tunneling",
      })
    );
  }

  // ---- Cluster 8: after-hours finance access by an HR account ---------------
  const afterHoursBase = setMinutes(
    setHours(addMinutes(anchor, -2400), 2),
    14
  );
  drafts.push(
    base(afterHoursBase, {
      eventType: "file_access",
      severity: "medium",
      sourceHostId: "asset-ws-hr-007",
      destinationHostId: "asset-fs-01",
      sourceIp: "10.10.6.7",
      destinationIp: "10.10.1.20",
      userId: "d.maya",
      description:
        "d.maya accessed \\\\corp-fs-01\\finance\\payroll-march.xlsx outside business hours",
      details: { share: "finance", segment: "finance", afterHours: true },
      __cluster: "after-hours",
    })
  );

  // ---- Cluster 9: certutil download on an engineering host -----------------
  drafts.push(
    base(at(1500), {
      eventType: "process_creation",
      severity: "high",
      sourceHostId: "asset-ws-eng-022",
      destinationHostId: null,
      sourceIp: "10.10.5.22",
      destinationIp: null,
      userId: "c.rahman",
      description:
        "certutil download utility launched on ws-eng-022 (certutil -urlcache -f …)",
      details: { processName: "certutil-download" },
      __cluster: "certutil-eng",
    })
  );
  drafts.push(
    base(addMinutes(at(1500), 2), {
      eventType: "network_connection",
      severity: "high",
      sourceHostId: "asset-ws-eng-022",
      destinationHostId: null,
      sourceIp: "10.10.5.22",
      destinationIp: EXTERNAL_IPS.charlie,
      userId: "c.rahman",
      description: `Outbound HTTP session from ws-eng-022 to ${EXTERNAL_IPS.charlie}:80`,
      details: { port: 80, protocol: "TCP" },
      __cluster: "certutil-eng",
    })
  );

  // ---- Cluster 10: encoded PowerShell on another engineering host ----------
  drafts.push(
    base(at(2600), {
      eventType: "process_creation",
      severity: "high",
      sourceHostId: "asset-ws-eng-031",
      destinationHostId: null,
      sourceIp: "10.10.5.31",
      destinationIp: null,
      userId: "c.rahman",
      description:
        "Encoded PowerShell launched on ws-eng-031 (powershell.exe -enc …)",
      details: { processName: "powershell-encoded" },
      __cluster: "powershell-eng",
    })
  );

  // ---- Cluster 11: synthetic malware flag on the mail server ---------------
  drafts.push(
    base(at(5400), {
      eventType: "malware_detected",
      severity: "low",
      sourceHostId: "asset-mail-01",
      destinationHostId: null,
      sourceIp: "10.10.2.20",
      destinationIp: null,
      userId: null,
      description:
        "Synthetic signature Synthetic.Legit.Tool flagged on mail-01 by the mail scanner",
      details: { signature: "Synthetic.Legit.Tool", quarantined: true },
      __cluster: "malware-mail",
    })
  );

  // ---- Cluster 12: simulated port sweep against the mail server ------------
  for (let i = 0; i < 21; i++) {
    drafts.push(
      base(new Date(at(6600).getTime() + i * 11_000), {
        eventType: "network_connection",
        severity: i % 4 === 0 ? "low" : "info",
        sourceHostId: null,
        destinationHostId: "asset-mail-01",
        sourceIp: EXTERNAL_IPS.charlie,
        destinationIp: "10.10.2.20",
        userId: null,
        description: `Simulated connection attempt from ${EXTERNAL_IPS.charlie} to mail-01 on port ${25 + i * 13}`,
        details: { port: 25 + i * 13, protocol: "TCP", blocked: true },
        __cluster: "port-scan-mail",
      })
    );
  }
  drafts.push(
    base(addMinutes(at(6600), 5), {
      eventType: "port_scan_simulated",
      severity: "medium",
      sourceHostId: null,
      destinationHostId: "asset-mail-01",
      sourceIp: EXTERNAL_IPS.charlie,
      destinationIp: "10.10.2.20",
      userId: null,
      description: `Simulated port sweep detected from ${EXTERNAL_IPS.charlie} against mail-01`,
      details: { distinctPorts: 21, windowSeconds: 300 },
      __cluster: "port-scan-mail",
    })
  );

  // ---- Cluster 13: suspicious outbound transfer from the backup server -----
  drafts.push(
    base(at(480), {
      eventType: "data_transfer",
      severity: "high",
      sourceHostId: "asset-backup-01",
      destinationHostId: null,
      sourceIp: "10.10.1.50",
      destinationIp: EXTERNAL_IPS.alpha,
      userId: "svc-backup",
      description: `backup-01 transferred 120.0 MB to ${EXTERNAL_IPS.alpha} outside the backup window`,
      details: { bytesOut: 125_829_120, destination: "external" },
      __cluster: "backup-exfil",
    })
  );

  // ---- Cluster 14: fresh credential burst against the VPN ------------------
  for (let i = 0; i < 9; i++) {
    drafts.push(
      base(new Date(at(1080).getTime() + i * 55_000), {
        eventType: "authentication_failure",
        severity: "high",
        sourceHostId: null,
        destinationHostId: "asset-vpn-01",
        sourceIp: EXTERNAL_IPS.alpha,
        destinationIp: EXTERNAL_IPS.vpn,
        userId: "c.rahman",
        description: `VPN sign-in failed for c.rahman from ${EXTERNAL_IPS.alpha} (invalid password)`,
        details: { reason: "invalid_credentials" },
        __cluster: "vpn-burst-2",
      })
    );
  }

  // ---- Sort, assign stable IDs, collect clusters ----------------------------
  const sorted = drafts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const clusters: Record<string, string[]> = {};
  const events: SecurityEvent[] = sorted.map((draft, index) => {
    const id = `evt-${String(index + 1).padStart(4, "0")}`;
    if (draft.__cluster) {
      (clusters[draft.__cluster] ??= []).push(id);
    }
    const rest = { ...draft };
    delete rest.__cluster;
    return {
      id,
      relatedAlertIds: [],
      ...rest,
    } as SecurityEvent;
  });

  return { events, clusters };
}

export { HOST_BY_NAME };
