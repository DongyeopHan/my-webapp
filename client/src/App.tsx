import { useEffect, useState } from 'react';
import './App.css';
import { LedgerPage } from './pages/LedgerPage';
import { BiblePage } from './pages/BiblePage';
import { TodoListPage } from './pages/TodoListPage';
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

type MenuItem = {
  id: string;
  label: string;
};

type PageType = 'home' | 'todo' | 'bible' | 'ledger' | 'inbody';

const MENU_ITEMS: MenuItem[] = [
  { id: 'todo', label: '✅Todo List' },
  { id: 'bible', label: '📖성경통독' },
  { id: 'ledger', label: '📒가계부' },
  { id: 'inbody', label: '📊인바디 기록' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [sessionNotice, setSessionNotice] = useState('');

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setStoredUser(loggedInUser);
    setSessionNotice('');
  };

  const handleLogout = () => {
    setUser(null);
    clearStoredUser();
    setCurrentPage('home');
  };

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

  const handleMenuClick = (id: string) => {
    setCurrentPage(id as PageType);
  };

  const handleHomeClick = () => {
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'ledger':
        return <LedgerPage user={user!} />;
      case 'bible':
        return <BiblePage user={user!} />;
      case 'todo':
        return <TodoListPage user={user!} />;
      case 'inbody':
        return <p className="app-main-placeholder">준비 중...</p>;
      default:
        return <p className="app-main-placeholder">메뉴를 선택해주세요</p>;
    }
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
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`menu-button ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;
