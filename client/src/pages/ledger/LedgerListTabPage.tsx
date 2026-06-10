import styles from '../LedgerPage.module.css';

type LedgerItem = {
  date: string;
  category: string;
  amount: number;
  writer: string;
  description: string;
  paymentMethod: string;
  row?: number;
};

type ListViewTab = 'history' | 'stats';

type Props = {
  selectedMonth: string;
  monthOptions: string[];
  isLoadingItems: boolean;
  isLoadingMonths: boolean;
  onMonthChange: (value: string) => void;
  formatMonthDisplay: (month: string) => string;
  listViewTab: ListViewTab;
  onListViewTabChange: (tab: ListViewTab) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  categories: string[];
  selectedCategoryStat: { count: number; total: number };
  filteredItems: LedgerItem[];
  onItemClick: (item: LedgerItem) => void;
  formatDateDisplay: (date: string) => string;
  totalAmount: number;
  itemCount: number;
  categoryStats: Array<{ category: string; total: number; percent: number }>;
  writerStats: Array<{ writer: string; total: number; percent: number }>;
};

export function LedgerListTabPage({
  selectedMonth,
  monthOptions,
  isLoadingItems,
  isLoadingMonths,
  onMonthChange,
  formatMonthDisplay,
  listViewTab,
  onListViewTabChange,
  filterCategory,
  onFilterCategoryChange,
  categories,
  selectedCategoryStat,
  filteredItems,
  onItemClick,
  formatDateDisplay,
  totalAmount,
  itemCount,
  categoryStats,
  writerStats,
}: Props) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.monthSelector}>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
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

      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${listViewTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => onListViewTabChange('history')}
          type="button"
        >
          내역
        </button>
        <button
          className={`${styles.tabBtn} ${listViewTab === 'stats' ? styles.tabBtnActive : ''}`}
          onClick={() => onListViewTabChange('stats')}
          type="button"
        >
          통계
        </button>
      </div>

      {listViewTab === 'history' ? (
        <>
          <div className={styles.filterRow}>
            <div className={styles.filterSelectWrap}>
              <select
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => onFilterCategoryChange(e.target.value)}
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
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

          <div className={styles.itemList}>
            {filteredItems.length === 0 ? (
              <p className={styles.emptyMessage}>지출 내역이 없습니다</p>
            ) : (
              filteredItems.map((item, index) => (
                <div
                  key={index}
                  className={styles.item}
                  onClick={() => onItemClick(item)}
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
        </>
      ) : (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>총 지출</span>
              <span className={styles.summaryAmount}>
                {totalAmount.toLocaleString()}원
              </span>
            </div>
            <div className={styles.summarySubRow}>
              <span className={styles.summarySubLabel}>총 {itemCount}건</span>
              {itemCount > 0 && (
                <span className={styles.summarySubLabel}>
                  평균 {Math.round(totalAmount / itemCount).toLocaleString()}
                  원/건
                </span>
              )}
            </div>
          </div>

          {itemCount === 0 ? (
            <p className={styles.emptyMessage}>이번달 지출 내역이 없습니다</p>
          ) : (
            <>
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
        </>
      )}
    </div>
  );
}
