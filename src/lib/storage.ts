import type { Asset, Holding, PriceHistory, PriceSnapshot, Transaction } from "../types";
import { buildSeedTransactions } from "./portfolioTransactions";

const ASSETS_KEY = "galaticos:assets";
const HOLDINGS_KEY = "galaticos:holdings";
const TRANSACTIONS_KEY = "galaticos:transactions";
const SNAPSHOTS_KEY = "galaticos:snapshots";

const readJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const buildSnapshotsFromHistory = (fallback: PriceHistory[]): PriceSnapshot[] =>
  fallback.map((entry) => ({
    assetId: entry.asset_id,
    currentPrice: entry.close_price,
    high52w: entry.high_52w,
    asOf: entry.date,
    source: entry.source
  }));

export const loadAssets = (fallback: Asset[]) => readJson<Asset[]>(ASSETS_KEY) ?? fallback;

export const loadHoldings = (fallback: Holding[]) => readJson<Holding[]>(HOLDINGS_KEY) ?? fallback;

export const loadTransactions = (fallback: Holding[]) =>
  readJson<Transaction[]>(TRANSACTIONS_KEY) ?? buildSeedTransactions(fallback);

export const loadSnapshots = (fallback: PriceHistory[]) =>
  readJson<PriceSnapshot[]>(SNAPSHOTS_KEY) ?? buildSnapshotsFromHistory(fallback);

export const saveAssets = (assets: Asset[]) => writeJson(ASSETS_KEY, assets);

export const saveHoldings = (holdings: Holding[]) => writeJson(HOLDINGS_KEY, holdings);

export const saveTransactions = (transactions: Transaction[]) =>
  writeJson(TRANSACTIONS_KEY, transactions);

export const saveSnapshots = (snapshots: PriceSnapshot[]) =>
  writeJson(SNAPSHOTS_KEY, snapshots);
