import type {
  Asset,
  DividendEvent,
  Holding,
  HoldingRow,
  MddStage,
  PerformanceRecord,
  PriceSnapshot
} from "../types";

export const getMddStage = (drawdown: number): MddStage => {
  if (drawdown <= -0.5) return "trigger_50";
  if (drawdown <= -0.4) return "trigger_40";
  if (drawdown <= -0.3) return "trigger_30";
  if (drawdown <= -0.25) return "trigger_25";
  if (drawdown <= -0.2) return "trigger_20";
  if (drawdown <= -0.15) return "trigger_15";
  return "normal";
};

export const getMddLabel = (stage: MddStage) => {
  const labels: Record<MddStage, string> = {
    normal: "정상",
    trigger_15: "15% 트리거",
    trigger_20: "20% 트리거",
    trigger_25: "25% 트리거",
    trigger_30: "30% 트리거",
    trigger_40: "40% 트리거",
    trigger_50: "50% 트리거"
  };

  return labels[stage];
};

export const buildHoldingRows = (
  assets: Asset[],
  holdings: Holding[],
  prices: PriceSnapshot[]
): HoldingRow[] => {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const priceMap = new Map(prices.map((price) => [price.assetId, price]));

  const draftRows = holdings
    .map((holding) => {
      const asset = assetMap.get(holding.asset_id);
      const price = priceMap.get(holding.asset_id);

      if (!asset || !price) {
        return null;
      }

      const marketValue = holding.quantity * price.currentPrice;
      const profitLoss = (price.currentPrice - holding.avg_buy_price) * holding.quantity;
      const returnRate =
        holding.avg_buy_price === 0
          ? 0
          : (price.currentPrice - holding.avg_buy_price) / holding.avg_buy_price;
      const drawdownFrom52w =
        price.high52w === 0 ? 0 : (price.currentPrice - price.high52w) / price.high52w;

      return {
        holdingId: holding.id,
        assetId: asset.id,
        name: asset.name,
        ticker: asset.ticker,
        market: asset.market,
        accountName: holding.account_name,
        quantity: holding.quantity,
        avgBuyPrice: holding.avg_buy_price,
        currentPrice: price.currentPrice,
        marketValue,
        profitLoss,
        returnRate,
        currentWeight: 0,
        targetWeight: holding.target_weight,
        weightDiff: 0,
        high52w: price.high52w,
        drawdownFrom52w,
        mddStage: getMddStage(drawdownFrom52w),
        memo: holding.memo,
        asOf: price.asOf
      } satisfies HoldingRow;
    })
    .filter((row): row is HoldingRow => row !== null);

  const totalMarketValue = draftRows.reduce((sum, row) => sum + row.marketValue, 0);

  return draftRows.map((row) => {
    const currentWeight =
      totalMarketValue === 0 ? 0 : row.marketValue / totalMarketValue;

    return {
      ...row,
      currentWeight,
      weightDiff: currentWeight - row.targetWeight
    };
  });
};

export const summarizePortfolio = (rows: HoldingRow[]) => {
  const totalMarketValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
  const totalBuyValue = rows.reduce(
    (sum, row) => sum + row.avgBuyPrice * row.quantity,
    0
  );
  const totalProfitLoss = totalMarketValue - totalBuyValue;
  const totalReturnRate =
    totalBuyValue === 0 ? 0 : totalProfitLoss / totalBuyValue;

  const offTargetCount = rows.filter((row) => Math.abs(row.weightDiff) >= 0.03).length;
  const mddAlertCount = rows.filter((row) => row.mddStage !== "normal").length;
  const sortedDates = rows.map((row) => row.asOf).sort();
  const lastUpdated = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : undefined;

  return {
    totalMarketValue,
    totalBuyValue,
    totalProfitLoss,
    totalReturnRate,
    offTargetCount,
    mddAlertCount,
    lastUpdated
  };
};

export const evaluatePerformanceRecords = (
  records: PerformanceRecord[],
  warningYears: number
) => {
  const sorted = [...records].sort((a, b) => a.year - b.year);

  return sorted.map((record, index) => {
    const yellow = record.portfolio_return < record.benchmark_return;
    const window = sorted.slice(Math.max(0, index - (warningYears - 1)), index + 1);
    const red =
      window.length === warningYears &&
      window.every((entry) => entry.portfolio_return < entry.benchmark_return);

    return {
      ...record,
      gap: record.portfolio_return - record.benchmark_return,
      yellow_flag: yellow,
      red_flag: red
    };
  });
};

export const getPerformanceSummary = (records: PerformanceRecord[]) => {
  const sorted = [...records].sort((a, b) => a.year - b.year);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  const trailing1Y = latest?.gap ?? 0;
  const trailing3Y = sorted.slice(-3).reduce((sum, row) => sum + row.gap, 0);

  return {
    latest,
    trailing1Y,
    trailing3Y
  };
};

export const getUpcomingDividends = (dividends: DividendEvent[]) =>
  [...dividends]
    .filter((event) => event.status !== "paid")
    .sort((a, b) => a.payment_due_date.localeCompare(b.payment_due_date));



