import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import Input from '../../../components/ui/Input.jsx';
import { createReceipt } from '../../../services/receiving.service.js';
import { listDrugs } from '../../../services/drugs.service.js';

const emptyItem = {
  drugId: '',
  batchNumber: '',
  quantity: '',
  expiryDate: '',
  unitCost: '',
  supplierReference: ''
};

const defaultHeader = {
  supplier: '',
  receiptReference: '',
  receivedDate: '',
  note: ''
};

export default function ReceiptFormDrawer({ open, onClose, onSaved }) {
  const [drugs, setDrugs] = useState([]);
  const [header, setHeader] = useState(defaultHeader);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setHeader(defaultHeader);
    setItems([{ ...emptyItem }]);
    setFieldErrors({});
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

  const updateHeader = (field) => (event) => {
    setHeader((current) => ({ ...current, [field]: event.target.value }));
    if (error) {
      setError('');
    }
  };

  const updateItem = (index, field) => (event) => {
    const value = event.target.value;
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
    setFieldErrors((current) => ({ ...current, [`${index}.${field}`]: undefined }));
    if (error) {
      setError('');
    }
  };

  const addItem = () => setItems((current) => [...current, { ...emptyItem }]);

  const removeItem = (index) =>
    setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    const seen = new Set();

    items.forEach((item, index) => {
      if (!item.drugId) {
        errors[`${index}.drugId`] = 'Choose a drug';
      }
      if (!item.batchNumber.trim()) {
        errors[`${index}.batchNumber`] = 'Batch number is required';
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors[`${index}.quantity`] = 'Enter a quantity above zero';
      }
      if (item.unitCost !== '' && Number(item.unitCost) < 0) {
        errors[`${index}.unitCost`] = 'Unit cost cannot be negative';
      }
      if (item.drugId && item.batchNumber.trim()) {
        const key = `${item.drugId}::${item.batchNumber.trim().toLowerCase()}`;
        if (seen.has(key)) {
          errors[`${index}.batchNumber`] = 'This drug and batch already appears above';
        }
        seen.add(key);
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Check the highlighted fields before saving.');
      return;
    }

    const payload = {
      supplier: header.supplier.trim() || null,
      receiptReference: header.receiptReference.trim() || null,
      receivedDate: header.receivedDate || null,
      note: header.note.trim() || null,
      items: items.map((item) => ({
        drugId: item.drugId,
        batchNumber: item.batchNumber.trim(),
        quantity: Number(item.quantity),
        expiryDate: item.expiryDate || null,
        unitCost: item.unitCost === '' ? null : Number(item.unitCost),
        receivedDate: header.receivedDate || null,
        supplierReference: item.supplierReference.trim() || null
      }))
    };

    setSaving(true);
    setError('');
    try {
      const result = await createReceipt(payload);
      onSaved(result);
    } catch (submitError) {
      setError(submitError.message || 'The receipt could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record a receipt"
      subtitle="Add stock as one or more drug batches"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          <Input
            label="Note"
            name="note"
            value={header.note}
            onChange={updateHeader('note')}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary-900">Items</h3>
            <span className="text-xs text-primary-500">
              {loadingDrugs ? 'Loading drugs…' : `${drugs.length} active drugs`}
            </span>
          </div>

          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-sand-200 bg-sand-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
                  Item {index + 1}
                </p>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-maroon-600 transition hover:bg-maroon-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor={`drug-${index}`}>
                    Drug
                  </label>
                  <select
                    id={`drug-${index}`}
                    value={item.drugId}
                    onChange={updateItem(index, 'drugId')}
                    className="field"
                    disabled={loadingDrugs}
                  >
                    <option value="">Select a drug</option>
                    {drugs.map((drug) => (
                      <option key={drug.id} value={drug.id}>
                        {drug.name} ({drug.code}) — {drug.unitOfMeasure}
                      </option>
                    ))}
                  </select>
                  {fieldErrors[`${index}.drugId`] ? (
                    <p className="mt-1.5 text-xs font-medium text-maroon-600">
                      {fieldErrors[`${index}.drugId`]}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Batch number"
                    name={`batch-${index}`}
                    value={item.batchNumber}
                    onChange={updateItem(index, 'batchNumber')}
                    placeholder="B-2026-01"
                    error={fieldErrors[`${index}.batchNumber`]}
                  />
                  <Input
                    label="Quantity"
                    name={`quantity-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={updateItem(index, 'quantity')}
                    placeholder="0"
                    error={fieldErrors[`${index}.quantity`]}
                  />
                  <Input
                    label="Expiry date"
                    name={`expiry-${index}`}
                    type="date"
                    value={item.expiryDate}
                    onChange={updateItem(index, 'expiryDate')}
                  />
                  <Input
                    label="Unit cost (₦)"
                    name={`cost-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitCost}
                    onChange={updateItem(index, 'unitCost')}
                    placeholder="Optional"
                    error={fieldErrors[`${index}.unitCost`]}
                  />
                  <Input
                    label="Supplier reference"
                    name={`reference-${index}`}
                    value={item.supplierReference}
                    onChange={updateItem(index, 'supplierReference')}
                    placeholder="Optional"
                    className="sm:col-span-2"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another item
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
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
