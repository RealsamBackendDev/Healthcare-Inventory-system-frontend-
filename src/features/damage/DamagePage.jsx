import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  PackageCheck,
  PackageX,
  RefreshCw,
  RotateCcw,
  Trash2,
  Truck
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import {
  listDamagedStock,
  listReturnsInTransit,
  markStockDamaged,
  receiveReturn,
  recordDamageDisposition
} from '../../services/damage.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  titleCase
} from '../../utils/format.js';

const emptyForm = {
  disposition: 'restocked',
  quantity: '',
  lossBearer: 'receiver',
  agreedWithName: '',
  note: ''
};

const emptyReceipt = {
  outcome: 'restock',
  note: ''
};

const waitingDays = (value) => {
  if (!value) {
    return 0;
  }
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days > 0 ? days : 0;
};

const SummaryTile = ({ label, value, hint, tone = 'primary' }) => (
  <div className="surface flex flex-col items-start gap-1 px-4 py-3">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
      {label}
    </span>
    <span
      className={`text-xl font-bold ${tone === 'maroon' ? 'text-maroon-600' : 'text-primary-900'}`}
    >
      {value}
    </span>
    {hint ? <span className="text-[11px] text-primary-400">{hint}</span> : null}
  </div>
);

export default function DamagePage() {
  const { hasPermission } = useAuth();
  const canRecord = hasPermission(PERMISSIONS.ADJUSTMENTS_CREATE);

  const [data, setData] = useState(null);
  const [returns, setReturns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [damageForm, setDamageForm] = useState({ batchId: '', quantity: '', reason: '' });
  const [damageError, setDamageError] = useState('');
  const [damageSaving, setDamageSaving] = useState(false);

  const [returnId, setReturnId] = useState(null);
  const [returnForm, setReturnForm] = useState(emptyReceipt);
  const [returnError, setReturnError] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stock, inTransit] = await Promise.all([
        listDamagedStock(),
        listReturnsInTransit()
      ]);
      setData(stock);
      setReturns(inTransit);
    } catch (loadError) {
      setError(loadError.message || 'Damaged stock could not be loaded.');
      setData(null);
      setReturns(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items || [];
  const history = data?.recentDispositions || [];
  const inTransit = returns?.items || [];
  const availableBatches = data?.availableBatches || [];

  const damagedBatch = useMemo(
    () => availableBatches.find((batch) => batch.batchId === damageForm.batchId) || null,
    [availableBatches, damageForm.batchId]
  );

  const submitDamage = async (event) => {
    event.preventDefault();
    if (!damagedBatch) {
      setDamageError('Choose the batch the damaged stock came from.');
      return;
    }

    const quantity = Number(damageForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setDamageError('Enter how many units are damaged.');
      return;
    }
    if (quantity > damagedBatch.quantity) {
      setDamageError(
        `That batch only holds ${formatQuantity(damagedBatch.quantity)} ${damagedBatch.unitOfMeasure}.`
      );
      return;
    }
    if (damageForm.reason.trim().length < 3) {
      setDamageError('Say briefly what happened.');
      return;
    }

    setDamageError('');
    setDamageSaving(true);
    try {
      const result = await markStockDamaged(damagedBatch.batchId, {
        quantity,
        reason: damageForm.reason.trim()
      });
      setNotice(
        `${formatQuantity(result.quantity)} ${result.unitOfMeasure} of ${result.drugName} ` +
          `moved into quarantine lot ${result.batchNumber}.`
      );
      setDamageForm({ batchId: '', quantity: '', reason: '' });
      await load();
    } catch (saveError) {
      setDamageError(saveError.message || 'The stock could not be moved into quarantine.');
    } finally {
      setDamageSaving(false);
    }
  };

  const selected = useMemo(
    () => items.find((item) => item.batchId === selectedId) || null,
    [items, selectedId]
  );

  const selectedReturn = useMemo(
    () => inTransit.find((item) => item.batchId === returnId) || null,
    [inTransit, returnId]
  );

  const openDecision = (item) => {
    setSelectedId(item.batchId);
    setForm({
      ...emptyForm,
      disposition: item.expired ? 'written_off' : 'restocked',
      quantity: String(item.quantity)
    });
    setFormError('');
    setNotice('');
  };

  const openReturn = (item) => {
    setReturnId(item.batchId);
    setReturnForm({
      outcome: item.allowedOutcomes.includes('restock') ? 'restock' : 'write_off',
      note: ''
    });
    setReturnError('');
    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Enter the quantity being decided.');
      return;
    }
    if (quantity > selected.quantity) {
      setFormError(`Only ${formatQuantity(selected.quantity)} is in quarantine.`);
      return;
    }
    if (form.agreedWithName.trim().length < 2) {
      setFormError('Enter the name of the person who agreed to this.');
      return;
    }
    if (form.note.trim().length < 3) {
      setFormError('Add a short note explaining the decision.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const result = await recordDamageDisposition(selected.batchId, {
        disposition: form.disposition,
        quantity,
        lossBearer: form.disposition === 'written_off' ? form.lossBearer : undefined,
        agreedWithName: form.agreedWithName.trim(),
        note: form.note.trim()
      });
      const outcome =
        result.disposition === 'restocked'
          ? 'returned to usable stock'
          : result.disposition === 'returned'
            ? `sent back to ${result.returnToName} and is now in transit`
            : 'written off';
      setNotice(
        `${formatQuantity(result.quantity)} ${result.unitOfMeasure} of ${result.drugName} ` +
          `${outcome}${result.replacementOwed ? ' - replacement owed by the sender' : ''}.`
      );
      setSelectedId(null);
      setForm(emptyForm);
      await load();
    } catch (saveError) {
      setFormError(saveError.message || 'The decision could not be recorded.');
    } finally {
      setSaving(false);
    }
  };

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!selectedReturn) {
      return;
    }
    if (returnForm.note.trim().length < 3) {
      setReturnError('Add a short note about what you found on arrival.');
      return;
    }

    setReturnError('');
    setReturnSaving(true);
    try {
      const result = await receiveReturn(selectedReturn.batchId, {
        outcome: returnForm.outcome,
        note: returnForm.note.trim()
      });
      setNotice(
        `${formatQuantity(result.quantity)} ${result.unitOfMeasure} of ${result.drugName} ` +
          `${result.outcome === 'restock' ? 'signed back in as usable stock' : 'written off on arrival'}.`
      );
      setReturnId(null);
      setReturnForm(emptyReceipt);
      await load();
    } catch (saveError) {
      setReturnError(saveError.message || 'The return could not be signed in.');
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Stock held back
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">
            Damaged stock
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Stock that arrived damaged is kept in quarantine. Record here what was agreed with the
            sender: return it to usable stock, send it back, or write it off and note who bears the
            loss.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reload
        </Button>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryTile
          label="In quarantine"
          value={data ? `${formatQuantity(data.totalQuantity)} units` : '—'}
          hint={data ? `${items.length} batch(es)` : 'Loading'}
        />
        <SummaryTile
          label="Overdue"
          value={data ? data.overdueCount : '—'}
          hint={`No decision after ${data ? data.quarantineWindowDays : 7} days`}
          tone={data && data.overdueCount > 0 ? 'maroon' : 'primary'}
        />
        <SummaryTile
          label="Expired"
          value={data ? data.expiredCount : '—'}
          hint="Can only be written off or returned"
          tone={data && data.expiredCount > 0 ? 'maroon' : 'primary'}
        />
      </div>

      {canRecord && availableBatches.length > 0 ? (
        <Card padded={false}>
          <div className="border-b border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-primary-900">Mark stock as damaged</p>
            <p className="mt-0.5 text-[11px] text-primary-500">
              Take only the damaged units out of a batch. The rest stays usable, and the damaged
              units wait here for a decision.
            </p>
          </div>
          <form onSubmit={submitDamage} className="space-y-3 px-4 py-3 sm:px-5">
            <div>
              <label className="field-label" htmlFor="damage-batch">
                Batch
              </label>
              <select
                id="damage-batch"
                className="field"
                value={damageForm.batchId}
                onChange={(event) =>
                  setDamageForm((current) => ({
                    ...current,
                    batchId: event.target.value,
                    quantity: ''
                  }))
                }
              >
                <option value="">Select a batch</option>
                {availableBatches.map((batch) => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.drugName} · {batch.batchNumber} ·{' '}
                    {formatQuantity(batch.quantity)} {batch.unitOfMeasure} · expires{' '}
                    {formatDate(batch.expiryDate)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={
                  damagedBatch
                    ? `Quantity (max ${formatQuantity(damagedBatch.quantity)})`
                    : 'Quantity'
                }
                name="damageQuantity"
                type="number"
                min="0"
                step="any"
                value={damageForm.quantity}
                onChange={(event) =>
                  setDamageForm((current) => ({ ...current, quantity: event.target.value }))
                }
                placeholder="0"
              />
              <Input
                label="What happened"
                name="damageReason"
                value={damageForm.reason}
                placeholder="Broken while moving"
                onChange={(event) =>
                  setDamageForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </div>

            {damageError ? (
              <p className="text-xs font-medium text-maroon-600">{damageError}</p>
            ) : null}

            <Button type="submit" size="sm" loading={damageSaving}>
              Move into quarantine
            </Button>
          </form>
        </Card>
      ) : null}

      <Card padded={false}>
        {loading ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center sm:px-5">
            <PackageX className="h-6 w-6 text-leaf-400" aria-hidden="true" />
            <p className="text-sm text-primary-500">
              No damaged stock is waiting for a decision.
            </p>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <ul className="divide-y divide-sand-100">
            {items.map((item) => (
              <li key={item.batchId} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {item.drugName}
                    </p>
                    <p className="truncate text-xs text-primary-500">
                      {item.batchNumber} · {item.drugCode} · expires {formatDate(item.expiryDate)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-primary-600">
                      {formatQuantity(item.quantity)} {item.unitOfMeasure} held ·{' '}
                      {item.sourceReference ? `from ${item.sourceReference}` : 'source not recorded'}
                    </p>
                    {canRecord ? (
                      <button
                        type="button"
                        onClick={() => openDecision(item)}
                        className="mt-1.5 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                      >
                        Record decision
                      </button>
                    ) : null}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.expired
                          ? 'border-maroon-200 bg-maroon-50 text-maroon-700'
                          : item.overdue
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-leaf-200 bg-leaf-50 text-primary-700'
                      }`}
                    >
                      {item.expired
                        ? 'Expired'
                        : item.overdue
                          ? `${item.ageDays} days held`
                          : `${item.ageDays} day(s) held`}
                    </span>
                    <p className="text-[11px] text-primary-400">
                      received {formatDate(item.receivedDate)}
                    </p>
                  </div>
                </div>

                {selected && selected.batchId === item.batchId ? (
                  <form
                    onSubmit={submit}
                    className="mt-3 space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-3"
                  >
                    <div>
                      <label className="field-label" htmlFor={`damage-decision-${item.batchId}`}>
                        Decision
                      </label>
                      <select
                        id={`damage-decision-${item.batchId}`}
                        className="field"
                        value={form.disposition}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, disposition: event.target.value }))
                        }
                      >
                        <option value="restocked" disabled={item.expired}>
                          Return to usable stock
                        </option>
                        <option value="written_off">Write off</option>
                        <option value="returned">Returned to sender</option>
                      </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label={`Quantity (max ${formatQuantity(item.quantity)})`}
                        name="quantity"
                        type="number"
                        min="0"
                        step="any"
                        value={form.quantity}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, quantity: event.target.value }))
                        }
                      />
                      <Input
                        label="Agreed with"
                        name="agreedWithName"
                        value={form.agreedWithName}
                        placeholder="Name of the person who agreed"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            agreedWithName: event.target.value
                          }))
                        }
                      />
                    </div>

                    {form.disposition === 'written_off' ? (
                      <div>
                        <span className="field-label">Who bears the loss</span>
                        <div className="flex gap-2">
                          {[
                            { value: 'sender', label: 'Sender replaces it' },
                            { value: 'receiver', label: 'This facility accepts it' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setForm((current) => ({ ...current, lossBearer: option.value }))
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                form.lossBearer === option.value
                                  ? 'border-primary-400 bg-white text-primary-900'
                                  : 'border-sand-300 bg-white text-primary-600 hover:text-primary-900'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {form.disposition === 'returned' ? (
                      <p className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-[11px] text-primary-600">
                        The stock leaves this store and travels as in-transit stock. It cannot be
                        issued by anyone until the sender signs it back in, and the sender will see
                        who agreed to it and your note.
                      </p>
                    ) : null}

                    <Input
                      label="Note"
                      name="note"
                      value={form.note}
                      placeholder="What was agreed"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, note: event.target.value }))
                      }
                    />

                    {formError ? (
                      <p className="text-xs font-medium text-maroon-600">{formError}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" loading={saving}>
                        Save decision
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedId(null);
                          setForm(emptyForm);
                          setFormError('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-sand-200 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary-900">Returns in transit</p>
          </div>
          <span className="text-[11px] text-primary-400">
            {returns ? `${formatQuantity(returns.totalQuantity)} units` : 'Loading'}
          </span>
        </div>

        {loading ? (
          <div className="px-4 py-4 sm:px-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-sand-200" />
          </div>
        ) : null}

        {!loading && inTransit.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center sm:px-5">
            <PackageCheck className="h-6 w-6 text-leaf-400" aria-hidden="true" />
            <p className="text-sm text-primary-500">
              No damaged stock has been sent to this store yet.
            </p>
          </div>
        ) : null}

        {!loading && inTransit.length > 0 ? (
          <ul className="divide-y divide-sand-100">
            {inTransit.map((item) => (
              <li key={item.batchId} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {item.drugName}
                    </p>
                    <p className="truncate text-xs text-primary-500">
                      {item.batchNumber} · expires {formatDate(item.expiryDate)} ·{' '}
                      {formatQuantity(item.quantity)} {item.unitOfMeasure}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-primary-600">
                      from {item.fromCentreName}
                      {item.recordedByName ? ` · sent by ${item.recordedByName}` : ''}
                      {item.supplierReference ? ` · ${item.supplierReference}` : ''}
                    </p>
                    {item.agreedWithName || item.note ? (
                      <p className="mt-0.5 text-[11px] text-primary-500">
                        {item.agreedWithName ? `agreed with ${item.agreedWithName}` : 'agreement recorded'}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    ) : null}
                    {canRecord ? (
                      <button
                        type="button"
                        onClick={() => openReturn(item)}
                        className="mt-1.5 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                      >
                        Sign it back in
                      </button>
                    ) : null}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.expired
                          ? 'border-maroon-200 bg-maroon-50 text-maroon-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.expired ? 'Expired' : 'Awaiting arrival'}
                    </span>
                    <p className="text-[11px] text-primary-400">
                      sent {formatDate(item.returnedAt)}
                      {waitingDays(item.returnedAt) > 0
                        ? ` · ${waitingDays(item.returnedAt)}d waiting`
                        : ''}
                    </p>
                  </div>
                </div>

                {selectedReturn && selectedReturn.batchId === item.batchId ? (
                  <form
                    onSubmit={submitReturn}
                    className="mt-3 space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'restock', label: 'Back into usable stock', icon: RotateCcw },
                        { value: 'write_off', label: 'Write off on arrival', icon: Trash2 }
                      ].map((option) => {
                        const disabled = !item.allowedOutcomes.includes(option.value);
                        const active = returnForm.outcome === option.value;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setReturnForm((current) => ({ ...current, outcome: option.value }))
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                              active
                                ? 'border-primary-400 bg-white text-primary-900'
                                : 'border-sand-300 bg-white text-primary-600 hover:text-primary-900'
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {item.expired ? (
                      <p className="rounded-lg border border-maroon-200 bg-maroon-50 px-3 py-2 text-[11px] text-maroon-700">
                        This lot expired before it arrived, so it can only be written off.
                      </p>
                    ) : null}

                    <Input
                      label="Note"
                      name="returnNote"
                      value={returnForm.note}
                      placeholder="What you found when it arrived"
                      onChange={(event) =>
                        setReturnForm((current) => ({ ...current, note: event.target.value }))
                      }
                    />

                    {returnError ? (
                      <p className="text-xs font-medium text-maroon-600">{returnError}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" loading={returnSaving}>
                        Sign it in
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReturnId(null);
                          setReturnForm(emptyReceipt);
                          setReturnError('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {history.length > 0 ? (
        <Card padded={false}>
          <div className="flex items-center gap-2 border-b border-sand-200 px-4 py-3 sm:px-5">
            <AlertTriangle className="h-4 w-4 text-primary-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary-900">Recent decisions</p>
          </div>
          <ul className="divide-y divide-sand-100">
            {history.map((record) => (
              <li key={record.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {record.drugName}
                  </p>
                  <p className="truncate text-xs text-primary-500">
                    {formatQuantity(record.quantity)} {record.unitOfMeasure} · {record.batchNumber}
                    {record.sourceReference ? ` · from ${record.sourceReference}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-primary-500">
                    agreed with {record.agreedWithName} · {record.note}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-primary-700">
                    {titleCase(record.disposition)}
                  </p>
                  <p className="text-[11px] text-primary-400">
                    {record.disposition === 'written_off'
                      ? record.lossBearer === 'sender'
                        ? 'sender replaces'
                        : 'facility accepts'
                      : record.disposition === 'returned'
                        ? record.returnStatus === 'received'
                          ? `signed in · ${titleCase(record.returnOutcome || '')}`
                          : `in transit to ${record.returnToName || 'the sender'}`
                        : 'back in use'}
                  </p>
                  <p className="text-[11px] text-primary-400">
                    {record.recordedByName} · {formatDateTime(record.recordedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
