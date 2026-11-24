import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Pill,
  RefreshCw,
  ScrollText,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  X
} from 'lucide-react';
import BrandMark from '../../components/common/BrandMark.jsx';
import MembershipSwitcher from '../../components/layout/MembershipSwitcher.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { initialsOf } from '../../utils/format.js';
import * as lgService from '../../services/lg.service.js';
import { PERMISSIONS } from '../../utils/permissions.js';

const groups = [
  {
    label: 'Overview',
    items: [{ to: '/lg', label: 'Overview', icon: LayoutDashboard, end: true }]
  },
  {
    label: 'Supply',
    items: [
      {
        to: '/lg/warehouse',
        label: 'Warehouse',
        icon: Warehouse,
        permission: PERMISSIONS.LG_WAREHOUSE_VIEW
      },
      {
        to: '/lg/requests',
        label: 'Requests',
        icon: ClipboardList,
        permission: PERMISSIONS.REQUISITIONS_LG_REVIEW
      },
      {
        to: '/lg/consolidations',
        label: 'Consolidations',
        icon: Layers,
        permission: PERMISSIONS.LG_CONSOLIDATIONS_MANAGE
      },
      {
        to: '/lg/orders',
        label: 'Orders',
        icon: ShoppingCart,
        permission: PERMISSIONS.LG_ORDERS_MANAGE
      },
      {
        to: '/lg/dispatches',
        label: 'Dispatches',
        icon: Truck,
        permission: PERMISSIONS.LG_WAREHOUSE_VIEW
      },
      {
        to: '/lg/transfers',
        label: 'Transfers',
        icon: ArrowLeftRight,
        permission: PERMISSIONS.LG_TRANSFERS_MANAGE
      }
    ]
  },
  {
    label: 'Control',
    items: [
      { to: '/lg/drugs', label: 'Drug catalogue', icon: Pill, permission: PERMISSIONS.DRUGS_VIEW },
      {
        to: '/lg/reports',
        label: 'Reports',
        icon: BarChart3,
        permission: PERMISSIONS.LG_REPORTS_VIEW
      }
    ]
  },
  {
    label: 'Administration',
    items: [
      { to: '/lg/centres', label: 'Centres', icon: Building2, permission: PERMISSIONS.ORGANISATIONS_MANAGE },
      { to: '/lg/users', label: 'Users', icon: Users, permission: PERMISSIONS.USERS_MANAGE },
      { to: '/lg/audit', label: 'Audit trail', icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW }
    ]
  }
];

export default function LgShell({ children }) {
  const { user, activeLocalGovernment, role, logout, isLocalGovernment, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const result = await lgService.getAlerts();
      setAlerts(result);
    } catch (error) {
      setAlerts(null);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAlertsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(item.permission))
    }))
    .filter((group) => group.items.length > 0);
  const flatItems = visibleGroups.flatMap((group) => group.items);

  if (!isLocalGovernment) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const exactMatch = flatItems.find((item) => location.pathname === item.to);
  const prefixMatch = flatItems
    .filter((item) => location.pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const current = exactMatch || prefixMatch || flatItems[0];

  const alertCounts = alerts?.counts || null;
  const alertTotal = alertCounts
    ? alertCounts.lowStock +
      alertCounts.expiring +
      alertCounts.requisitions +
      alertCounts.orders +
      alertCounts.consolidations
    : 0;

  return (
    <div className="flex min-h-screen bg-sand-50">
      <div
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-30 bg-primary-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-primary-800 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <BrandMark className="h-9 w-9" tone="light" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              {activeLocalGovernment?.name || 'Local government'}
            </p>
            <p className="truncate text-[11px] uppercase tracking-wider text-primary-200">
              LG Medical Warehouse
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-primary-100 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-300">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
                              : 'text-primary-100/85 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 text-leaf-300" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-500/25 text-xs font-bold text-white">
              {initialsOf(user?.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="truncate text-[11px] text-primary-200">{role?.name || 'User'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-primary-100 transition hover:bg-maroon-500/30 hover:text-white disabled:opacity-60"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-sand-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-sand-200 p-2 text-primary-700 transition hover:bg-primary-50 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold tracking-tight text-primary-900 sm:text-lg">
                {current.label}
              </h1>
              <p className="hidden truncate text-xs text-primary-500 sm:block">
                {activeLocalGovernment?.name}
                {role?.name ? ` · ${role.name}` : ''}
              </p>
            </div>

            <span className="hidden items-center gap-1.5 rounded-full border border-leaf-200 bg-leaf-50 px-3 py-1 text-xs font-semibold text-primary-700 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
              {activeLocalGovernment?.code || 'LG'}
            </span>

            <MembershipSwitcher />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAlertsOpen((open) => !open);
                  if (!alertsOpen) {
                    loadAlerts();
                  }
                }}
                aria-label="Alerts"
                className="relative rounded-xl border border-sand-200 p-2 text-primary-700 transition hover:bg-primary-50"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {alertTotal > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-maroon-500 px-1 text-[10px] font-bold text-white">
                    {alertTotal > 99 ? '99+' : alertTotal}
                  </span>
                ) : null}
              </button>

              {alertsOpen ? (
                <div className="absolute right-0 top-12 z-30 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-sand-100 px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                      Alerts
                    </p>
                    <button
                      type="button"
                      onClick={loadAlerts}
                      disabled={alertsLoading}
                      aria-label="Refresh alerts"
                      className="rounded-lg p-1 text-primary-500 transition hover:bg-primary-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${alertsLoading ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <ul className="max-h-80 divide-y divide-sand-100 overflow-y-auto">
                    {(alerts?.alerts || []).map((alert) => (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAlertsOpen(false);
                            navigate(alert.link || '/lg');
                          }}
                          className="w-full px-3 py-2.5 text-left transition hover:bg-primary-50"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                alert.severity === 'danger'
                                  ? 'bg-maroon-500'
                                  : alert.severity === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-leaf-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary-800">{alert.title}</p>
                              <p className="text-[11px] text-primary-500">{alert.detail}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                    {alerts && alerts.alerts.length === 0 ? (
                      <li className="px-3 py-8 text-center text-xs text-primary-400">
                        Nothing needs attention right now.
                      </li>
                    ) : null}
                    {!alerts && alertsLoading ? (
                      <li className="px-3 py-8 text-center text-xs text-primary-400">Loading…</li>
                    ) : null}
                  </ul>

                  {alertCounts ? (
                    <div className="border-t border-sand-100 px-3 py-2 text-[11px] text-primary-400">
                      Low stock {alertCounts.lowStock} · Expiring {alertCounts.expiring} · Requests{' '}
                      {alertCounts.requisitions}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="hidden items-center gap-2 rounded-xl border border-sand-200 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-60 sm:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {signingOut ? 'Signing out' : 'Sign out'}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-sand-200 px-4 py-4 text-center text-[11px] text-primary-400 sm:px-6 lg:px-8">
          Healthcare Centre Inventory and Requisition Management System
        </footer>
      </div>
    </div>
  );
}
