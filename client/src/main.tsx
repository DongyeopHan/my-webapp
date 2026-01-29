import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { UpdateModal } from './components/UpdateModal.tsx';
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
      <UpdateModal isOpen={showUpdateModal} />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
