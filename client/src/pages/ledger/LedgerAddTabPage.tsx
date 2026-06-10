import { Button } from '../../components/Button';
import styles from '../LedgerPage.module.css';

type LedgerFormData = {
  date: string;
  category: string;
  amount: string;
  writer: string;
  description: string;
  paymentMethod: string;
};

type Props = {
  formData: LedgerFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: string[];
  isFormValid: boolean;
  isSaving: boolean;
  isDeleting: boolean;
};

export function LedgerAddTabPage({
  formData,
  onChange,
  onSubmit,
  categories,
  isFormValid,
  isSaving,
  isDeleting,
}: Props) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.addPanel}>
        <form className={styles.addForm} onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="date">날짜*</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={onChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">카테고리*</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={onChange}
              required
            >
              <option value="">선택하세요</option>
              {categories.map((cat) => (
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
              onChange={onChange}
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
              onChange={onChange}
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
              onChange={onChange}
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
              onChange={onChange}
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
  );
}
