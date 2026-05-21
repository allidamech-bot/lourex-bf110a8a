export type PredictiveSeverity = "low" | "medium" | "high" | "critical";
export type PredictiveHorizon = "24h" | "3d" | "7d" | "14d";
export type PredictiveCategory = "revenue" | "customer" | "operations" | "logistics" | "finance";

export type PredictiveRequestSnapshot = {
  id: string;
  label?: string;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  productName?: string;
  quantity?: number | null;
  destination?: string | null;
  customerCountry?: string | null;
  shippingMethod?: string | null;
  hasTransferProof?: boolean;
};

export type PredictiveDealSnapshot = {
  id: string;
  label?: string;
  status?: string;
  operationalStatus?: string;
  stage?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  shipmentId?: string | null;
  totalValue?: number | null;
  currency?: string | null;
  turkishPartnerId?: string | null;
  saudiPartnerId?: string | null;
};

export type PredictiveShipmentSnapshot = {
  id: string;
  label?: string;
  stage?: string;
  updatedAt?: string | null;
  destination?: string | null;
  dealLabel?: string | null;
};

export type PredictiveFinanceSnapshot = {
  id: string;
  label?: string;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  amount?: number | null;
  currency?: string | null;
};

export type PredictiveDataSnapshot = {
  generatedFrom?: "lovable-cloud" | "static" | "manual";
  generatedAt?: string;
  requests?: PredictiveRequestSnapshot[];
  deals?: PredictiveDealSnapshot[];
  shipments?: PredictiveShipmentSnapshot[];
  financeReviews?: PredictiveFinanceSnapshot[];
};

export type PredictiveSignal = {
  id: string;
  category: PredictiveCategory;
  title: string;
  severity: PredictiveSeverity;
  probability: number;
  impactScore: number;
  horizon: PredictiveHorizon;
  entityLabel?: string;
  evidence: string[];
  recommendedAction: string;
};

export type PredictiveMetric = {
  id: string;
  label: string;
  value: number | string;
  severity: PredictiveSeverity;
  description: string;
};

export type PredictiveReport = {
  generatedAt: string;
  dataSource: PredictiveDataSnapshot["generatedFrom"];
  readinessScore: number;
  confidenceScore: number;
  metrics: PredictiveMetric[];
  signals: PredictiveSignal[];
  nextBestActions: string[];
  sourceCounts: {
    requests: number;
    deals: number;
    shipments: number;
    financeReviews: number;
  };
};
