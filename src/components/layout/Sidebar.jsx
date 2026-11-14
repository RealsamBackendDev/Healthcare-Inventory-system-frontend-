import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import BrandMark from '../common/BrandMark.jsx';
import { navigationGroups } from '../../utils/navigation.js';
import { initialsOf } from '../../utils/format.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function Sidebar({ open, onClose }) {
  const { user, role, activeCentre, hasPermission, logout } = useAuth();

  const groups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission))
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-primary-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-primary-800 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <BrandMark className="h-9 w-9" tone="light" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white">Health Inventory</p>
            <p className="truncate text-[11px] uppercase tracking-wider text-primary-200">
              {activeCentre?.code || 'PHC'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-primary-100 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-200">
            Active centre
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {activeCentre?.name || 'No centre assigned'}
          </p>
        </div>

        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
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
                        onClick={onClose}
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
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-primary-100 transition hover:bg-maroon-500/30 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
