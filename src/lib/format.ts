const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

const monthFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export const formatCurrency = (value: number) => krwFormatter.format(value);

export const formatNumber = (value: number) => numberFormatter.format(value);

export const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

export const formatPercentPlain = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

export const formatDateLabel = (value: string) => monthFormatter.format(new Date(value));

export const formatDateTime = (value: string) =>
  dateTimeFormatter.format(new Date(value));
