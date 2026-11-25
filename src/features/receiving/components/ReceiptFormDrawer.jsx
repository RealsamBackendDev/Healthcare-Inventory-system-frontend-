import { useEffect, useMemo, useState } from 'react';
import { PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import Input from '../../../components/ui/Input.jsx';
import { createReceipt } from '../../../services/receiving.service.js';
import { listDrugs } from '../../../services/drugs.service.js';
import { formatCurrency, formatDate, formatQuantity } from '../../../utils/format.js';

const emptyDraft = { batchNumber: '', quantity: '', expiryDate: '', unitCost: '', supplierReference: '' };
const defaultHeader = { supplier: '', receiptReference: '', receivedDate: '', note: '' };
const keyOf = (item) => `${item.drugId}::${item.batchNumber.trim().toLowerCase()}`;

export default function ReceiptFormDrawer({ open, onClose, onSaved }) {
  const [drugs, setDrugs] = useState([]);
  const [header, setHeader] = useState(defaultHeader);
  const [search, setSearch] = useState('');
  const [pickedDrugId, setPickedDrugId] = useState('');
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [editingKey, setEditingKey] = useState('');
  const [items, setItems] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestKey, setRequestKey] = useState('');
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setHeader(defaultHeader);
    setSearch('');
    setPickedDrugId('');
    setDraft({ ...emptyDraft });
    setEditingKey('');
    setItems([]);
    setFieldErrors({});
    setRowErrors({});
    setRequestKey('');
    setError('');

    let active = true;
    setLoadingDrugs(true);
    listDrugs({ status: 'active', pageSize: 100 })
      .then((result) => {
        if (active) {
          setDrugs(result.items || []);
        }
      })
      .catch(() => {
        if (active) {
          setDrugs([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDrugs(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  const pickedDrug = drugs.find((drug) => drug.id === pickedDrugId) || null;

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || pickedDrug) {
      return [];
    }
    return drugs
      .filter((drug) => drug.name.toLowerCase().includes(term) || drug.code.toLowerCase().includes(term))
      .slice(0, 8);
  }, [drugs, search, pickedDrug]);

  const updateHeader = (field) => (event) => {
    setHeader((current) => ({ ...current, [field]: event.target.value }));
    if (error) {
      setError('');
    }
  };

  const updateDraft = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (error) {
      setError('');
    }
  };

  const chooseDrug = (drug) => {
    setPickedDrugId(drug.id);
    setSearch(`${drug.name} (${drug.code})`);
    setFieldErrors((current) => ({ ...current, drugId: undefined }));
    setError('');
  };

  const clearDraft = () => {
    setPickedDrugId('');
    setEditingKey('');
    setSearch('');
    setDraft({ ...emptyDraft });
  };

  const startEdit = (item) => {
    setPickedDrugId(item.drugId);
    setEditingKey(keyOf(item));
    setSearch(`${item.name} (${item.code})`);
    setDraft({
      batchNumber: item.batchNumber,
      quantity: String(item.quantity),
      expiryDate: item.expiryDate || '',
      unitCost: item.unitCost === null ? '' : String(item.unitCost),
      supplierReference: item.supplierReference || ''
    });
    setFieldErrors({});
    setError('');
  };

  const addItem = () => {
    const errors = {};
    if (!pickedDrug) {
      errors.drugId = 'Search for a drug and pick it from the list first';
    }
    if (!draft.batchNumber.trim()) {
      errors.batchNumber = 'Batch number is required';
    }
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.quantity = 'Enter a quantity above zero';
    }
    if (draft.unitCost !== '' && Number(draft.unitCost) < 0) {
      errors.unitCost = 'Unit cost cannot be negative';
    }

    const candidate = pickedDrug
      ? {
          drugId: pickedDrug.id,
          name: pickedDrug.name,
          code: pickedDrug.code,
          unitOfMeasure: pickedDrug.unitOfMeasure,
          batchNumber: draft.batchNumber.trim(),
          quantity,
          expiryDate: draft.expiryDate || null,
          unitCost: draft.unitCost === '' ? null : Number(draft.unitCost),
          supplierReference: draft.supplierReference.trim() || null
        }
      : null;

    const clash =
      candidate &&
      !errors.batchNumber &&
      items.some((item) => keyOf(item) === keyOf(candidate) && keyOf(item) !== editingKey);
    if (clash) {
      errors.batchNumber = 'This drug and batch is already in the list';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setItems((current) =>
      editingKey
        ? current.map((item) => (keyOf(item) === editingKey ? candidate : item))
        : [...current, candidate]
    );
    setFieldErrors({});
    setRowErrors({});
    setError('');
    clearDraft();
  };

  const removeItem = (key) => {
    setItems((current) => current.filter((item) => keyOf(item) !== key));
    setRowErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
    if (editingKey === key) {
      clearDraft();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (items.length === 0) {
      setError('Add at least one batch before saving the receipt.');
      return;
    }

    const key = requestKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    setRequestKey(key);
    const payload = {
      clientRequestId: key,
      supplier: header.supplier.trim() || null,
      receiptReference: header.receiptReference.trim() || null,
      receivedDate: header.receivedDate || null,
      note: header.note.trim() || null,
      items: items.map((item) => ({
        drugId: item.drugId,
        batchNumber: item.batchNumber,
        quantity: Number(item.quantity),
        expiryDate: item.expiryDate || null,
        unitCost: item.unitCost,
        receivedDate: header.receivedDate || null,
        supplierReference: item.supplierReference
      }))
    };

    setSaving(true);
    setError('');
    try {
      const result = await createReceipt(payload);
      setRequestKey('');
      onSaved(result);
    } catch (submitError) {
      setError(submitError.message || 'The receipt could not be saved.');
      const failedRows = {};
      (submitError.details || []).forEach((detail) => {
        const match = /^items\.(\d+)\./.exec(detail.field || '');
        const item = match ? items[Number(match[1])] : null;
        if (item) {
          failedRows[keyOf(item)] = detail.message || 'Check this batch';
        }
      });
      setRowErrors(failedRows);
      if (Object.keys(failedRows).length > 0) {
        listDrugs({ status: 'active', pageSize: 100 })
          .then((result) => setDrugs(result.items || []))
          .catch(() => setDrugs([]));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Record a receipt" subtitle="Add stock one batch at a time">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Supplier"
            name="supplier"
            value={header.supplier}
            onChange={updateHeader('supplier')}
            placeholder="State medical store"
          />
          <Input
            label="Received date"
            name="receivedDate"
            type="date"
            value={header.receivedDate}
            onChange={updateHeader('receivedDate')}
          />
          <Input
            label="Receipt reference"
            name="receiptReference"
            value={header.receiptReference}
            onChange={updateHeader('receiptReference')}
            placeholder="Leave blank to generate"
          />
          <Input label="Note" name="note" value={header.note} onChange={updateHeader('note')} placeholder="Optional" />
        </div>

        <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/60 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary-900">{editingKey ? 'Edit batch' : 'Add a batch'}</h3>
            <span className="text-xs text-primary-500">
              {loadingDrugs ? 'Loading drugs…' : `${drugs.length} active drugs`}
            </span>
          </div>

          <div className="relative">
            <label className="field-label" htmlFor="receipt-drug-search">
              Drug
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                aria-hidden="true"
              />
              <input
                id="receipt-drug-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPickedDrugId('');
                  setFieldErrors((current) => ({ ...current, drugId: undefined }));
                  if (error) {
                    setError('');
                  }
                }}
                placeholder="Type a drug name or code"
                autoComplete="off"
                className="field pl-9 pr-9"
                disabled={loadingDrugs}
              />
              {search ? (
                <button
                  type="button"
                  onClick={clearDraft}
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

            {fieldErrors.drugId ? (
              <p className="mt-1.5 text-xs font-medium text-maroon-600">{fieldErrors.drugId}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Batch number"
              name="receipt-batch"
              value={draft.batchNumber}
              onChange={updateDraft('batchNumber')}
              placeholder="B-2026-01"
              error={fieldErrors.batchNumber}
            />
            <Input
              label="Quantity"
              name="receipt-quantity"
              type="number"
              min="0"
              step="any"
              value={draft.quantity}
              onChange={updateDraft('quantity')}
              placeholder="0"
              error={fieldErrors.quantity}
            />
            <Input
              label="Expiry date"
              name="receipt-expiry"
              type="date"
              value={draft.expiryDate}
              onChange={updateDraft('expiryDate')}
            />
            <Input
              label="Unit cost (₦)"
              name="receipt-cost"
              type="number"
              min="0"
              step="0.01"
              value={draft.unitCost}
              onChange={updateDraft('unitCost')}
              placeholder="Optional"
              error={fieldErrors.unitCost}
            />
            <Input
              label="Supplier reference"
              name="receipt-supplier-reference"
              value={draft.supplierReference}
              onChange={updateDraft('supplierReference')}
              placeholder="Optional"
              className="sm:col-span-2"
            />
          </div>

          <Button type="button" variant="accent" size="md" onClick={addItem} className="w-full">
            {editingKey ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {editingKey ? 'Update batch' : 'Add'}
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-primary-900">
            Batches added {items.length > 0 ? `(${items.length})` : ''}
          </h3>

          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand-300 px-3 py-6 text-center text-xs text-primary-400">
              Nothing added yet. Search above, fill the batch details and tap Add.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200 bg-white">
              {items.map((item) => (
                <li key={keyOf(item)} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-800">{item.name}</p>
                    <p className="text-[11px] text-primary-400">
                      {item.code} · {item.batchNumber} · {formatQuantity(item.quantity)} {item.unitOfMeasure}
                    </p>
                    <p className="text-[11px] text-primary-400">
                      Expires {formatDate(item.expiryDate)}
                      {item.unitCost === null ? '' : ` · ${formatCurrency(item.unitCost)} each`}
                    </p>
                    {rowErrors[keyOf(item)] ? (
                      <p className="mt-1 text-[11px] font-semibold text-maroon-600">{rowErrors[keyOf(item)]}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label={`Edit ${item.name} batch ${item.batchNumber}`}
                      className="rounded-lg p-1.5 text-primary-600 transition hover:bg-primary-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(keyOf(item))}
                      aria-label={`Remove ${item.name} batch ${item.batchNumber}`}
                      className="rounded-lg p-1.5 text-maroon-600 transition hover:bg-maroon-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving receipt' : 'Save receipt'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
