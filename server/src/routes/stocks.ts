import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';

// This router serves stock features: quotes, search, and user watchlist CRUD.

type StockDirection = 'RISING' | 'FALLING' | 'UNCHANGED';

type StockQuote = {
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

type StockSearchItem = {
  code: string;
  name: string;
  market: string;
};

type NaverRealtimeResponse = {
  datas?: NaverRealtimeItem[];
  time?: string;
};

type NaverRealtimeItem = {
  itemCode?: string;
  stockName?: string;
  closePriceRaw?: string;
  compareToPreviousClosePriceRaw?: string;
  fluctuationsRatioRaw?: string;
  accumulatedTradingVolumeRaw?: string;
  stockExchangeType?: {
    nameKor?: string;
  };
  compareToPreviousPrice?: {
    name?: StockDirection;
    text?: string;
  };
  tradeStopType?: {
    text?: string;
  };
  localTradedAt?: string;
};

type NaverMarketValueResponse = {
  stocks?: NaverMarketValueItem[];
};

type NaverMarketValueItem = {
  itemCode?: string;
  stockName?: string;
  stockExchangeType?: {
    nameKor?: string;
  };
};

const router = Router();

// Tunable settings for stock feature behavior.
const DEFAULT_STOCK_CODES = ['005930', '000660', '035420', '035720', '005380'];
const STOCK_CODE_PATTERN = /^\d{6}$/;
const SEARCH_MARKETS = ['KOSPI', 'KOSDAQ'] as const;
const SEARCH_PAGE_SIZE = 100;
const SEARCH_PAGE_COUNT = 8;
const SEARCH_RESULT_LIMIT = 12;
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 10;

// In-memory search catalog cache to reduce repeated upstream calls.
let searchCatalogCache: {
  expiresAt: number;
  items: StockSearchItem[];
} | null = null;

// All endpoints in this file require authenticated user context.
router.use(authenticate);

const parseNumber = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const normalized = Number(value.replaceAll(',', '').trim());
  return Number.isFinite(normalized) ? normalized : 0;
};

const normalizeWatchlistCodes = (codes: unknown): string[] => {
  if (!Array.isArray(codes)) {
    return [];
  }

  return Array.from(
    new Set(
      codes
        .filter((code): code is string => typeof code === 'string')
        .map((code) => code.trim())
        .filter((code) => STOCK_CODE_PATTERN.test(code)),
    ),
  );
};

const parseNaverTimestamp = (timestamp?: string): string | null => {
  if (!timestamp || !/^\d{14}$/.test(timestamp)) {
    return null;
  }

  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(8, 10);
  const minute = timestamp.slice(10, 12);
  const second = timestamp.slice(12, 14);

  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`,
  ).toISOString();
};

const normalizeCodes = (codesQuery: unknown): string[] => {
  if (typeof codesQuery !== 'string' || !codesQuery.trim()) {
    return DEFAULT_STOCK_CODES;
  }

  const codes = codesQuery
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .filter((code) => STOCK_CODE_PATTERN.test(code));

  return codes.length > 0 ? Array.from(new Set(codes)) : DEFAULT_STOCK_CODES;
};

// Fetch a single realtime quote from Naver Finance and normalize fields.
const fetchQuote = async (code: string): Promise<StockQuote> => {
  const response = await fetch(
    `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`주식 시세 조회 실패: ${code}`);
  }

  const payload = (await response.json()) as NaverRealtimeResponse;
  const item = payload.datas?.[0];

  if (!item?.itemCode || !item.stockName) {
    throw new Error(`주식 데이터 형식 오류: ${code}`);
  }

  return {
    code: item.itemCode,
    name: item.stockName,
    market: item.stockExchangeType?.nameKor || '국내',
    price: parseNumber(item.closePriceRaw),
    change: parseNumber(item.compareToPreviousClosePriceRaw),
    changePercent: parseNumber(item.fluctuationsRatioRaw),
    volume: parseNumber(item.accumulatedTradingVolumeRaw),
    direction: item.compareToPreviousPrice?.name || 'UNCHANGED',
    directionLabel: item.compareToPreviousPrice?.text || '보합',
    tradeState: item.tradeStopType?.text || '정보 없음',
    lastUpdated: item.localTradedAt || parseNaverTimestamp(payload.time),
  };
};

// Fetch one page of market-cap ranked stocks used for search catalog.
const fetchMarketStocksPage = async (
  market: (typeof SEARCH_MARKETS)[number],
  page: number,
): Promise<StockSearchItem[]> => {
  const response = await fetch(
    `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=${SEARCH_PAGE_SIZE}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`종목 검색 목록 조회 실패: ${market}-${page}`);
  }

  const payload = (await response.json()) as NaverMarketValueResponse;

  return (payload.stocks || [])
    .filter(
      (
        item,
      ): item is Required<
        Pick<NaverMarketValueItem, 'itemCode' | 'stockName'>
      > &
        NaverMarketValueItem => Boolean(item.itemCode && item.stockName),
    )
    .map((item) => ({
      code: item.itemCode,
      name: item.stockName,
      market: item.stockExchangeType?.nameKor || market,
    }));
};

// Build or reuse cached stock catalog for name/code search.
const getSearchCatalog = async (): Promise<StockSearchItem[]> => {
  if (searchCatalogCache && searchCatalogCache.expiresAt > Date.now()) {
    return searchCatalogCache.items;
  }

  const requests = SEARCH_MARKETS.flatMap((market) =>
    Array.from({ length: SEARCH_PAGE_COUNT }, (_, index) =>
      fetchMarketStocksPage(market, index + 1),
    ),
  );

  const pages = await Promise.all(requests);
  const deduplicated = Array.from(
    new Map(pages.flat().map((item) => [item.code, item] as const)).values(),
  );

  searchCatalogCache = {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    items: deduplicated,
  };

  return deduplicated;
};

// Search by exact code (fast path) or by name/code against cached catalog.
const searchStocks = async (query: string): Promise<StockSearchItem[]> => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  if (STOCK_CODE_PATTERN.test(normalizedQuery)) {
    try {
      const quote = await fetchQuote(normalizedQuery);
      return [
        {
          code: quote.code,
          name: quote.name,
          market: quote.market,
        },
      ];
    } catch {
      return [];
    }
  }

  const catalog = await getSearchCatalog();

  return catalog
    .filter((item) => {
      const name = item.name.toLowerCase();
      const code = item.code.toLowerCase();
      return name.includes(normalizedQuery) || code.includes(normalizedQuery);
    })
    .slice(0, SEARCH_RESULT_LIMIT);
};

// Realtime quotes endpoint. Query param: ?codes=005930,000660
router.get('/quotes', async (req: Request, res: Response) => {
  const codes = normalizeCodes(req.query.codes);

  try {
    const results = await Promise.allSettled(
      codes.map((code) => fetchQuote(code)),
    );
    const quotes = results
      .filter(
        (result): result is PromiseFulfilledResult<StockQuote> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);

    if (quotes.length === 0) {
      return res
        .status(502)
        .json({ message: '주식 시세를 불러오지 못했습니다' });
    }

    return res.json({
      source: 'NAVER_FINANCE',
      refreshedAt: new Date().toISOString(),
      quotes,
    });
  } catch (error) {
    console.error('Get stock quotes error:', error);
    return res
      .status(500)
      .json({ message: '주식 시세 조회 중 오류가 발생했습니다' });
  }
});

// Search endpoint. Query param: ?query=삼성 or ?query=005930
router.get('/search', async (req: Request, res: Response) => {
  const query = typeof req.query.query === 'string' ? req.query.query : '';

  if (!query.trim()) {
    return res.status(400).json({ message: '검색어를 입력해주세요' });
  }

  try {
    const items = await searchStocks(query);
    return res.json({ items });
  } catch (error) {
    console.error('Search stocks error:', error);
    return res
      .status(500)
      .json({ message: '종목 검색 중 오류가 발생했습니다' });
  }
});

// Current user's watchlist read endpoint.
router.get('/watchlist/me', async (req: Request, res: Response) => {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;
    const userId = authenticatedRequest.user.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 정보입니다' });
    }

    const user = await User.findById(userId).select('stockWatchlistCodes');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    const codes = normalizeWatchlistCodes(user.stockWatchlistCodes);

    return res.json({
      codes,
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    return res
      .status(500)
      .json({ message: '관심종목 조회 중 오류가 발생했습니다' });
  }
});

// Current user's watchlist save endpoint. Body: { codes: string[] }
router.put('/watchlist/me', async (req: Request, res: Response) => {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;
    const userId = authenticatedRequest.user.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 정보입니다' });
    }

    const codes = normalizeWatchlistCodes(req.body?.codes);

    if (!Array.isArray(req.body?.codes)) {
      return res
        .status(400)
        .json({ message: '관심종목 형식이 올바르지 않습니다' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          stockWatchlistCodes: codes,
        },
      },
      { new: true },
    ).select('stockWatchlistCodes');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    return res.json({
      codes,
    });
  } catch (error) {
    console.error('Update watchlist error:', error);
    return res
      .status(500)
      .json({ message: '관심종목 저장 중 오류가 발생했습니다' });
  }
});

export default router;
