import { get, post, patch } from './api.js';

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

export const listDrugs = (params) => get(`/drugs${buildQuery(params)}`);

export const getDrug = (drugId) => get(`/drugs/${drugId}`);

export const createDrug = (payload) => post('/drugs', payload);

export const updateDrug = (drugId, payload) => patch(`/drugs/${drugId}`, payload);

export const setDrugActive = (drugId, isActive) => post(`/drugs/${drugId}/status`, { isActive });
