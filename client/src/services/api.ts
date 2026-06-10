import { MONGODB_API_BASE_URL } from '../config/api';
import { getStoredUser, notifyLoggedOut } from './authStorage';
import type { User } from '../types/user';
import type {
  StockQuoteResponse,
  StockSearchResponse,
  StockWatchlistResponse,
} from '../types/stock';
import type {
  CreateShoppingPricePayload,
  ShoppingPriceListResponse,
} from '../types/shopping';

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

export const stockAPI = {
  getQuotes: async (codes?: string[]): Promise<StockQuoteResponse> => {
    const params = new URLSearchParams();

    if (codes && codes.length > 0) {
      params.set('codes', codes.join(','));
    }

    const query = params.toString();
    const path = query ? `/stocks/quotes?${query}` : '/stocks/quotes';

    return requestJson<StockQuoteResponse>(path, '주식 시세 조회 실패', {
      requiresAuth: true,
    });
  },

  searchStocks: async (query: string): Promise<StockSearchResponse> => {
    const params = new URLSearchParams({ query });

    return requestJson<StockSearchResponse>(
      `/stocks/search?${params.toString()}`,
      '종목 검색 실패',
      {
        requiresAuth: true,
      },
    );
  },

  getWatchlist: async (): Promise<StockWatchlistResponse> => {
    return requestJson<StockWatchlistResponse>(
      '/stocks/watchlist/me',
      '관심종목 조회 실패',
      {
        requiresAuth: true,
      },
    );
  },

  updateWatchlist: async (codes: string[]): Promise<StockWatchlistResponse> => {
    return requestJson<StockWatchlistResponse>(
      '/stocks/watchlist/me',
      '관심종목 저장 실패',
      {
        method: 'PUT',
        body: { codes },
        requiresAuth: true,
      },
    );
  },
};

export const shoppingAPI = {
  getPrices: async (): Promise<ShoppingPriceListResponse> => {
    return requestJson<ShoppingPriceListResponse>(
      '/shopping/prices',
      '장보기 시세 조회 실패',
      {
        requiresAuth: true,
      },
    );
  },

  addPrice: async (
    payload: CreateShoppingPricePayload,
  ): Promise<{ item: unknown }> => {
    return requestJson<{ item: unknown }>(
      '/shopping/prices',
      '시세 등록 실패',
      {
        method: 'POST',
        body: payload,
        requiresAuth: true,
      },
    );
  },

  addItem: async (payload: {
    product: string;
    unit: string;
  }): Promise<{ item: unknown }> => {
    return requestJson<{ item: unknown }>('/shopping/items', '품목 생성 실패', {
      method: 'POST',
      body: payload,
      requiresAuth: true,
    });
  },

  updatePrice: async (
    priceId: string,
    payload: { martName?: string; price?: number },
  ): Promise<{ item: unknown }> => {
    return requestJson<{ item: unknown }>(
      `/shopping/prices/${priceId}`,
      '시세 수정 실패',
      {
        method: 'PATCH',
        body: payload,
        requiresAuth: true,
      },
    );
  },

  deletePrice: async (priceId: string): Promise<{ message: string }> => {
    return requestJson<{ message: string }>(
      `/shopping/prices/${priceId}`,
      '시세 삭제 실패',
      {
        method: 'DELETE',
        requiresAuth: true,
      },
    );
  },

  updateItem: async (payload: {
    product: string;
    unit: string;
    nextProduct: string;
    nextUnit: string;
  }): Promise<{ message: string }> => {
    return requestJson<{ message: string }>(
      '/shopping/items',
      '품목 수정 실패',
      {
        method: 'PATCH',
        body: payload,
        requiresAuth: true,
      },
    );
  },

  deleteItem: async (payload: {
    product: string;
    unit: string;
  }): Promise<{ message: string }> => {
    return requestJson<{ message: string }>(
      '/shopping/items',
      '품목 삭제 실패',
      {
        method: 'DELETE',
        body: payload,
        requiresAuth: true,
      },
    );
  },
};
