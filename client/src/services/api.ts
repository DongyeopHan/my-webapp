import { MONGODB_API_BASE_URL } from '../config/api';
import { getStoredUser, notifyLoggedOut } from './authStorage';
import type { User } from '../types/user';
import type { Todo } from '../types/todo';

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
};

export const bibleAPI = {
  getProgress: async (): Promise<Record<string, number[]>> => {
    return requestJson<Record<string, number[]>>(
      '/scripture/me',
      '진행상황 조회 실패',
      {
        requiresAuth: true,
      },
    );
  },

  saveProgress: async (
    bookName: string,
    readChapters: number[],
  ): Promise<Record<string, unknown>> => {
    return requestJson<Record<string, unknown>>(
      '/scripture/me',
      '진행상황 저장 실패',
      {
        method: 'POST',
        body: { bookName, readChapters },
        requiresAuth: true,
      },
    );
  },
};

export const todoAPI = {
  getTodos: async (): Promise<Todo[]> => {
    return requestJson<Todo[]>('/todo/me', 'Todo 목록 조회 실패', {
      requiresAuth: true,
    });
  },

  createTodo: async (
    title: string,
    time: string,
    content: string,
  ): Promise<Todo> => {
    return requestJson<Todo>('/todo/me', 'Todo 생성 실패', {
      method: 'POST',
      body: { title, time, content },
      requiresAuth: true,
    });
  },

  toggleTodo: async (todoId: string): Promise<Todo> => {
    return requestJson<Todo>(`/todo/${todoId}/toggle`, 'Todo 상태 변경 실패', {
      method: 'PATCH',
      requiresAuth: true,
    });
  },

  updateTodo: async (
    todoId: string,
    title: string,
    time: string,
    content: string,
  ): Promise<Todo> => {
    return requestJson<Todo>(`/todo/${todoId}`, 'Todo 수정 실패', {
      method: 'PUT',
      body: { title, time, content },
      requiresAuth: true,
    });
  },

  deleteTodo: async (todoId: string): Promise<{ message: string }> => {
    return requestJson<{ message: string }>(
      `/todo/${todoId}`,
      'Todo 삭제 실패',
      {
        method: 'DELETE',
        requiresAuth: true,
      },
    );
  },
};
