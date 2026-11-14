import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Eraser, RefreshCw, Search, Wand2 } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { createStockCount } from '../../services/adjustments.service.js';
import { listBatches } from '../../services/inventory.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity, titleCase } from '../../utils/format.js';

const scopeOptions = [
  { value: 'usable', label: 'Usable stock only' },
  { value: 'all', label: 'Every batch' }
];

const hasCount = (counts, batchId) => {
  const value = counts[batchId];
  return value !== undefined && value !== '';
};

const varianceFor = (batch, counts) => {
  if (!hasCount(counts, batch.id)) {
    return null;
  }
  return Number(counts[batch.id]) - Number(batch.quantity);
};

export default function StockCountPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCount = hasPermission(PERMISSIONS.ADJUSTMENTS_CREATE);

  const [batches, setBatches] = useState([]);
  const [counts, setCounts] = useState({});
  const [scope, setScope] = useState('usable');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('Physical stock count');
  const [reference, setReference] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const first = await listBatches({ pageSize: 100, page: 1 });
      const all = [...(first.items || [])];
      const totalPages = first.pagination?.totalPages || 1;
      for (let page = 2; page <= totalPages; page += 1) {
        const next = await listBatches({ pageSize: 100, page });
        all.push(...(next.items || []));
      }
      all.sort((left, right) => left.drugName.localeCompare(right.drugName));
      setBatches(all);
    } catch (loadError) {
      setError(loadError.message || 'Batches could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return batches
      .filter((batch) => (scope === 'all' ? true : batch.status === 'usable'))
      .filter((batch) =>
        term
          ? `${batch.drugName} ${batch.drugCode} ${batch.batchNumber}`.toLowerCase().includes(term)
          : true
      );
  }, [batches, scope, search]);

  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((batch) => {
      if (!map.has(batch.drugId)) {
        map.set(batch.drugId, {
          drugId: batch.drugId,
          drugName: batch.drugName,
          drugCode: batch.drugCode,
          unitOfMeasure: batch.unitOfMeasure,
          batches: []
        });
      }
      map.get(batch.drugId).batches.push(batch);
    });
    return [...map.values()];
  }, [visible]);

  const enteredLines = useMemo(
    () => batches.filter((batch) => hasCount(counts, batch.id)),
    [batches, counts]
  );

  const varianceCount = useMemo(
    () => enteredLines.filter((batch) => Number(varianceFor(batch, counts)) !== 0).length,
    [enteredLines, counts]
  );

  const setCount = (batchId, value) => {
    setCounts((current) => ({ ...current, [batchId]: value }));
    if (error) {
      setError('');
    }
  };

  const fillWithSystemCounts = () => {
    const next = { ...counts };
    visible.forEach((batch) => {
      if (!hasCount(next, batch.id)) {
        next[batch.id] = String(batch.quantity);
      }
    });
    setCounts(next);
  };

  const clearCounts = () => setCounts({});

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();

    if (enteredLines.length === 0) {
      setError('Enter a counted quantity for at least one batch.');
      return;
    }

    const invalid = enteredLines.find((batch) => {
      const value = Number(counts[batch.id]);
      return !Number.isFinite(value) || value < 0;
    });
    if (invalid) {
      setError(`The count for ${invalid.drugName} (${invalid.batchNumber}) is not a valid number.`);
      return;
    }

    if (reason.trim().length > 0 && reason.trim().length < 3) {
      setError('A reason, if given, needs at least 3 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const payload = await createStockCount({
        reason: reason.trim() || null,
        reference: reference.trim() || null,
        lines: enteredLines.map((batch) => ({
          batchId: batch.id,
          countedQuantity: Number(counts[batch.id])
        }))
      });
      setResult(payload);
      setCounts({});
      load();
    } catch (submitError) {
      setError(submitError.message || 'The stock count could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCount) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="error">You do not have permission to record stock counts.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/adjustments')}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 transition hover:text-primary-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Adjustments
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-primary-900">
            Physical stock count
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Count the shelves, type what you actually found, and only the differences become
            adjustments.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload batches
        </Button>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {result ? (
        <div className="surface space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-primary-900">Count submitted</h2>
            <p className="mt-0.5 text-xs text-primary-600">
              {result.summary.lines} batch(es) counted ，{' '}
              {result.summary.variances === 0
                ? 'no differences found, so nothing needs approval'
                : `${result.summary.variances} difference(s) raised as pending adjustments`}
              .
            </p>
          </div>

          {result.summary.variances > 0 ? (
            <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200">
              {result.results
                .filter((line) => Number(line.variance) !== 0)
                .map((line) => (
                  <li
                    key={line.batchId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-900">
                        {line.drugName}
                      </p>
                      <p className="text-[11px] text-primary-500">
                        {line.batchNumber} ， system {formatQuantity(line.systemQuantity)} ， counted{' '}
                        {formatQuantity(line.countedQuantity)}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-bold ${
                        Number(line.variance) < 0 ? 'text-maroon-600' : 'text-amber-700'
                      }`}
                    >
                      {Number(line.variance) > 0 ? '+' : ''}
                      {formatQuantity(line.variance)} {line.unitOfMeasure}
                    </p>
                  </li>
                ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/adjustments')}>
              Go to approval queue
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResult(null)}>
              Count again
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="surface space-y-3 p-3 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="count-scope">
                Which batches
              </label>
              <select
                id="count-scope"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                className="field"
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="count-search">
                Find a drug
              </label>
              <div className="flex gap-2">
                <input
                  id="count-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, code or batch"
                  className="field"
                />
                <button
                  type="button"
                  onClick={() => setSearch(searchInput.trim())}
                  aria-label="Apply search"
                  className="rounded-xl border border-sand-300 px-2.5 text-primary-600 transition hover:bg-primary-50"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fillWithSystemCounts}>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Copy system quantities
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearCounts}>
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear counts
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="surface space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-5 animate-pulse rounded bg-sand-200" />
            ))}
          </div>
        ) : null}

        {!loading && groups.length === 0 ? (
          <p className="surface px-4 py-12 text-center text-sm text-primary-500">
            No batches match this view.
          </p>
        ) : null}

        {!loading && groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.drugId} className="surface overflow-hidden">
                <div className="border-b border-sand-200 bg-sand-50 px-4 py-2 sm:px-5">
                  <p className="text-sm font-bold text-primary-900">{group.drugName}</p>
                  <p className="text-[11px] text-primary-500">
                    {group.drugCode} ， {group.unitOfMeasure}
                  </p>
                </div>
                <ul className="divide-y divide-sand-100">
                  {group.batches.map((batch) => {
                    const variance = varianceFor(batch, counts);
                    return (
                      <li key={batch.id} className="px-4 py-2.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-primary-800">
                              {batch.batchNumber}
                            </p>
                            <p className="text-[11px] text-primary-500">
                              on record {formatQuantity(batch.quantity)} ， expires{' '}
                              {formatDate(batch.expiryDate)} ， {titleCase(batch.status)}
                            </p>
                          </div>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={counts[batch.id] ?? ''}
                            onChange={(event) => setCount(batch.id, event.target.value)}
                            placeholder="counted"
                            aria-label={`Counted quantity for ${batch.batchNumber}`}
                            className="w-24 rounded-xl border border-sand-300 px-2.5 py-2 text-right text-sm text-primary-900 shadow-sm focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-200"
                          />
                          <span className="w-20 shrink-0 text-right text-[11px] font-semibold">
                            {variance === null ? (
                              <span className="text-primary-400">！</span>
                            ) : variance === 0 ? (
                              <span className="text-leaf-600">Match</span>
                            ) : (
                              <span
                                className={variance < 0 ? 'text-maroon-600' : 'text-amber-700'}
                              >
                                {variance > 0 ? '+' : ''}
                                {formatQuantity(variance)}
                              </span>
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        <div className="surface space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Reason"
              name="countReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Physical stock count"
            />
            <Input
              label="Reference"
              name="countReference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional, e.g. month-end"
            />
          </div>

          <p className="text-xs text-primary-500">
            {enteredLines.length} batch(es) counted, {varianceCount} with a difference. Differences
            become pending adjustments, so an administrator approves them before stock changes.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              loading={submitting}
              disabled={enteredLines.length === 0}
              className="sm:flex-1"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Submitting' : 'Submit count'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/adjustments')}
              className="sm:flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
