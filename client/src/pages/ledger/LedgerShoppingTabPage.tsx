import { Button } from '../../components/Button';
import styles from '../LedgerPage.module.css';
import type { ShoppingPriceItem } from '../../types/shopping';

type ShoppingComparisonRow = {
  product: string;
  unit: string;
  prices: ShoppingPriceItem['prices'];
};

type Props = {
  shoppingSearchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenShoppingNewItemModal: () => void;
  isLoadingShopping: boolean;
  filteredShoppingRows: ShoppingComparisonRow[];
  onOpenShoppingDetail: (row: ShoppingComparisonRow) => void;
  formatShoppingUpdatedDate: (value: string) => string;
};

export function LedgerShoppingTabPage({
  shoppingSearchQuery,
  onSearchChange,
  onOpenShoppingNewItemModal,
  isLoadingShopping,
  filteredShoppingRows,
  onOpenShoppingDetail,
  formatShoppingUpdatedDate,
}: Props) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.shoppingSearchBar}>
        <input
          type="text"
          value={shoppingSearchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="품목 또는 마트명 검색"
          className={styles.shoppingInput}
        />
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={onOpenShoppingNewItemModal}
        >
          품목 추가
        </Button>
      </div>

      <div className={styles.shoppingGrid}>
        {isLoadingShopping ? (
          <p className={styles.emptyMessage}>시세를 불러오는 중입니다...</p>
        ) : filteredShoppingRows.length === 0 ? (
          <p className={styles.emptyMessage}>등록된 장보기 시세가 없습니다</p>
        ) : (
          filteredShoppingRows.map((row) => (
            <div
              key={`${row.product}-${row.unit}`}
              className={styles.shoppingCard}
            >
              <div className={styles.shoppingHeaderRow}>
                <div>
                  <div className={styles.shoppingProduct}>{row.product}</div>
                  <div className={styles.shoppingUnit}>{row.unit}</div>
                </div>
              </div>
              <div className={styles.shoppingPriceList}>
                {row.prices
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((priceInfo) => (
                    <div
                      key={`${row.product}-${priceInfo.martName}-${priceInfo.id}`}
                      className={styles.shoppingPriceRow}
                    >
                      <span className={styles.shoppingMartName}>
                        {priceInfo.martName}
                      </span>
                      <span className={styles.shoppingPriceValue}>
                        {priceInfo.price.toLocaleString()}원
                      </span>
                      <span className={styles.shoppingUpdatedDate}>
                        {formatShoppingUpdatedDate(priceInfo.updatedAt)}
                      </span>
                    </div>
                  ))}
              </div>
              <button
                type="button"
                className={styles.shoppingDetailButton}
                onClick={() => onOpenShoppingDetail(row)}
              >
                상세 보기
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
