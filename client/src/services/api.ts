const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '로그인 실패');
    }

    return response.json();
  },

  signup: async (username: string, password: string, name: string) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '회원가입 실패');
    }

    return response.json();
  },
};

export const scriptureAPI = {
  getProgress: async (userId: string) => {
    const response = await fetch(`${API_URL}/scripture/${userId}`);

    if (!response.ok) {
      throw new Error('진행상황 조회 실패');
    }

    return response.json();
  },

  saveProgress: async (
    userId: string,
    bookName: string,
    readChapters: number[],
  ) => {
    const response = await fetch(`${API_URL}/scripture/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookName, readChapters }),
    });

    if (!response.ok) {
      throw new Error('진행상황 저장 실패');
    }

    return response.json();
  },
};

export const todoAPI = {
  getTodos: async (userId: string) => {
    const response = await fetch(`${API_URL}/todo/${userId}`);

    if (!response.ok) {
      throw new Error('Todo 목록 조회 실패');
    }

    return response.json();
  },

  createTodo: async (
    userId: string,
    title: string,
    time: string,
    content: string,
  ) => {
    const response = await fetch(`${API_URL}/todo/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, time, content }),
    });

    if (!response.ok) {
      throw new Error('Todo 생성 실패');
    }

    return response.json();
  },

  toggleTodo: async (todoId: string) => {
    const response = await fetch(`${API_URL}/todo/${todoId}/toggle`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('Todo 상태 변경 실패');
    }

    return response.json();
  },

  updateTodo: async (
    todoId: string,
    title: string,
    time: string,
    content: string,
  ) => {
    const response = await fetch(`${API_URL}/todo/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, time, content }),
    });

    if (!response.ok) {
      throw new Error('Todo 수정 실패');
    }

    return response.json();
  },

  deleteTodo: async (todoId: string) => {
    const response = await fetch(`${API_URL}/todo/${todoId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Todo 삭제 실패');
    }

    return response.json();
  },
};
