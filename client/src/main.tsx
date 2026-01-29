import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA 자동 업데이트 (vite-plugin-pwa 사용)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('앱을 오프라인에서 사용할 수 있습니다.');
  },
});
