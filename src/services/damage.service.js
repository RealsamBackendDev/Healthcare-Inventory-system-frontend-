import { get, post } from './api.js';

export const listDamagedStock = () => get('/stock/damage');

export const recordDamageDisposition = (batchId, payload) =>
  post(`/stock/damage/${batchId}/disposition`, payload);

export const listDamageLots = () => get('/stock/damage/lots');

export const listReturnsInTransit = () => get('/stock/damage/returns');

export const receiveReturn = (batchId, payload) =>
  post(`/stock/damage/returns/${batchId}/receive`, payload);
