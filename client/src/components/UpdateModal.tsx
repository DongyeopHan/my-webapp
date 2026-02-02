import { Modal } from './Modal';
import { Button } from './Button';
import styles from './UpdateModal.module.css';

type UpdateModalProps = {
  isOpen: boolean;
  onConfirm?: () => void;
};

export function UpdateModal({ isOpen, onConfirm }: UpdateModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="업데이트"
      showCloseButton={false}
      maxWidth="320px"
    >
      <div className={styles.container}>
        <p className={styles.message}>새 버전이 업데이트 되었습니다.</p>
        <p className={styles.hint}>확인을 누르면 새 버전으로 전환됩니다.</p>
        <div className={styles.buttonContainer}>
          <Button
            variant="primary"
            size="medium"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              }
            }}
          >
            확인
          </Button>
        </div>
      </div>
    </Modal>
  );
}
