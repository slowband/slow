import type { Holding, Transaction } from "../types";

export type TransactionType = "buy" | "sell";

export type TransactionDraft = {
  asset_id: string;
  account_name: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee: number;
  date: string;
  note: string;
};

export const buildSeedTransactions = (holdings: Holding[]): Transaction[] =>
  holdings.map((holding) => ({
    id: `seed-${holding.id}`,
    asset_id: holding.asset_id,
    account_name: holding.account_name,
    date: holding.buy_date,
    type: "buy",
    quantity: holding.quantity,
    price: holding.avg_buy_price,
    amount: holding.quantity * holding.avg_buy_price,
    fee: 0,
    note: "초기 보유",
    created_at: holding.created_at
  }));

export const buildTransactionRecord = (
  holding: Holding,
  draft: TransactionDraft,
  existingId?: string
): Transaction => ({
  id: existingId ?? `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  asset_id: holding.asset_id,
  account_name: holding.account_name,
  date: draft.date,
  type: draft.type,
  quantity: draft.quantity,
  price: draft.price,
  amount: draft.quantity * draft.price,
  fee: draft.fee,
  note: draft.note,
  created_at: existingId ? holding.updated_at : new Date().toISOString()
});

export const recalculateHoldingFromTransactions = (
  holding: Holding,
  transactions: Transaction[]
): Holding => {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let quantity = 0;
  let totalCost = 0;

  for (const tx of sorted) {
    if (tx.type === "buy") {
      quantity += tx.quantity;
      totalCost += tx.quantity * tx.price + tx.fee;
      continue;
    }

    if (tx.type === "sell") {
      const avg = quantity > 0 ? totalCost / quantity : 0;
      const sellQty = Math.min(tx.quantity, quantity);
      quantity -= sellQty;
      totalCost = quantity > 0 ? avg * quantity : 0;
    }
  }

  const firstBuy = sorted.find((tx) => tx.type === "buy");

  return {
    ...holding,
    quantity,
    avg_buy_price: quantity > 0 ? totalCost / quantity : 0,
    buy_date: firstBuy?.date ?? holding.buy_date,
    updated_at: new Date().toISOString()
  };
};
