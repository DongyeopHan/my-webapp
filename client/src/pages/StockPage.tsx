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
const volumeFormatter = new Intl.NumberFormat('ko-KR');
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
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

const formatTime = (value: string | null) => {
  if (!value) {
    return '정보 없음';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '정보 없음';
  }

  return timeFormatter.format(date);
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
};

const StockCard = ({ quote, onRemove, isRemoveDisabled }: StockCardProps) => {
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

      <p className={styles.price}>{currencyFormatter.format(quote.price)}원</p>

      <div className={styles.changeRow}>
        <span className={`${styles.changeValue} ${directionClassName}`}>
          {formatSignedNumber(quote.change)}원
        </span>
        <span className={`${styles.changePercent} ${directionClassName}`}>
          {formatSignedPercent(quote.changePercent)}
        </span>
      </div>

      <div className={styles.metaBoxRow}>
        <div className={styles.metaBoxItem}>
          <span className={styles.metaBoxLabel}>거래량</span>
          <span className={styles.metaBoxValue}>
            {volumeFormatter.format(quote.volume)}
          </span>
        </div>
        <div className={styles.metaBoxItem}>
          <span className={styles.metaBoxLabel}>체결시각</span>
          <span className={styles.metaBoxValue}>
            {formatTime(quote.lastUpdated)}
          </span>
        </div>
      </div>
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
  const searchRequestIdRef = useRef(0);
  const searchDebounceTimerRef = useRef<number | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const { quotes, refreshedAt, isLoading, error } =
    useStockQuotes(watchlistCodes);

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

  return (
    <div className={styles.stockPage}>
      <section className={styles.summaryBar}>
        <span>최근 갱신 {formatTime(refreshedAt || null)}</span>
        <span>관심종목 {watchlistCodes.length}</span>
        {isWatchlistSaving ? <span>관심종목 저장 중...</span> : null}
      </section>

      {watchlistError ? (
        <div className={styles.errorMessage}>{watchlistError}</div>
      ) : null}

      <section className={styles.searchSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>종목 검색</h3>
            <p className={styles.sectionDescription}>
              종목명이나 6자리 종목코드로 검색해서 관심종목에 추가할 수
              있습니다.
            </p>
          </div>
        </div>

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
      </section>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <section className={styles.stockGrid}>
        {isLoading && quotes.length === 0
          ? renderSkeletonCards()
          : quotes.map((quote) => (
              <StockCard
                key={quote.code}
                quote={quote}
                onRemove={handleRemoveStock}
                isRemoveDisabled={isWatchlistLoading || isWatchlistSaving}
              />
            ))}
      </section>
    </div>
  );
}
