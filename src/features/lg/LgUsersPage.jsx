import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, UserRound } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Drawer from '../../components/ui/Drawer.jsx';
import Input from '../../components/ui/Input.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDate } from '../../utils/format.js';

const roleOptions = [
  { code: 'LG_INVENTORY_OFFICER', name: 'Logistician', scope: 'lg' },
  { code: 'LG_ADMIN', name: 'MOH (Medical Officer of Health)', scope: 'lg' },
  { code: 'ADMINISTRATOR', name: 'OIC (Officer In Charge)', scope: 'facility' },
  { code: 'STAFF', name: 'Centre Staff', scope: 'facility' }
];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  roleCode: 'LG_INVENTORY_OFFICER',
  centreId: ''
};

const roleNameOf = (row) => row.roleName || roleOptions.find((role) => role.code === row.roleCode)?.name || row.roleCode;

export default function LgUsersPage() {
  const [users, setUsers] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userResult, centreResult] = await Promise.all([lgService.listLgUsers(), lgService.listCentres()]);
      setUsers(userResult.users || []);
      setCentres(centreResult.centres || []);
    } catch (loadError) {
      setError(loadError.message || 'The accounts could not be loaded.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRole = useMemo(
    () => roleOptions.find((role) => role.code === form.roleCode) || roleOptions[0],
    [form.roleCode]
  );

  const openForm = () => {
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await lgService.createLgUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleCode: form.roleCode,
        centreId: selectedRole.scope === 'facility' ? form.centreId : null
      });
      setFormOpen(false);
      await load();
    } catch (saveError) {
      setFormError(saveError.message || 'The account could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    setBusyId(user.id);
    setError('');
    try {
      await lgService.updateLgUser(user.id, { isActive: !user.isActive });
      await load();
    } catch (updateError) {
      setError(updateError.message || 'The account could not be updated.');
    } finally {
      setBusyId('');
    }
  };

  const openReset = (user) => {
    setResetUser(user);
    setNewPassword('');
    setResetError('');
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setResetSaving(true);
    setResetError('');
    try {
      await lgService.resetLgUserPassword(resetUser.id, newPassword);
      setResetUser(null);
      setNewPassword('');
    } catch (resetFailure) {
      setResetError(resetFailure.message || 'The password could not be reset.');
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Users</h1>
          <p className="mt-1 text-sm text-primary-600">
            Warehouse officers and the store keepers at your centres.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openForm}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add user
          </Button>
        </div>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <div className="surface space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-sand-100" />
          ))}
        </div>
      ) : null}

      {!loading && users.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-4 py-14 text-center">
          <UserRound className="h-6 w-6 text-leaf-400" aria-hidden="true" />
          <p className="text-sm text-primary-500">No account has been created yet.</p>
        </div>
      ) : null}

      {!loading && users.length > 0 ? (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="surface px-4 py-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-primary-900">{user.fullName}</p>
                    <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                      {roleNameOf(user)}
                    </span>
                    {user.isActive ? null : (
                      <span className="rounded-full bg-maroon-50 px-2 py-0.5 text-[10px] font-semibold text-maroon-600">
                        Inactive
                      </span>
                    )}
                    {user.mustChangePassword ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Password not changed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-primary-500">
                    {user.email} · {user.centreName || 'Local government office'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-primary-400">
                    Created {formatDate(user.createdAt)}
                    {user.lastLoginAt ? ` · Last signed in ${formatDate(user.lastLoginAt)}` : ' · Never signed in'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openReset(user)}
                    aria-label={`Reset password for ${user.fullName}`}
                  >
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === user.id}
                    onClick={() => toggleActive(user)}
                    className={user.isActive ? 'text-maroon-600 hover:bg-maroon-50' : ''}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a user"
        subtitle="They will be asked to choose a new password at first sign in."
      >
        <form className="space-y-4" onSubmit={submit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <Input
            label="Full name"
            name="userFullName"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            placeholder="Adaeze Okafor"
            required
          />

          <Input
            label="Email address"
            name="userEmail"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@healthcentre.local"
            required
          />

          <Input
            label="Temporary password"
            name="userPassword"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="At least 8 characters"
            required
          />

          <div>
            <label className="field-label" htmlFor="userRole">
              Role
            </label>
            <select
              id="userRole"
              className="field"
              value={form.roleCode}
              onChange={(event) => setForm({ ...form, roleCode: event.target.value })}
            >
              {roleOptions.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRole.scope === 'facility' ? (
            <div>
              <label className="field-label" htmlFor="userCentre">
                Centre
              </label>
              <select
                id="userCentre"
                className="field"
                value={form.centreId}
                onChange={(event) => setForm({ ...form, centreId: event.target.value })}
                required
              >
                <option value="">Choose a centre</option>
                {centres
                  .filter((centre) => centre.isActive)
                  .map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centre.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-sand-200 pt-4">
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create account
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        title={resetUser ? `Reset password for ${resetUser.fullName}` : 'Reset password'}
        subtitle="Every existing session for this account is signed out."
      >
        <form className="space-y-4" onSubmit={submitReset}>
          {resetError ? <Alert tone="error">{resetError}</Alert> : null}

          <Input
            label="New temporary password"
            name="resetPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />

          <div className="flex justify-end gap-2 border-t border-sand-200 pt-4">
            <Button variant="ghost" onClick={() => setResetUser(null)} disabled={resetSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={resetSaving}>
              Reset password
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
