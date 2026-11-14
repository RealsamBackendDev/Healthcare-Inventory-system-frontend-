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

export const listDispensing = (params) => get(`/dispensing${buildQuery(params)}`);

export const getDispensing = (dispensingId) => get(`/dispensing/${dispensingId}`);

export const dispense = (payload) => post('/dispensing', payload);
