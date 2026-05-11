import { useCallback, useEffect, useMemo, useState } from 'react';
import { stockAPI } from '../services/api';
import type { StockQuote } from '../types/stock';

type CachedStockQuotes = {
  timestamp: number;
  refreshedAt: string;
  quotes: StockQuote[];
};

// 캐시 TTL과 새로고침 간격은 필요에 따라 조정할 수 있습니다.
const STOCK_QUOTES_CACHE_TTL_MS = 1000 * 1;
const STOCK_QUOTES_REFRESH_INTERVAL_MS = 1000 * 1;

const getStockQuotesCacheKey = (codes: string[]) => {
  return `stock_quotes_cache_${codes.join('_') || 'empty'}`;
};

const readStockQuotesCache = (codes: string[]): CachedStockQuotes | null => {
  try {
    const raw = localStorage.getItem(getStockQuotesCacheKey(codes));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedStockQuotes;

    if (
      !parsed?.timestamp ||
      !parsed.refreshedAt ||
      !Array.isArray(parsed.quotes)
    ) {
      return null;
    }

    if (Date.now() - parsed.timestamp > STOCK_QUOTES_CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeStockQuotesCache = (
  codes: string[],
  quotes: StockQuote[],
  refreshedAt: string,
) => {
  const payload: CachedStockQuotes = {
    timestamp: Date.now(),
    refreshedAt,
    quotes,
  };

  localStorage.setItem(getStockQuotesCacheKey(codes), JSON.stringify(payload));
};

export const useStockQuotes = (codes: string[]) => {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const normalizedCodes = useMemo(() => codes.filter(Boolean), [codes]);
  const cacheCodes = useMemo(
    () => (normalizedCodes.length > 0 ? normalizedCodes : ['empty']),
    [normalizedCodes],
  );

  const loadQuotes = useCallback(
    async (isBackgroundRefresh = false) => {
      if (normalizedCodes.length === 0) {
        setQuotes([]);
        setRefreshedAt('');
        setError('');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (isBackgroundRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await stockAPI.getQuotes(normalizedCodes);
        setQuotes(response.quotes);
        setRefreshedAt(response.refreshedAt);
        writeStockQuotesCache(
          cacheCodes,
          response.quotes,
          response.refreshedAt,
        );
        setError('');
      } catch (loadError) {
        console.error(loadError);
        setError('주식 시세를 불러오지 못했습니다');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheCodes, normalizedCodes],
  );

  useEffect(() => {
    const cached = readStockQuotesCache(cacheCodes);

    if (cached) {
      setQuotes(cached.quotes);
      setRefreshedAt(cached.refreshedAt);
      setIsLoading(false);
    } else {
      setQuotes([]);
      setRefreshedAt('');
    }

    void loadQuotes();

    if (normalizedCodes.length === 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      void loadQuotes(true);
    }, STOCK_QUOTES_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [cacheCodes, loadQuotes, normalizedCodes.length]);

  const refresh = useCallback(async () => {
    await loadQuotes(true);
  }, [loadQuotes]);

  return {
    quotes,
    refreshedAt,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
};
