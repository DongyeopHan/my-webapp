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
import { shoppingAPI } from '../services/api';
import type { ShoppingPriceItem } from '../types/shopping';
import type { User } from '../types/user';
import { LedgerHomeTabPage } from './ledger/LedgerHomeTabPage';
import { LedgerListTabPage } from './ledger/LedgerListTabPage';
import { LedgerShoppingTabPage } from './ledger/LedgerShoppingTabPage';
import { LedgerAddTabPage } from './ledger/LedgerAddTabPage';

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

type ActiveTab = 'home' | 'list' | 'shopping' | 'add';
type ListViewTab = 'history' | 'stats';

type ShoppingComparisonRow = {
  product: string;
  unit: string;
  prices: ShoppingPriceItem['prices'];
};

type ShoppingNewMartFormData = {
  martName: string;
  price: string;
};

type ShoppingNewItemFormData = {
  product: string;
  unit: string;
};

type ShoppingItemEditFormData = {
  product: string;
  unit: string;
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

const createInitialNewMartFormData = (): ShoppingNewMartFormData => ({
  martName: '',
  price: '',
});

const createInitialNewItemFormData = (): ShoppingNewItemFormData => ({
  product: '',
  unit: '',
});

const createInitialShoppingItemEditFormData = (): ShoppingItemEditFormData => ({
  product: '',
  unit: '',
});

const formatShoppingUpdatedDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toComparisonRow = (item: ShoppingPriceItem): ShoppingComparisonRow | null => {
  if (!item.prices.length) {
    return null;
  }

  const sortedPrices = [...item.prices].sort((a, b) => a.price - b.price);

  return {
    ...item,
    prices: sortedPrices,
  };
};

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
  const [listViewTab, setListViewTab] = useState<ListViewTab>('history');
  const [shoppingItems, setShoppingItems] = useState<ShoppingPriceItem[]>([]);
  const [shoppingSearchQuery, setShoppingSearchQuery] = useState('');
  const [selectedShoppingRow, setSelectedShoppingRow] =
    useState<ShoppingComparisonRow | null>(null);
  const [shoppingPriceEdits, setShoppingPriceEdits] = useState<
    Record<string, { martName: string; price: string }>
  >({});
  const [shoppingNewMartFormData, setShoppingNewMartFormData] =
    useState<ShoppingNewMartFormData>(() => createInitialNewMartFormData());
  const [shoppingNewItemFormData, setShoppingNewItemFormData] =
    useState<ShoppingNewItemFormData>(() => createInitialNewItemFormData());
  const [shoppingItemEditFormData, setShoppingItemEditFormData] =
    useState<ShoppingItemEditFormData>(() =>
      createInitialShoppingItemEditFormData(),
    );
  const [isShoppingNewItemModalOpen, setIsShoppingNewItemModalOpen] =
    useState(false);
  const [isLoadingShopping, setIsLoadingShopping] = useState(false);
  const [isSavingShopping, setIsSavingShopping] = useState(false);
  const [isSavingShoppingItem, setIsSavingShoppingItem] = useState(false);
  const [savingShoppingPriceId, setSavingShoppingPriceId] = useState<
    string | null
  >(null);
  const [shoppingDeleteConfirm, setShoppingDeleteConfirm] = useState<{
    isOpen: boolean;
    priceId: string;
    martName: string;
  }>({
    isOpen: false,
    priceId: '',
    martName: '',
  });
  const [shoppingItemDeleteConfirm, setShoppingItemDeleteConfirm] = useState<{
    isOpen: boolean;
    product: string;
    unit: string;
  }>({
    isOpen: false,
    product: '',
    unit: '',
  });
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

  const loadShoppingItems = useCallback(async (): Promise<ShoppingPriceItem[]> => {
    try {
      setIsLoadingShopping(true);
      const result = await shoppingAPI.getPrices();
      const nextItems = result.items ?? [];
      setShoppingItems(nextItems);
      return nextItems;
    } catch (error) {
      console.error('장보기 시세 불러오기 실패:', error);
      return [];
    } finally {
      setIsLoadingShopping(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'shopping') {
      return;
    }

    loadShoppingItems();
  }, [activeTab, loadShoppingItems]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleShoppingPriceEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, dataset } = e.target;
    const priceId = dataset.priceId;

    if (!priceId) {
      return;
    }

    setShoppingPriceEdits((prev) => ({
      ...prev,
      [priceId]: {
        martName:
          name === 'martName' ? value : (prev[priceId]?.martName ?? ''),
        price: name === 'price' ? value : (prev[priceId]?.price ?? ''),
      },
    }));
  };

  const handleShoppingNewMartFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setShoppingNewMartFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenShoppingDetail = (row: ShoppingComparisonRow) => {
    const editMap: Record<string, { martName: string; price: string }> = {};

    for (const priceInfo of row.prices) {
      editMap[priceInfo.id] = {
        martName: priceInfo.martName,
        price: String(priceInfo.price),
      };
    }

    setShoppingPriceEdits(editMap);
    setShoppingNewMartFormData({
      martName: '',
      price: '',
    });
    setShoppingItemEditFormData({
      product: row.product,
      unit: row.unit,
    });
    setSelectedShoppingRow(row);
  };

  const handleCloseShoppingDetail = () => {
    setSelectedShoppingRow(null);
    setShoppingPriceEdits({});
    setShoppingNewMartFormData(createInitialNewMartFormData());
    setShoppingItemEditFormData(createInitialShoppingItemEditFormData());
    setSavingShoppingPriceId(null);
    setShoppingItemDeleteConfirm({ isOpen: false, product: '', unit: '' });
  };

  const handleShoppingNewItemFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setShoppingNewItemFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenShoppingNewItemModal = () => {
    setShoppingNewItemFormData(createInitialNewItemFormData());
    setIsShoppingNewItemModalOpen(true);
  };

  const handleCloseShoppingNewItemModal = () => {
    setIsShoppingNewItemModalOpen(false);
  };

  const handleShoppingItemEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setShoppingItemEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const syncDetailRow = (
    items: ShoppingPriceItem[],
    product: string,
    unit: string,
  ) => {
    const matched = items.find(
      (item) => item.product === product && item.unit === unit,
    );
    if (!matched) {
      setSelectedShoppingRow(null);
      return;
    }

    const next = toComparisonRow(matched);
    if (!next) {
      setSelectedShoppingRow(null);
      return;
    }

    setSelectedShoppingRow(next);
    setShoppingItemEditFormData({
      product: next.product,
      unit: next.unit,
    });

    const editMap: Record<string, { martName: string; price: string }> = {};
    for (const priceInfo of next.prices) {
      editMap[priceInfo.id] = {
        martName: priceInfo.martName,
        price: String(priceInfo.price),
      };
    }
    setShoppingPriceEdits(editMap);
  };

  const handleShoppingItemUpdate = async () => {
    if (!selectedShoppingRow) {
      return;
    }

    const nextProduct = shoppingItemEditFormData.product.trim();
    const nextUnit = shoppingItemEditFormData.unit.trim();

    if (!nextProduct || !nextUnit) {
      return;
    }

    try {
      setIsSavingShoppingItem(true);
      await shoppingAPI.updateItem({
        product: selectedShoppingRow.product,
        unit: selectedShoppingRow.unit,
        nextProduct,
        nextUnit,
      });
      const latestItems = await loadShoppingItems();
      syncDetailRow(latestItems, nextProduct, nextUnit);
      setShoppingSearchQuery(nextProduct);
    } catch (error) {
      console.error('장보기 품목 수정 실패:', error);
    } finally {
      setIsSavingShoppingItem(false);
    }
  };

  const handleShoppingPriceUpdate = async (priceId: string) => {
    const editData = shoppingPriceEdits[priceId];
    if (!editData || !selectedShoppingRow) {
      return;
    }

    const normalizedMart = editData.martName.trim();
    const parsedPrice = Number(editData.price);

    if (!normalizedMart || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return;
    }

    try {
      setSavingShoppingPriceId(priceId);
      await shoppingAPI.updatePrice(priceId, {
        martName: normalizedMart,
        price: parsedPrice,
      });
      const latestItems = await loadShoppingItems();
      syncDetailRow(latestItems, selectedShoppingRow.product, selectedShoppingRow.unit);
    } catch (error) {
      console.error('장보기 시세 수정 실패:', error);
    } finally {
      setSavingShoppingPriceId(null);
    }
  };

  const handleShoppingDeleteClick = (priceId: string, martName: string) => {
    setShoppingDeleteConfirm({
      isOpen: true,
      priceId,
      martName,
    });
  };

  const handleShoppingDeleteCancel = () => {
    setShoppingDeleteConfirm({ isOpen: false, priceId: '', martName: '' });
  };

  const handleShoppingItemDeleteClick = () => {
    if (!selectedShoppingRow) {
      return;
    }

    setShoppingItemDeleteConfirm({
      isOpen: true,
      product: selectedShoppingRow.product,
      unit: selectedShoppingRow.unit,
    });
  };

  const handleShoppingItemDeleteCancel = () => {
    setShoppingItemDeleteConfirm({ isOpen: false, product: '', unit: '' });
  };

  const handleShoppingItemDeleteConfirm = async () => {
    if (!selectedShoppingRow) {
      return;
    }

    try {
      setIsSavingShoppingItem(true);
      await shoppingAPI.deleteItem({
        product: selectedShoppingRow.product,
        unit: selectedShoppingRow.unit,
      });
      await loadShoppingItems();
      handleCloseShoppingDetail();
    } catch (error) {
      console.error('장보기 품목 삭제 실패:', error);
    } finally {
      setIsSavingShoppingItem(false);
      setShoppingItemDeleteConfirm({ isOpen: false, product: '', unit: '' });
    }
  };

  const handleShoppingDeleteConfirm = async () => {
    const { priceId } = shoppingDeleteConfirm;
    if (!priceId || !selectedShoppingRow) {
      return;
    }

    try {
      setSavingShoppingPriceId(priceId);
      await shoppingAPI.deletePrice(priceId);
      const latestItems = await loadShoppingItems();
      syncDetailRow(latestItems, selectedShoppingRow.product, selectedShoppingRow.unit);
    } catch (error) {
      console.error('장보기 시세 삭제 실패:', error);
    } finally {
      setSavingShoppingPriceId(null);
      setShoppingDeleteConfirm({ isOpen: false, priceId: '', martName: '' });
    }
  };

  const handleShoppingAddMart = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShoppingRow) {
      return;
    }

    const normalizedMart = shoppingNewMartFormData.martName.trim();
    const parsedPrice = Number(shoppingNewMartFormData.price);

    if (
      !normalizedMart ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      return;
    }

    try {
      setIsSavingShopping(true);
      await shoppingAPI.addPrice({
        product: selectedShoppingRow.product,
        unit: selectedShoppingRow.unit,
        martName: normalizedMart,
        price: parsedPrice,
      });
      const latestItems = await loadShoppingItems();
      syncDetailRow(latestItems, selectedShoppingRow.product, selectedShoppingRow.unit);
      setShoppingNewMartFormData((prev) => ({
        ...prev,
        martName: '',
        price: '',
      }));
    } catch (error) {
      console.error('장보기 시세 등록 실패:', error);
    } finally {
      setIsSavingShopping(false);
    }
  };

  const handleShoppingAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedProduct = shoppingNewItemFormData.product.trim();
    const normalizedUnit = shoppingNewItemFormData.unit.trim();

    if (
      !normalizedProduct ||
      !normalizedUnit
    ) {
      return;
    }

    try {
      setIsSavingShopping(true);
      await shoppingAPI.addItem({
        product: normalizedProduct,
        unit: normalizedUnit,
      });
      const latestItems = await loadShoppingItems();
      const matched = latestItems.find(
        (item) =>
          item.product === normalizedProduct && item.unit === normalizedUnit,
      );

      if (matched) {
        const nextRow = toComparisonRow(matched);
        if (nextRow) {
          handleOpenShoppingDetail(nextRow);
        }
      }
      setShoppingSearchQuery(normalizedProduct);
      setIsShoppingNewItemModalOpen(false);
      setShoppingNewItemFormData(createInitialNewItemFormData());
    } catch (error) {
      console.error('장보기 품목 추가 실패:', error);
    } finally {
      setIsSavingShopping(false);
    }
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

  const isFormValid = Boolean(
    formData.date && formData.category && formData.amount && formData.writer,
  );

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

  const shoppingComparisonRows = useMemo<ShoppingComparisonRow[]>(() => {
    return shoppingItems
      .filter((row) => row.prices.length > 0)
      .map((row) => toComparisonRow(row))
      .filter((row): row is ShoppingComparisonRow => row !== null)
      .sort((a, b) => a.product.localeCompare(b.product, 'ko-KR'));
  }, [shoppingItems]);

  const filteredShoppingRows = useMemo(() => {
    const query = shoppingSearchQuery.trim().toLowerCase();
    if (!query) {
      return shoppingComparisonRows;
    }

    return shoppingComparisonRows.filter((row) => {
      if (row.product.toLowerCase().includes(query)) {
        return true;
      }
      return row.prices.some((priceInfo) =>
        priceInfo.martName.toLowerCase().includes(query),
      );
    });
  }, [shoppingComparisonRows, shoppingSearchQuery]);

  return (
    <div className={styles.ledgerPage}>
      {/* <div className={styles.ledgerHeader}>
        <h2 className={styles.ledgerTitle}>📒 가계부</h2>
      </div> */}

      <div className={styles.ledgerMain}>
        {activeTab === 'home' && (
          <LedgerHomeTabPage
            totalAmount={totalAmount}
            itemCount={items.length}
            monthDiff={monthDiff}
            monthDiffRate={monthDiffRate}
            previousMonthInsight={previousMonthInsight}
            todayAmount={todayAndWeekSpending.todayAmount}
            weekAmount={todayAndWeekSpending.weekAmount}
            budgetUsageRate={budgetUsageRate}
            monthlyBudget={monthlyBudget}
            budgetRemaining={budgetRemaining}
          />
        )}

        {activeTab === 'list' && (
          <LedgerListTabPage
            selectedMonth={selectedMonth}
            monthOptions={monthOptions}
            isLoadingItems={isLoadingItems}
            isLoadingMonths={isLoadingMonths}
            onMonthChange={setSelectedMonth}
            formatMonthDisplay={formatMonthDisplay}
            listViewTab={listViewTab}
            onListViewTabChange={setListViewTab}
            filterCategory={filterCategory}
            onFilterCategoryChange={setFilterCategory}
            categories={CATEGORIES}
            selectedCategoryStat={selectedCategoryStat}
            filteredItems={filteredItems}
            onItemClick={handleItemClick}
            formatDateDisplay={formatDateDisplay}
            totalAmount={totalAmount}
            itemCount={items.length}
            categoryStats={categoryStats}
            writerStats={writerStats}
          />
        )}

        {activeTab === 'shopping' && (
          <LedgerShoppingTabPage
            shoppingSearchQuery={shoppingSearchQuery}
            onSearchChange={setShoppingSearchQuery}
            onOpenShoppingNewItemModal={handleOpenShoppingNewItemModal}
            isLoadingShopping={isLoadingShopping}
            filteredShoppingRows={filteredShoppingRows}
            onOpenShoppingDetail={handleOpenShoppingDetail}
            formatShoppingUpdatedDate={formatShoppingUpdatedDate}
          />
        )}

        {activeTab === 'add' && (
          <LedgerAddTabPage
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            categories={CATEGORIES}
            isFormValid={isFormValid}
            isSaving={isSaving}
            isDeleting={isDeleting}
          />
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

      <Modal
        isOpen={selectedShoppingRow !== null}
        onClose={handleCloseShoppingDetail}
        title={
          selectedShoppingRow
            ? `${selectedShoppingRow.product} (${selectedShoppingRow.unit})`
            : '장보기 상세'
        }
        maxWidth="520px"
      >
        {selectedShoppingRow && (
          <div className={styles.shoppingDetailWrap}>
            <div className={styles.shoppingItemEditPanel}>
              <h4 className={styles.shoppingDetailTitle}>품목 정보</h4>
              <div className={styles.shoppingItemEditRow}>
                <input
                  type="text"
                  name="product"
                  value={shoppingItemEditFormData.product}
                  onChange={handleShoppingItemEditFormChange}
                  placeholder="품목명"
                  className={styles.shoppingInput}
                />
                <input
                  type="text"
                  name="unit"
                  value={shoppingItemEditFormData.unit}
                  onChange={handleShoppingItemEditFormChange}
                  placeholder="단위"
                  className={styles.shoppingInput}
                />
              </div>
              <div className={styles.shoppingItemEditActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={isSavingShoppingItem}
                  onClick={handleShoppingItemUpdate}
                >
                  {isSavingShoppingItem ? '수정 중...' : '품목 수정'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={isSavingShoppingItem}
                  onClick={handleShoppingItemDeleteClick}
                >
                  품목 삭제
                </Button>
              </div>
            </div>

            <div className={styles.shoppingDetailList}>
              {selectedShoppingRow.prices.map((priceInfo) => {
                const edit = shoppingPriceEdits[priceInfo.id] ?? {
                  martName: priceInfo.martName,
                  price: String(priceInfo.price),
                };

                return (
                  <div key={priceInfo.id} className={styles.shoppingDetailRow}>
                    <input
                      data-price-id={priceInfo.id}
                      name="martName"
                      value={edit.martName}
                      onChange={handleShoppingPriceEditChange}
                      className={styles.shoppingInput}
                    />
                    <input
                      data-price-id={priceInfo.id}
                      name="price"
                      type="number"
                      min="1"
                      value={edit.price}
                      onChange={handleShoppingPriceEditChange}
                      className={styles.shoppingInput}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      disabled={savingShoppingPriceId === priceInfo.id}
                      onClick={() => handleShoppingPriceUpdate(priceInfo.id)}
                    >
                      {savingShoppingPriceId === priceInfo.id ? '저장 중...' : '수정'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      disabled={savingShoppingPriceId === priceInfo.id}
                      onClick={() =>
                        handleShoppingDeleteClick(priceInfo.id, priceInfo.martName)
                      }
                    >
                      삭제
                    </Button>
                    <span className={styles.shoppingUpdatedDate}>
                      {formatShoppingUpdatedDate(priceInfo.updatedAt)}
                    </span>
                  </div>
                );
              })}
            </div>

            <form className={styles.shoppingDetailAddForm} onSubmit={handleShoppingAddMart}>
              <h4 className={styles.shoppingDetailTitle}>마트 추가</h4>
              <div className={styles.shoppingDetailAddRow}>
                <input
                  type="text"
                  name="martName"
                  value={shoppingNewMartFormData.martName}
                  onChange={handleShoppingNewMartFormChange}
                  placeholder="마트명"
                  className={styles.shoppingInput}
                  required
                />
                <input
                  type="number"
                  name="price"
                  min="1"
                  value={shoppingNewMartFormData.price}
                  onChange={handleShoppingNewMartFormChange}
                  placeholder="가격"
                  className={styles.shoppingInput}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={isSavingShopping}
                >
                  {isSavingShopping ? '추가 중...' : '추가'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isShoppingNewItemModalOpen}
        onClose={handleCloseShoppingNewItemModal}
        title="품목 추가"
        maxWidth="520px"
      >
        <form className={styles.shoppingItemAddForm} onSubmit={handleShoppingAddItem}>
          <div className={styles.shoppingItemAddGrid}>
            <input
              type="text"
              name="product"
              value={shoppingNewItemFormData.product}
              onChange={handleShoppingNewItemFormChange}
              placeholder="품목명 (예: 사과)"
              className={styles.shoppingInput}
              required
            />
            <input
              type="text"
              name="unit"
              value={shoppingNewItemFormData.unit}
              onChange={handleShoppingNewItemFormChange}
              placeholder="단위 (예: 1kg)"
              className={styles.shoppingInput}
              required
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="small"
            disabled={isSavingShopping}
          >
            {isSavingShopping ? '추가 중...' : '추가하기'}
          </Button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={shoppingDeleteConfirm.isOpen}
        onClose={handleShoppingDeleteCancel}
        onConfirm={handleShoppingDeleteConfirm}
        title="마트 시세 삭제"
        message={`${shoppingDeleteConfirm.martName} 시세를 삭제하시겠어요?`}
        confirmText="삭제"
        cancelText="취소"
      />

      <ConfirmModal
        isOpen={shoppingItemDeleteConfirm.isOpen}
        onClose={handleShoppingItemDeleteCancel}
        onConfirm={handleShoppingItemDeleteConfirm}
        title="품목 삭제"
        message={`${shoppingItemDeleteConfirm.product} (${shoppingItemDeleteConfirm.unit}) 품목 전체를 삭제하시겠어요?`}
        confirmText="삭제"
        cancelText="취소"
      />
    </div>
  );
}
