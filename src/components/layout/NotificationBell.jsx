import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import Alert from '../ui/Alert.jsx';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../../services/notifications.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDateTime } from '../../utils/format.js';

export default function NotificationBell() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  const loadCount = useCallback(async () => {
    if (!allowed) {
      return;
    }
    try {
      const data = await getUnreadCount();
      setUnread(Number(data?.unread || 0));
    } catch (countError) {
      setUnread(0);
    }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) {
      return undefined;
    }
    loadCount();
    const timer = window.setInterval(loadCount, 60000);
    return () => window.clearInterval(timer);
  }, [allowed, loadCount]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const loadList = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listNotifications({ pageSize: 15 });
      setItems(result.items || []);
    } catch (loadError) {
      setError(loadError.message || 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadList();
      loadCount();
    }
  };

  const handleRead = async (notification) => {
    if (notification.isRead) {
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    );
    setUnread((current) => Math.max(0, current - 1));
    try {
      await markNotificationRead(notification.id);
    } catch (readError) {
      setError(readError.message || 'The notification could not be marked as read.');
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
    } catch (readError) {
      setError(readError.message || 'Notifications could not be updated.');
    }
  };

  if (!allowed) {
    return null;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-xl border border-sand-200 p-2 text-primary-700 transition hover:bg-primary-50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-maroon-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-[19rem] overflow-hidden rounded-xl border border-sand-200 bg-white shadow-lift sm:w-80">
          <div className="flex items-center justify-between border-b border-sand-200 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
              Notifications
            </p>
            <button
              type="button"
              onClick={handleReadAll}
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error ? (
              <div className="p-2">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}

            {loading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-primary-500">Loading…</p>
            ) : null}

            {!loading && items.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-primary-500">
                Nothing new. Expiry and low stock alerts appear here.
              </p>
            ) : null}

            <ul className="divide-y divide-sand-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleRead(item)}
                    className={`flex w-full gap-2 px-3 py-2.5 text-left transition hover:bg-primary-50/50 ${
                      item.isRead ? 'bg-white' : 'bg-leaf-50/40'
                    }`}
                  >
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.isRead ? 'bg-sand-300' : 'bg-leaf-500'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-primary-900">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-primary-600">
                        {item.message}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-primary-400">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
