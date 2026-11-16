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

export const listNeighbours = () => get('/transfers/neighbours');

export const getNeighbourStock = (facilityId) =>
  get(`/transfers/neighbours/${facilityId}/stock`);

export const listTransferRequests = (direction) =>
  get(`/transfers/requests${buildQuery({ direction })}`);

export const getTransferRequest = (requestId) => get(`/transfers/requests/${requestId}`);

export const createTransferRequest = (payload) => post('/transfers/requests', payload);

export const approveTransferRequest = (requestId, note) =>
  post(`/transfers/requests/${requestId}/approve`, { note: note || null });

export const declineTransferRequest = (requestId, reason) =>
  post(`/transfers/requests/${requestId}/decline`, { reason });

export const receiveTransferRequest = (requestId, note) =>
  post(`/transfers/requests/${requestId}/receive`, { note: note || null });

export const cancelTransferRequest = (requestId, reason) =>
  post(`/transfers/requests/${requestId}/cancel`, { reason });
