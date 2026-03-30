export type Asset = {
  id: string;
  name: string;
  ticker: string;
  market: "KRX" | "NASDAQ" | "NYSE" | "ETF";
  asset_type: "stock" | "etf" | "cash";
  currency: "KRW" | "USD";
  benchmark_group: string;
  dividend_cycle: "monthly" | "quarterly" | "semiannual" | "annual" | "none";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Holding = {
  id: string;
  asset_id: string;
  account_name: string;
  quantity: number;
  avg_buy_price: number;
  buy_date: string;
  target_weight: number;
  memo: string;
  created_at: string;
  updated_at: string;
};

export type PriceHistory = {
  id: string;
  asset_id: string;
  date: string;
  close_price: number;
  high_52w: number;
  source: "manual" | "api" | "sheet" | "mock";
  created_at: string;
};

export type PerformanceRecord = {
  id: string;
  year: number;
  portfolio_return: number;
  benchmark_return: number;
  gap: number;
  yellow_flag: boolean;
  red_flag: boolean;
  note: string;
  created_at: string;
  updated_at: string;
};

export type DividendEventStatus = "planned" | "confirmed" | "paid";

export type DividendEvent = {
  id: string;
  asset_id: string;
  ex_date: string;
  record_date: string;
  payment_due_date: string;
  payment_actual_date?: string;
  dividend_per_share: number;
  expected_amount: number;
  actual_amount?: number;
  status: DividendEventStatus;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  asset_id: string;
  account_name: string;
  date: string;
  type: "buy" | "sell" | "dividend";
  quantity: number;
  price: number;
  amount: number;
  fee: number;
  note: string;
  created_at: string;
};

export type BenchmarkSettings = {
  label: string;
  ticker: string;
  benchmark_group: string;
  warningYears: number;
};

export type PriceSnapshot = {
  assetId: string;
  currentPrice: number;
  high52w: number;
  asOf: string;
  source: PriceHistory["source"];
};

export type MddStage =
  | "normal"
  | "trigger_15"
  | "trigger_20"
  | "trigger_25"
  | "trigger_30"
  | "trigger_40"
  | "trigger_50";

export type HoldingRow = {
  holdingId: string;
  assetId: string;
  name: string;
  ticker: string;
  market: Asset["market"];
  accountName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  returnRate: number;
  currentWeight: number;
  targetWeight: number;
  weightDiff: number;
  high52w: number;
  drawdownFrom52w: number;
  mddStage: MddStage;
  memo: string;
  asOf: string;
};
