import type { User } from '../types/user';

export const USER_STORAGE_KEY = 'logged_in_user';
export const AUTH_LOGOUT_EVENT = 'auth:logout';

export type LogoutReason = 'manual' | 'unauthorized';

export type LogoutEventDetail = {
  reason: LogoutReason;
  message?: string;
};

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const notifyLoggedOut = (detail: LogoutEventDetail) => {
  clearStoredUser();
  window.dispatchEvent(
    new CustomEvent<LogoutEventDetail>(AUTH_LOGOUT_EVENT, { detail }),
  );
};
