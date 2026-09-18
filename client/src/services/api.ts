import { MONGODB_API_BASE_URL } from '../config/api';
import { getStoredUser, notifyLoggedOut } from './authStorage';
import type { User } from '../types/user';

const API_URL = MONGODB_API_BASE_URL;
const SESSION_EXPIRED_MESSAGE =
  '세션이 만료되어 로그아웃되었습니다. 다시 로그인해주세요.';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestJsonOptions = {
  method?: RequestMethod;
  body?: unknown;
  requiresAuth?: boolean;
};

const createAuthHeaders = (): HeadersInit => {
  const storedUser = getStoredUser();

  if (!storedUser?.accessToken) {
    return { 'Content-Type': 'application/json' };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${storedUser.accessToken}`,
  };
};

const parseErrorMessage = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  try {
    const error = (await response.json()) as { message?: string };
    return error.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const handleUnauthorizedResponse = (
  response: Response,
  requiresAuth: boolean,
) => {
  if (requiresAuth && response.status === 401) {
    notifyLoggedOut({
      reason: 'unauthorized',
      message: SESSION_EXPIRED_MESSAGE,
    });
  }
};

const requestJson = async <T>(
  path: string,
  fallbackMessage: string,
  options: RequestJsonOptions = {},
): Promise<T> => {
  const { method = 'GET', body, requiresAuth = false } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requiresAuth
      ? createAuthHeaders()
      : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response, requiresAuth);
    throw new Error(await parseErrorMessage(response, fallbackMessage));
  }

  return response.json() as Promise<T>;
};

export const authAPI = {
  login: async (loginId: string, password: string): Promise<User> => {
    return requestJson<User>('/auth/login', '로그인 실패', {
      method: 'POST',
      body: { loginId, password },
    });
  },

  signup: async (
    loginId: string,
    password: string,
    name: string,
  ): Promise<User> => {
    return requestJson<User>('/auth/signup', '회원가입 실패', {
      method: 'POST',
      body: { loginId, password, name },
    });
  },

  updateProfile: async (payload: {
    name?: string;
    monthlyBudget?: number;
  }): Promise<User> => {
    return requestJson<User>('/auth/me', '개인정보 저장 실패', {
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    });
  },
};
