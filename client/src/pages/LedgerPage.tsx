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
  sortByDateDesc,
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

type LedgerPageProps = {
  user: User;
};

export function LedgerPage({ user }: LedgerPageProps) {
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<LedgerFormData>({
    date: getToday(),
    category: '',
    amount: '',
    writer: user.name,
    description: '',
    paymentMethod: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      setIsBlockingLoad(true);
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
        // 유효한 데이터만 필터링 (NaN, null, undefined 제외)
        const validItems = (result.items || []).filter((item: LedgerItem) => {
          return (
            item.date &&
            item.category &&
            item.amount &&
            !isNaN(item.amount) &&
            item.amount > 0
          );
        });

        const normalizedItems = validItems.map((item: LedgerItem) => {
          if (!item.paymentMethod && item.writer && item.description) {
            return {
              ...item,
              paymentMethod: item.description,
              description: item.writer,
              writer: '미지정',
            };
          }

          return {
            ...item,
            writer: item.writer || '미지정',
          };
        });

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

  useEffect(() => {
    loadMonthOptions();
  }, [loadMonthOptions]);

  useEffect(() => {
    if (!isMonthOptionsLoaded) {
      return;
    }
    if (monthOptions.length > 0) {
      if (lastLoadedMonthRef.current === selectedMonth) {
        return;
      }
      lastLoadedMonthRef.current = selectedMonth;
      loadItems(selectedMonth);
    }
  }, [selectedMonth, monthOptions, loadItems, isMonthOptionsLoaded]);

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
        setFormData({
          date: getToday(),
          category: '',
          amount: '',
          writer: user.name,
          description: '',
          paymentMethod: '',
        });
        setShowAddModal(false);
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

  const handleAddClick = () => {
    setFormData({
      date: getToday(),
      category: '',
      amount: '',
      writer: user.name,
      description: '',
      paymentMethod: '',
    });
    setSelectedItem(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedItem(null);
    setFormData({
      date: getToday(),
      category: '',
      amount: '',
      writer: user.name,
      description: '',
      paymentMethod: '',
    });
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
    formData.date &&
    formData.category &&
    formData.amount &&
    formData.writer &&
    formData.paymentMethod;

  // 화면에 표시할 때 날짜 내림차순으로 정렬 (최신 날짜가 위로)
  const sortedItems = useMemo(() => sortByDateDesc<LedgerItem>(items), [items]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );

  return (
    <div className={styles.ledgerPage}>
      <div className={styles.ledgerHeader}>
        <h2 className={styles.ledgerTitle}>가계부</h2>
        <Button variant="primary" size="small" onClick={handleAddClick}>
          + 추가
        </Button>
      </div>

      <div className={styles.ledgerMain}>
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

        <div className={styles.summary}>
          <span className={styles.summaryLabel}>총 지출:</span>
          <span className={styles.summaryAmount}>
            {totalAmount.toLocaleString()}원
          </span>
        </div>

        <div className={styles.itemList}>
          {sortedItems.length === 0 ? (
            <p className={styles.emptyMessage}>지출 내역이 없습니다</p>
          ) : (
            sortedItems.map((item, index) => (
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
                  <span className={styles.itemCategory}>{item.category}</span>
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
        isOpen={showAddModal || selectedItem !== null}
        onClose={handleCloseModal}
        title={selectedItem ? '지출 상세' : '지출 추가'}
        maxWidth="500px"
      >
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="date">날짜</label>
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
            <label htmlFor="category">카테고리</label>
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
            <label htmlFor="amount">금액</label>
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
              placeholder="결제수단을 입력하세요"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="writer">작성자</label>
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
