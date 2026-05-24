import { useEffect, useState } from 'react';
import './App.css';
import { LedgerPage } from './pages/LedgerPage';
import appIcon from '../icons/icon-192.webp';
// import { BiblePage } from './pages/BiblePage';
// import { StockPage } from './pages/StockPage';
// import { TodoListPage } from './pages/TodoListPage';
import { LoginPage } from './pages/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import type { User } from './types/user';
import {
  AUTH_LOGOUT_EVENT,
  clearStoredUser,
  getStoredUser,
  setStoredUser,
  type LogoutEventDetail,
} from './services/authStorage';

type PageType = 'home' | /* 'todo' | 'bible' | */ 'ledger' /* | 'stock' */;
type ActiveTab = 'home' | 'list' | 'stats' | 'add';

// const MENU_ITEMS: MenuItem[] = [
//   { id: 'todo', label: '✅Todo List' },
//   { id: 'bible', label: '📖성경통독' },
//   { id: 'ledger', label: '📒가계부' },
//   { id: 'stock', label: '📈주식' },
// ];

const TAB_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'home', label: '🏠 홈' },
  { id: 'list', label: '📋 내역' },
  { id: 'stats', label: '📊 통계' },
  { id: 'add', label: '➕ 추가' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('ledger');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [sessionNotice, setSessionNotice] = useState('');
  const [showSplash, setShowSplash] = useState(() => getStoredUser() !== null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setStoredUser(loggedInUser);
    setSessionNotice('');
    setShowSplash(true);
  };

  const handleLogout = () => {
    setUser(null);
    clearStoredUser();
    setCurrentPage('home');
    setShowSplash(false);
  };

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    const handleForcedLogout = (event: Event) => {
      const customEvent = event as CustomEvent<LogoutEventDetail>;
      setUser(null);
      setCurrentPage('home');
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
    setCurrentPage('ledger');
    setActiveTab('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'ledger':
        return <LedgerPage user={user!} activeTab={activeTab} />;
      // case 'bible':
      //   return <BiblePage user={user!} />;
      // case 'todo':
      //   return <TodoListPage user={user!} />;
      // case 'stock':
      //   return <StockPage />;
      default:
        return <LedgerPage user={user!} activeTab={activeTab} />;
    }
  };

  // 로그인되지 않은 경우 로그인 페이지만 표시
  if (!user) {
    return <LoginPage onLogin={handleLogin} notice={sessionNotice} />;
  }

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo" aria-hidden="true">
            <img
              src={appIcon}
              alt=""
              className="splash-logo-image"
              loading="eager"
              decoding="async"
            />
          </div>
          <h1 className="splash-title">동희부부's 앱</h1>
          <div className="splash-dots">
            <span className="splash-dot" />
            <span className="splash-dot" />
            <span className="splash-dot" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <OfflineIndicator />
      <header className="app-header">
        <h1 className="app-title" onClick={handleHomeClick}>
          동희부부's 앱
        </h1>
        {user && (
          <div className="user-info">
            <span className="username">{user.name}님</span>
            <button className="logout-button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        )}
      </header>

      <main className="app-main">{renderPage()}</main>

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
    </div>
  );
}

export default App;
