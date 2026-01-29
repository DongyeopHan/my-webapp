import { useState } from 'react';
import styles from './LedgerPage.module.css';
import { Button } from '../components/Button';

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
  'https://script.google.com/macros/s/AKfycbxlcHNiBw9ZP_N_PPzLPL8IpwfCpXaSZ1vBVrSXKIlBmsCxcENZgkg5co2jg01_Tcur/exec';

const getToday = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function LedgerPage() {
  const [formData, setFormData] = useState<LedgerFormData>({
    date: getToday(),
    category: '',
    amount: '',
    description: '',
    paymentMethod: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

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
        setSubmitMessage('✅ 저장되었습니다!');
        setFormData({
          date: getToday(),
          category: '',
          amount: '',
          description: '',
          paymentMethod: '',
        });
      } else {
        setSubmitMessage(
          `❌ 저장에 실패했습니다: ${result.message || '알 수 없는 오류'}`,
        );
      }
    } catch (error) {
      setSubmitMessage('❌ 저장에 실패했습니다.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.date &&
    formData.category &&
    formData.amount &&
    formData.paymentMethod;

  return (
    <div className={styles.ledgerPage}>
      <div className={styles.ledgerHeader}>
        <h2 className={styles.ledgerTitle}>가계부</h2>
      </div>

      <form className={styles.ledgerForm} onSubmit={handleSubmit}>
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

        {submitMessage && (
          <p className={styles.submitMessage}>{submitMessage}</p>
        )}
      </form>
    </div>
  );
}
