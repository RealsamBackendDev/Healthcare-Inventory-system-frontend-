import { get } from './api.js';

export const getDashboard = (days = 90) => get(`/reports/dashboard?days=${days}`);