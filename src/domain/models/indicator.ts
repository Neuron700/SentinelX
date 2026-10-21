export type IndicatorType = "ip" | "domain" | "file_hash" | "username" | "hostname";

export type IndicatorRisk = "low" | "medium" | "high" | "critical";

export interface ThreatIndicator {
  id: string;
  type: IndicatorType;
  value: string;
  source: string;
  confidence: number;
  riskRating: IndicatorRisk;
  firstSeen: string;
  lastSeen: string;
  description: string;
  relatedEventIds: string[];
  relatedAlertIds: string[];
  relatedAssetIds: string[];
  analystNotes: string;
  synthetic: true;
}
