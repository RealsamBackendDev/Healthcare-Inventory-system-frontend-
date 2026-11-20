import { post, get } from './api.js';

export const login = (email, password) => post('/auth/login', { email, password });

export const fetchProfile = () => get('/auth/me');

export const switchMembership = (membershipId) => post('/auth/membership', { membershipId });

export const logout = () => post('/auth/logout');

export const changePassword = (currentPassword, newPassword) =>
  post('/auth/change-password', { currentPassword, newPassword });