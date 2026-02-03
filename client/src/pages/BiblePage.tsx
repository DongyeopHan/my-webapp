import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './BiblePage.module.css';
import { bibleAPI } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import type { User } from '../types/user';
import {
  BIBLE_BOOKS,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  type BibleBook,
} from '../constants/bible';

type BiblePageProps = {
  user: User;
};

export function BiblePage({ user }: BiblePageProps) {
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
  const saveTimeoutRef = useRef<number | null>(null);

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

  const getTestamentProgress = (books: BibleBook[]): number => {
    const totalChapters = books.reduce((sum, book) => sum + book.chapters, 0);
    const readTotal = books.reduce((sum, book) => {
      return sum + (readChapters[book.name]?.size || 0);
    }, 0);
    return parseFloat(((readTotal / totalChapters) * 100).toFixed(1));
  };

  const currentBooks = activeTab === 'old' ? OLD_TESTAMENT : NEW_TESTAMENT;

  if (loading) {
    return (
      <div className={styles.biblePage}>
        <div className={styles.bibleLoading}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.biblePage}>
      {!selectedBook ? (
        <>
          <div className={styles.bibleHeader}>
            <h2 className={styles.bibleTitle}>성경통독</h2>
          </div>

          <div className={styles.testamentTabs}>
            <button
              className={`${styles.tabButton} ${activeTab === 'old' ? styles.active : ''}`}
              onClick={() => setActiveTab('old')}
            >
              <span className={styles.tabName}>구약</span>
              <span className={styles.tabProgress}>
                {getTestamentProgress(OLD_TESTAMENT)}%
              </span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'new' ? styles.active : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <span className={styles.tabName}>신약</span>
              <span className={styles.tabProgress}>
                {getTestamentProgress(NEW_TESTAMENT)}%
              </span>
            </button>
          </div>

          <div className={styles.bibleBookList}>
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
                  className={`${styles.bookButton} ${isCompleted ? styles.completed : ''}`}
                  onClick={() => setSelectedBook(book.name)}
                >
                  <span className={styles.bookName}>{book.name}</span>
                  <span className={styles.bookProgress}>
                    {readCount}/{totalChapters} ({progress}%)
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className={styles.bibleHeader}>
            <button
              className={styles.backButton}
              onClick={() => setSelectedBook(null)}
            >
              ← 뒤로
            </button>
            <h2 className={styles.bibleTitle}>{selectedBook}</h2>
          </div>
          <div className={styles.bibleChapterList}>
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
                    className={`${styles.chapterButton} ${isRead ? styles.read : ''}`}
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
      <ConfirmModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        onConfirm={() => setErrorModal({ isOpen: false, message: '' })}
        title="알림"
        message={errorModal.message}
        confirmText="확인"
        cancelText=""
        variant="primary"
      />
    </div>
  );
}
