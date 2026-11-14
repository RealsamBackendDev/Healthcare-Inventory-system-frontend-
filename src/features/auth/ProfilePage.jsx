import { Link } from 'react-router-dom';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { formatDateTime, initialsOf } from '../../utils/format.js';

export default function ProfilePage() {
  const { user, role, activeCentre, memberships, permissions, logout } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">My profile</h1>
        <p className="mt-1 text-sm text-primary-600">
          The details your account is signed in with.
        </p>
      </header>

      <div className="surface flex items-center gap-4 p-4 sm:p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-base font-bold text-white">
          {initialsOf(user?.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-primary-900">{user?.fullName}</p>
          <p className="truncate text-sm text-primary-600">{user?.email}</p>
          <p className="mt-0.5 text-xs text-primary-500">
            {role?.name || 'User'}
            {activeCentre?.code ? ` · ${activeCentre.code}` : ''}
          </p>
        </div>
      </div>

      <div className="surface divide-y divide-sand-100">
        <div className="px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
            Healthcare centre
          </p>
          <p className="mt-0.5 text-sm font-medium text-primary-900">
            {activeCentre?.name || 'Not assigned'}
          </p>
          {activeCentre?.code ? (
            <p className="text-xs text-primary-500">Code {activeCentre.code}</p>
          ) : null}
        </div>

        <div className="px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
            Role and access
          </p>
          <p className="mt-0.5 text-sm font-medium text-primary-900">{role?.name || 'User'}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {permissions.length} permission{permissions.length === 1 ? '' : 's'} on this centre
          </p>
        </div>

        {memberships.length > 1 ? (
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
              Other centres
            </p>
            <ul className="mt-1 space-y-1">
              {memberships.map((membership) => (
                <li key={membership.id || membership.healthcareCentreId} className="text-xs text-primary-600">
                  {membership.healthcareCentreName || membership.name || 'Centre'}
                  {membership.roleName ? ` · ${membership.roleName}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
            Session
          </p>
          <p className="mt-0.5 text-xs text-primary-600">
            Last sign-in recorded {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'this session'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/change-password">
          <Button variant="outline">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Change password
          </Button>
        </Link>
        <Button variant="ghost" onClick={logout} className="text-maroon-600 hover:bg-maroon-50">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
