import type { PriceHistory, PriceSnapshot } from "../types";

export interface PriceProvider {
  name: string;
  getLatestSnapshots(): Promise<PriceSnapshot[]>;
}

export class MockPriceProvider implements PriceProvider {
  name = "mock";

  constructor(private readonly prices: PriceHistory[]) {}

  async getLatestSnapshots(): Promise<PriceSnapshot[]> {
    return this.prices.map((entry) => ({
      assetId: entry.asset_id,
      currentPrice: entry.close_price,
      high52w: entry.high_52w,
      asOf: entry.date,
      source: entry.source
    }));
  }
}
