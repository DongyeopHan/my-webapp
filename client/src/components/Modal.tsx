import type { ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  maxWidth?: string;
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  maxWidth,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ '--modal-max-width': maxWidth } as React.CSSProperties}
      >
        {title && (
          <div className={styles.modalHeader}>
            <h3>{title}</h3>
            {showCloseButton && (
              <button className={styles.modalClose} onClick={onClose}>
                ✕
              </button>
            )}
          </div>
        )}
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
