import type { Asset, DividendEvent, Holding } from "../types";

export const enrichDividendAmounts = (
  events: DividendEvent[],
  holdings: Holding[]
) => {
  const quantityMap = new Map(holdings.map((holding) => [holding.asset_id, holding.quantity]));

  return events.map((event) => {
    const quantity = quantityMap.get(event.asset_id) ?? 0;
    const expectedAmount = quantity * event.dividend_per_share;

    return {
      ...event,
      expected_amount: expectedAmount
    };
  });
};

export const groupDividends = (events: DividendEvent[], assets: Asset[]) => {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const planned = events.filter((event) => event.status === "planned");
  const confirmed = events.filter((event) => event.status === "confirmed");
  const paid = events.filter((event) => event.status === "paid");

  const totalPaid = paid.reduce((sum, event) => sum + (event.actual_amount ?? 0), 0);
  const totalExpected = events.reduce((sum, event) => sum + event.expected_amount, 0);

  const byMonth = events.reduce<Record<string, number>>((acc, event) => {
    const key = event.payment_due_date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + event.expected_amount;
    return acc;
  }, {});

  const withAssetNames = events.map((event) => ({
    ...event,
    assetName: assetMap.get(event.asset_id)?.name ?? "알 수 없음"
  }));

  return {
    planned,
    confirmed,
    paid,
    totalPaid,
    totalExpected,
    byMonth,
    withAssetNames
  };
};
