import type { Asset } from "@/domain/models/asset";

export const SYNTHETIC_NOTE =
  "All entities in this dataset are fictional and generated for demonstration.";

export const SEED_ANCHOR_HOURS = 7 * 24;

export interface HostDef {
  id: string;
  name: string;
  type: Asset["type"];
  environment: string;
  os: string | null;
  ip: string | null;
  risk: number;
  factors: string[];
  tags: string[];
}

export const HOSTS: HostDef[] = [
  {
    id: "asset-dc-01",
    name: "corp-dc-01",
    type: "server",
    environment: "datacenter",
    os: "Windows Server 2022 (synthetic)",
    ip: "10.10.1.10",
    risk: 34,
    factors: ["Domain controller", "Exposed LDAP", "Legacy TLS policy"],
    tags: ["identity", "critical-infrastructure"],
  },
  {
    id: "asset-fs-01",
    name: "corp-fs-01",
    type: "server",
    environment: "datacenter",
    os: "Windows Server 2022 (synthetic)",
    ip: "10.10.1.20",
    risk: 46,
    factors: ["Finance share host", "Broad read ACL", "SMBv1 disabled"],
    tags: ["file-share", "finance"],
  },
  {
    id: "asset-web-01",
    name: "web-01",
    type: "server",
    environment: "dmz",
    os: "Ubuntu 22.04 (synthetic)",
    ip: "10.10.2.10",
    risk: 58,
    factors: ["Internet-facing", "Recent CVE backlog", "Public HTTP/HTTPS"],
    tags: ["public-web", "dmz"],
  },
  {
    id: "asset-vpn-01",
    name: "vpn-gw-01",
    type: "gateway",
    environment: "edge",
    os: "NetworkOS 7.2 (synthetic)",
    ip: "203.0.113.10",
    risk: 51,
    factors: ["Remote access entry point", "Password-only legacy profile"],
    tags: ["vpn", "edge"],
  },
  {
    id: "asset-mail-01",
    name: "mail-01",
    type: "server",
    environment: "dmz",
    os: "Ubuntu 22.04 (synthetic)",
    ip: "10.10.2.20",
    risk: 29,
    factors: ["SMTP ingress", "Spam filtering enabled"],
    tags: ["email", "dmz"],
  },
  {
    id: "asset-jump-01",
    name: "jump-01",
    type: "server",
    environment: "management",
    os: "Windows Server 2019 (synthetic)",
    ip: "10.10.1.30",
    risk: 47,
    factors: ["Admin jump host", "Shared local admin", "RDP exposed internally"],
    tags: ["management", "privileged-access"],
  },
  {
    id: "asset-ws-fin-014",
    name: "ws-fin-014",
    type: "workstation",
    environment: "finance",
    os: "Windows 11 (synthetic)",
    ip: "10.10.4.14",
    risk: 66,
    factors: ["EDR alert history", "Finance share access", "External USB policy relaxed"],
    tags: ["finance", "endpoint"],
  },
  {
    id: "asset-ws-fin-021",
    name: "ws-fin-021",
    type: "workstation",
    environment: "finance",
    os: "Windows 11 (synthetic)",
    ip: "10.10.4.21",
    risk: 24,
    factors: ["Fully patched", "Standard user"],
    tags: ["finance", "endpoint"],
  },
  {
    id: "asset-ws-eng-022",
    name: "ws-eng-022",
    type: "workstation",
    environment: "engineering",
    os: "Ubuntu 24.04 (synthetic)",
    ip: "10.10.5.22",
    risk: 38,
    factors: ["Developer toolchain", "Outbound package access"],
    tags: ["engineering", "endpoint"],
  },
  {
    id: "asset-ws-eng-031",
    name: "ws-eng-031",
    type: "workstation",
    environment: "engineering",
    os: "Windows 11 (synthetic)",
    ip: "10.10.5.31",
    risk: 21,
    factors: ["Fully patched"],
    tags: ["engineering", "endpoint"],
  },
  {
    id: "asset-ws-hr-007",
    name: "ws-hr-007",
    type: "workstation",
    environment: "hr",
    os: "Windows 11 (synthetic)",
    ip: "10.10.6.7",
    risk: 19,
    factors: ["Fully patched", "Restricted share access"],
    tags: ["hr", "endpoint"],
  },
  {
    id: "asset-app-crm",
    name: "crm-app",
    type: "application",
    environment: "datacenter",
    os: "Container runtime (synthetic)",
    ip: "10.10.1.40",
    risk: 44,
    factors: ["Customer data", "Internal API exposed"],
    tags: ["application", "customer-data"],
  },
  {
    id: "asset-app-erp",
    name: "erp-app",
    type: "application",
    environment: "datacenter",
    os: "Container runtime (synthetic)",
    ip: "10.10.1.41",
    risk: 52,
    factors: ["Financial records", "Service account integration", "Outbound integration enabled"],
    tags: ["application", "finance"],
  },
  {
    id: "asset-backup-01",
    name: "backup-01",
    type: "server",
    environment: "datacenter",
    os: "Ubuntu 22.04 (synthetic)",
    ip: "10.10.1.50",
    risk: 41,
    factors: ["Service account access", "Large outbound transfer capability"],
    tags: ["backup", "service-account"],
  },
  {
    id: "asset-print-03",
    name: "print-03",
    type: "endpoint",
    environment: "corporate",
    os: "PrinterOS 3.1 (synthetic)",
    ip: "10.10.3.33",
    risk: 15,
    factors: ["Legacy firmware", "No internet access"],
    tags: ["peripheral"],
  },
  {
    id: "asset-user-a-dewi",
    name: "a.dewi",
    type: "user_account",
    environment: "finance",
    os: null,
    ip: null,
    risk: 57,
    factors: ["Privileged finance access", "Remote VPN user", "Recent anomalous sign-in"],
    tags: ["finance", "identity"],
  },
  {
    id: "asset-user-b-santoso",
    name: "b.santoso",
    type: "user_account",
    environment: "management",
    os: null,
    ip: null,
    risk: 48,
    factors: ["Domain administrator", "Jump host access"],
    tags: ["admin", "identity"],
  },
  {
    id: "asset-user-c-rahman",
    name: "c.rahman",
    type: "user_account",
    environment: "engineering",
    os: null,
    ip: null,
    risk: 20,
    factors: ["Developer access"],
    tags: ["engineering", "identity"],
  },
  {
    id: "asset-user-d-maya",
    name: "d.maya",
    type: "user_account",
    environment: "hr",
    os: null,
    ip: null,
    risk: 23,
    factors: ["HR records access", "Recent after-hours finance access"],
    tags: ["hr", "identity"],
  },
  {
    id: "asset-user-svc-backup",
    name: "svc-backup",
    type: "user_account",
    environment: "datacenter",
    os: null,
    ip: null,
    risk: 63,
    factors: ["Non-interactive service account", "Large transfer observed", "No MFA"],
    tags: ["service-account", "identity"],
  },
];

export const HOST_BY_ID = new Map(HOSTS.map((h) => [h.id, h]));
export const HOST_BY_NAME = new Map(HOSTS.map((h) => [h.name, h]));

export function hostName(id: string | null): string {
  if (!id) return "external";
  return HOST_BY_ID.get(id)?.name ?? id;
}

export function hostIp(id: string | null): string | null {
  if (!id) return null;
  return HOST_BY_ID.get(id)?.ip ?? null;
}

export const USER_NAMES = [
  "a.dewi",
  "b.santoso",
  "c.rahman",
  "d.maya",
  "svc-backup",
] as const;

export const INTERNAL_HOST_IDS = [
  "asset-dc-01",
  "asset-fs-01",
  "asset-web-01",
  "asset-mail-01",
  "asset-jump-01",
  "asset-ws-fin-014",
  "asset-ws-fin-021",
  "asset-ws-eng-022",
  "asset-ws-eng-031",
  "asset-ws-hr-007",
  "asset-app-crm",
  "asset-app-erp",
  "asset-backup-01",
  "asset-print-03",
] as const;

export const WORKSTATION_IDS = [
  "asset-ws-fin-014",
  "asset-ws-fin-021",
  "asset-ws-eng-022",
  "asset-ws-eng-031",
  "asset-ws-hr-007",
] as const;

export const EXTERNAL_IPS = {
  alpha: "198.51.100.23",
  bravo: "203.0.113.77",
  charlie: "192.0.2.45",
  vpn: "203.0.113.10",
} as const;

export const INTERNAL_IPS = [
  "10.10.1.10",
  "10.10.1.20",
  "10.10.1.30",
  "10.10.1.40",
  "10.10.1.41",
  "10.10.1.50",
  "10.10.2.10",
  "10.10.2.20",
  "10.10.3.33",
  "10.10.4.14",
  "10.10.4.21",
  "10.10.5.22",
  "10.10.5.31",
  "10.10.6.7",
] as const;

export const DOMAINS = {
  corporate: "meridian-logistics.example",
  mail: "mail.meridian-logistics.example",
  update: "update-check.example",
  cdn: "cdn-storage.example",
  intranet: "intranet.meridian-logistics.example",
} as const;

export const ANALYSTS = ["demo-analyst", "a.soc-lead", "t.tier2"] as const;
