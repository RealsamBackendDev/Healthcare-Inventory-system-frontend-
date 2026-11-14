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

export const listAdjustments = (params) => get(`/adjustments${buildQuery(params)}`);

export const getAdjustment = (adjustmentId) => get(`/adjustments/${adjustmentId}`);

export const createAdjustment = (payload) => post('/adjustments', payload);

export const createStockCount = (payload) => post('/adjustments/stock-count', payload);

export const approveAdjustment = (adjustmentId, comment) =>
  post(`/adjustments/${adjustmentId}/approve`, { comment: comment || null });

export const rejectAdjustment = (adjustmentId, comment) =>
  post(`/adjustments/${adjustmentId}/reject`, { comment });

export const listReturns = (params) => get(`/returns${buildQuery(params)}`);

export const getReturn = (returnId) => get(`/returns/${returnId}`);

export const createReturn = (payload) => post('/returns', payload);

export const approveReturn = (returnId, comment) =>
  post(`/returns/${returnId}/approve`, { comment: comment || null });

export const rejectReturn = (returnId, comment) => post(`/returns/${returnId}/reject`, { comment });
