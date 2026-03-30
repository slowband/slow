import type { Holding, Transaction } from "../types";
import { buildSeedTransactions } from "./portfolioTransactions";

const HOLDINGS_KEY = "galaticos:holdings";
const TRANSACTIONS_KEY = "galaticos:transactions";

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

export const loadHoldings = (fallback: Holding[]) => readJson<Holding[]>(HOLDINGS_KEY) ?? fallback;

export const loadTransactions = (fallback: Holding[]) =>
  readJson<Transaction[]>(TRANSACTIONS_KEY) ?? buildSeedTransactions(fallback);

export const saveHoldings = (holdings: Holding[]) => writeJson(HOLDINGS_KEY, holdings);

export const saveTransactions = (transactions: Transaction[]) =>
  writeJson(TRANSACTIONS_KEY, transactions);
