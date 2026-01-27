import { useState } from 'react';
import './App.css';
import { LedgerPage } from './pages/LedgerPage';

type MenuItem = {
  id: string;
  label: string;
};

type PageType = 'home' | 'todo' | 'scripture' | 'ledger' | 'inbody';

const MENU_ITEMS: MenuItem[] = [
  { id: 'todo', label: 'TODO-LIST' },
  { id: 'scripture', label: '매일 말씀묵상' },
  { id: 'ledger', label: '가계부' },
  { id: 'inbody', label: '인바디 기록' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

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
      case 'todo':
      case 'scripture':
      case 'inbody':
        return <p className="app-main-placeholder">준비 중입니다...</p>;
      default:
        return <p className="app-main-placeholder">메뉴를 선택해주세요</p>;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title" onClick={handleHomeClick}>
          동희부부's 앱
        </h1>
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
