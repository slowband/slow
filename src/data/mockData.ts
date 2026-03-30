import type {
  Asset,
  DividendEvent,
  Holding,
  PerformanceRecord,
  PriceHistory,
  Transaction
} from "../types";

const now = "2026-03-30T08:40:00+09:00";

export const assets: Asset[] = [
  {
    id: "asset-kodex-nasdaq",
    name: "KODEX 미국나스닥100TR",
    ticker: "379800",
    market: "ETF",
    asset_type: "etf",
    currency: "KRW",
    benchmark_group: "nasdaq_growth",
    dividend_cycle: "none",
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: "asset-tiger-ai",
    name: "TIGER 글로벌AI&로보틱스INDXX",
    ticker: "417450",
    market: "ETF",
    asset_type: "etf",
    currency: "KRW",
    benchmark_group: "growth_satellite",
    dividend_cycle: "semiannual",
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: "asset-kosef-bond",
    name: "KOSEF 국고채10년",
    ticker: "148070",
    market: "ETF",
    asset_type: "etf",
    currency: "KRW",
    benchmark_group: "defensive",
    dividend_cycle: "quarterly",
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: "asset-samsung",
    name: "삼성전자",
    ticker: "005930",
    market: "KRX",
    asset_type: "stock",
    currency: "KRW",
    benchmark_group: "core_kr",
    dividend_cycle: "quarterly",
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: "asset-tiger-dividend",
    name: "TIGER 미국배당다우존스",
    ticker: "458730",
    market: "ETF",
    asset_type: "etf",
    currency: "KRW",
    benchmark_group: "income",
    dividend_cycle: "monthly",
    is_active: true,
    created_at: now,
    updated_at: now
  }
];

export const holdings: Holding[] = [
  {
    id: "holding-1",
    asset_id: "asset-kodex-nasdaq",
    account_name: "ISA",
    quantity: 132,
    avg_buy_price: 12940,
    buy_date: "2025-04-18",
    target_weight: 0.3,
    memo: "핵심 성장 축",
    created_at: now,
    updated_at: now
  },
  {
    id: "holding-2",
    asset_id: "asset-tiger-ai",
    account_name: "연금저축",
    quantity: 84,
    avg_buy_price: 12110,
    buy_date: "2025-08-08",
    target_weight: 0.18,
    memo: "공격적 위성 자산",
    created_at: now,
    updated_at: now
  },
  {
    id: "holding-3",
    asset_id: "asset-kosef-bond",
    account_name: "ISA",
    quantity: 96,
    avg_buy_price: 112750,
    buy_date: "2025-02-10",
    target_weight: 0.2,
    memo: "방어 포지션",
    created_at: now,
    updated_at: now
  },
  {
    id: "holding-4",
    asset_id: "asset-samsung",
    account_name: "일반",
    quantity: 18,
    avg_buy_price: 74100,
    buy_date: "2024-11-06",
    target_weight: 0.12,
    memo: "국내 대표주",
    created_at: now,
    updated_at: now
  },
  {
    id: "holding-5",
    asset_id: "asset-tiger-dividend",
    account_name: "연금저축",
    quantity: 163,
    avg_buy_price: 10480,
    buy_date: "2025-10-22",
    target_weight: 0.2,
    memo: "현금흐름 보강",
    created_at: now,
    updated_at: now
  }
];

export const priceHistory: PriceHistory[] = [
  {
    id: "price-1",
    asset_id: "asset-kodex-nasdaq",
    date: "2026-03-30",
    close_price: 14820,
    high_52w: 15680,
    source: "mock",
    created_at: now
  },
  {
    id: "price-2",
    asset_id: "asset-tiger-ai",
    date: "2026-03-30",
    close_price: 9640,
    high_52w: 13650,
    source: "mock",
    created_at: now
  },
  {
    id: "price-3",
    asset_id: "asset-kosef-bond",
    date: "2026-03-30",
    close_price: 111940,
    high_52w: 114300,
    source: "mock",
    created_at: now
  },
  {
    id: "price-4",
    asset_id: "asset-samsung",
    date: "2026-03-30",
    close_price: 79800,
    high_52w: 88800,
    source: "mock",
    created_at: now
  },
  {
    id: "price-5",
    asset_id: "asset-tiger-dividend",
    date: "2026-03-30",
    close_price: 10970,
    high_52w: 11320,
    source: "mock",
    created_at: now
  }
];

export const performanceRecords: PerformanceRecord[] = [
  {
    id: "perf-2022",
    year: 2022,
    portfolio_return: -0.194,
    benchmark_return: -0.168,
    gap: -0.026,
    yellow_flag: true,
    red_flag: false,
    note: "초기 구축기",
    created_at: now,
    updated_at: now
  },
  {
    id: "perf-2023",
    year: 2023,
    portfolio_return: 0.284,
    benchmark_return: 0.317,
    gap: -0.033,
    yellow_flag: true,
    red_flag: false,
    note: "반등 국면 추격 부족",
    created_at: now,
    updated_at: now
  },
  {
    id: "perf-2024",
    year: 2024,
    portfolio_return: 0.182,
    benchmark_return: 0.211,
    gap: -0.029,
    yellow_flag: true,
    red_flag: true,
    note: "현금 비중 확대 영향",
    created_at: now,
    updated_at: now
  },
  {
    id: "perf-2025",
    year: 2025,
    portfolio_return: 0.226,
    benchmark_return: 0.194,
    gap: 0.032,
    yellow_flag: false,
    red_flag: false,
    note: "AI 테마 초과 성과",
    created_at: now,
    updated_at: now
  }
];

export const dividendEvents: DividendEvent[] = [
  {
    id: "div-1",
    asset_id: "asset-kosef-bond",
    ex_date: "2026-04-01",
    record_date: "2026-04-02",
    payment_due_date: "2026-04-08",
    dividend_per_share: 120,
    expected_amount: 11520,
    status: "planned",
    created_at: now,
    updated_at: now
  },
  {
    id: "div-2",
    asset_id: "asset-tiger-dividend",
    ex_date: "2026-04-29",
    record_date: "2026-04-30",
    payment_due_date: "2026-05-07",
    dividend_per_share: 55,
    expected_amount: 8965,
    status: "confirmed",
    created_at: now,
    updated_at: now
  },
  {
    id: "div-3",
    asset_id: "asset-samsung",
    ex_date: "2026-02-27",
    record_date: "2026-02-28",
    payment_due_date: "2026-04-18",
    payment_actual_date: "2026-04-18",
    dividend_per_share: 361,
    expected_amount: 6498,
    actual_amount: 6498,
    status: "paid",
    created_at: now,
    updated_at: now
  }
];

export const transactions: Transaction[] = [
  {
    id: "txn-1",
    asset_id: "asset-kodex-nasdaq",
    account_name: "ISA",
    date: "2025-04-18",
    type: "buy",
    quantity: 40,
    price: 12820,
    amount: 512800,
    fee: 0,
    note: "첫 매수",
    created_at: now
  }
];

