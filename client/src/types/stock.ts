export type StockDirection = 'RISING' | 'FALLING' | 'UNCHANGED';

export type StockQuote = {
  code: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  direction: StockDirection;
  directionLabel: string;
  tradeState: string;
  lastUpdated: string | null;
};

export type StockSearchItem = {
  code: string;
  name: string;
  market: string;
};

export type StockQuoteResponse = {
  source: string;
  refreshedAt: string;
  quotes: StockQuote[];
};

export type StockSearchResponse = {
  items: StockSearchItem[];
};

export type StockWatchlistResponse = {
  codes: string[];
};
