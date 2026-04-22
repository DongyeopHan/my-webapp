import { useState } from 'react';
import styles from './LoginPage.module.css';
import { authAPI } from '../services/api';
import { Button } from '../components/Button';
import type { User } from '../types/user';

type LoginPageProps = {
  onLogin: (user: User) => void;
  notice?: string;
};

export function LoginPage({ onLogin, notice = '' }: LoginPageProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      setError('아이디와 비밀번호를 입력해주세요');
      return;
    }

    if (isSignup && loginId.trim().length < 3) {
      setError('아이디는 3자 이상이어야 합니다');
      return;
    }

    if (isSignup && password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    if (isSignup && !name) {
      setError('이름을 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const user = isSignup
        ? await authAPI.signup(loginId, password, name)
        : await authAPI.login(loginId, password);
      onLogin(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isSignup
            ? '회원가입에 실패했습니다'
            : '로그인에 실패했습니다',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <h2 className={styles.loginTitle}>
          {isSignup ? '회원가입' : '로그인'}
        </h2>
        {notice && <div className={styles.noticeMessage}>{notice}</div>}
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="loginId">아이디</label>
            <input
              type="text"
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              disabled={loading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              disabled={loading}
            />
          </div>
          {isSignup && (
            <div className={styles.formGroup}>
              <label htmlFor="name">이름</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                disabled={loading}
              />
            </div>
          )}
          {error && <div className={styles.errorMessage}>{error}</div>}
          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={loading}
          >
            {loading
              ? isSignup
                ? '회원가입 중...'
                : '로그인 중...'
              : isSignup
                ? '회원가입'
                : '로그인'}
          </Button>
          <Button
            type="button"
            variant="text"
            size="small"
            fullWidth
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            disabled={loading}
          >
            {isSignup
              ? '이미 계정이 있으신가요? 로그인'
              : '계정이 없으신가요? 회원가입'}
          </Button>
        </form>
      </div>
    </div>
  );
}
