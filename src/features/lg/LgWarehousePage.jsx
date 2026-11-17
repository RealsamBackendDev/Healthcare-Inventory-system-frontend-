import { useCallback, useEffect, useState } from 'react';
import { PackagePlus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity } from '../../utils/format.js';

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouse, history] = await Promise.all([
        lgService.getWarehouse({ search: search || undefined }),
        lgService.listReceipts()
      ]);
      setData(warehouse);
      setReceipts(history || []);
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

    setSaving(true);
    try {
      const result = await lgService.createReceipt({
        supplierName: supplierName || null,
        supplierReference: supplierReference || null,
        notes: notes || null,
        items
      });
      setNotice(`Stock received as ${result.receiptNumber}.`);
      resetForm();
      setShowForm(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'The stock could not be received.');
    } finally {
      setSaving(false);
    }
  };

  const items = data?.items || [];
  const drugs = items.map((item) => ({ id: item.drugId, label: `${item.drugName} (${item.drugCode})` }));

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
