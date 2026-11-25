import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  RefreshCw,
  ShieldAlert,
  TriangleAlert
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ExpiryBadge from './components/ExpiryBadge.jsx';
import BatchActionDrawer from './components/BatchActionDrawer.jsx';
import { getExpired, getExpirySummary, getNearExpiry, refreshExpiry } from '../../services/expiry.service.js';
import { listBatches } from '../../services/inventory.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity, titleCase } from '../../utils/format.js';

const PAGE_SIZE = 20;
const windows = [7, 30, 90, 180];
const holdStatuses = ['quarantined', 'blocked', 'recalled', 'returned_pending_inspection'];

const tabs = [
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'on_hold', label: 'On hold' }
];

const holdFilters = [
  { value: '', label: 'All' },
  { value: 'quarantined', label: 'Quarantined' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'recalled', label: 'Recalled' },
  { value: 'returned_pending_inspection', label: 'Pending inspection' }
];

const SummaryTile = ({ label, value, hint, tone = 'primary', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="surface flex flex-col items-start gap-1 px-4 py-3 text-left transition hover:border-primary-200"
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
      {label}
    </span>
    <span
      className={`text-xl font-bold ${
        tone === 'maroon' ? 'text-maroon-600' : 'text-primary-900'
      }`}
    >
      {value}
    </span>
    {hint ? <span className="text-[11px] text-primary-400">{hint}</span> : null}
  </button>
);

export default function ExpiryPage() {
  const { hasPermission } = useAuth();
  const canWriteOff = hasPermission(PERMISSIONS.ADJUSTMENTS_QUANTITY);
  const canReturn = hasPermission(PERMISSIONS.RETURNS_REQUEST);
  const isAdmin = hasPermission(PERMISSIONS.SETTINGS_MANAGE);

  const [tab, setTab] = useState('expiring');
  const [days, setDays] = useState(90);
  const [page, setPage] = useState(1);
  const [holdFilter, setHoldFilter] = useState('');

  const [summary, setSummary] = useState(null);
  const [nearExpiry, setNearExpiry] = useState(null);
  const [expired, setExpired] = useState(null);
  const [onHold, setOnHold] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const result = await getExpirySummary();
      setSummary(result);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'expiring') {
        setNearExpiry(await getNearExpiry({ days, page, pageSize: PAGE_SIZE }));
      } else if (tab === 'expired') {
        setExpired(await getExpired({ page, pageSize: PAGE_SIZE }));
      } else {
        const results = await Promise.all(
          holdStatuses.map((status) => listBatches({ status, pageSize: 100 }))
        );
        const merged = results.flatMap((result) => result.items || []);
        merged.sort((left, right) => {
          const a = left.expiryDate ? new Date(left.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          const b = right.expiryDate ? new Date(right.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          return a - b;
        });
        setOnHold(merged);
      }
    } catch (loadError) {
      setError(loadError.message || 'Expiry data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [tab, days, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  useEffect(() => {
    setPage(1);
  }, [tab, days]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setNotice('');
    try {
      const result = await refreshExpiry();
      setNotice(
        `Expiry check finished: ${result.expiredBatches} batch${
          result.expiredBatches === 1 ? '' : 'es'
        } newly expired, ${result.notifications} notification${
          result.notifications === 1 ? '' : 's'
        } raised.`
      );
      loadSummary();
      loadTab();
    } catch (refreshError) {
      setError(refreshError.message || 'The expiry check could not run.');
    } finally {
      setRefreshing(false);
    }
  };

  const visibleHold = useMemo(
    () => (holdFilter ? onHold.filter((batch) => batch.status === holdFilter) : onHold),
    [onHold, holdFilter]
  );

  const activeData = tab === 'expiring' ? nearExpiry : expired;
  const records = activeData?.items || [];
  const pagination = activeData?.pagination;
  const canAct = canWriteOff || canReturn;

  const handleDone = (message) => {
    setSelectedBatch(null);
    setNotice(message);
    loadSummary();
    loadTab();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Shelf life
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">
            Expiry monitoring
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Batches that are close to expiry, already expired, or held out of use.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadTab} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload
          </Button>
          {isAdmin ? (
            <Button size="sm" onClick={handleRefresh} loading={refreshing}>
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Run expiry check
            </Button>
          ) : null}
        </div>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Expired"
          value={summary ? formatQuantity(summary.expiredQuantity) : '—'}
          hint={summary ? `${summary.expiredBatches} batch(es)` : 'Loading'}
          tone="maroon"
          onClick={() => {
            setTab('expired');
            setPage(1);
          }}
        />
        <SummaryTile
          label="Within 7 days"
          value={summary ? summary.within7Days : '—'}
          hint="batches"
          tone="maroon"
          onClick={() => {
            setTab('expiring');
            setDays(7);
          }}
        />
        <SummaryTile
          label="Within 30 days"
          value={summary ? summary.within30Days : '—'}
          hint="batches"
          onClick={() => {
            setTab('expiring');
            setDays(30);
          }}
        />
        <SummaryTile
          label="Within 90 days"
          value={summary ? summary.within90Days : '—'}
          hint="batches"
          onClick={() => {
            setTab('expiring');
            setDays(90);
          }}
        />
      </div>

      <div className="flex gap-1 rounded-xl bg-sand-100 p-1">
        {tabs.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === option.value
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="surface">
        {tab === 'expiring' ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-sand-200 p-3 sm:px-5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-primary-400">
              Window
            </span>
            {windows.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  days === option
                    ? 'bg-primary-50 text-primary-900'
                    : 'text-primary-600 hover:text-primary-900'
                }`}
              >
                {option} days
              </button>
            ))}
          </div>
        ) : null}

        {tab === 'on_hold' ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-sand-200 p-3 sm:px-5">
            {holdFilters.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                onClick={() => setHoldFilter(filter.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  holdFilter === filter.value
                    ? 'bg-primary-50 text-primary-900'
                    : 'text-primary-600 hover:text-primary-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && tab !== 'on_hold' && records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center sm:px-5">
            <CalendarClock className="h-6 w-6 text-leaf-400" aria-hidden="true" />
            <p className="text-sm text-primary-500">
              {tab === 'expiring'
                ? `No batches expire within ${days} days.`
                : 'No expired batches are on record.'}
            </p>
          </div>
        ) : null}

        {!loading && tab === 'on_hold' && visibleHold.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-primary-500 sm:px-5">
            Nothing is being held back right now.
          </p>
        ) : null}

        {!loading && tab !== 'on_hold' ? (
          <ul className="divide-y divide-sand-100">
            {records.map((batch) => (
              <li key={batch.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {batch.drugName}
                  </p>
                  <p className="truncate text-xs text-primary-500">
                    {batch.batchNumber} · {batch.drugCode} · expires {formatDate(batch.expiryDate)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-primary-600">
                    {formatQuantity(batch.quantity)} {batch.unitOfMeasure} available
                  </p>
                  {canAct ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(batch)}
                      className="mt-1.5 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                    >
                      Act on batch
                    </button>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <ExpiryBadge
                    days={
                      tab === 'expiring'
                        ? batch.daysToExpiry
                        : batch.daysExpired
                          ? -batch.daysExpired
                          : batch.daysExpired
                    }
                  />
                  <p className="mt-1 text-[11px] text-primary-400">{titleCase(batch.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && tab === 'on_hold' ? (
          <ul className="divide-y divide-sand-100">
            {visibleHold.map((batch) => (
              <li key={batch.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {batch.drugName}
                  </p>
                  <p className="truncate text-xs text-primary-500">
                    {batch.batchNumber} · {batch.drugCode} · expires {formatDate(batch.expiryDate)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-primary-600">
                    {formatQuantity(batch.quantity)} {batch.unitOfMeasure} held
                  </p>
                  {canAct ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(batch)}
                      className="mt-1.5 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                    >
                      Act on batch
                    </button>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                    {titleCase(batch.status)}
                  </span>
                  <p className="mt-1 text-[11px] text-primary-400">
                    {batch.isUsable ? 'Usable' : 'Not for use'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && tab !== 'on_hold' && pagination && pagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-xs text-primary-500">
              Page {pagination.page} of {pagination.totalPages || 1} ·{' '}
              {formatQuantity(pagination.total)} batches
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
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
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {summary && summary.within7Days > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-maroon-50 px-3 py-2.5 text-xs text-maroon-700">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {summary.within7Days} batch(es) expire within a week. Dispensing already uses the
          earliest expiry first, so move or write off these batches before they are wasted.
        </p>
      ) : null}

      <BatchActionDrawer
        open={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
        batch={selectedBatch}
        onDone={handleDone}
      />
    </div>
  );
}
