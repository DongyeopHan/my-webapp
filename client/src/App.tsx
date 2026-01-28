import { useState, useEffect } from 'react';
import './App.css';
import { LedgerPage } from './pages/LedgerPage';
import { ScripturePage } from './pages/ScripturePage';
import { LoginPage } from './pages/LoginPage';
import type { User } from './types/user';

type MenuItem = {
  id: string;
  label: string;
};

type PageType = 'home' | 'todo' | 'scripture' | 'ledger' | 'inbody';

const MENU_ITEMS: MenuItem[] = [
  { id: 'todo', label: 'TODO-LIST' },
  { id: 'scripture', label: '성경통독' },
  { id: 'ledger', label: '가계부' },
  { id: 'inbody', label: '인바디 기록' },
];

const USER_STORAGE_KEY = 'logged_in_user';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setCurrentPage('home');
  };

  const handleMenuClick = (id: string) => {
    setCurrentPage(id as PageType);
  };

  const handleHomeClick = () => {
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'ledger':
        return <LedgerPage />;
      case 'scripture':
        return <ScripturePage user={user!} />;
      case 'todo':
      case 'inbody':
        return <p className="app-main-placeholder">준비 중입니다...</p>;
      default:
        return <p className="app-main-placeholder">메뉴를 선택해주세요</p>;
    }
  };

  // 로그인되지 않은 경우 로그인 페이지만 표시
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
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
