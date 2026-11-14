import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import Input from '../../../components/ui/Input.jsx';
import { createReturn } from '../../../services/adjustments.service.js';
import { listDrugs } from '../../../services/drugs.service.js';
import { getDrugInventory } from '../../../services/inventory.service.js';
import { formatDate, formatQuantity } from '../../../utils/format.js';

const dispositions = [
  { value: 'return_to_supplier', label: 'Return to supplier' },
  { value: 'quarantined', label: 'Quarantine' },
  { value: 'blocked', label: 'Block from use' },
  { value: 'destroyed', label: 'Destroy' },
  { value: 'restock_usable', label: 'Return to usable stock' }
];

let itemKey = 0;
const nextKey = () => {
  itemKey += 1;
  return itemKey;
};
const emptyItem = () => ({
  key: nextKey(),
  drugId: '',
  batchId: '',
  quantity: '',
  disposition: 'return_to_supplier'
});

export default function ReturnFormDrawer({ open, onClose, onSaved }) {
  const [drugs, setDrugs] = useState([]);
  const [batchesByDrug, setBatchesByDrug] = useState({});
  const [items, setItems] = useState([emptyItem()]);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems([emptyItem()]);
    setReason('');
    setReference('');
    setError('');
    setBatchesByDrug({});
    listDrugs({ status: 'active', pageSize: 100 })
      .then((result) => setDrugs(result.items || []))
      .catch(() => setDrugs([]));
  }, [open]);

  const loadBatches = async (drugId) => {
    if (!drugId || batchesByDrug[drugId]) {
      return;
    }
    try {
      const data = await getDrugInventory(drugId, 90);
      setBatchesByDrug((current) => ({ ...current, [drugId]: data.batches || [] }));
    } catch (loadError) {
      setError(loadError.message || 'Batches could not be loaded.');
    }
  };

  const updateItem = (key, field) => (event) => {
    const value = event.target.value;
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, [field]: value, ...(field === 'drugId' ? { batchId: '' } : {}) }
          : item
      )
    );
    if (error) {
      setError('');
    }
    if (field === 'drugId') {
      loadBatches(value);
    }
  };

  const addItem = () => setItems((current) => [...current, emptyItem()]);
  const removeItem = (key) =>
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required.');
      return;
    }

    const valid = items.filter((item) => item.batchId);
    if (valid.length === 0) {
      setError('Select at least one batch to return.');
      return;
    }

    const badQuantity = valid.find((item) => !(Number(item.quantity) > 0));
    if (badQuantity) {
      setError('Every selected batch needs a quantity greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await createReturn({
        reason: reason.trim(),
        reference: reference.trim() || null,
        items: valid.map((item) => ({
          batchId: item.batchId,
          quantity: Number(item.quantity),
          disposition: item.disposition
        }))
      });
      onSaved(result);
    } catch (submitError) {
      setError(submitError.message || 'The return request could not be created.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New return request"
      subtitle="Removing stock from a batch needs approval"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Input
          label="Reason"
          name="returnReason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Damaged in transit"
        />
        <Input
          label="Reference"
          name="returnReference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Optional"
        />

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-primary-900">Batches to return</h3>

          {items.map((item, index) => {
            const batches = batchesByDrug[item.drugId] || [];
            const batch = batches.find((option) => option.id === item.batchId);
            return (
              <div key={item.key} className="rounded-xl border border-sand-200 bg-sand-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
                    Item {index + 1}
                  </p>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-maroon-600 transition hover:bg-maroon-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="field-label" htmlFor={`return-drug-${item.key}`}>
                      Drug
                    </label>
                    <select
                      id={`return-drug-${item.key}`}
                      value={item.drugId}
                      onChange={updateItem(item.key, 'drugId')}
                      className="field"
                    >
                      <option value="">Select a drug</option>
                      {drugs.map((drug) => (
                        <option key={drug.id} value={drug.id}>
                          {drug.name} ({drug.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`return-batch-${item.key}`}>
                      Batch
                    </label>
                    <select
                      id={`return-batch-${item.key}`}
                      value={item.batchId}
                      onChange={updateItem(item.key, 'batchId')}
                      className="field"
                      disabled={!item.drugId || batches.length === 0}
                    >
                      <option value="">
                        {item.drugId && batches.length === 0 ? 'No batches' : 'Select a batch'}
                      </option>
                      {batches
                        .filter((option) => Number(option.quantity) > 0)
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.batchNumber} — {formatQuantity(option.quantity)} on hand, expires{' '}
                            {formatDate(option.expiryDate)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Quantity"
                      name={`return-quantity-${item.key}`}
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={updateItem(item.key, 'quantity')}
                      placeholder="0"
                      hint={
                        batch
                          ? `Max ${formatQuantity(batch.quantity)} ${batch.unitOfMeasure}`
                          : undefined
                      }
                    />
                    <div>
                      <label className="field-label" htmlFor={`return-disposition-${item.key}`}>
                        Disposition
                      </label>
                      <select
                        id={`return-disposition-${item.key}`}
                        value={item.disposition}
                        onChange={updateItem(item.key, 'disposition')}
                        className="field"
                      >
                        {dispositions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another batch
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving' : 'Submit return request'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
