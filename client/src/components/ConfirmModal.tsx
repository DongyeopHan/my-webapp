import styles from './ConfirmModal.module.css';

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmButtons}>
          <button className={styles.cancelButton} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`${styles.confirmButton} ${variant === 'primary' ? styles.primary : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
