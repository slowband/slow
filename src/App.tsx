import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { benchmarkSettings } from "./config/benchmark";
import {
  assets,
  dividendEvents,
  holdings as initialHoldings,
  performanceRecords,
  priceHistory
} from "./data/mockData";
import {
  buildHoldingRows,
  evaluatePerformanceRecords,
  getMddLabel,
  getPerformanceSummary,
  getUpcomingDividends,
  summarizePortfolio
} from "./lib/calc";
import { enrichDividendAmounts, groupDividends } from "./lib/dividends";
import {
  formatCurrency,
  formatDateLabel,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPercentPlain
} from "./lib/format";
import {
  buildTransactionRecord,
  recalculateHoldingFromTransactions,
  type TransactionDraft
} from "./lib/portfolioTransactions";
import {
  loadAssets,
  loadHoldings,
  loadSnapshots,
  loadTransactions,
  saveAssets,
  saveHoldings,
  saveSnapshots,
  saveTransactions
} from "./lib/storage";
import { MockPriceProvider } from "./providers/prices";
import type {
  Asset,
  DividendEvent,
  Holding,
  HoldingRow,
  PriceSnapshot,
  Transaction
} from "./types";

type TabKey = "home" | "portfolio" | "performance" | "dividends";
type SortKey = "returnRate" | "weightDiff" | "drawdownFrom52w";
type PortfolioViewMode = "summary" | "expanded";
type HoldingEditField = "account_name" | "quantity" | "avg_buy_price" | "target_weight" | "memo";
type AssetEditField = "name" | "ticker" | "market";
type SnapshotEditField = "currentPrice" | "high52w";
type AssetFormField = "name" | "ticker" | "market" | "account_name" | "quantity" | "avg_buy_price" | "target_weight" | "current_price" | "high_52w" | "memo";

const tabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "portfolio", label: "포트폴리오" },
  { key: "performance", label: "성과 비교" },
  { key: "dividends", label: "배당 관리" }
];

const sortLabels: Record<SortKey, string> = {
  returnRate: "수익률",
  weightDiff: "비중 차이",
  drawdownFrom52w: "MDD"
};

const initialTransactionDraft = (holding?: Holding): TransactionDraft => ({
  asset_id: holding?.asset_id ?? initialHoldings[0]?.asset_id ?? "",
  account_name: holding?.account_name ?? initialHoldings[0]?.account_name ?? "ISA",
  type: "buy",
  quantity: 1,
  price: holding?.avg_buy_price ?? 0,
  fee: 0,
  date: new Date().toISOString().slice(0, 10),
  note: ""
});

const initialAssetForm: Record<AssetFormField, string> = {
  name: "",
  ticker: "",
  market: "ETF",
  account_name: "절세계좌",
  quantity: "1",
  avg_buy_price: "0",
  target_weight: "10",
  current_price: "0",
  high_52w: "0",
  memo: ""
};

const sortTransactionsDesc = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });

const isTransactionInvalid = (transactions: Transaction[]) => {
  let quantity = 0;
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.localeCompare(b.created_at);
  });

  for (const transaction of sorted) {
    if (transaction.quantity <= 0 || transaction.price <= 0 || transaction.fee < 0) {
      return "수량과 가격은 0보다 커야 하고 수수료는 0 이상이어야 합니다.";
    }

    if (transaction.type === "buy") {
      quantity += transaction.quantity;
      continue;
    }

    if (transaction.quantity > quantity) {
      return "거래 순서를 기준으로 보면 매도 수량이 보유 수량보다 많습니다.";
    }

    quantity -= transaction.quantity;
  }

  return null;
};

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [sortKey, setSortKey] = useState<SortKey>("drawdownFrom52w");
  const [portfolioViewMode, setPortfolioViewMode] = useState<PortfolioViewMode>("summary");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editableAssets, setEditableAssets] = useState(() => loadAssets(assets));
  const [editableHoldings, setEditableHoldings] = useState<Holding[]>(() => loadHoldings(initialHoldings));
  const [priceSnapshots, setPriceSnapshots] = useState<PriceSnapshot[]>(() => loadSnapshots(priceHistory));
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(initialHoldings[0]?.id ?? "");
  const [transactionLog, setTransactionLog] = useState<Transaction[]>(() => loadTransactions(initialHoldings));
  const [transactionForm, setTransactionForm] = useState<TransactionDraft>(() => initialTransactionDraft(initialHoldings[0]));
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [assetFormError, setAssetFormError] = useState<string | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);

  useEffect(() => {
    void refreshPrices(true);
  }, []);

  const rows = useMemo(() => buildHoldingRows(editableAssets, editableHoldings, priceSnapshots), [editableAssets, editableHoldings, priceSnapshots]);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const direction = sortKey === "drawdownFrom52w" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * direction;
  }), [rows, sortKey]);

  const selectedHolding = editableHoldings.find((holding) => holding.id === selectedHoldingId) ?? editableHoldings[0];
  const selectedAsset = selectedHolding ? editableAssets.find((asset) => asset.id === selectedHolding.asset_id) : undefined;
  const selectedSnapshot = selectedHolding ? priceSnapshots.find((snapshot) => snapshot.assetId === selectedHolding.asset_id) : undefined;
  const selectedRow = rows.find((row) => row.holdingId === selectedHolding?.id) ?? rows[0];
  const selectedTransactions = useMemo(() => {
    if (!selectedHolding) return [];
    return sortTransactionsDesc(transactionLog.filter((transaction) => transaction.asset_id === selectedHolding.asset_id && transaction.account_name === selectedHolding.account_name));
  }, [selectedHolding, transactionLog]);

  useEffect(() => {
    if (editableHoldings.length === 0) {
      setSelectedHoldingId("");
      return;
    }

    if (!editableHoldings.some((holding) => holding.id === selectedHoldingId)) {
      setSelectedHoldingId(editableHoldings[0].id);
    }
  }, [editableHoldings, selectedHoldingId]);

  useEffect(() => {
    setEditingTransactionId(null);
    setTransactionError(null);
    setTransactionForm(initialTransactionDraft(selectedHolding));
  }, [selectedHoldingId]);

  useEffect(() => saveAssets(editableAssets), [editableAssets]);
  useEffect(() => saveHoldings(editableHoldings), [editableHoldings]);
  useEffect(() => saveSnapshots(priceSnapshots), [priceSnapshots]);
  useEffect(() => saveTransactions(transactionLog), [transactionLog]);

  const portfolioSummary = useMemo(() => summarizePortfolio(rows), [rows]);
  const performance = useMemo(() => evaluatePerformanceRecords(performanceRecords, benchmarkSettings.warningYears), []);
  const performanceSummary = useMemo(() => getPerformanceSummary(performance), [performance]);
  const dividends = useMemo(() => enrichDividendAmounts(dividendEvents, editableHoldings), [editableHoldings]);
  const dividendSummary = useMemo(() => groupDividends(dividends, editableAssets), [dividends, editableAssets]);
  const upcomingDividends = useMemo(() => getUpcomingDividends(dividends).slice(0, 3), [dividends]);

  const pieData = rows.map((row) => ({ name: row.ticker, value: row.marketValue }));
  const topWeightRows = [...rows].sort((a, b) => b.currentWeight - a.currentWeight).slice(0, 3);
  const performanceChart = performance.reduce<{ year: string; portfolio: number; benchmark: number }[]>((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : undefined;
    const portfolio = (prev?.portfolio ?? 100) * (1 + row.portfolio_return);
    const benchmark = (prev?.benchmark ?? 100) * (1 + row.benchmark_return);
    acc.push({ year: `${row.year}`, portfolio, benchmark });
    return acc;
  }, []);
  const isEmpty = !loading && rows.length === 0;

  async function refreshPrices(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);

    const provider = new MockPriceProvider(priceHistory);

    try {
      const snapshots = await provider.getLatestSnapshots();
      setPriceSnapshots((current) => {
        const currentOnly = current.filter((snapshot) => !snapshots.some((fresh) => fresh.assetId === snapshot.assetId));
        return [...snapshots, ...currentOnly];
      });
      setError(null);
    } catch {
      setError("현재가를 불러오지 못했습니다. mock provider 연결 상태를 확인해주세요.");
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }
  function updateHoldingField(holdingId: string, field: HoldingEditField, value: string) {
    const holding = editableHoldings.find((item) => item.id === holdingId);
    if (!holding) return;

    if (field === "account_name") {
      const nextAccountName = value;
      setEditableHoldings((current) => current.map((item) => item.id === holdingId ? { ...item, account_name: nextAccountName, updated_at: new Date().toISOString() } : item));
      setTransactionLog((current) => current.map((transaction) => transaction.asset_id === holding.asset_id && transaction.account_name === holding.account_name ? { ...transaction, account_name: nextAccountName } : transaction));
      return;
    }

    if (field === "memo") {
      setEditableHoldings((current) => current.map((item) => item.id === holdingId ? { ...item, memo: value, updated_at: new Date().toISOString() } : item));
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;

    setEditableHoldings((current) => current.map((item) => {
      if (item.id !== holdingId) return item;
      return { ...item, [field]: field === "target_weight" ? parsed / 100 : parsed, updated_at: new Date().toISOString() };
    }));
  }

  function updateAssetField(assetId: string, field: AssetEditField, value: string) {
    setEditableAssets((current) => current.map((asset) => asset.id === assetId ? { ...asset, [field]: value, updated_at: new Date().toISOString() } : asset));
  }

  function updateSnapshotField(assetId: string, field: SnapshotEditField, value: string) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;

    setPriceSnapshots((current) => current.map((snapshot) => snapshot.assetId === assetId ? { ...snapshot, [field]: parsed, asOf: new Date().toISOString().slice(0, 10), source: "manual" } : snapshot));
  }

  function submitTransaction() {
    if (!selectedHolding) return;

    const existingTransaction = transactionLog.find((transaction) => transaction.id === editingTransactionId);
    const draftRecord = buildTransactionRecord(selectedHolding, transactionForm, editingTransactionId ?? undefined);
    const nextTransaction: Transaction = {
      ...draftRecord,
      created_at: existingTransaction?.created_at ?? new Date().toISOString()
    };

    const nextHoldingTransactions = editingTransactionId
      ? selectedTransactions.map((transaction) => transaction.id === editingTransactionId ? nextTransaction : transaction)
      : [...selectedTransactions, nextTransaction];

    const validationError = isTransactionInvalid(nextHoldingTransactions);
    if (validationError) {
      setTransactionError(validationError);
      return;
    }

    const recalculatedHolding = recalculateHoldingFromTransactions(selectedHolding, nextHoldingTransactions);

    setEditableHoldings((current) => current.map((holding) => holding.id === selectedHolding.id ? { ...recalculatedHolding, memo: holding.memo, target_weight: holding.target_weight } : holding));
    setTransactionLog((current) => editingTransactionId
      ? current.map((transaction) => transaction.id === editingTransactionId ? nextTransaction : transaction)
      : [nextTransaction, ...current]);
    setTransactionError(null);
    setEditingTransactionId(null);
    setTransactionForm(initialTransactionDraft({ ...selectedHolding, ...recalculatedHolding }));
  }

  function startEditingTransaction(transaction: Transaction) {
    setEditingTransactionId(transaction.id);
    setTransactionError(null);
    setTransactionForm({
      asset_id: transaction.asset_id,
      account_name: transaction.account_name,
      type: transaction.type === "sell" ? "sell" : "buy",
      quantity: transaction.quantity,
      price: transaction.price,
      fee: transaction.fee,
      date: transaction.date,
      note: transaction.note
    });
  }

  function cancelTransactionEdit() {
    setEditingTransactionId(null);
    setTransactionError(null);
    setTransactionForm(initialTransactionDraft(selectedHolding));
  }

  function deleteTransaction(transactionId: string) {
    if (!selectedHolding) return;

    const nextHoldingTransactions = selectedTransactions.filter((transaction) => transaction.id !== transactionId);
    const validationError = isTransactionInvalid(nextHoldingTransactions);
    if (validationError) {
      setTransactionError(validationError);
      return;
    }

    const recalculatedHolding = recalculateHoldingFromTransactions(selectedHolding, nextHoldingTransactions);

    setEditableHoldings((current) => current.map((holding) => holding.id === selectedHolding.id ? { ...recalculatedHolding, memo: holding.memo, target_weight: holding.target_weight } : holding));
    setTransactionLog((current) => current.filter((transaction) => transaction.id !== transactionId));

    if (editingTransactionId === transactionId) {
      cancelTransactionEdit();
    }
  }

  function submitNewAsset() {
    const quantity = Number(assetForm.quantity);
    const avgBuyPrice = Number(assetForm.avg_buy_price);
    const targetWeight = Number(assetForm.target_weight);
    const currentPrice = Number(assetForm.current_price);
    const high52w = Number(assetForm.high_52w);

    if (!assetForm.name || !assetForm.ticker) {
      setAssetFormError("종목명과 티커는 필수입니다.");
      return;
    }

    if ([quantity, avgBuyPrice, targetWeight, currentPrice, high52w].some((value) => Number.isNaN(value) || value < 0)) {
      setAssetFormError("숫자 입력값을 다시 확인해주세요.");
      return;
    }

    const timestamp = new Date().toISOString();
    const assetId = `asset-${Date.now()}`;
    const holdingId = `holding-${Date.now()}`;

    const nextAsset: Asset = {
      id: assetId,
      name: assetForm.name,
      ticker: assetForm.ticker,
      market: assetForm.market as HoldingRow["market"],
      asset_type: assetForm.market === "KRX" ? "stock" : "etf",
      currency: "KRW",
      benchmark_group: "custom",
      dividend_cycle: "none",
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    };

    const nextHolding: Holding = {
      id: holdingId,
      asset_id: assetId,
      account_name: assetForm.account_name,
      quantity,
      avg_buy_price: avgBuyPrice,
      buy_date: timestamp.slice(0, 10),
      target_weight: targetWeight / 100,
      memo: assetForm.memo,
      created_at: timestamp,
      updated_at: timestamp
    };

    const nextSnapshot: PriceSnapshot = {
      assetId,
      currentPrice,
      high52w,
      asOf: timestamp.slice(0, 10),
      source: "manual"
    };

    const seedTransaction = buildTransactionRecord(nextHolding, {
      asset_id: assetId,
      account_name: assetForm.account_name,
      type: "buy",
      quantity,
      price: avgBuyPrice,
      fee: 0,
      date: timestamp.slice(0, 10),
      note: "초기 입력"
    });

    setEditableAssets((current) => [...current, nextAsset]);
    setEditableHoldings((current) => [...current, nextHolding]);
    setPriceSnapshots((current) => [...current, nextSnapshot]);
    setTransactionLog((current) => [seedTransaction, ...current]);
    setSelectedHoldingId(holdingId);
    setAssetForm(initialAssetForm);
    setAssetFormError(null);
  }

  function deleteSelectedAsset() {
    if (!selectedHolding || !selectedAsset) return;

    const shouldDelete = window.confirm(`${selectedAsset.name}을(를) 삭제하면 보유 정보와 거래 히스토리도 함께 삭제됩니다.`);
    if (!shouldDelete) return;

    setEditableAssets((current) => current.filter((asset) => asset.id !== selectedAsset.id));
    setEditableHoldings((current) => current.filter((holding) => holding.id !== selectedHolding.id));
    setPriceSnapshots((current) => current.filter((snapshot) => snapshot.assetId !== selectedAsset.id));
    setTransactionLog((current) => current.filter((transaction) => !(transaction.asset_id === selectedHolding.asset_id && transaction.account_name === selectedHolding.account_name)));
    setEditingTransactionId(null);
    setTransactionError(null);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Galaticos Portfolio Dashboard MVP</p>
          <h1>매일 열어보기 편한 개인 투자 대시보드</h1>
          <p className="hero-copy">수량, 매입단가, 목표 비중은 직접 수정하고, 현재가 기반 계산과 경고는 자동으로 반영됩니다.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => void refreshPrices()} disabled={refreshing}>{refreshing ? "가격 갱신 중" : "가격 갱신"}</button>
            <span className="helper-text">provider: mock · 이후 CSV/API로 교체 가능</span>
          </div>
        </div>
        <div className="hero-panel">
          <span className="hero-chip">벤치마크: {benchmarkSettings.ticker}</span>
          <strong>{benchmarkSettings.label}</strong>
          <div className="hero-meta">
            <div><span>업데이트 시각</span><strong>{portfolioSummary.lastUpdated ? formatDateTime(portfolioSummary.lastUpdated) : "-"}</strong></div>
            <div><span>현재 탑 비중</span><strong>{topWeightRows[0] ? `${topWeightRows[0].name} ${formatPercentPlain(topWeightRows[0].currentWeight)}` : "-"}</strong></div>
          </div>
        </div>
      </header>

      <nav className="tab-bar" aria-label="메인 화면">
        {tabs.map((tab) => (
          <button key={tab.key} className={tab.key === activeTab ? "tab is-active" : "tab"} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? <section className="panel error-panel">{error}</section> : null}
      {loading ? <section className="panel empty-panel"><h2>가격 데이터를 불러오는 중입니다</h2><p>가격 provider에서 현재가를 받은 뒤 포트폴리오 계산을 시작합니다.</p></section> : null}
      {isEmpty ? <section className="panel empty-panel"><h2>아직 표시할 포트폴리오가 없습니다</h2><p>최소한 assets, holdings, price_history 데이터를 입력하면 화면이 바로 계산됩니다.</p></section> : null}

      {!loading && !isEmpty ? (
        <>
          {activeTab === "home" ? (
            <section className="page-grid">
              <section className="focus-strip">
                <div className="focus-card main"><span>총 평가금액</span><strong>{formatCurrency(portfolioSummary.totalMarketValue)}</strong><p>총 매입금액 {formatCurrency(portfolioSummary.totalBuyValue)}</p></div>
                <div className="focus-card"><span>총 손익</span><strong className={portfolioSummary.totalProfitLoss >= 0 ? "positive" : "negative"}>{formatCurrency(portfolioSummary.totalProfitLoss)}</strong><p>전체 수익률 {formatPercent(portfolioSummary.totalReturnRate)}</p></div>
                <div className="focus-card"><span>오늘 확인할 것</span><strong>{portfolioSummary.offTargetCount + portfolioSummary.mddAlertCount}건</strong><p>비중 이탈 {portfolioSummary.offTargetCount}개 · MDD 경보 {portfolioSummary.mddAlertCount}개</p></div>
              </section>

              <div className="home-grid enhanced">
                <section className="panel spotlight-panel">
                  <div className="panel-head"><h2>오늘 확인할 것</h2><span className="helper-text">상단 우선순위</span></div>
                  <div className="alert-list">
                    <AlertItem label="비중 이탈 종목" value={`${portfolioSummary.offTargetCount}개`} tone={portfolioSummary.offTargetCount > 0 ? "warn" : "neutral"} />
                    <AlertItem label="MDD 경보 종목" value={`${portfolioSummary.mddAlertCount}개`} tone={portfolioSummary.mddAlertCount > 0 ? "danger" : "neutral"} />
                    <AlertItem label="성과 판정" value={performanceSummary.latest?.red_flag ? "레드카드" : performanceSummary.latest?.yellow_flag ? "옐로카드" : "정상"} tone={performanceSummary.latest?.red_flag ? "danger" : performanceSummary.latest?.yellow_flag ? "warn" : "neutral"} />
                  </div>
                </section>

                <section className="panel compact-panel">
                  <div className="panel-head"><h2>상위 비중</h2><span className="helper-text">현재 포트폴리오 기준</span></div>
                  <div className="rank-list">
                    {topWeightRows.map((row, index) => <div key={row.holdingId} className="rank-row"><span>{index + 1}</span><div><strong>{row.name}</strong><p>{row.accountName}</p></div><strong>{formatPercentPlain(row.currentWeight)}</strong></div>)}
                  </div>
                </section>

                <section className="panel"><div className="panel-head"><h2>비중 구성</h2></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} /><Tooltip formatter={(value: number) => formatCurrency(value)} /></PieChart></ResponsiveContainer></div></section>
                <section className="panel"><div className="panel-head"><h2>다가오는 배당</h2><span className="helper-text">예정 순</span></div><div className="list-block">{upcomingDividends.map((event) => { const asset = editableAssets.find((item) => item.id === event.asset_id); return <div key={event.id} className="list-row"><div><strong>{asset?.name}</strong><p>{formatDateLabel(event.payment_due_date)} 지급 예정</p></div><span>{formatCurrency(event.expected_amount)}</span></div>; })}</div></section>
                <section className="panel"><div className="panel-head"><h2>간단 성과 요약</h2></div><div className="metric-stack"><div><span>최근 1년 갭</span><strong className={performanceSummary.trailing1Y >= 0 ? "positive" : "negative"}>{formatPercent(performanceSummary.trailing1Y)}</strong></div><div><span>최근 3년 누적 갭</span><strong className={performanceSummary.trailing3Y >= 0 ? "positive" : "negative"}>{formatPercent(performanceSummary.trailing3Y)}</strong></div></div></section>
              </div>
            </section>
          ) : null}

          {activeTab === "portfolio" ? (
            <section className="portfolio-layout">
              <section className="panel portfolio-main">
                <div className="panel-head"><h2>포트폴리오 / MDD 모니터</h2><div className="sort-group">{Object.entries(sortLabels).map(([key, label]) => <button key={key} className={sortKey === key ? "ghost-btn is-active" : "ghost-btn"} onClick={() => setSortKey(key as SortKey)}>{label} 정렬</button>)}</div></div>
                <div className="table-wrap desktop-only"><table><thead><tr><th>종목</th><th>수량</th><th>매입단가</th><th>현재가</th><th>평가금액</th><th>손익</th><th>수익률</th><th>현재 비중</th><th>목표 비중</th><th>비중 차이</th><th>52주 고가</th><th>하락률</th><th>트리거</th></tr></thead><tbody>{sortedRows.map((row) => <PortfolioRow key={row.holdingId} row={row} isSelected={row.holdingId === selectedHolding?.id} onSelect={() => setSelectedHoldingId(row.holdingId)} />)}</tbody></table></div>
                <div className="mobile-cards mobile-only">{sortedRows.map((row) => <article key={row.holdingId} className={row.holdingId === selectedHolding?.id ? "asset-card selected" : "asset-card"} onClick={() => setSelectedHoldingId(row.holdingId)}><div className="asset-card-head"><div><strong>{row.name}</strong><p>{row.ticker}</p></div><span className={`badge ${row.mddStage}`}>{getMddLabel(row.mddStage)}</span></div><dl className="asset-stats"><div><dt>평가금액</dt><dd>{formatCurrency(row.marketValue)}</dd></div><div><dt>손익</dt><dd className={row.profitLoss >= 0 ? "positive" : "negative"}>{formatCurrency(row.profitLoss)}</dd></div><div><dt>수익률</dt><dd className={row.returnRate >= 0 ? "positive" : "negative"}>{formatPercent(row.returnRate)}</dd></div><div><dt>비중 차이</dt><dd className={Math.abs(row.weightDiff) >= 0.03 ? "warning" : ""}>{formatPercent(row.weightDiff)}</dd></div></dl></article>)}</div>
              </section>

              <section className="panel editor-panel">
                <div className="panel-head"><h2>수동 입력 편집</h2><span className="helper-text">거래 기준 관리 + 필요시 수동 보정</span></div>
                <section className="transaction-panel new-asset-panel">
                  <div className="panel-head"><h3>새 종목 추가</h3><span className="helper-text">자주 쓰지 않는 기능</span></div>
                  <button className="ghost-btn" onClick={() => setShowAssetForm((current) => !current)}>{showAssetForm ? "입력 닫기" : "새 종목 추가 열기"}</button>
                  {showAssetForm ? <><div className="editor-note">현재가와 52주 고가는 우선 평균단가 기준으로 생성되고, 추가 후 종목 정보 편집에서 조정할 수 있습니다.</div>{assetFormError ? <p className="error-text">{assetFormError}</p> : null}<div className="field-grid">
                    <label className="field-block"><span>종목명</span><input type="text" value={assetForm.name} onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="field-block"><span>티커</span><input type="text" value={assetForm.ticker} onChange={(event) => setAssetForm((current) => ({ ...current, ticker: event.target.value }))} /></label>
                  </div>
                  <div className="field-grid">
                    <label className="field-block"><span>시장</span><select value={assetForm.market} onChange={(event) => setAssetForm((current) => ({ ...current, market: event.target.value }))}><option value="ETF">ETF</option><option value="KRX">KRX</option><option value="NASDAQ">NASDAQ</option><option value="NYSE">NYSE</option></select></label>
                    <label className="field-block"><span>초기 수량</span><input type="number" min="0" value={assetForm.quantity} onChange={(event) => setAssetForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
                  </div>
                  <div className="field-grid">
                    <label className="field-block"><span>평균단가</span><input type="number" min="0" value={assetForm.avg_buy_price} onChange={(event) => setAssetForm((current) => ({ ...current, avg_buy_price: event.target.value }))} /></label>
                    <label className="field-block"><span>목표 비중 (%)</span><input type="number" min="0" step="0.1" value={assetForm.target_weight} onChange={(event) => setAssetForm((current) => ({ ...current, target_weight: event.target.value }))} /></label>
                  </div>
                  <label className="field-block"><span>메모</span><input type="text" value={assetForm.memo} onChange={(event) => setAssetForm((current) => ({ ...current, memo: event.target.value }))} /></label>
                  <button className="primary-btn transaction-btn" onClick={submitNewAsset}>종목 추가</button></> : null}
                </section>
                {selectedHolding && selectedRow && selectedAsset ? (
                  <>
                    <div className="editor-summary"><strong>{selectedRow.name}</strong><p>{selectedRow.ticker}</p><span className={`badge ${selectedRow.mddStage}`}>{getMddLabel(selectedRow.mddStage)}</span></div>
                    <label className="field-block"><span>편집 종목</span><select value={selectedHolding.id} onChange={(event) => setSelectedHoldingId(event.target.value)}>{editableHoldings.map((holding) => { const asset = editableAssets.find((item) => item.id === holding.asset_id); return <option key={holding.id} value={holding.id}>{asset?.name ?? holding.id}</option>; })}</select></label>

                    <section className="transaction-panel compact-panel-section">
                      <div className="panel-head"><h3>종목 정보 편집</h3><span className="helper-text">즉시 저장</span></div>
                      <div className="field-grid">
                        <label className="field-block"><span>종목명</span><input type="text" value={selectedAsset.name} onChange={(event) => updateAssetField(selectedAsset.id, "name", event.target.value)} /></label>
                        <label className="field-block"><span>티커</span><input type="text" value={selectedAsset.ticker} onChange={(event) => updateAssetField(selectedAsset.id, "ticker", event.target.value)} /></label>
                      </div>
                      <div className="field-grid">
                        <label className="field-block"><span>시장</span><select value={selectedAsset.market} onChange={(event) => updateAssetField(selectedAsset.id, "market", event.target.value)}><option value="ETF">ETF</option><option value="KRX">KRX</option><option value="NASDAQ">NASDAQ</option><option value="NYSE">NYSE</option></select></label>
                      </div>
                      <div className="field-grid">
                        <label className="field-block"><span>현재가</span><input type="number" min="0" value={selectedSnapshot?.currentPrice ?? 0} onChange={(event) => updateSnapshotField(selectedAsset.id, "currentPrice", event.target.value)} /></label>
                        <label className="field-block"><span>52주 고가</span><input type="number" min="0" value={selectedSnapshot?.high52w ?? 0} onChange={(event) => updateSnapshotField(selectedAsset.id, "high52w", event.target.value)} /></label>
                      </div>
                      <div className="action-row"><button className="ghost-btn danger-btn" onClick={deleteSelectedAsset}>종목 삭제</button></div>
                    </section>

                    <section className="transaction-panel compact-panel-section">
                      <div className="panel-head"><h3>보유 정보 보정</h3><span className="helper-text">기본은 아래 거래 히스토리 기준 관리</span></div>
                      <div className="field-grid">
                        <label className="field-block"><span>보유 수량</span><input type="number" value={selectedHolding.quantity} onChange={(event) => updateHoldingField(selectedHolding.id, "quantity", event.target.value)} /></label>
                        <label className="field-block"><span>매입 단가</span><input type="number" value={selectedHolding.avg_buy_price} onChange={(event) => updateHoldingField(selectedHolding.id, "avg_buy_price", event.target.value)} /></label>
                      </div>
                      <div className="editor-note">권장 흐름은 거래 히스토리 입력입니다. 이 구역은 초기값 보정이나 예외 상황 정리에만 사용하세요.</div><label className="field-block"><span>목표 비중 (%)</span><input type="number" step="0.1" value={(selectedHolding.target_weight * 100).toFixed(1)} onChange={(event) => updateHoldingField(selectedHolding.id, "target_weight", event.target.value)} /></label>
                      <label className="field-block"><span>메모</span><textarea rows={4} value={selectedHolding.memo} onChange={(event) => updateHoldingField(selectedHolding.id, "memo", event.target.value)} /></label>
                    </section>

                    <section className="transaction-panel">
                      <div className="panel-head"><h3>{editingTransactionId ? "거래 수정" : "거래 입력"}</h3><span className="helper-text">매수/매도 내역 기준으로 평균단가 재계산</span></div>
                      {transactionError ? <p className="error-text">{transactionError}</p> : null}
                      <div className="field-grid">
                        <label className="field-block"><span>거래 유형</span><select value={transactionForm.type} onChange={(event) => setTransactionForm((current) => ({ ...current, type: event.target.value as TransactionDraft["type"] }))}><option value="buy">매수</option><option value="sell">매도</option></select></label>
                        <label className="field-block"><span>수량</span><input type="number" min="1" value={transactionForm.quantity} onChange={(event) => setTransactionForm((current) => ({ ...current, quantity: Number(event.target.value) }))} /></label>
                      </div>
                      <div className="field-grid">
                        <label className="field-block"><span>가격</span><input type="number" min="0" value={transactionForm.price} onChange={(event) => setTransactionForm((current) => ({ ...current, price: Number(event.target.value) }))} /></label>
                        <label className="field-block"><span>수수료</span><input type="number" min="0" value={transactionForm.fee} onChange={(event) => setTransactionForm((current) => ({ ...current, fee: Number(event.target.value) }))} /></label>
                      </div>
                      <div className="field-grid">
                        <label className="field-block"><span>거래일</span><input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))} /></label>
                        <label className="field-block"><span>메모</span><input type="text" value={transactionForm.note} onChange={(event) => setTransactionForm((current) => ({ ...current, note: event.target.value }))} /></label>
                      </div>
                      <div className="action-row split-actions">
                        <button className="primary-btn transaction-btn" onClick={submitTransaction}>{editingTransactionId ? "거래 저장" : "거래 추가"}</button>
                        {editingTransactionId ? <button className="ghost-btn transaction-btn" onClick={cancelTransactionEdit}>편집 취소</button> : null}
                      </div>
                      <div className="mini-empty">거래 히스토리를 수정하거나 삭제하면 보유수량과 평균단가가 자동으로 다시 계산됩니다.</div>
                    </section>

                    <section className="transaction-history-section">
                      <div className="panel-head compact-head"><h3>거래 히스토리</h3><span className="helper-text">선택 종목 기준 {selectedTransactions.length}건</span></div>
                      <div className="transaction-history">
                        {selectedTransactions.length === 0 ? <div className="mini-empty">아직 거래 내역이 없습니다.</div> : selectedTransactions.map((transaction) => (
                          <div key={transaction.id} className="transaction-row">
                            <div className="transaction-copy"><strong>{transaction.type === "buy" ? "매수" : "매도"}</strong><p>{transaction.date} · {transaction.quantity}주 · {transaction.account_name}</p>{transaction.note ? <span>{transaction.note}</span> : null}</div>
                            <div className="transaction-actions"><strong>{formatCurrency(transaction.price)}</strong><div className="action-row tight-actions"><button className="ghost-btn small-btn" onClick={() => startEditingTransaction(transaction)}>편집</button><button className="ghost-btn small-btn danger-btn" onClick={() => deleteTransaction(transaction.id)}>삭제</button></div></div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="editor-metrics"><div><span>평가금액</span><strong>{formatCurrency(selectedRow.marketValue)}</strong></div><div><span>손익</span><strong className={selectedRow.profitLoss >= 0 ? "positive" : "negative"}>{formatCurrency(selectedRow.profitLoss)}</strong></div><div><span>비중 차이</span><strong className={Math.abs(selectedRow.weightDiff) >= 0.03 ? "warning" : ""}>{formatPercent(selectedRow.weightDiff)}</strong></div></div>
                  </>
                ) : <div className="mini-empty">편집할 종목을 선택해주세요.</div>}
              </section>
            </section>
          ) : null}

          {activeTab === "performance" ? (
            <section className="page-grid"><section className="panel"><div className="panel-head"><h2>호날두 평가</h2><span className="helper-text">{benchmarkSettings.label} 기준</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={280}><AreaChart data={performanceChart}><defs><linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d9b7e" stopOpacity={0.35} /><stop offset="95%" stopColor="#1d9b7e" stopOpacity={0.05} /></linearGradient><linearGradient id="benchmarkArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f39c12" stopOpacity={0.3} /><stop offset="95%" stopColor="#f39c12" stopOpacity={0.04} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip /><Area type="monotone" dataKey="portfolio" stroke="#1d9b7e" fill="url(#portfolioArea)" /><Area type="monotone" dataKey="benchmark" stroke="#f39c12" fill="url(#benchmarkArea)" /></AreaChart></ResponsiveContainer></div><div className="table-wrap"><table><thead><tr><th>연도</th><th>전략 수익률</th><th>벤치마크</th><th>Gap</th><th>판정</th><th>메모</th></tr></thead><tbody>{performance.map((row) => <tr key={row.id}><td>{row.year}</td><td className={row.portfolio_return >= 0 ? "positive" : "negative"}>{formatPercentPlain(row.portfolio_return)}</td><td className={row.benchmark_return >= 0 ? "positive" : "negative"}>{formatPercentPlain(row.benchmark_return)}</td><td className={row.gap >= 0 ? "positive" : "negative"}>{formatPercent(row.gap)}</td><td>{row.red_flag ? <span className="badge trigger_30">레드카드</span> : row.yellow_flag ? <span className="badge trigger_15">옐로카드</span> : <span className="badge normal">정상</span>}</td><td>{row.note}</td></tr>)}</tbody></table></div></section></section>
          ) : null}
          {activeTab === "dividends" ? (
            <section className="page-grid"><div className="summary-grid three-up"><SummaryCard title="예상 누적 배당" value={formatCurrency(dividendSummary.totalExpected)} /><SummaryCard title="지급 완료 배당" value={formatCurrency(dividendSummary.totalPaid)} /><SummaryCard title="이번 달 예정" value={formatCurrency(dividendSummary.planned[0]?.expected_amount ?? 0)} /></div><section className="panel"><div className="panel-head"><h2>예정 / 확정 / 지급 완료</h2></div><div className="dividend-grid"><DividendColumn title="예정 배당" items={dividendSummary.planned} /><DividendColumn title="확정 배당" items={dividendSummary.confirmed} /><DividendColumn title="지급 완료" items={dividendSummary.paid} /></div></section></section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, value, tone = "neutral" }: { title: string; value: string; tone?: "neutral" | "positive" | "negative"; }) {
  return <section className="summary-card"><span>{title}</span><strong className={tone}>{value}</strong></section>;
}

function AlertItem({ label, value, tone }: { label: string; value: string; tone: "neutral" | "warn" | "danger"; }) {
  return <div className={`alert-item ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function PortfolioRow({ row, isSelected, onSelect }: { row: HoldingRow; isSelected: boolean; onSelect: () => void; }) {
  return <tr className={isSelected ? "table-row-selected" : undefined} onClick={onSelect}><td><strong>{row.name}</strong><div className="subtle">{row.ticker} · {row.market}</div></td><td>{formatNumber(row.quantity)}</td><td>{formatCurrency(row.avgBuyPrice)}</td><td>{formatCurrency(row.currentPrice)}</td><td>{formatCurrency(row.marketValue)}</td><td className={row.profitLoss >= 0 ? "positive" : "negative"}>{formatCurrency(row.profitLoss)}</td><td className={row.returnRate >= 0 ? "positive" : "negative"}>{formatPercent(row.returnRate)}</td><td>{formatPercentPlain(row.currentWeight)}</td><td>{formatPercentPlain(row.targetWeight)}</td><td className={Math.abs(row.weightDiff) >= 0.03 ? "warning" : ""}>{formatPercent(row.weightDiff)}</td><td>{formatCurrency(row.high52w)}</td><td className={row.drawdownFrom52w >= -0.15 ? "" : "negative"}>{formatPercent(row.drawdownFrom52w)}</td><td><span className={`badge ${row.mddStage}`}>{getMddLabel(row.mddStage)}</span></td></tr>;
}

function DividendColumn({ title, items }: { title: string; items: DividendEvent[]; }) {
  return <section className="dividend-column"><h3>{title}</h3>{items.length === 0 ? <div className="mini-empty">표시할 배당 내역이 없습니다.</div> : items.map((item) => <div key={item.id} className="list-row"><div><strong>{formatDateLabel(item.payment_due_date)}</strong><p>주당 {formatCurrency(item.dividend_per_share)}</p></div><span>{formatCurrency(item.actual_amount ?? item.expected_amount)}</span></div>)}</section>;
}

export default App;
















