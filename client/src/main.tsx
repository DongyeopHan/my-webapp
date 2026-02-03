import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { UpdateModal } from './components/UpdateModal.tsx';
import { registerSW } from 'virtual:pwa-register';

export function Root() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateSW, setUpdateSW] = useState<
    ((reloadPage?: boolean) => Promise<void>) | null
  >(null);

  // PWA 업데이트 설정
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('새 버전 감지: 모달 표시');
      setShowUpdateModal(true);
    },
    onOfflineReady() {
      console.log('앱을 오프라인에서 사용할 수 있습니다.');
    },
    onRegisteredSW(swUrl, r) {
      console.log('Service Worker 등록됨:', swUrl);
      // 주기적으로 업데이트 확인 (5분마다)
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          3 * 60 * 1000,
        );
      }
    },
    onRegistered(r) {
      if (r) {
        setUpdateSW(() => async (reloadPage?: boolean) => {
          if (r.waiting) {
            // 대기 중인 SW에 skipWaiting 메시지 전송
            r.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await r.update();
          if (reloadPage) {
            window.location.reload();
          }
        });
      }
    },
  });

  return (
    <StrictMode>
      <App />
      <UpdateModal
        isOpen={showUpdateModal}
        onConfirm={async () => {
          if (updateSW) {
            await updateSW(true);
            // Capacitor 앱인 경우 종료 시도
            if ('Capacitor' in window) {
              const { App } = await import('@capacitor/app');
              App.exitApp();
            }
          } else {
            window.location.reload();
          }
        }}
      />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
