import { useEffect, useState } from 'react';
import './App.css';
import { LedgerPage } from './pages/LedgerPage';
import { Modal } from './components/Modal';
import { LoginPage } from './pages/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import type { User } from './types/user';
import { authAPI } from './services/api';
import {
  AUTH_LOGOUT_EVENT,
  clearStoredUser,
  getStoredUser,
  setStoredUser,
  type LogoutEventDetail,
} from './services/authStorage';

type ActiveTab = 'home' | 'list' | 'shopping' | 'add';

const TAB_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'home', label: '🏠 홈' },
  { id: 'list', label: '📋 내역' },
  { id: 'shopping', label: '🛒 장보기' },
  { id: 'add', label: '➕ 추가' },
];

const initialStoredUser = getStoredUser();

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [user, setUser] = useState<User | null>(initialStoredUser);
  const [sessionNotice, setSessionNotice] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsMonthlyBudget, setSettingsMonthlyBudget] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleOpenSettings = () => {
    if (!user) {
      return;
    }
    setSettingsName(user.name);
    setSettingsMonthlyBudget(String(user.monthlyBudget ?? 3000000));
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!user) {
      return;
    }

    const trimmedName = settingsName.trim();
    const parsedBudget = Number(settingsMonthlyBudget);
    if (!trimmedName || !Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return;
    }

    try {
      setIsSavingSettings(true);
      const updatedUser = await authAPI.updateProfile({
        name: trimmedName,
        monthlyBudget: parsedBudget,
      });
      setUser(updatedUser);
      setStoredUser(updatedUser);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setStoredUser(loggedInUser);
    setSessionNotice('');
  };

  const handleLogout = () => {
    setUser(null);
    clearStoredUser();
  };

  useEffect(() => {
    const handleForcedLogout = (event: Event) => {
      const customEvent = event as CustomEvent<LogoutEventDetail>;
      setUser(null);
      setSessionNotice(
        customEvent.detail?.message ||
          '세션이 만료되어 로그아웃되었습니다. 다시 로그인해주세요.',
      );
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);

    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  const handleHomeClick = () => {
    setActiveTab('home');
  };

  // 로그인되지 않은 경우 로그인 페이지만 표시
  if (!user) {
    return <LoginPage onLogin={handleLogin} notice={sessionNotice} />;
  }

  return (
    <div className="app">
      <OfflineIndicator />
      <header className="app-header">
        <h1 className="app-title" onClick={handleHomeClick}>
          동희부부's 가계부
        </h1>
        {user && (
          <div className="user-info">
            <span className="username">{user.name}님</span>
            <button
              className="settings-button"
              onClick={handleOpenSettings}
              aria-label="개인정보 설정"
              title="개인정보 설정"
            >
              ⚙
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        <LedgerPage user={user} activeTab={activeTab} />
      </main>

      <footer className="app-footer">
        <div className="menu-buttons">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              className={`menu-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </footer>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="개인정보 설정"
        maxWidth="420px"
      >
        <div className="settings-form">
          <div className="settings-form-group">
            <label htmlFor="settings-name">이름</label>
            <input
              id="settings-name"
              type="text"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              placeholder="이름"
            />
          </div>
          <div className="settings-form-group">
            <label htmlFor="settings-budget">월 예산</label>
            <input
              id="settings-budget"
              type="number"
              min="0"
              value={settingsMonthlyBudget}
              onChange={(e) => setSettingsMonthlyBudget(e.target.value)}
              placeholder="월 예산"
            />
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-cancel"
              onClick={() => setIsSettingsOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="settings-save"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? '저장 중...' : '저장'}
            </button>
          </div>
          <button
            type="button"
            className="settings-logout"
            onClick={() => {
              setIsSettingsOpen(false);
              handleLogout();
            }}
          >
            로그아웃
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
