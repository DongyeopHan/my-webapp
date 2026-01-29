import { useState, useEffect, useRef, useCallback } from 'react';
import './ScripturePage.css';
import { bibleAPI } from '../services/api';
import type { User } from '../types/user';

type Book = {
  name: string;
  chapters: number;
};

const BIBLE_BOOKS: Book[] = [
  // 구약 (39권)
  { name: '창세기', chapters: 50 },
  { name: '출애굽기', chapters: 40 },
  { name: '레위기', chapters: 27 },
  { name: '민수기', chapters: 36 },
  { name: '신명기', chapters: 34 },
  { name: '여호수아', chapters: 24 },
  { name: '사사기', chapters: 21 },
  { name: '룻기', chapters: 4 },
  { name: '사무엘상', chapters: 31 },
  { name: '사무엘하', chapters: 24 },
  { name: '열왕기상', chapters: 22 },
  { name: '열왕기하', chapters: 25 },
  { name: '역대상', chapters: 29 },
  { name: '역대하', chapters: 36 },
  { name: '에스라', chapters: 10 },
  { name: '느헤미야', chapters: 13 },
  { name: '에스더', chapters: 10 },
  { name: '욥기', chapters: 42 },
  { name: '시편', chapters: 150 },
  { name: '잠언', chapters: 31 },
  { name: '전도서', chapters: 12 },
  { name: '아가', chapters: 8 },
  { name: '이사야', chapters: 66 },
  { name: '예레미야', chapters: 52 },
  { name: '예레미야애가', chapters: 5 },
  { name: '에스겔', chapters: 48 },
  { name: '다니엘', chapters: 12 },
  { name: '호세아', chapters: 14 },
  { name: '요엘', chapters: 3 },
  { name: '아모스', chapters: 9 },
  { name: '오바댜', chapters: 1 },
  { name: '요나', chapters: 4 },
  { name: '미가', chapters: 7 },
  { name: '나훔', chapters: 3 },
  { name: '하박국', chapters: 3 },
  { name: '스바냐', chapters: 3 },
  { name: '학개', chapters: 2 },
  { name: '스가랴', chapters: 14 },
  { name: '말라기', chapters: 4 },
  // 신약 (27권)
  { name: '마태복음', chapters: 28 },
  { name: '마가복음', chapters: 16 },
  { name: '누가복음', chapters: 24 },
  { name: '요한복음', chapters: 21 },
  { name: '사도행전', chapters: 28 },
  { name: '로마서', chapters: 16 },
  { name: '고린도전서', chapters: 16 },
  { name: '고린도후서', chapters: 13 },
  { name: '갈라디아서', chapters: 6 },
  { name: '에베소서', chapters: 6 },
  { name: '빌립보서', chapters: 4 },
  { name: '골로새서', chapters: 4 },
  { name: '데살로니가전서', chapters: 5 },
  { name: '데살로니가후서', chapters: 3 },
  { name: '디모데전서', chapters: 6 },
  { name: '디모데후서', chapters: 4 },
  { name: '디도서', chapters: 3 },
  { name: '빌레몬서', chapters: 1 },
  { name: '히브리서', chapters: 13 },
  { name: '야고보서', chapters: 5 },
  { name: '베드로전서', chapters: 5 },
  { name: '베드로후서', chapters: 3 },
  { name: '요한1서', chapters: 5 },
  { name: '요한2서', chapters: 1 },
  { name: '요한3서', chapters: 1 },
  { name: '유다서', chapters: 1 },
  { name: '요한계시록', chapters: 22 },
];

const OLD_TESTAMENT = BIBLE_BOOKS.slice(0, 39); // 구약 39권
const NEW_TESTAMENT = BIBLE_BOOKS.slice(39); // 신약 27권

type ScripturePageProps = {
  user: User;
};

export function ScripturePage({ user }: ScripturePageProps) {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [readChapters, setReadChapters] = useState<Record<string, Set<number>>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'old' | 'new'>('old');
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: '' });

  // Debounce를 위한 ref
  const pendingChangesRef = useRef<Record<string, Set<number>>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 서버에서 진행상황 불러오기
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        const progress = await bibleAPI.getProgress(user.userId);

        // { bookName: [chapters] } → { bookName: Set<number> }
        const restored: Record<string, Set<number>> = {};
        Object.keys(progress).forEach((book) => {
          restored[book] = new Set(progress[book]);
        });
        setReadChapters(restored);
      } catch (error) {
        console.error('진행상황 불러오기 실패:', error);
        setErrorModal({
          isOpen: true,
          message: '진행상황을 불러오는데 실패했습니다',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [user.userId]);

  // 서버에 진행상황 저장
  const saveProgress = useCallback(
    async (bookName: string, chapters: Set<number>) => {
      try {
        await bibleAPI.saveProgress(
          user.userId,
          bookName,
          Array.from(chapters),
        );
      } catch (error) {
        console.error('진행상황 저장 실패:', error);
        setErrorModal({
          isOpen: true,
          message: '진행상황 저장에 실패했습니다',
        });
      }
    },
    [user.userId],
  );

  // 대기 중인 변경사항을 즉시 저장
  const flushPendingChanges = useCallback(async () => {
    if (Object.keys(pendingChangesRef.current).length === 0) return;

    const changesSnapshot = { ...pendingChangesRef.current };
    pendingChangesRef.current = {};

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // 모든 책의 변경사항을 동시에 저장
    const savePromises = Object.entries(changesSnapshot).map(
      ([bookName, chapters]) => saveProgress(bookName, chapters),
    );

    await Promise.all(savePromises);
  }, [saveProgress]);

  // 페이지 이탈 시 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingChanges();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushPendingChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 컴포넌트 unmount 시에도 저장
    return () => {
      flushPendingChanges();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [flushPendingChanges]);

  // Debounced save (500ms)
  const debouncedSave = (bookName: string, chapters: Set<number>) => {
    // pending changes에 저장
    pendingChangesRef.current[bookName] = chapters;

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 500ms 후 저장
    saveTimeoutRef.current = setTimeout(() => {
      flushPendingChanges();
    }, 500);
  };

  const toggleChapter = (bookName: string, chapter: number) => {
    setReadChapters((prev) => {
      const newProgress = { ...prev };
      if (!newProgress[bookName]) {
        newProgress[bookName] = new Set();
      }
      const bookSet = new Set(newProgress[bookName]);

      if (bookSet.has(chapter)) {
        bookSet.delete(chapter);
      } else {
        bookSet.add(chapter);
      }

      newProgress[bookName] = bookSet;

      // Debounced 저장
      debouncedSave(bookName, bookSet);

      return newProgress;
    });
  };

  const getReadCount = (bookName: string): number => {
    return readChapters[bookName]?.size || 0;
  };

  const selectedBookData = BIBLE_BOOKS.find((b) => b.name === selectedBook);

  const getTestamentProgress = (books: Book[]): number => {
    const totalChapters = books.reduce((sum, book) => sum + book.chapters, 0);
    const readTotal = books.reduce((sum, book) => {
      return sum + (readChapters[book.name]?.size || 0);
    }, 0);
    return parseFloat(((readTotal / totalChapters) * 100).toFixed(1));
  };

  const currentBooks = activeTab === 'old' ? OLD_TESTAMENT : NEW_TESTAMENT;

  if (loading) {
    return (
      <div className="scripture-page">
        <div className="scripture-loading">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="scripture-page">
      {!selectedBook ? (
        <>
          <div className="scripture-header">
            <h2 className="scripture-title">성경통독</h2>
          </div>

          <div className="testament-tabs">
            <button
              className={`tab-button ${activeTab === 'old' ? 'active' : ''}`}
              onClick={() => setActiveTab('old')}
            >
              <span className="tab-name">구약</span>
              <span className="tab-progress">
                {getTestamentProgress(OLD_TESTAMENT)}%
              </span>
            </button>
            <button
              className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <span className="tab-name">신약</span>
              <span className="tab-progress">
                {getTestamentProgress(NEW_TESTAMENT)}%
              </span>
            </button>
          </div>

          <div className="scripture-book-list">
            {currentBooks.map((book) => {
              const readCount = getReadCount(book.name);
              const totalChapters = book.chapters;
              const progress = parseFloat(
                ((readCount / totalChapters) * 100).toFixed(1),
              );
              const isCompleted = progress === 100;

              return (
                <button
                  key={book.name}
                  className={`book-button ${isCompleted ? 'completed' : ''}`}
                  onClick={() => setSelectedBook(book.name)}
                >
                  <span className="book-name">{book.name}</span>
                  <span className="book-progress">
                    {readCount}/{totalChapters} ({progress}%)
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="scripture-header">
            <button
              className="back-button"
              onClick={() => setSelectedBook(null)}
            >
              ← 뒤로
            </button>
            <h2 className="scripture-title">{selectedBook}</h2>
          </div>
          <div className="scripture-chapter-list">
            {selectedBookData &&
              Array.from(
                { length: selectedBookData.chapters },
                (_, i) => i + 1,
              ).map((chapter) => {
                const isRead =
                  readChapters[selectedBook]?.has(chapter) || false;
                const unit = selectedBook === '시편' ? '편' : '장';
                return (
                  <button
                    key={chapter}
                    className={`chapter-button ${isRead ? 'read' : ''}`}
                    onClick={() => toggleChapter(selectedBook, chapter)}
                  >
                    {chapter}
                    {unit}
                  </button>
                );
              })}
          </div>
        </>
      )}

      {/* 에러 모달 */}
      {errorModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setErrorModal({ isOpen: false, message: '' })}
        >
          <div
            className="modal-content error-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>알림</h3>
            <p>{errorModal.message}</p>
            <button
              className="modal-button"
              onClick={() => setErrorModal({ isOpen: false, message: '' })}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
