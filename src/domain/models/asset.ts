import type { AssetType } from "./common";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  environment: string;
  os: string | null;
  ipAddress: string | null;
  riskScore: number;
  riskFactors: string[];
  lastSeen: string;
  relatedAlertIds: string[];
  tags: string[];
}
