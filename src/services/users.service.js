import { get, patch, post, put } from './api.js';

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
              search.set(key, value);
                  }
                    });
                      const query = search.toString();
                        return query ? `?${query}` : '';
                        };

                        export const listUsers = (params) => get(`/users${buildQuery(params)}`);

                        export const listRoles = () => get('/users/roles');

                        export const createUser = (payload) => post('/users', payload);

                        export const updateUser = (userId, payload) => patch(`/users/${userId}`, payload);

                        export const resetUserPassword = (userId, newPassword) =>
                          post(`/users/${userId}/reset-password`, { newPassword });

                          export const getSettings = () => get('/settings');

                          export const updateSettings = (payload) => put('/settings', payload);