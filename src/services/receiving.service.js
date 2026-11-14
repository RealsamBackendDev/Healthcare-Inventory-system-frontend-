import { get, post, uploadFile } from './api.js';

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

export const listReceipts = (params) => get(`/receiving/receipts${buildQuery(params)}`);

export const getReceipt = (receiptId) => get(`/receiving/receipts/${receiptId}`);

export const createReceipt = (payload) => post('/receiving/receipts', payload);

export const previewImport = (file) => uploadFile('/receiving/import/preview', file);

export const commitImport = (payload) => post('/receiving/import/commit', payload);
