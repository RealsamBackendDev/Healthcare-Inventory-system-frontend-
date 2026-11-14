import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import InventoryTable from './components/InventoryTable.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import { listInventory } from '../../services/inventory.service.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatQuantity } from '../../utils/format.js';

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' }
];

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listInventory({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE
      });
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Stock levels could not be loaded.');
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

  const pagination = data?.pagination;
  const items = data?.items || [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Stock on hand
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Inventory</h1>
          <p className="mt-1 text-sm text-primary-600">
            Usable, blocked and expired quantities per drug, with batch detail.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </header>

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
              aria-label="Search inventory"
              className="field pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl bg-sand-100 p-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.value || 'all'}
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
            <Alert tone="error" title="Inventory unavailable">
              {error}
            </Alert>
          </div>
        ) : null}

        {!error && !loading && items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-primary-800">No drugs match this view</p>
            <p className="mt-1 text-xs text-primary-500">
              Try a different search term or clear the status filter.
            </p>
          </div>
        ) : null}

        {!error && items.length > 0 ? (
          <InventoryTable
            items={items}
            loading={loading}
            onSelect={setSelectedDrugId}
            selectedId={selectedDrugId}
          />
        ) : null}

        {!error && loading && items.length === 0 ? (
          <InventoryTable items={[]} loading onSelect={() => {}} selectedId={null} />
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
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages || 1, current + 1)
                  )
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

      <BatchPanel
        drugId={selectedDrugId}
        open={Boolean(selectedDrugId)}
        onClose={() => setSelectedDrugId(null)}
      />
    </div>
  );
}
