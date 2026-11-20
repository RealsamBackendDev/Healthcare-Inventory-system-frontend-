import { BASE_URL, ApiError, get, getStoredSession, patch, post } from './api.js';

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

export const getOverview = () => get('/organisations/lg');

export const listCentres = () => get('/lg/admin/centres');

export const createCentre = (payload) => post('/lg/admin/centres', payload);

export const updateCentre = (centreId, payload) => patch(`/lg/admin/centres/${centreId}`, payload);

export const listLgUsers = () => get('/lg/admin/users');

export const createLgUser = (payload) => post('/lg/admin/users', payload);

export const updateLgUser = (userId, payload) => patch(`/lg/admin/users/${userId}`, payload);

export const resetLgUserPassword = (userId, newPassword) =>
  post(`/lg/admin/users/${userId}/reset-password`, { newPassword });

export const listLgAudit = (params) => get(`/lg/admin/audit${buildQuery(params)}`);

export const getWarehouse = (params) => get(`/lg/warehouse${buildQuery(params)}`);

export const getWarehouseBatches = (params) => get(`/lg/warehouse/batches${buildQuery(params)}`);

export const createReceipt = (payload) => post('/lg/warehouse/receipts', payload);

export const listReceipts = () => get('/lg/warehouse/receipts');

export const getWarehouseMovements = (params) =>
  get(`/lg/warehouse/movements${buildQuery(params)}`);

export const getLedgerReconciliation = (params) => get(`/lg/ledger/reconciliation${buildQuery(params)}`);

export const listRequests = (params) => get(`/lg/requisitions${buildQuery(params)}`);

export const getRequest = (requisitionId) => get(`/lg/requisitions/${requisitionId}`);

export const approveRequest = (requisitionId, comment, items) =>
  post(`/lg/requisitions/${requisitionId}/approve`, {
    comment: comment || null,
    items: items && items.length > 0 ? items : undefined
  });

export const rejectRequest = (requisitionId, reason) =>
  post(`/lg/requisitions/${requisitionId}/reject`, { reason });

export const dispatchRequest = (requisitionId, payload) =>
  post(`/lg/requisitions/${requisitionId}/dispatch`, payload);

export const listDispatches = () => get('/lg/dispatches');

export const listIncomingDeliveries = () => get('/deliveries/incoming');

export const getDispatchDelivery = (dispatchId) => get(`/deliveries/${dispatchId}`);

export const receiveDispatchDelivery = (dispatchId, payload) =>
  post(`/deliveries/${dispatchId}/receive`, payload);

export const listTransferFacilities = () => get('/lg/transfers/facilities');

export const getTransferFacilityStock = (facilityId) =>
  get(`/lg/transfers/facilities/stock${buildQuery({ facilityId })}`);

export const createTransfer = (payload) => post('/lg/transfers', payload);

export const listTransfers = (params) => get(`/lg/transfers${buildQuery(params)}`);

export const getTransfer = (transferId) => get(`/lg/transfers/${transferId}`);

export const cancelTransfer = (transferId, reason) =>
  post(`/lg/transfers/${transferId}/cancel`, { reason });

export const listIncomingTransfers = () => get('/transfers/incoming');

export const getIncomingTransfer = (transferId) => get(`/transfers/${transferId}`);

export const receiveTransfer = (transferId, note) =>
  post(`/transfers/${transferId}/receive`, { note: note || null });

export const resolveDiscrepancy = (itemId, resolution, note) =>
  post(`/lg/discrepancies/${itemId}/resolve`, { resolution, note });

export const closeShort = (requisitionId, items, reason) =>
  post(`/lg/requisitions/${requisitionId}/close-short`, { items, reason });

export const listOrderCandidates = () => get('/lg/orders/candidates');

export const createOrder = (consolidationId, mode, notes) =>
  post('/lg/orders', { consolidationId, mode: mode || 'gap', notes: notes || null });

export const listOrders = (params) => get(`/lg/orders${buildQuery(params)}`);

export const getOrder = (orderId) => get(`/lg/orders/${orderId}`);

export const submitOrder = (orderId) => post(`/lg/orders/${orderId}/submit`, {});

export const fulfillOrder = (orderId, note) =>
  post(`/lg/orders/${orderId}/fulfill`, { note: note || null });

export const cancelOrder = (orderId, reason) => post(`/lg/orders/${orderId}/cancel`, { reason });

export const receiveOrder = (orderId, payload) => post(`/lg/orders/${orderId}/receipts`, payload);

export const getConsolidationCandidates = () => get('/lg/consolidations/candidates');

export const previewConsolidation = (requisitionIds) =>
  post('/lg/consolidations/preview', { requisitionIds });

export const createConsolidation = (requisitionIds, notes) =>
  post('/lg/consolidations', { requisitionIds, notes: notes || null });

export const listConsolidations = (params) => get(`/lg/consolidations${buildQuery(params)}`);

export const getConsolidation = (consolidationId) => get(`/lg/consolidations/${consolidationId}`);

export const finalizeConsolidation = (consolidationId) =>
  post(`/lg/consolidations/${consolidationId}/finalize`, {});

export const cancelConsolidation = (consolidationId) =>
  post(`/lg/consolidations/${consolidationId}/cancel`, {});

export const getAlerts = () => get('/lg/alerts');

export const getReportsSummary = () => get('/lg/reports/summary');

export const runLgReport = (type, params) => get(`/lg/reports/${type}${buildQuery(params)}`);

export const downloadLgReport = async (type, params) => {
  const session = getStoredSession();
  const response = await fetch(
    `${BASE_URL}/lg/reports/${type}${buildQuery({ ...params, format: 'csv' })}`,
    {
      headers: {
        Authorization: session?.token ? `Bearer ${session.token}` : '',
        Accept: '*/*'
      }
    }
  );

  if (!response.ok) {
    let message = 'The report could not be downloaded.';
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch (error) {
      message = message;
    }
    throw new ApiError(message, { status: response.status, code: 'REPORT_DOWNLOAD_FAILED' });
  }

  return response.blob();
};
