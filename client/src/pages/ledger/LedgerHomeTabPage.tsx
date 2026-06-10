import styles from '../LedgerPage.module.css';

type Props = {
  totalAmount: number;
  itemCount: number;
  monthDiff: number;
  monthDiffRate: number;
  previousMonthInsight: string;
  todayAmount: number;
  weekAmount: number;
  budgetUsageRate: number;
  monthlyBudget: number;
  budgetRemaining: number;
};

export function LedgerHomeTabPage({
  totalAmount,
  itemCount,
  monthDiff,
  monthDiffRate,
  previousMonthInsight,
  todayAmount,
  weekAmount,
  budgetUsageRate,
  monthlyBudget,
  budgetRemaining,
}: Props) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>이번달 총 지출</span>
          <span className={styles.summaryAmount}>
            {totalAmount.toLocaleString()}원
          </span>
        </div>
        <div className={styles.summarySubRow}>
          <span className={styles.summarySubLabel}>총 {itemCount}건</span>
          {itemCount > 0 && (
            <span className={styles.summarySubLabel}>
              평균 {Math.round(totalAmount / itemCount).toLocaleString()}원/건
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
            오늘 {todayAmount.toLocaleString()}원
          </strong>
          <span className={styles.homeCardValueText}>
            이번주 {weekAmount.toLocaleString()}원
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
  );
}
