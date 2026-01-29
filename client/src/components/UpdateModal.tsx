import { Modal } from './Modal';
import styles from './UpdateModal.module.css';

type UpdateModalProps = {
  isOpen: boolean;
};

export function UpdateModal({ isOpen }: UpdateModalProps) {
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
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
        <p className={styles.hint}>곧 새 버전으로 전환됩니다</p>
      </div>
    </Modal>
  );
}
