import { get } from './api.js';

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

export const listInventory = (params) => get(`/inventory${buildQuery(params)}`);

export const listBatches = (params) => get(`/inventory/batches${buildQuery(params)}`);

export const getDrugInventory = (drugId, nearExpiryDays = 90) =>
  get(`/inventory/drugs/${drugId}${buildQuery({ nearExpiryDays })}`);
