import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Drawer from '../../components/ui/Drawer.jsx';
import Input from '../../components/ui/Input.jsx';
import * as lgService from '../../services/lg.service.js';

const emptyForm = { name: '', code: '', address: '' };

export default function LgCentresPage() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listCentres();
      setCentres(result.centres || []);
    } catch (loadError) {
      setError(loadError.message || 'The centres could not be loaded.');
      setCentres([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      await lgService.createCentre({
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address.trim() || null
      });
      setFormOpen(false);
      await load();
    } catch (saveError) {
      setFormError(saveError.message || 'The centre could not be added.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (centre) => {
    setBusyId(centre.id);
    setError('');
    try {
      await lgService.updateCentre(centre.id, { isActive: !centre.isActive });
      await load();
    } catch (updateError) {
      setError(updateError.message || 'The centre could not be updated.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Centres</h1>
          <p className="mt-1 text-sm text-primary-600">
            Every health centre supplied by this local government warehouse.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openForm}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add centre
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

      {!loading && centres.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-4 py-14 text-center">
          <Building2 className="h-6 w-6 text-leaf-400" aria-hidden="true" />
          <p className="text-sm text-primary-500">
            No centre has been added yet. Add the first one to start supplying it.
          </p>
        </div>
      ) : null}

      {!loading && centres.length > 0 ? (
        <ul className="space-y-2">
          {centres.map((centre) => (
            <li key={centre.id} className="surface flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-primary-900">{centre.name}</p>
                  <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
                    {centre.code}
                  </span>
                  {centre.isActive ? null : (
                    <span className="rounded-full bg-maroon-50 px-2 py-0.5 text-[10px] font-semibold text-maroon-600">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-primary-500">
                  {centre.address || 'No address recorded'} · {centre.userCount} user
                  {centre.userCount === 1 ? '' : 's'} · {centre.openRequests} open request
                  {centre.openRequests === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={busyId === centre.id}
                onClick={() => toggleActive(centre)}
                className={centre.isActive ? 'text-maroon-600 hover:bg-maroon-50' : ''}
              >
                {centre.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a centre"
        subtitle="It will belong to your local government and get its own main store."
      >
        <form className="space-y-4" onSubmit={submit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <Input
            label="Centre name"
            name="centreName"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ijabe Community Health Centre"
            required
          />

          <Input
            label="Centre code"
            name="centreCode"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            placeholder="IJB-CHC"
            hint="A short code used on reports and store names. Letters, numbers and hyphens only."
            required
          />

          <Input
            label="Address"
            name="centreAddress"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="Ijabe, Afijio"
          />

          <p className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-primary-600">
            Deactivating a centre signs its users out and hides it from supply screens. Existing records
            are kept.
          </p>

          <div className="flex justify-end gap-2 border-t border-sand-200 pt-4">
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add centre
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
