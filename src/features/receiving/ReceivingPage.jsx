import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  PackagePlus,
  RefreshCw,
  Search,
  Upload
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ReceiptFormDrawer from './components/ReceiptFormDrawer.jsx';
import ImportDrawer from './components/ImportDrawer.jsx';
import ReceiptDetailDrawer from './components/ReceiptDetailDrawer.jsx';
import { listReceipts } from '../../services/receiving.service.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity, titleCase } from '../../utils/format.js';

const PAGE_SIZE = 20;

export default function ReceivingPage() {
  const { hasPermission } = useAuth();
  const canReceive = hasPermission(PERMISSIONS.STOCK_RECEIVE);
  const canImport = hasPermission(PERMISSIONS.STOCK_IMPORT);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receiptDrawer, setReceiptDrawer] = useState(false);
  const [importDrawer, setImportDrawer] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listReceipts({
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE
      });
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Receipts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleReceiptSaved = (result) => {
    setReceiptDrawer(false);
    setNotice(`Receipt ${result.receipt.receiptReference} saved with ${result.items.length} item(s).`);
    load();
  };

  const handleImported = (result) => {
    setNotice(
      `Import finished: ${result.summary.importedRows} of ${result.summary.totalRows} rows imported.`
    );
    load();
  };

  const receipts = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Stock in
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Receiving</h1>
          <p className="mt-1 text-sm text-primary-600">
            Record deliveries batch by batch, or import a supplier file.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          {canImport ? (
            <Button variant="outline" size="sm" onClick={() => setImportDrawer(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import file
            </Button>
          ) : null}
          {canReceive ? (
            <Button size="sm" onClick={() => setReceiptDrawer(true)}>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              New receipt
            </Button>
          ) : null}
        </div>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

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
              placeholder="Search reference or supplier"
              aria-label="Search receipts"
              className="field pl-9"
            />
          </div>
          <p className="text-xs text-primary-500">
            {pagination ? `${formatQuantity(pagination.total)} receipts recorded` : ''}
          </p>
        </div>

        {error ? (
          <div className="p-4 sm:p-5">
            <Alert tone="error" title="Receipts unavailable">
              {error}
            </Alert>
          </div>
        ) : null}

        {!error && !loading && receipts.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-primary-800">No receipts yet</p>
            <p className="mt-1 text-xs text-primary-500">
              Record your first delivery to start building batch history.
            </p>
          </div>
        ) : null}

        {!error && loading && receipts.length === 0 ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {receipts.length > 0 ? (
          <ul className="divide-y divide-sand-100">
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(receipt.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-50/50 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {receipt.receiptReference}
                    </p>
                    <p className="truncate text-xs text-primary-500">
                      {receipt.supplier || 'No supplier'} · {titleCase(receipt.source)} ·{' '}
                      {formatDate(receipt.receivedDate || receipt.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-primary-900">
                      {formatQuantity(receipt.totalQuantity)}
                    </p>
                    <p className="text-[11px] text-primary-500">
                      {receipt.totalItems} item{receipt.totalItems === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Chevron className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {pagination && pagination.total > 0 ? (
          <div className="flex flex-col gap-2 border-t border-sand-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-primary-500">
              Page {pagination.page} of {pagination.totalPages || 1}
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

      <ReceiptFormDrawer
        open={receiptDrawer}
        onClose={() => setReceiptDrawer(false)}
        onSaved={handleReceiptSaved}
      />
      <ImportDrawer
        open={importDrawer}
        onClose={() => setImportDrawer(false)}
        onImported={handleImported}
      />
      <ReceiptDetailDrawer
        receiptId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
