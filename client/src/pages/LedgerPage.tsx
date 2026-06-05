import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from './LedgerPage.module.css';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  getToday,
  formatDateForInput,
  getCurrentMonth,
  convertSheetNameToMonth,
  formatMonthDisplay,
  formatDateDisplay,
} from '../utils/dateUtils';
import { GOOGLE_SHEET_URL } from '../config/api';
import type { User } from '../types/user';

type LedgerItem = {
  date: string;
  category: string;
  amount: number;
  writer: string;
  description: string;
  paymentMethod: string;
  row?: number;
};

type LedgerFormData = {
  date: string;
  category: string;
  amount: string;
  writer: string;
  description: string;
  paymentMethod: string;
};

type CachedLedgerItems = {
  timestamp: number;
  items: LedgerItem[];
};

type ActiveTab = 'home' | 'list' | 'stats' | 'add';

const CATEGORIES = [
  '대출',
  '관리비',
  '장보기',
  '전기',
  '통신비',
  '음악/iCloud',
  '인터넷',
  '건강/의료',
  '외식/카페',
  '데이트',
  '용돈',
  '교통비',
  '자동차보험',
  '주유/톨비',
  '차량유지',
  '헌금',
  '보험',
  '가족경조사',
  '지인경조사',
  '여행',
];

const ITEMS_CACHE_PREFIX = 'ledger_items_cache_';
const ITEMS_CACHE_TTL_MS = 1000 * 60 * 5;

const getItemsCacheKey = (month: string) => `${ITEMS_CACHE_PREFIX}${month}`;

const readItemsCache = (month: string): LedgerItem[] | null => {
  try {
    const raw = localStorage.getItem(getItemsCacheKey(month));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedLedgerItems;
    if (!parsed?.timestamp || !Array.isArray(parsed.items)) {
      return null;
    }
    if (Date.now() - parsed.timestamp > ITEMS_CACHE_TTL_MS) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
};

const writeItemsCache = (month: string, items: LedgerItem[]) => {
  const payload: CachedLedgerItems = {
    timestamp: Date.now(),
    items,
  };
  localStorage.setItem(getItemsCacheKey(month), JSON.stringify(payload));
};

const invalidateItemsCache = (month: string) => {
  localStorage.removeItem(getItemsCacheKey(month));
};

const getPreviousMonth = (month: string): string => {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 2, 1);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
};

const getDaysInMonth = (month: string): number => {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
};

const normalizeLedgerItems = (items: LedgerItem[]): LedgerItem[] => {
  return items
    .filter((item) => {
      return (
        item.date &&
        item.category &&
        item.amount &&
        !isNaN(item.amount) &&
        item.amount > 0
      );
    })
    .map((item) => ({
      ...item,
      writer: item.writer || '미지정',
      description: item.description || '',
      paymentMethod: item.paymentMethod || '',
    }));
};

const createInitialFormData = (writer: string): LedgerFormData => ({
  date: getToday(),
  category: '',
  amount: '',
  writer,
  description: '',
  paymentMethod: '',
});

type LedgerPageProps = {
  user: User;
  activeTab: ActiveTab;
};

export function LedgerPage({ user, activeTab }: LedgerPageProps) {
  const currentMonth = getCurrentMonth();
  const previousMonth = getPreviousMonth(currentMonth);
  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const previousMonthDays = getDaysInMonth(previousMonth);
  const comparisonDay = Math.min(currentDayOfMonth, previousMonthDays);
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthOptions, setMonthOptions] = useState<string[]>(() => [
    getCurrentMonth(),
  ]);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isBlockingLoad, setIsBlockingLoad] = useState(true);
  const [isMonthOptionsLoaded, setIsMonthOptionsLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LedgerItem | null>(null);
  const [formData, setFormData] = useState<LedgerFormData>(() =>
    createInitialFormData(user.name),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(0);
  const [previousMonthComparableTotal, setPreviousMonthComparableTotal] =
    useState(0);
  const [isLoadingPreviousMonth, setIsLoadingPreviousMonth] = useState(false);
  const [submitModal, setSubmitModal] = useState<{
    isOpen: boolean;
    message: string;
    isSuccess: boolean;
  }>({ isOpen: false, message: '', isSuccess: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    item: LedgerItem | null;
  }>({ isOpen: false, item: null });
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadRequestIdRef = useRef(0);
  const lastLoadedMonthRef = useRef<string | null>(null);

  const loadMonthOptions = useCallback(async () => {
    try {
      setIsLoadingMonths(true);
      const response = await fetch(`${GOOGLE_SHEET_URL}?action=getMonths`);
      const result = await response.json();

      if (result.result === 'success' && result.months) {
        // "YY.MM" -> "YYYY-MM" 변환
        const converted = result.months.map(convertSheetNameToMonth);
        setMonthOptions(converted);

        // 현재 월이 목록에 없으면 첫 번째 옵션으로 설정
        if (converted.length > 0) {
          setSelectedMonth((prev) =>
            converted.includes(prev) ? prev : converted[0],
          );
        }
      }
    } catch (error) {
      console.error('월 목록 불러오기 실패:', error);
      // 실패 시 기본값 사용
      setMonthOptions([getCurrentMonth()]);
    } finally {
      setIsLoadingMonths(false);
      setIsMonthOptionsLoaded(true);
    }
  }, []);

  const loadItems = useCallback(async (month: string) => {
    let requestId = 0;
    try {
      const cached = readItemsCache(month);
      if (cached) {
        setItems(cached);
      }

      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;

      setIsBlockingLoad(true);
      setIsLoadingItems(true);
      const response = await fetch(`${GOOGLE_SHEET_URL}?month=${month}`, {
        signal: controller.signal,
      });
      const result = await response.json();

      if (controller.signal.aborted || requestId !== loadRequestIdRef.current) {
        return;
      }

      if (result.result === 'success') {
        const normalizedItems = normalizeLedgerItems(result.items || []);

        setItems(normalizedItems);
        writeItemsCache(month, normalizedItems);
      } else {
        console.error('Failed to load items:', result.message);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading items:', error);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoadingItems(false);
        setIsBlockingLoad(false);
      }
    }
  }, []);

  const loadMonthTotal = useCallback(
    async (month: string, upToDay?: number): Promise<number> => {
      try {
        const cached = readItemsCache(month);
        const isWithinRange = (dateStr: string) => {
          if (upToDay === undefined) {
            return true;
          }
          const date = new Date(dateStr);
          return !Number.isNaN(date.getTime()) && date.getDate() <= upToDay;
        };

        if (cached) {
          return cached.reduce(
            (sum, item) => sum + (isWithinRange(item.date) ? item.amount : 0),
            0,
          );
        }

        const response = await fetch(`${GOOGLE_SHEET_URL}?month=${month}`);
        const result = await response.json();
        if (result.result !== 'success') {
          return 0;
        }

        const normalizedItems = normalizeLedgerItems(result.items || []);
        writeItemsCache(month, normalizedItems);
        return normalizedItems.reduce(
          (sum, item) => sum + (isWithinRange(item.date) ? item.amount : 0),
          0,
        );
      } catch {
        return 0;
      }
    },
    [],
  );

  // ✅ 초기 마운트: 월 옵션과 현재 월 데이터를 병렬로 로드
  useEffect(() => {
    const currentMonth = getCurrentMonth();

    setIsBlockingLoad(true);
    lastLoadedMonthRef.current = currentMonth;

    // 두 API를 동시에 호출
    Promise.all([loadMonthOptions(), loadItems(currentMonth)]).finally(() => {
      setIsBlockingLoad(false);
    });
  }, [loadMonthOptions, loadItems]);

  // ✅ 탭/월 변경: 홈은 항상 현재월, 나머지는 선택 월
  useEffect(() => {
    if (!isMonthOptionsLoaded) {
      return;
    }
    if (monthOptions.length === 0) {
      return;
    }

    const targetMonth = activeTab === 'home' ? currentMonth : selectedMonth;
    if (lastLoadedMonthRef.current === targetMonth) {
      return;
    }

    lastLoadedMonthRef.current = targetMonth;
    setIsBlockingLoad(false);
    loadItems(targetMonth);
  }, [
    activeTab,
    currentMonth,
    selectedMonth,
    monthOptions,
    loadItems,
    isMonthOptionsLoaded,
  ]);

  useEffect(() => {
    if (activeTab !== 'home') {
      return;
    }

    let isCancelled = false;
    setIsLoadingPreviousMonth(true);
    Promise.all([
      loadMonthTotal(previousMonth),
      loadMonthTotal(previousMonth, comparisonDay),
    ])
      .then(([total, comparableTotal]) => {
        if (!isCancelled) {
          setPreviousMonthTotal(total);
          setPreviousMonthComparableTotal(comparableTotal);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingPreviousMonth(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, previousMonth, comparisonDay, loadMonthTotal]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSubmitModal({ isOpen: false, message: '', isSuccess: false });

    try {
      // selectedItem이 있고 row가 있으면 update, 없으면 insert
      const payload = selectedItem?.row
        ? { ...formData, action: 'update', row: selectedItem.row }
        : formData;

      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.result === 'success') {
        setSubmitModal({
          isOpen: true,
          message: '저장되었습니다!',
          isSuccess: true,
        });
        setFormData(createInitialFormData(user.name));
        setSelectedItem(null);
        invalidateItemsCache(selectedMonth);
        loadItems(selectedMonth); // 목록 새로고침
      } else {
        setSubmitModal({
          isOpen: true,
          message: `저장에 실패했습니다: ${result.message || '알 수 없는 오류'}`,
          isSuccess: false,
        });
      }
    } catch (error) {
      setSubmitModal({
        isOpen: true,
        message: '저장에 실패했습니다.',
        isSuccess: false,
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemClick = (item: LedgerItem) => {
    setSelectedItem(item);
    setFormData({
      date: formatDateForInput(item.date),
      category: item.category,
      amount: String(item.amount),
      writer: item.writer,
      description: item.description,
      paymentMethod: item.paymentMethod,
    });
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setFormData(createInitialFormData(user.name));
  };

  const handleDeleteClick = (item: LedgerItem) => {
    setDeleteConfirm({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    const item = deleteConfirm.item;
    if (!item || !item.row) {
      setDeleteConfirm({ isOpen: false, item: null });
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'delete',
          row: item.row,
          date: item.date,
        }),
      });

      const result = await response.json();

      if (result.result === 'success') {
        setSubmitModal({
          isOpen: true,
          message: '삭제되었습니다!',
          isSuccess: true,
        });
        setDeleteConfirm({ isOpen: false, item: null });
        setSelectedItem(null);
        invalidateItemsCache(selectedMonth);
        loadItems(selectedMonth);
      } else {
        setSubmitModal({
          isOpen: true,
          message: `삭제에 실패했습니다: ${result.message || '알 수 없는 오류'}`,
          isSuccess: false,
        });
      }
    } catch (error) {
      setSubmitModal({
        isOpen: true,
        message: '삭제에 실패했습니다.',
        isSuccess: false,
      });
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, item: null });
  };

  const isFormValid =
    formData.date && formData.category && formData.amount && formData.writer;

  // ✅ 서버에서 이미 내림차순 정렬되어 있음 (중복 정렬 제거)
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      filterCategory
        ? items.filter((item) => item.category === filterCategory)
        : items,
    [items, filterCategory],
  );

  const categoryOptionStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();

    for (const item of items) {
      const prev = stats.get(item.category) ?? { count: 0, total: 0 };
      stats.set(item.category, {
        count: prev.count + 1,
        total: prev.total + item.amount,
      });
    }

    return stats;
  }, [items]);

  const selectedCategoryStat = useMemo(
    () =>
      filterCategory
        ? (categoryOptionStats.get(filterCategory) ?? { count: 0, total: 0 })
        : { count: items.length, total: totalAmount },
    [categoryOptionStats, filterCategory, items.length, totalAmount],
  );

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
    }
    return Array.from(map.entries())
      .map(([cat, total]) => ({
        category: cat,
        total,
        percent: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, totalAmount]);

  const currentMonthToDateTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) {
        return sum;
      }
      return date.getDate() <= currentDayOfMonth ? sum + item.amount : sum;
    }, 0);
  }, [items, currentDayOfMonth]);

  const monthDiff = totalAmount - previousMonthTotal;
  const monthDiffRate =
    previousMonthTotal > 0 ? (monthDiff / previousMonthTotal) * 100 : 0;
  const monthToDateDiff =
    currentMonthToDateTotal - previousMonthComparableTotal;
  const monthlyBudget =
    user.monthlyBudget && user.monthlyBudget > 0 ? user.monthlyBudget : 3000000;
  const budgetUsageRate =
    monthlyBudget > 0 ? Math.min((totalAmount / monthlyBudget) * 100, 999) : 0;
  const budgetRemaining = monthlyBudget - totalAmount;

  const todayAndWeekSpending = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const day = startOfToday.getDay();
    const diffToMonday = (day + 6) % 7;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - diffToMonday);

    let todayAmount = 0;
    let weekAmount = 0;

    for (const item of items) {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const normalizedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

      if (normalizedDate.getTime() === startOfToday.getTime()) {
        todayAmount += item.amount;
      }
      if (
        normalizedDate.getTime() >= startOfWeek.getTime() &&
        normalizedDate.getTime() <= startOfToday.getTime()
      ) {
        weekAmount += item.amount;
      }
    }

    return { todayAmount, weekAmount };
  }, [items]);

  const previousMonthInsight = useMemo(() => {
    if (isLoadingPreviousMonth) {
      return `지난달의 오늘을 기준으로 비교 중입니다...`;
    }
    if (previousMonthComparableTotal <= 0) {
      return `지난달의 오늘 기준 데이터가 없어요.`;
    }
    if (monthToDateDiff >= 0) {
      return `지난달의 오늘보다 ${Math.abs(monthToDateDiff).toLocaleString()}원 더 지출했어요`;
    }

    if (currentDayOfMonth > previousMonthDays) {
      return `지난달은 ${previousMonthDays}일까지라 이후 ${currentDayOfMonth - previousMonthDays}일은 함께 반영했어요.`;
    }

    return `지난 달의 오늘보다 ${Math.abs(monthToDateDiff).toLocaleString()}원 절약했어요.`;
  }, [
    isLoadingPreviousMonth,
    previousMonthComparableTotal,
    monthToDateDiff,
    comparisonDay,
    currentDayOfMonth,
    previousMonthDays,
  ]);

  // 작성자별 통계
  const writerStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.writer, (map.get(item.writer) ?? 0) + item.amount);
    }
    return Array.from(map.entries())
      .map(([writer, total]) => ({
        writer,
        total,
        percent: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, totalAmount]);

  return (
    <div className={styles.ledgerPage}>
      {/* <div className={styles.ledgerHeader}>
        <h2 className={styles.ledgerTitle}>📒 가계부</h2>
      </div> */}

      <div className={styles.ledgerMain}>
        {/* 월 선택 */}
        {(activeTab === 'list' || activeTab === 'stats') && (
          <div className={styles.monthSelector}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={styles.monthSelect}
              disabled={isLoadingItems || isLoadingMonths}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthDisplay(month)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className={styles.tabContent}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>이번달 총 지출</span>
                <span className={styles.summaryAmount}>
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
              <div className={styles.summarySubRow}>
                <span className={styles.summarySubLabel}>
                  총 {items.length}건
                </span>
                {items.length > 0 && (
                  <span className={styles.summarySubLabel}>
                    평균{' '}
                    {Math.round(totalAmount / items.length).toLocaleString()}
                    원/건
                  </span>
                )}
              </div>
            </div>

            <div className={styles.homeCards}>
              <div className={styles.homeCard}>
                <span className={styles.homeCardLabel}>지난달 지출 비교</span>
                <strong className={styles.homeCardValue}>
                  {`${monthDiff >= 0 ? '+' : '-'}${Math.abs(monthDiff).toLocaleString()}원 (${monthDiffRate >= 0 ? '+' : ''}${monthDiffRate.toFixed(1)}%)`}
                </strong>
                <span className={styles.homeCardValueText}>
                  {previousMonthInsight}
                </span>
              </div>

              <div className={styles.homeCard}>
                <span className={styles.homeCardLabel}>오늘/이번주 지출</span>
                <strong className={styles.homeCardValue}>
                  오늘 {todayAndWeekSpending.todayAmount.toLocaleString()}원
                </strong>
                <span className={styles.homeCardValueText}>
                  이번주 {todayAndWeekSpending.weekAmount.toLocaleString()}원
                </span>
              </div>

              <div className={styles.homeCard}>
                <span className={styles.homeCardLabel}>월 예산 진행률</span>
                <strong className={styles.homeCardValue}>
                  {budgetUsageRate.toFixed(1)}%
                </strong>
                <div className={styles.homeProgressTrack}>
                  <div
                    className={styles.homeProgressFill}
                    style={{ width: `${Math.min(budgetUsageRate, 100)}%` }}
                  />
                </div>
                <span className={styles.homeCardValueText}>
                  예산 {monthlyBudget.toLocaleString()}원 / 잔여{' '}
                  {budgetRemaining.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 내역 탭 */}
        {activeTab === 'list' && (
          <div className={styles.tabContent}>
            {/* 카테고리 필터 */}
            <div className={styles.filterRow}>
              <div className={styles.filterSelectWrap}>
                <select
                  className={styles.filterSelect}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">전체 카테고리</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <div className={styles.filterInfo}>
                  <span>{selectedCategoryStat.count}건</span>
                  <span className={styles.filterTotal}>
                    {selectedCategoryStat.total.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 지출 목록 */}
            <div className={styles.itemList}>
              {filteredItems.length === 0 ? (
                <p className={styles.emptyMessage}>지출 내역이 없습니다</p>
              ) : (
                filteredItems.map((item: LedgerItem, index: number) => (
                  <div
                    key={index}
                    className={styles.item}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={styles.itemHeader}>
                      <span className={styles.itemDate}>
                        {formatDateDisplay(item.date)}
                      </span>
                      <span className={styles.itemAmount}>
                        {item.amount.toLocaleString()}원
                      </span>
                    </div>
                    <div className={styles.itemBody}>
                      <span className={styles.itemCategory}>
                        {item.category}
                      </span>
                      <div className={styles.itemMeta}>
                        <span className={styles.itemWriter}>{item.writer}</span>
                      </div>
                    </div>
                    {(item.description || item.paymentMethod) && (
                      <div className={styles.itemFooter}>
                        <div className={styles.itemDescription}>
                          {item.description}
                        </div>
                        <span className={styles.itemPayment}>
                          {item.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className={styles.tabContent}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>총 지출</span>
                <span className={styles.summaryAmount}>
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
              <div className={styles.summarySubRow}>
                <span className={styles.summarySubLabel}>
                  총 {items.length}건
                </span>
                {items.length > 0 && (
                  <span className={styles.summarySubLabel}>
                    평균{' '}
                    {Math.round(totalAmount / items.length).toLocaleString()}
                    원/건
                  </span>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <p className={styles.emptyMessage}>이번달 지출 내역이 없습니다</p>
            ) : (
              <>
                {/* 카테고리별 지출 */}
                <div className={styles.statSection}>
                  <h3 className={styles.statSectionTitle}>카테고리별 지출</h3>
                  <div className={styles.statList}>
                    {categoryStats.map(({ category, total, percent }) => (
                      <div key={category} className={styles.statItem}>
                        <div className={styles.statItemHeader}>
                          <span className={styles.statLabel}>{category}</span>
                          <div className={styles.statAmountGroup}>
                            <span className={styles.statAmount}>
                              {total.toLocaleString()}원
                            </span>
                            <span className={styles.statPercent}>
                              {percent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 작성자별 지출 */}
                <div className={styles.statSection}>
                  <h3 className={styles.statSectionTitle}>작성자별 지출</h3>
                  <div className={styles.writerCards}>
                    {writerStats.map(({ writer, total, percent }) => (
                      <div key={writer} className={styles.writerCard}>
                        <div className={styles.writerName}>{writer}</div>
                        <div className={styles.writerAmount}>
                          {total.toLocaleString()}원
                        </div>
                        <div className={styles.writerPercent}>
                          {percent.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 추가 탭 */}
        {activeTab === 'add' && (
          <div className={styles.tabContent}>
            <div className={styles.addPanel}>
              <form className={styles.addForm} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="date">날짜*</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="category">카테고리*</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">선택하세요</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="amount">금액*</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="writer">작성자*</label>
                  <input
                    type="text"
                    id="writer"
                    name="writer"
                    value={formData.writer}
                    onChange={handleChange}
                    placeholder="작성자"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="paymentMethod">결제수단</label>
                  <input
                    type="text"
                    id="paymentMethod"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    placeholder="카카오페이, 신용카드 등"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description">설명</label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="메모"
                  />
                </div>

                <div className={styles.addFormButtonRow}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="large"
                    fullWidth
                    disabled={!isFormValid || isSaving || isDeleting}
                  >
                    {isSaving ? '저장 중...' : '저장하기'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {isBlockingLoad && (
        <div className={styles.loadingOverlay} aria-hidden="true">
          <div className={styles.loadingDots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        </div>
      )}

      {/* 추가/상세 모달 */}
      <Modal
        isOpen={selectedItem !== null}
        onClose={handleCloseModal}
        title="지출 상세"
        maxWidth="500px"
      >
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="date">날짜*</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">카테고리*</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">선택하세요</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">금액*</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">설명</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="메모를 입력하세요"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="paymentMethod">결제수단</label>
            <input
              type="text"
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              placeholder="카카오페이, 신용카드 등"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="writer">작성자*</label>
            <input
              type="text"
              id="writer"
              name="writer"
              value={formData.writer}
              onChange={handleChange}
              placeholder="작성자를 입력하세요"
              required
            />
          </div>

          <div className={styles.buttonGroup}>
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={!isFormValid || isSaving || isDeleting}
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </Button>

            {selectedItem && (
              <Button
                type="button"
                variant="secondary"
                size="large"
                fullWidth
                onClick={() => handleDeleteClick(selectedItem)}
                disabled={isSaving || isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제하기'}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* 저장 결과 모달 */}
      <Modal
        isOpen={submitModal.isOpen}
        onClose={() => setSubmitModal({ ...submitModal, isOpen: false })}
        title={submitModal.isSuccess ? '성공' : '오류'}
        maxWidth="320px"
      >
        <div className={styles.modalContent}>
          <p
            className={
              submitModal.isSuccess
                ? styles.successMessage
                : styles.errorMessage
            }
          >
            {submitModal.isSuccess ? '✅' : '❌'} {submitModal.message}
          </p>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="삭제 확인"
        message="정말 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
      />
    </div>
  );
}
