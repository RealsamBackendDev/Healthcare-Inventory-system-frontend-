import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import DrugTable from '../drugs/components/DrugTable.jsx';
import DrugFormDrawer from '../drugs/components/DrugFormDrawer.jsx';
import * as lgService from '../../services/lg.service.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatQuantity } from '../../utils/format.js';

const statusFilters = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' }
];

const PAGE_SIZE = 20;

export default function LgDrugsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drawer, setDrawer] = useState({ open: false, drug: null });
  const [busyId, setBusyId] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listLgDrugs({
        search: debouncedSearch || undefined,
        status,
        page,
        pageSize: PAGE_SIZE
      });
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'The drug catalogue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const handleSaved = (saved, wasEdit) => {
    setDrawer({ open: false, drug: null });
    setNotice(wasEdit ? `${saved.name} was updated.` : `${saved.name} was added to the catalogue.`);
    load();
  };

  const handleToggle = async (drug) => {
    const nextState = !drug.isActive;
    const confirmed = window.confirm(
      nextState
        ? `Reactivate ${drug.name}? Every centre in this local government can receive and dispense it again.`
        : `Deactivate ${drug.name}? It is withdrawn from every centre in this local government. Existing stock stays.`
    );
    if (!confirmed) {
      return;
    }

    setBusyId(drug.id);
    setNotice('');
    try {
      await lgService.setLgDrugActive(drug.id, nextState);
      setNotice(`${drug.name} was ${nextState ? 'reactivated' : 'deactivated'}.`);
      load();
    } catch (toggleError) {
      setError(toggleError.message || 'The drug status could not be changed.');
    } finally {
      setBusyId(null);
    }
  };

  const pagination = data?.pagination;
  const drugs = data?.items || [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Catalogue
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Drug catalogue</h1>
          <p className="mt-1 text-sm text-primary-600">
            Every drug this local government supplies to its centres. A new drug is added to each centre’s
            catalogue straight away.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDrawer({ open: true, drug: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add drug
          </Button>
        </div>
      </header>

      {notice ? (
        <Alert tone="success" className="animate-none">
          {notice}
        </Alert>
      ) : null}

      <div className="surface">
        <div className="flex flex-col gap-3 border-b border-sand-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, code or generic"
              aria-label="Search drugs"
              className="field pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl bg-sand-100 p-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  status === filter.value
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-primary-600 hover:text-primary-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-4 sm:p-5">
            <Alert tone="error" title="Catalogue unavailable">
              {error}
            </Alert>
          </div>
        ) : null}

        {!error && loading && drugs.length === 0 ? (
          <DrugTable
            drugs={[]}
            loading
            canManage={false}
            onEdit={() => {}}
            onToggle={() => {}}
            showMinimum={false}
          />
        ) : null}

        {!error && !loading && drugs.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-primary-800">No drugs in this view</p>
            <p className="mt-1 text-xs text-primary-500">
              {status === 'inactive'
                ? 'No drugs have been deactivated.'
                : 'Add your first drug, or try a different search.'}
            </p>
          </div>
        ) : null}

        {!error && drugs.length > 0 ? (
          <DrugTable
            drugs={drugs}
            loading={loading}
            canManage
            onEdit={(drug) => setDrawer({ open: true, drug })}
            onToggle={handleToggle}
            busyId={busyId}
            showMinimum={false}
          />
        ) : null}

        {pagination && pagination.total > 0 ? (
          <div className="flex flex-col gap-2 border-t border-sand-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-primary-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {formatQuantity(pagination.total)} drugs
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
              <span className="text-xs font-medium text-primary-600">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
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

      <DrugFormDrawer
        open={drawer.open}
        drug={drawer.drug}
        onClose={() => setDrawer({ open: false, drug: null })}
        onSaved={handleSaved}
        onCreate={lgService.createLgDrug}
        onUpdate={lgService.updateLgDrug}
        showMinimumStockLevel={false}
        catalogueLabel="the local government catalogue"
      />
    </div>
  );
}
