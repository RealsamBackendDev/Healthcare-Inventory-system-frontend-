import { get, patch, post } from './api.js';

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

                        export const listNotifications = (params) => get(`/notifications${buildQuery(params)}`);

                        export const getUnreadCount = () => get('/notifications/unread-count');

                        export const markNotificationRead = (notificationId) =>
                          patch(`/notifications/${notificationId}/read`);

                          export const markAllNotificationsRead = () => post('/notifications/read-all');