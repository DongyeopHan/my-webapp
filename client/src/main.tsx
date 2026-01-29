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
        maxWidth="320px"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '500' }}>
            새 버전이 업데이트 되었습니다.
          </p>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#e8e8e8', 
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#ffb088',
              borderRadius: '4px',
              animation: 'progress 2s ease-in-out',
              width: '100%'
            }}></div>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
            곧 새 버전으로 전환됩니다
          </p>
        </div>
        <style>{`
          @keyframes progress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </Modal>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
