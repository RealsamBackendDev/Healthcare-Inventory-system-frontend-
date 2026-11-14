import { get, post } from './api.js';

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

export const getExpirySummary = () => get('/expiry/summary');

export const getNearExpiry = (params) => get(`/expiry/near-expiry${buildQuery(params)}`);

export const getExpired = (params) => get(`/expiry/expired${buildQuery(params)}`);

export const refreshExpiry = () => post('/expiry/refresh');
