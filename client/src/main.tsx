import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { UpdateModal } from './components/UpdateModal.tsx';
import { registerSW } from 'virtual:pwa-register';

function Root() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);

  // PWA 업데이트 설정
  registerSW({
    immediate: true,
    onNeedRefresh() {
      setShowUpdateModal(true);
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
    onRegistered(r) {
      if (r) {
        setUpdateSW(() => () => {
          r.update().then(() => {
            window.location.reload();
          });
        });
      }
    },
  });

  return (
    <StrictMode>
      <App />
      <UpdateModal
        isOpen={showUpdateModal}
        onConfirm={() => {
          if (updateSW) {
            updateSW();
          } else {
            window.location.reload();
          }
        }}
      />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
