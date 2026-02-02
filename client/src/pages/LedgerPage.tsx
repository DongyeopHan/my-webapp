import { useState, useEffect } from 'react';
import styles from './LedgerPage.module.css';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

type LedgerItem = {
  date: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
};

type LedgerFormData = {
  date: string;
  category: string;
  amount: string;
  description: string;
  paymentMethod: string;
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

const GOOGLE_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbwRCSIldJf5MjFqd6J04ykAOBxHD7Fd3Nx0x2JnASm5KHssRsRfShRszS71_yx2WUOy/exec';

const getToday = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getCurrentMonth = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthOptions = (): string[] => {
  const options: string[] = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    options.push(`${year}-${month}`);
  }

  return options;
};

const formatMonthDisplay = (month: string): string => {
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m)}월`;
};

const formatDateDisplay = (dateStr: string): string => {
  // "2026-01-31" 형식을 "1월 31일" 형식으로 변환
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
};

export function LedgerPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LedgerItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<LedgerFormData>({
    date: getToday(),
    category: '',
    amount: '',
    description: '',
    paymentMethod: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitModal, setSubmitModal] = useState<{
    isOpen: boolean;
    message: string;
    isSuccess: boolean;
  }>({ isOpen: false, message: '', isSuccess: false });

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${GOOGLE_SHEET_URL}?month=${selectedMonth}`,
      );
      const result = await response.json();

      if (result.result === 'success') {
        const sortedItems = (result.items || []).sort(
          (a: LedgerItem, b: LedgerItem) => {
            // 최신 날짜가 먼저 오도록 내림차순 정렬
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          },
        );
        setItems(sortedItems);
      } else {
        console.error('Failed to load items:', result.message);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitModal({ isOpen: false, message: '', isSuccess: false });

    try {
      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(formData),
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
          description: '',
          paymentMethod: '',
        });
        setShowAddModal(false);
        setSelectedItem(null);
        loadItems(); // 목록 새로고침
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
      setIsSubmitting(false);
    }
  };

  const handleItemClick = (item: LedgerItem) => {
    setSelectedItem(item);
    setFormData({
      date: item.date,
      category: item.category,
      amount: String(item.amount),
      description: item.description,
      paymentMethod: item.paymentMethod,
    });
  };

  const handleAddClick = () => {
    setFormData({
      date: getToday(),
      category: '',
      amount: '',
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
      description: '',
      paymentMethod: '',
    });
  };

  const isFormValid =
    formData.date &&
    formData.category &&
    formData.amount &&
    formData.paymentMethod;

  // 화면에 표시할 때 날짜 내림차순으로 정렬 (최신 날짜가 위로)
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // 내림차순
  });

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={styles.ledgerPage}>
      <div className={styles.ledgerHeader}>
        <h2 className={styles.ledgerTitle}>가계부</h2>
        <Button variant="primary" size="small" onClick={handleAddClick}>
          + 추가
        </Button>
      </div>

      <div className={styles.monthSelector}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={styles.monthSelect}
        >
          {getMonthOptions().map((month) => (
            <option key={month} value={month}>
              {formatMonthDisplay(month)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : (
        <>
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
                    <span className={styles.itemPayment}>
                      {item.paymentMethod}
                    </span>
                  </div>
                  {item.description && (
                    <div className={styles.itemDescription}>
                      {item.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
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

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '저장하기'}
          </Button>
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
    </div>
  );
}
