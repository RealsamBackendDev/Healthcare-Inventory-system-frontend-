import { get, patch, post, remove } from './api.js';

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

export const listRequisitions = (params) => get(`/requisitions${buildQuery(params)}`);

export const getRequisition = (requisitionId) => get(`/requisitions/${requisitionId}`);

export const createRequisition = (payload) => post('/requisitions', payload);

export const updateRequisition = (requisitionId, payload) =>
  patch(`/requisitions/${requisitionId}`, payload);

export const deleteRequisition = (requisitionId) => remove(`/requisitions/${requisitionId}`);

export const submitRequisition = (requisitionId) => post(`/requisitions/${requisitionId}/submit`);

export const approveRequisition = (requisitionId, items) =>
  post(`/requisitions/${requisitionId}/approve`, items && items.length > 0 ? { items } : {});

export const rejectRequisition = (requisitionId, reason) =>
  post(`/requisitions/${requisitionId}/reject`, { reason });

export const cancelRequisition = (requisitionId, reason) =>
  post(`/requisitions/${requisitionId}/cancel`, { reason: reason || null });

export const closeRequisition = (requisitionId, comment) =>
  post(`/requisitions/${requisitionId}/close`, { comment: comment || null });

export const amendRequisition = (requisitionId) =>
  post(`/requisitions/${requisitionId}/amend`);

export const getShortages = () => get('/requisitions/shortages');

export const generateSuggestions = () => post('/requisitions/suggestions');
