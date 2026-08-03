import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './StockPage.module.css';
import { stockAPI } from '../services/api';
import { useStockQuotes } from '../hooks/useStockQuotes';
import type {
  StockDirection,
  StockQuote,
  StockSearchItem,
} from '../types/stock';

const currencyFormatter = new Intl.NumberFormat('ko-KR');
const percentFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatSignedNumber = (value: number) => {
  if (value > 0) {
    return `+${currencyFormatter.format(value)}`;
  }

  if (value < 0) {
    return `-${currencyFormatter.format(Math.abs(value))}`;
  }

  return currencyFormatter.format(value);
};

const formatSignedPercent = (value: number) => {
  if (value > 0) {
    return `+${percentFormatter.format(value)}%`;
  }

  if (value < 0) {
    return `-${percentFormatter.format(Math.abs(value))}%`;
  }

  return `${percentFormatter.format(value)}%`;
};

const getPercentToReference = (
  currentPrice: number,
  referencePrice: number,
) => {
  if (!referencePrice) {
    return 0;
  }

  return (currentPrice / referencePrice - 1) * 100;
};

const getDirectionClassName = (direction: StockDirection) => {
  switch (direction) {
    case 'RISING':
      return styles.rising;
    case 'FALLING':
      return styles.falling;
    default:
      return styles.unchanged;
  }
};

const TARGET_PRICES_STORAGE_KEY = 'stock-target-prices';

const readStoredTargetPrices = () => {
  if (typeof window === 'undefined') {
    return {} as Record<string, string>;
  }

  try {
    const storedValue = window.localStorage.getItem(TARGET_PRICES_STORAGE_KEY);

    if (!storedValue) {
      return {} as Record<string, string>;
    }

    const parsedValue = JSON.parse(storedValue) as Record<string, string>;

    if (parsedValue && typeof parsedValue === 'object') {
      return parsedValue;
    }
  } catch (error) {
    console.error(error);
  }

  return {} as Record<string, string>;
};

const writeStoredTargetPrices = (targetPrices: Record<string, string>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      TARGET_PRICES_STORAGE_KEY,
      JSON.stringify(targetPrices),
    );
  } catch (error) {
    console.error(error);
  }
};

const renderSkeletonCards = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <div key={index} className={`${styles.stockCard} ${styles.skeletonCard}`}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonPrice} />
      <div className={styles.skeletonMeta} />
      <div className={styles.skeletonMeta} />
    </div>
  ));
};

type StockCardProps = {
  quote: StockQuote;
  onRemove: (code: string) => void;
  isRemoveDisabled: boolean;
  targetPrice: string;
  onTargetPriceChange: (code: string, value: string) => void;
};

const StockCard = ({
  quote,
  onRemove,
  isRemoveDisabled,
  targetPrice,
  onTargetPriceChange,
}: StockCardProps) => {
  const directionClassName = getDirectionClassName(quote.direction);

  return (
    <article className={styles.stockCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.stockName}>{quote.name}</h3>
          <div className={styles.stockCodeRow}>
            <p className={styles.stockCode}>
              {quote.code} · {quote.market}
            </p>
            <span className={styles.tradeStateInline}>{quote.tradeState}</span>
          </div>
        </div>
        <div className={styles.cardHeaderActions}>
          <span className={`${styles.directionBadge} ${directionClassName}`}>
            {quote.directionLabel}
          </span>
          <button
            type="button"
            className={styles.removeStockButton}
            onClick={() => onRemove(quote.code)}
            disabled={isRemoveDisabled}
          >
            삭제
          </button>
        </div>
      </div>

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          {currencyFormatter.format(quote.price)}원
        </p>
        <div className={styles.changeRow}>
          <span className={`${styles.changeValue} ${directionClassName}`}>
            {formatSignedNumber(quote.change)}원
          </span>
          <span className={`${styles.changePercent} ${directionClassName}`}>
            {formatSignedPercent(quote.changePercent)}
          </span>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>52주 최고</span>
          <span className={styles.metricValue}>
            {currencyFormatter.format(quote.fiftyTwoWeekHigh)}원
          </span>
          <span className={`${styles.metricDelta} ${styles.falling}`}>
            {formatSignedPercent(
              getPercentToReference(quote.price, quote.fiftyTwoWeekHigh),
            )}
          </span>
        </div>
        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>52주 최저</span>
          <span className={styles.metricValue}>
            {currencyFormatter.format(quote.fiftyTwoWeekLow)}원
          </span>
          <span className={`${styles.metricDelta} ${styles.rising}`}>
            {formatSignedPercent(
              getPercentToReference(quote.price, quote.fiftyTwoWeekLow),
            )}
          </span>
        </div>
      </div>

      <label
        className={styles.targetPriceField}
        htmlFor={`target-${quote.code}`}
      >
        <span className={styles.targetPriceLabel}>목표가</span>
        <input
          id={`target-${quote.code}`}
          className={styles.targetPriceInput}
          type="number"
          min="0"
          placeholder="입력"
          value={targetPrice}
          onChange={(event) =>
            onTargetPriceChange(quote.code, event.target.value)
          }
        />
      </label>
    </article>
  );
};

export function StockPage() {
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);
  const [isWatchlistSaving, setIsWatchlistSaving] = useState(false);
  const [watchlistError, setWatchlistError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [targetPrices, setTargetPrices] = useState<Record<string, string>>(
    readStoredTargetPrices,
  );
  const searchRequestIdRef = useRef(0);
  const searchDebounceTimerRef = useRef<number | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const { quotes, isLoading, error } = useStockQuotes(watchlistCodes);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setIsWatchlistLoading(true);
        const response = await stockAPI.getWatchlist();
        setWatchlistCodes(response.codes);
        setWatchlistError('');
      } catch (loadError) {
        console.error(loadError);
        setWatchlistCodes([]);
        setWatchlistError('관심종목을 불러오지 못했습니다');
      } finally {
        setIsWatchlistLoading(false);
      }
    };

    void loadWatchlist();
  }, []);

  const watchlistSet = useMemo(() => new Set(watchlistCodes), [watchlistCodes]);

  const persistWatchlist = async (codes: string[]) => {
    setIsWatchlistSaving(true);
    setWatchlistCodes(codes);
    try {
      const response = await stockAPI.updateWatchlist(codes);
      setWatchlistCodes(response.codes);
      setWatchlistError('');
    } catch (saveError) {
      console.error(saveError);
      setWatchlistError('관심종목 저장에 실패했습니다');
    } finally {
      setIsWatchlistSaving(false);
    }
  };

  const handleRemoveStock = (code: string) => {
    setTargetPrices((prev) => {
      const nextTargetPrices = { ...prev };
      delete nextTargetPrices[code];
      return nextTargetPrices;
    });

    void persistWatchlist(watchlistCodes.filter((item) => item !== code));
  };

  const handleAddStock = (stock: StockSearchItem): 'added' | 'duplicate' => {
    if (watchlistSet.has(stock.code)) {
      return 'duplicate';
    }

    void persistWatchlist([...watchlistCodes, stock.code]);
    return 'added';
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      if (searchDebounceTimerRef.current) {
        window.clearTimeout(searchDebounceTimerRef.current);
        searchDebounceTimerRef.current = null;
      }
      return;
    }

    if (searchDebounceTimerRef.current) {
      window.clearTimeout(searchDebounceTimerRef.current);
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    searchDebounceTimerRef.current = window.setTimeout(() => {
      const fetchSearchResults = async () => {
        try {
          setIsSearching(true);
          const response = await stockAPI.searchStocks(trimmedQuery);

          if (requestId !== searchRequestIdRef.current) {
            return;
          }

          setSearchResults(response.items);
          setSearchError(
            response.items.length === 0 ? '검색 결과가 없습니다' : '',
          );
        } catch (searchLoadError) {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }
          console.error(searchLoadError);
          setSearchError('종목 검색에 실패했습니다');
          setSearchResults([]);
        } finally {
          if (requestId === searchRequestIdRef.current) {
            setIsSearching(false);
          }
        }
      };

      void fetchSearchResults();
    }, 250);

    return () => {
      if (searchDebounceTimerRef.current) {
        window.clearTimeout(searchDebounceTimerRef.current);
        searchDebounceTimerRef.current = null;
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchContainerRef.current) {
        return;
      }

      const target = event.target as Node;
      if (!searchContainerRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleAutocompleteSelect = (stock: StockSearchItem) => {
    const addResult = handleAddStock(stock);

    if (addResult === 'duplicate') {
      setSearchError('이미 관심종목에 추가된 종목입니다');
      return;
    }

    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setIsSearching(false);
  };

  useEffect(() => {
    writeStoredTargetPrices(targetPrices);
  }, [targetPrices]);

  const handleTargetPriceChange = (code: string, value: string) => {
    setTargetPrices((prev) => ({ ...prev, [code]: value }));
  };

  return (
    <div className={styles.stockPage}>
      {watchlistError ? (
        <div className={styles.errorMessage}>{watchlistError}</div>
      ) : null}

      <div className={styles.searchBarWrap}>
        <div className={styles.searchAutocomplete} ref={searchContainerRef}>
          <input
            className={styles.searchInput}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="예: 삼성전자 또는 005930"
          />

          {isSearchFocused && searchQuery.trim() ? (
            <div className={styles.searchDropdown}>
              {isSearching ? (
                <div className={styles.searchDropdownStatus}>검색 중...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((stock) => {
                  const isAdded = watchlistSet.has(stock.code);

                  return (
                    <button
                      key={stock.code}
                      type="button"
                      className={styles.searchDropdownItem}
                      disabled={
                        isAdded || isWatchlistLoading || isWatchlistSaving
                      }
                      onClick={() => handleAutocompleteSelect(stock)}
                    >
                      <span className={styles.searchDropdownName}>
                        {stock.name}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className={styles.searchDropdownStatus}>
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          ) : null}
        </div>

        {searchError ? (
          <div className={styles.errorMessage}>{searchError}</div>
        ) : null}
      </div>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <section className={styles.stockGridSection}>
        {watchlistCodes.length === 0 && !isWatchlistLoading ? (
          <div className={styles.emptyState}>관심종목이 없습니다.</div>
        ) : null}

        <div className={styles.stockGrid}>
          {isLoading && quotes.length === 0
            ? renderSkeletonCards()
            : quotes.map((quote) => (
                <StockCard
                  key={quote.code}
                  quote={quote}
                  onRemove={handleRemoveStock}
                  isRemoveDisabled={isWatchlistLoading || isWatchlistSaving}
                  targetPrice={targetPrices[quote.code] ?? ''}
                  onTargetPriceChange={handleTargetPriceChange}
                />
              ))}
        </div>
      </section>
    </div>
  );
}
