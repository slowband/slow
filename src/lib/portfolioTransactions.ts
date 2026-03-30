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

export const applyTransactionToHolding = (
  holding: Holding,
  draft: TransactionDraft
): Holding => {
  const currentCost = holding.quantity * holding.avg_buy_price;

  if (draft.type === "buy") {
    const nextQuantity = holding.quantity + draft.quantity;
    const nextCost = currentCost + draft.quantity * draft.price + draft.fee;

    return {
      ...holding,
      quantity: nextQuantity,
      avg_buy_price: nextQuantity > 0 ? nextCost / nextQuantity : 0,
      buy_date: draft.date,
      updated_at: new Date().toISOString()
    };
  }

  const nextQuantity = Math.max(holding.quantity - draft.quantity, 0);

  return {
    ...holding,
    quantity: nextQuantity,
    avg_buy_price: nextQuantity > 0 ? holding.avg_buy_price : 0,
    updated_at: new Date().toISOString()
  };
};

export const buildTransactionRecord = (
  holding: Holding,
  draft: TransactionDraft
): Transaction => ({
  id: `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  asset_id: holding.asset_id,
  account_name: holding.account_name,
  date: draft.date,
  type: draft.type,
  quantity: draft.quantity,
  price: draft.price,
  amount: draft.quantity * draft.price,
  fee: draft.fee,
  note: draft.note,
  created_at: new Date().toISOString()
});
