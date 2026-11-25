import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import AllocationPreview from './components/AllocationPreview.jsx';
import DispenseResult from './components/DispenseResult.jsx';
import { dispense, listDispensing } from '../../services/dispensing.service.js';
import { listDrugs } from '../../services/drugs.service.js';
import { getDrugInventory } from '../../services/inventory.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDateTime, formatQuantity } from '../../utils/format.js';

const PAGE_SIZE = 10;
let lineKey = 0;
const nextKey = () => {
  lineKey += 1;
  return lineKey;
};

export default function DispensingPage() {
  const { hasPermission } = useAuth();
  const canDispense = hasPermission(PERMISSIONS.STOCK_DISPENSE);

  const [drugs, setDrugs] = useState([]);
  const [batchesByDrug, setBatchesByDrug] = useState({});
  const [search, setSearch] = useState('');
  const [pickedDrugId, setPickedDrugId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [lines, setLines] = useState([]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadDrugs = useCallback(async () => {
    try {
      const response = await listDrugs({ status: 'active', pageSize: 100 });
      setDrugs(response.items || []);
    } catch (loadError) {
      setError(loadError.message || 'The drug list could not be loaded.');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await listDispensing({ page: historyPage, pageSize: PAGE_SIZE });
      setHistory(response);
    } catch (loadError) {
      setError(loadError.message || 'Dispensing history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    loadDrugs();
  }, [loadDrugs]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadBatches = async (drugId) => {
    if (!drugId || batchesByDrug[drugId]) {
      return;
    }
    try {
      const data = await getDrugInventory(drugId, 90);
      setBatchesByDrug((current) => ({ ...current, [drugId]: data.batches || [] }));
    } catch (batchError) {
      setError(batchError.message || 'Batches for that drug could not be loaded.');
    }
  };

  const pickedDrug = drugs.find((drug) => drug.id === pickedDrugId) || null;

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || pickedDrug) {
      return [];
    }
    return drugs
      .filter(
        (drug) => drug.name.toLowerCase().includes(term) || drug.code.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [drugs, search, pickedDrug]);

  const drugById = (drugId) => drugs.find((drug) => drug.id === drugId);

  const chooseDrug = (drug) => {
    setPickedDrugId(drug.id);
    setSearch(`${drug.name} (${drug.code})`);
    setQuantity('');
    setFieldError('');
    if (error) {
      setError('');
    }
    loadBatches(drug.id);
  };

  const clearPick = () => {
    setPickedDrugId('');
    setSearch('');
    setQuantity('');
    setFieldError('');
  };

  const addLine = () => {
    if (!pickedDrug) {
      setFieldError('Search for a drug and pick it from the list first');
      return;
    }
    if (lines.some((line) => line.drugId === pickedDrug.id)) {
      setFieldError(
        `${pickedDrug.name} is already on the list. Remove that line before adding it again.`
      );
      return;
    }
    const value = Number(quantity);
    if (!Number.isFinite(value) || value <= 0) {
      setFieldError('Enter a quantity above zero');
      return;
    }
    setLines((current) => [...current, { key: nextKey(), drugId: pickedDrug.id, quantity }]);
    clearPick();
    if (error) {
      setError('');
    }
  };

  const updateLineQuantity = (key) => (event) => {
    const value = event.target.value;
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: value } : line))
    );
    if (error) {
      setError('');
    }
  };

  const removeLine = (key) => setLines((current) => current.filter((line) => line.key !== key));

  const clearAll = () => {
    setLines([]);
    clearPick();
  };

  const dismissResult = useCallback(() => setResult(null), []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (lines.length === 0) {
      setError('Add at least one drug to dispense.');
      return;
    }

    const invalid = lines.find((line) => !(Number(line.quantity) > 0));
    if (invalid) {
      setError(
        `Every drug needs a quantity greater than zero. Check ${drugById(invalid.drugId)?.name}.`
      );
      return;
    }

    const drugIds = lines.map((line) => line.drugId);
    if (new Set(drugIds).size !== drugIds.length) {
      setError('The same drug cannot be on more than one line. Keep one line per drug.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await dispense({
        reference: reference.trim() || null,
        note: note.trim() || null,
        items: lines.map((line) => ({
          drugId: line.drugId,
          quantity: Number(line.quantity)
        }))
      });
      setResult(response);
      setLines([]);
      setReference('');
      setNote('');
      setBatchesByDrug({});
      loadHistory();
    } catch (submitError) {
      setError(submitError.message || 'The dispensing could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const historyItems = history?.items || [];
  const historyPagination = history?.pagination;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Stock out
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Dispensing</h1>
          <p className="mt-1 text-sm text-primary-600">
            First-expiry-first-out. The oldest usable batch is used before newer stock.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadHistory} loading={historyLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {result ? <DispenseResult result={result} onDismiss={dismissResult} /> : null}

      {canDispense ? (
        <form onSubmit={handleSubmit} className="surface space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Reference"
              name="dispenseReference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Leave blank to generate"
            />
            <Input
              label="Note"
              name="dispenseNote"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Patient or ward reference"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/60 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary-900">Add a drug</h3>
              <span className="text-xs text-primary-500">{drugs.length} active drugs</span>
            </div>

            <div className="relative">
              <label className="field-label" htmlFor="dispense-drug-search">
                Drug
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                  aria-hidden="true"
                />
                <input
                  id="dispense-drug-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPickedDrugId('');
                    setFieldError('');
                    if (error) {
                      setError('');
                    }
                  }}
                  placeholder="Type a drug name or code"
                  autoComplete="off"
                  className="field pl-9 pr-9"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={clearPick}
                    aria-label="Clear drug"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-primary-400 transition hover:bg-primary-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {pickedDrug ? (
                <p className="mt-1 text-[11px] font-semibold text-leaf-600">
                  Selected: {pickedDrug.name} ({pickedDrug.code}) · {pickedDrug.unitOfMeasure}
                </p>
              ) : null}

              {matches.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white shadow-lg">
                  {matches.map((drug) => (
                    <li key={drug.id}>
                      <button
                        type="button"
                        onClick={() => chooseDrug(drug)}
                        className="w-full px-3 py-2 text-left text-sm text-primary-800 transition hover:bg-primary-50"
                      >
                        {drug.name} ({drug.code})
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {!pickedDrug && search.trim() && matches.length === 0 ? (
                <p className="mt-1 text-[11px] text-primary-400">No drug matches that search.</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                label={`Quantity${pickedDrug ? ` (${pickedDrug.unitOfMeasure})` : ''}`}
                name="dispense-quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setFieldError('');
                }}
                placeholder="0"
                disabled={!pickedDrug}
              />
              <div className="flex items-end">
                <Button type="button" variant="accent" onClick={addLine} className="w-full">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>

            {pickedDrug ? (
              <AllocationPreview
                batches={batchesByDrug[pickedDrug.id]}
                quantity={quantity}
                unit={pickedDrug.unitOfMeasure || 'units'}
              />
            ) : null}

            {fieldError ? (
              <p className="text-xs font-medium text-maroon-600">{fieldError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-primary-900">
              Drugs added {lines.length > 0 ? `(${lines.length})` : ''}
            </h3>

            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sand-300 px-3 py-6 text-center text-xs text-primary-400">
                Nothing added yet. Search above, enter a quantity and tap Add. Each drug gets one
                line.
              </p>
            ) : (
              <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200 bg-white">
                {lines.map((line) => {
                  const drug = drugById(line.drugId);
                  return (
                    <li key={line.key} className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary-800">{drug?.name}</p>
                          <p className="text-[11px] text-primary-400">
                            {drug?.code} · {drug?.unitOfMeasure}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={updateLineQuantity(line.key)}
                            aria-label={`Quantity for ${drug?.name}`}
                            className="field w-24"
                          />
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            aria-label={`Remove ${drug?.name}`}
                            className="rounded-lg p-1.5 text-maroon-600 transition hover:bg-maroon-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <AllocationPreview
                        batches={batchesByDrug[line.drugId]}
                        quantity={line.quantity}
                        unit={drug?.unitOfMeasure || 'units'}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
            <Button type="submit" loading={submitting} className="sm:w-auto">
              <HandHeart className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Dispensing' : 'Dispense'}
            </Button>
            <Button type="button" variant="outline" onClick={clearAll}>
              Clear
            </Button>
          </div>
        </form>
      ) : (
        <Alert tone="info">
          Your role does not include dispensing. You can still see the recent dispensing history
          below.
        </Alert>
      )}

      <section className="surface">
        <header className="border-b border-sand-200 px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-bold tracking-tight text-primary-900">Recent dispensing</h2>
          <p className="mt-0.5 text-xs text-primary-500">Latest records from this centre</p>
        </header>

        {historyLoading && historyItems.length === 0 ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!historyLoading && historyItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-primary-500 sm:px-5">
            No dispensing has been recorded yet.
          </p>
        ) : null}

        {historyItems.length > 0 ? (
          <ul className="divide-y divide-sand-100">
            {historyItems.map((record) => (
              <li key={record.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {record.reference}
                  </p>
                  <p className="truncate text-xs text-primary-500">
                    {record.createdByName} · {formatDateTime(record.createdAt)}
                  </p>
                  {record.note ? (
                    <p className="truncate text-[11px] text-primary-400">{record.note}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-primary-900">
                    {formatQuantity(record.totalQuantity)}
                  </p>
                  <p className="text-[11px] text-primary-500">
                    {record.itemCount} line{record.itemCount === 1 ? '' : 's'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {historyPagination && historyPagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-xs text-primary-500">
              Page {historyPagination.page} of {historyPagination.totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                disabled={historyPagination.page <= 1 || historyLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setHistoryPage((current) =>
                    Math.min(historyPagination.totalPages || 1, current + 1)
                  )
                }
                disabled={historyPagination.page >= historyPagination.totalPages || historyLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
