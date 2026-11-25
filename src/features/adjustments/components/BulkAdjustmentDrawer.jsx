import { useEffect, useMemo, useState } from 'react';
import { Layers, Minus, Plus, Search, Trash2 } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import { createBulkAdjustment } from '../../../services/adjustments.service.js';
import { listBatches } from '../../../services/inventory.service.js';
import { formatDate, formatQuantity } from '../../../utils/format.js';

const adjustmentTypes = [
  { value: 'physical_count', label: 'Physical count correction' },
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss or theft' },
  { value: 'correction', label: 'Data correction' },
  { value: 'expiry_writeoff', label: 'Expiry write-off' },
  { value: 'other', label: 'Other' }
];

const initialForm = {
  adjustmentType: 'correction',
  reason: '',
  reference: ''
};

export default function BulkAdjustmentDrawer({ open, onClose, onSaved }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLines([]);
    setForm(initialForm);
    setSearch('');
    setError('');
    setLoading(true);
    listBatches({ pageSize: 100, page: 1 })
      .then(async (first) => {
        const all = [...(first.items || [])];
        const totalPages = first.pagination?.totalPages || 1;
        for (let page = 2; page <= totalPages; page += 1) {
          const next = await listBatches({ pageSize: 100, page });
          all.push(...(next.items || []));
        }
        all.sort((left, right) => left.drugName.localeCompare(right.drugName));
        setBatches(all.filter((batch) => batch.status === 'usable'));
      })
      .catch((loadError) => setError(loadError.message || 'Batches could not be loaded.'))
      .finally(() => setLoading(false));
  }, [open]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return batches
      .filter((batch) =>
        `${batch.drugName} ${batch.drugCode} ${batch.batchNumber}`.toLowerCase().includes(term)
      )
      .filter((batch) => !lines.some((line) => line.batchId === batch.id))
      .slice(0, 6);
  }, [batches, lines, search]);

  const addBatch = (batch) => {
    setLines((current) => [
      ...current,
      { batchId: batch.id, drugId: batch.drugId, batch, direction: 'reduce', quantity: '' }
    ]);
    setSearch('');
    setError('');
  };

  const updateLine = (batchId, patch) => {
    setLines((current) =>
      current.map((line) => (line.batchId === batchId ? { ...line, ...patch } : line))
    );
    if (error) {
      setError('');
    }
  };

  const setQuantity = (batchId, value) => {
    updateLine(batchId, { quantity: value.replace(/[^0-9.]/g, '') });
  };

  const removeLine = (batchId) => {
    setLines((current) => current.filter((line) => line.batchId !== batchId));
    if (error) {
      setError('');
    }
  };

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (lines.length === 0) {
      setError('Add at least one drug batch to correct.');
      return;
    }

    const invalid = lines.find((line) => {
      const quantity = Number(line.quantity);
      return !Number.isFinite(quantity) || quantity <= 0;
    });
    if (invalid) {
      setError(`Enter a quantity greater than zero for ${invalid.batch.drugName}.`);
      return;
    }

    if (form.reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await createBulkAdjustment({
        adjustmentType: form.adjustmentType,
        reason: form.reason.trim(),
        reference: form.reference.trim() || null,
        lines: lines.map((line) => ({
          drugId: line.drugId,
          batchId: line.batchId,
          quantity: line.direction === 'reduce' ? -Number(line.quantity) : Number(line.quantity)
        }))
      });
      onSaved(result);
    } catch (submitError) {
      setError(submitError.message || 'The stock quantity adjustment could not be submitted.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Stock quantity adjustment"
      subtitle="Correct several drugs in one request"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div>
          <label className="field-label" htmlFor="bulk-search">
            Add a drug batch
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-primary-400"
              aria-hidden="true"
            />
            <input
              id="bulk-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={loading ? 'Loading batches…' : 'Search name, code or batch'}
              className="field pl-9"
              disabled={loading}
            />
          </div>
          {results.length > 0 ? (
            <ul className="mt-2 overflow-hidden rounded-xl border border-sand-200">
              {results.map((batch) => (
                <li key={batch.id} className="border-b border-sand-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => addBatch(batch)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-primary-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary-900">
                        {batch.drugName}
                      </span>
                      <span className="block text-[11px] text-primary-500">
                        {batch.batchNumber} · {formatQuantity(batch.quantity)}{' '}
                        {batch.unitOfMeasure} · expires {formatDate(batch.expiryDate)}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && search.trim().length > 0 && results.length === 0 ? (
            <p className="mt-2 text-xs text-primary-500">No usable batch matches that search.</p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="field-label">Lines to correct</span>
            <span className="text-[11px] font-semibold text-primary-500">
              {lines.length} line{lines.length === 1 ? '' : 's'}
            </span>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand-300 px-3 py-6 text-center text-xs text-primary-500">
              Search above and add every drug batch that needs correcting.
            </p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li key={line.batchId} className="rounded-xl border border-sand-200 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary-900">
                        {line.batch.drugName}
                      </p>
                      <p className="text-[11px] text-primary-500">
                        {line.batch.batchNumber} · {formatQuantity(line.batch.quantity)}{' '}
                        {line.batch.unitOfMeasure} on hand
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.batchId)}
                      aria-label={`Remove ${line.batch.drugName}`}
                      className="rounded-lg p-1 text-primary-400 transition hover:bg-maroon-50 hover:text-maroon-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateLine(line.batchId, { direction: 'add' })}
                      aria-pressed={line.direction === 'add'}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                        line.direction === 'add'
                          ? 'border-leaf-600 bg-leaf-600 text-white'
                          : 'border-sand-300 bg-white text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      Increase
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLine(line.batchId, { direction: 'reduce' })}
                      aria-pressed={line.direction === 'reduce'}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                        line.direction === 'reduce'
                          ? 'border-maroon-600 bg-maroon-600 text-white'
                          : 'border-sand-300 bg-white text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      Reduce
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={line.quantity}
                      onChange={(event) => setQuantity(line.batchId, event.target.value)}
                      placeholder="qty"
                      aria-label={`Quantity for ${line.batch.drugName}`}
                      className="w-20 rounded-lg border border-sand-300 px-2 py-1.5 text-right text-sm text-primary-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-200"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="bulk-type">
            Adjustment type
          </label>
          <select
            id="bulk-type"
            value={form.adjustmentType}
            onChange={updateField('adjustmentType')}
            className="field"
          >
            {adjustmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="bulk-reason">
            Reason
          </label>
          <input
            id="bulk-reason"
            value={form.reason}
            onChange={updateField('reason')}
            placeholder="Why is the recorded quantity wrong?"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="bulk-reference">
            Reference
          </label>
          <input
            id="bulk-reference"
            value={form.reference}
            onChange={updateField('reference')}
            placeholder="Optional supporting reference"
            className="field"
          />
        </div>

        <p className="rounded-xl bg-sand-100 px-3 py-2 text-[11px] text-primary-600">
          Stock is corrected as soon as you apply this request. Every line is recorded in the audit trail with
          your name so the change can still be reviewed afterwards.
        </p>

        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
            <Layers className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Applying' : 'Apply adjustment'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
