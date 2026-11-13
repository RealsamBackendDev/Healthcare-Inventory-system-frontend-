import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  UserPlus
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import UserFormDrawer from './components/UserFormDrawer.jsx';
import PasswordResetDrawer from './components/PasswordResetDrawer.jsx';
import { listRoles, listUsers } from '../../services/users.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDateTime, formatQuantity } from '../../utils/format.js';

const PAGE_SIZE = 20;

const filters = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listUsers({
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE
      });
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Staff accounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    load();
  }, [canManage, load]);

  useEffect(() => {
    if (!canManage) {
      return;
    }
    listRoles()
      .then((result) => setRoles(Array.isArray(result) ? result : result.items || []))
      .catch(() => setRoles([]));
  }, [canManage]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="error">Only administrators can manage staff accounts.</Alert>
      </div>
    );
  }

  const records = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">
            Staff accounts
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Add the people who work at this centre and set what they can do.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add staff
          </Button>
        </div>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
        }}
        className="surface flex flex-col gap-2 p-3 sm:flex-row sm:items-end sm:px-5"
      >
        <div className="flex-1">
          <Input
            label="Search"
            name="userSearch"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or email"
          />
        </div>
        <Button type="submit" variant="outline" className="sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      <div className="surface">
        <div className="flex flex-wrap gap-1 border-b border-sand-200 p-3 sm:px-5">
          {filters.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                status === filter.value
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-primary-600 hover:text-primary-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && records.length === 0 ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && records.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-primary-500 sm:px-5">
            No staff accounts match this view.
          </p>
        ) : null}

        <ul className="divide-y divide-sand-100">
          {records.map((member) => (
            <li key={member.membershipId || member.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {member.fullName}
                    {member.id === currentUser?.id ? (
                      <span className="ml-1.5 text-[10px] font-bold uppercase text-leaf-600">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-primary-500">{member.email}</p>
                  <p className="text-[11px] text-primary-400">
                    {member.roleName} ¡¤{' '}
                    {member.lastLoginAt
                      ? `last signed in ${formatDateTime(member.lastLoginAt)}`
                      : 'never signed in'}
                  </p>
                  {member.mustChangePassword ? (
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                      Password change pending
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(member);
                        setFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetTarget(member)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50"
                    >
                      <KeyRound className="h-3 w-3" aria-hidden="true" />
                      Reset password
                    </button>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    member.isActive
                      ? 'border-leaf-200 bg-leaf-50 text-primary-700'
                      : 'border-maroon-200 bg-maroon-50 text-maroon-600'
                  }`}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {pagination && pagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-xs text-primary-500">
              Page {pagination.page} of {pagination.totalPages || 1} ¡¤{' '}
              {formatQuantity(pagination.total)} people
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages || 1, current + 1))
                }
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <UserFormDrawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        roles={roles}
        onSaved={(result, wasEditing) => {
          setFormOpen(false);
          setEditingUser(null);
          setNotice(
            wasEditing
              ? `${result.fullName || 'Account'} updated.`
              : `Account created for ${result.fullName}. Share the temporary password with them.`
          );
          load();
        }}
      />

      <PasswordResetDrawer
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        user={resetTarget}
        onDone={(message) => {
          setResetTarget(null);
          setNotice(message);
          load();
        }}
      />
    </div>
  );
}
