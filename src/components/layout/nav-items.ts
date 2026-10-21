import {
  LayoutDashboard,
  ListFilter,
  BellRing,
  Share2,
  FolderSearch,
  Server,
  Radar,
  ShieldCheck,
  FlaskConical,
  ClipboardList,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  group: "operations" | "intelligence" | "response" | "system";
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Cyber command center",
    group: "operations",
  },
  {
    href: "/events",
    label: "Events",
    icon: ListFilter,
    description: "Security event explorer",
    group: "operations",
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: BellRing,
    description: "Alert management",
    group: "operations",
  },
  {
    href: "/network",
    label: "Network Graph",
    icon: Share2,
    description: "Topology and threat graph",
    group: "operations",
  },
  {
    href: "/incidents",
    label: "Incidents",
    icon: FolderSearch,
    description: "Investigation workspace",
    group: "operations",
  },
  {
    href: "/assets",
    label: "Assets",
    icon: Server,
    description: "Asset inventory",
    group: "intelligence",
  },
  {
    href: "/intelligence",
    label: "Threat Intelligence",
    icon: Radar,
    description: "Synthetic indicator explorer",
    group: "intelligence",
  },
  {
    href: "/rules",
    label: "Detection Rules",
    icon: ShieldCheck,
    description: "Rule explorer",
    group: "intelligence",
  },
  {
    href: "/scenarios",
    label: "Scenarios",
    icon: FlaskConical,
    description: "Scenario simulator",
    group: "response",
  },
  {
    href: "/playbooks",
    label: "Playbooks",
    icon: ClipboardList,
    description: "Incident response checklists",
    group: "response",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    description: "Incident reports and export",
    group: "response",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Workspace preferences",
    group: "system",
  },
];

export const NAV_GROUPS: { id: NavItem["group"]; label: string }[] = [
  { id: "operations", label: "Operations" },
  { id: "intelligence", label: "Intelligence" },
  { id: "response", label: "Response" },
  { id: "system", label: "System" },
];
