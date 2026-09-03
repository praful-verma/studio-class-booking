import { fetchApi } from './client';

export const authApi = {
  login: (email, password) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getMe: () => fetchApi('/auth/me')
};
