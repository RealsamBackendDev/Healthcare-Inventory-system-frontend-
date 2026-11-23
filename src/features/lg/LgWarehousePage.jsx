import { useCallback, useEffect, useState } from 'react';
import { PackageCheck, PackagePlus, Plus, RefreshCw, RotateCcw, Trash2, Truck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity, titleCase } from '../../utils/format.js';

const emptyLine = () => ({
  drugId: '',
  batchNumber: '',
  expiryDate: '',
  quantity: '',
  unitCost: ''
});

export default function LgWarehousePage() {
  const { hasPermission } = useAuth();
  const canReceive = hasPermission(PERMISSIONS.WAREHOUSE_RECEIVE);

  const [data, setData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [check, setCheck] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [requestKey, setRequestKey] = useState('');

  const [returns, setReturns] = useState(null);
  const [returnId, setReturnId] = useState(null);
  const [returnForm, setReturnForm] = useState({ outcome: 'restock', note: '' });
  const [returnError, setReturnError] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouse, history, ledgerCheck, movementList, returnList] = await Promise.all([
        lgService.getWarehouse({ search: search || undefined }),
        lgService.listReceipts(),
        lgService.getLedgerReconciliation({ limit: 200 }).catch(() => null),
        lgService.getWarehouseMovements({ limit: 100 }).catch(() => null),
        lgService.listWarehouseReturns().catch(() => null)
      ]);
      setData(warehouse);
      setReceipts(history || []);
      setCheck(ledgerCheck);
      setLedger(movementList);
      setReturns(returnList);
    } catch (loadError) {
      setError(loadError.message || 'The warehouse could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLine = (index, field, value) => {
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, [field]: value } : line))
    );
  };

  const addLine = () => setLines((current) => [...current, emptyLine()]);

  const removeLine = (index) =>
    setLines((current) => (current.length === 1 ? [emptyLine()] : current.filter((_, position) => position !== index)));

  const resetForm = () => {
    setSupplierName('');
    setSupplierReference('');
    setNotes('');
    setLines([emptyLine()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const items = lines
      .filter((line) => line.drugId && line.batchNumber.trim() && Number(line.quantity) > 0)
      .map((line) => ({
        drugId: line.drugId,
        batchNumber: line.batchNumber.trim(),
        expiryDate: line.expiryDate || null,
        quantity: Number(line.quantity),
        unitCost: line.unitCost === '' ? null : Number(line.unitCost)
      }));

    if (items.length === 0) {
      setError('Add at least one batch with a drug, batch number and quantity.');
      return;
    }

    const key = requestKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    setRequestKey(key);

    setSaving(true);
    try {
      const result = await lgService.createReceipt({
        supplierName: supplierName || null,
        supplierReference: supplierReference || null,
        notes: notes || null,
        clientRequestId: key,
        items
      });
      setNotice(`Stock received as ${result.receiptNumber}.`);
      setRequestKey('');
      resetForm();
      setShowForm(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'The stock could not be received.');
    } finally {
      setSaving(false);
    }
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

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!returnId) {
      return;
    }
    if (returnForm.note.trim().length < 3) {
      setReturnError('Add a short note about what you found.');
      return;
    }

    setReturnError('');
    setReturnSaving(true);
    try {
      const result = await lgService.receiveWarehouseReturn(returnId, {
        outcome: returnForm.outcome,
        note: returnForm.note.trim()
      });
      setNotice(
        `${formatQuantity(result.quantity)} ${result.unitOfMeasure} of ${result.drugName} ` +
          `${result.outcome === 'restock' ? 'signed back into the warehouse' : 'written off on arrival'}.`
      );
      setReturnId(null);
      setReturnForm({ outcome: 'restock', note: '' });
      await load();
    } catch (saveError) {
      setReturnError(saveError.message || 'The return could not be signed in.');
    } finally {
      setReturnSaving(false);
    }
  };

  const returnItems = returns?.items || [];
  const items = data?.items || [];
  const drugs = items.map((item) => ({ id: item.drugId, label: `${item.drugName} (${item.drugCode})` }));

  const ledgerBatches = check?.batches || [];
  const transitBatches = ledgerBatches.filter(
    (batch) => batch.locationType === 'in_transit' && Number(batch.batchQuantity) > 0
  );
  const mismatches = ledgerBatches.filter((batch) => Math.abs(Number(batch.difference)) > 0.0005);
  const transitQuantity = transitBatches.reduce(
    (total, batch) => total + Number(batch.batchQuantity || 0),
    0
  );

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">{data?.warehouse?.name || 'LG warehouse'}</h1>
          <p className="text-xs text-primary-500">
            {data?.warehouse?.code || 'Warehouse stock'} · {items.length} drug(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          {canReceive ? (
            <Button size="sm" onClick={() => setShowForm((current) => !current)}>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              Receive stock
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      <div className="mt-4">
        <Input
          label="Search the catalogue"
          placeholder="Drug name or code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-sand-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-primary-800">Receive supplier stock</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              label="Supplier"
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              placeholder="State Medical Store"
            />
            <Input
              label="Supplier reference"
              value={supplierReference}
              onChange={(event) => setSupplierReference(event.target.value)}
              placeholder="SMS-0001"
            />
          </div>

          <div className="mt-4 space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="rounded-xl border border-sand-200 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Drug</span>
                    <select
                      className="field"
                      value={line.drugId}
                      onChange={(event) => updateLine(index, 'drugId', event.target.value)}
                    >
                      <option value="">Select a drug</option>
                      {drugs.map((drug) => (
                        <option key={drug.id} value={drug.id}>
                          {drug.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Batch number"
                    value={line.batchNumber}
                    onChange={(event) => updateLine(index, 'batchNumber', event.target.value)}
                  />
                  <Input
                    label="Expiry date"
                    type="date"
                    value={line.expiryDate}
                    onChange={(event) => updateLine(index, 'expiryDate', event.target.value)}
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                  />
                  <Input
                    label="Unit cost (₦)"
                    type="number"
                    min="0"
                    value={line.unitCost}
                    onChange={(event) => updateLine(index, 'unitCost', event.target.value)}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add batch
            </Button>
            <p className="text-xs text-primary-500">
              Post each batch exactly as it appears on the supplier delivery note.
            </p>
          </div>

          <div className="mt-3">
            <Input
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for the receipt"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Post receipt
            </Button>
          </div>
        </form>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-sand-100 text-left text-[11px] uppercase tracking-wide text-primary-500">
            <tr>
              <th className="px-4 py-3">Drug</th>
              <th className="px-4 py-3">Batches</th>
              <th className="px-4 py-3">Usable quantity</th>
              <th className="px-4 py-3">Nearest expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {items.map((item) => (
              <tr key={item.drugId}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-primary-800">{item.drugName}</p>
                  <p className="text-xs text-primary-500">{item.drugCode}</p>
                </td>
                <td className="px-4 py-3 text-primary-700">{item.batchCount}</td>
                <td className="px-4 py-3 font-semibold text-primary-800">
                  {formatQuantity(item.usableQuantity)} {item.unitOfMeasure}
                </td>
                <td className="px-4 py-3 text-primary-600">{formatDate(item.nearestExpiry)}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-primary-400">
                  The warehouse has no stock yet. Receive supplier stock to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-primary-800">Returns in transit</h2>
              <p className="text-xs text-primary-500">
                Damaged stock sent back by a facility, waiting to be signed in
              </p>
            </div>
          </div>
          <p className="text-[11px] text-primary-500">
            {returns ? `${formatQuantity(returns.totalQuantity)} units` : 'Loading'}
          </p>
        </div>

        <ul className="divide-y divide-sand-100">
          {returnItems.map((item) => (
            <li key={item.batchId} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary-800">{item.drugName}</p>
                  <p className="text-xs text-primary-500">
                    {item.batchNumber} · expires {formatDate(item.expiryDate)} ·{' '}
                    {formatQuantity(item.quantity)} {item.unitOfMeasure}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-primary-600">
                    back from {item.fromCentreName}
                    {item.supplierReference ? ` · ${item.supplierReference}` : ''}
                  </p>
                  {item.agreedWithName || item.note ? (
                    <p className="mt-0.5 text-[11px] text-primary-500">
                      {item.agreedWithName ? `agreed with ${item.agreedWithName}` : 'agreement recorded'}
                      {item.note ? ` · ${item.note}` : ''}
                    </p>
                  ) : null}
                  {canReceive ? (
                    <button
                      type="button"
                      onClick={() => openReturn(item)}
                      className="mt-1.5 rounded-lg border border-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition hover:bg-primary-50"
                    >
                      Sign it back in
                    </button>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.expired
                        ? 'border-maroon-200 bg-maroon-50 text-maroon-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.expired ? 'Expired' : 'Awaiting arrival'}
                  </span>
                  <p className="text-[11px] text-primary-400">sent {formatDate(item.returnedAt)}</p>
                </div>
              </div>

              {returnId === item.batchId ? (
                <form
                  onSubmit={submitReturn}
                  className="mt-3 space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-3"
                >
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'restock', label: 'Back into the warehouse', icon: RotateCcw },
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
                      This lot expired before it came back, so it can only be written off.
                    </p>
                  ) : null}

                  <Input
                    label="Note"
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
                        setReturnForm({ outcome: 'restock', note: '' });
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
          {returns && returnItems.length === 0 ? (
            <li className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-primary-400">
              <PackageCheck className="h-4 w-4 text-leaf-400" aria-hidden="true" />
              No damaged stock is on its way back to the warehouse.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-primary-800">Warehouse ledger</h2>
            <p className="text-xs text-primary-500">Every movement in and out of the warehouse</p>
          </div>
          {ledger ? (
            <p className="text-[11px] text-primary-500">
              In {formatQuantity(ledger.totals.in)} · Out {formatQuantity(ledger.totals.out)}
            </p>
          ) : null}
        </div>
        <ul className="divide-y divide-sand-100">
          {(ledger?.movements || []).map((movement) => (
            <li key={movement.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-800">{movement.drugName}</p>
                <p className="text-xs text-primary-500">
                  {titleCase(movement.movementType.replace(/_/g, ' '))} · batch {movement.batchNumber}
                  {movement.locationName ? ` · ${movement.locationName}` : ''}
                </p>
                <p className="text-[11px] text-primary-400">
                  {formatDate(movement.createdAt)} · {movement.actorFullName}
                  {movement.reference ? ` · ${movement.reference}` : ''}
                </p>
                {movement.reason ? (
                  <p className="text-[11px] text-primary-400">{movement.reason}</p>
                ) : null}
              </div>
              <p
                className={`whitespace-nowrap text-sm font-semibold ${
                  movement.quantity >= 0 ? 'text-leaf-700' : 'text-maroon-600'
                }`}
              >
                {movement.quantity >= 0 ? '+' : ''}
                {formatQuantity(movement.quantity)} {movement.unitOfMeasure}
              </p>
            </li>
          ))}
          {ledger && ledger.movements.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-primary-400">
              No warehouse movements yet.
            </li>
          ) : null}
        </ul>
      </section>

      {check ? (
        <section className="mt-6 rounded-2xl border border-sand-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-primary-800">Stock check</h2>
              <p className="text-xs text-primary-500">
                Batch balances compared with the movement ledger
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                check.balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {check.balanced ? 'Balanced' : `${check.mismatched} to review`}
            </span>
          </div>

          <div className="px-4 py-3">
            <p className="text-xs text-primary-500">
              {formatQuantity(transitQuantity)} units in transit right now
            </p>
            {transitBatches.length > 0 ? (
              <ul className="mt-2 divide-y divide-sand-100">
                {transitBatches.map((batch) => (
                  <li
                    key={batch.batchId}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-primary-800">{batch.drugName}</p>
                      <p className="text-xs text-primary-500">
                        Batch {batch.batchNumber} · {batch.drugCode}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-primary-700">
                      {formatQuantity(batch.batchQuantity)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-primary-400">Nothing is in transit right now.</p>
            )}

            {mismatches.length > 0 ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">Batches that need review</p>
                <ul className="mt-1 space-y-1">
                  {mismatches.map((batch) => (
                    <li key={batch.batchId} className="text-xs text-amber-800">
                      {batch.drugName} · {batch.batchNumber} ({batch.locationName}):
                      {` ${formatQuantity(batch.difference)} difference`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-sand-200 bg-white">
        <div className="border-b border-sand-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-800">Recent receipts</h2>
        </div>
        <ul className="divide-y divide-sand-100">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-primary-800">{receipt.receiptNumber}</p>
                <p className="text-xs text-primary-500">
                  {receipt.supplierName || 'Supplier not stated'}
                  {receipt.supplierReference ? ` · ${receipt.supplierReference}` : ''}
                  {receipt.orderNumber ? ` · order ${receipt.orderNumber}` : ''}
                </p>
              </div>
              <div className="text-right text-xs text-primary-500">
                <p className="font-semibold text-primary-700">{formatQuantity(receipt.totalQuantity)} units</p>
                <p>{formatDate(receipt.receivedAt)}</p>
              </div>
            </li>
          ))}
          {receipts.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-primary-400">No receipts yet</li>
          ) : null}
        </ul>
      </section>
    </LgShell>
  );
}
