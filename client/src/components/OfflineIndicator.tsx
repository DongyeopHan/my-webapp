import { useState, useEffect } from 'react';
import styles from './OfflineIndicator.module.css';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={styles.offlineBar}>
      <span className={styles.offlineIcon}>⚠️</span>
      <span className={styles.offlineText}>
        오프라인 상태입니다. 인터넷 연결을 확인해주세요.
      </span>
    </div>
  );
}
