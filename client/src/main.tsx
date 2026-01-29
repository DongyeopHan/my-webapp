import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Modal } from './components/Modal.tsx';
import { registerSW } from 'virtual:pwa-register';

function Root() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // PWA 자동 업데이트 설정
  registerSW({
    immediate: true,
    onNeedRefresh() {
      setShowUpdateModal(true);
      // 2초 후 자동으로 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onOfflineReady() {
      console.log('앱을 오프라인에서 사용할 수 있습니다.');
    },
    onRegisteredSW(swUrl, r) {
      console.log('Service Worker 등록됨:', swUrl);
      // 주기적으로 업데이트 확인 (30분마다)
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          30 * 60 * 1000,
        );
      }
    },
  });

  return (
    <StrictMode>
      <App />
      <Modal
        isOpen={showUpdateModal}
        onClose={() => {}}
        title="업데이트"
        showCloseButton={false}
        maxWidth="300px"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
            새 버전이 업데이트 되었습니다.
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
            잠시만 기다려주세요...
          </p>
        </div>
      </Modal>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
