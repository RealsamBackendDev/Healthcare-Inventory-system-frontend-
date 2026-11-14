import { post, get } from './api.js';

export const login = (email, password) => post('/auth/login', { email, password });

export const fetchProfile = () => get('/auth/me');

export const logout = () => post('/auth/logout');

export const changePassword = (currentPassword, newPassword) =>
  post('/auth/change-password', { currentPassword, newPassword });
