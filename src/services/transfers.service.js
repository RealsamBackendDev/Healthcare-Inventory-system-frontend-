import { get, post } from './api.js';

const newRequestKey = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `trq-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

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

export const listNeighbours = () => get('/transfers/neighbours');

export const getNeighbourStock = (facilityId) =>
  get(`/transfers/neighbours/${facilityId}/stock`);

export const listTransferRequests = (direction) =>
  get(`/transfers/requests${buildQuery({ direction })}`);

export const getTransferRequest = (requestId) => get(`/transfers/requests/${requestId}`);

export const createTransferRequest = (payload) => post('/transfers/requests', payload);

export const sendStock = (payload) => post('/transfers/send', payload);

export const endorseTransferRequest = (requestId, note) =>
  post(`/transfers/requests/${requestId}/endorse`, { note: note || null });

export const approveTransferRequest = (requestId, note) =>
  post(`/transfers/requests/${requestId}/approve`, {
    note: note || null,
    clientRequestId: newRequestKey()
  });

export const declineTransferRequest = (requestId, reason) =>
  post(`/transfers/requests/${requestId}/decline`, {
    reason,
    clientRequestId: newRequestKey()
  });

export const receiveTransferRequest = (requestId, note, items) =>
  post(`/transfers/requests/${requestId}/receive`, {
    note: note || null,
    items: Array.isArray(items) && items.length > 0 ? items : undefined,
    clientRequestId: newRequestKey()
  });

export const resolveTransferShortage = (requestId, lineId, resolution, note) =>
  post(`/transfers/requests/${requestId}/shortages/${lineId}/resolve`, {
    resolution,
    note
  });

export const cancelTransferRequest = (requestId, reason) =>
  post(`/transfers/requests/${requestId}/cancel`, { reason });
