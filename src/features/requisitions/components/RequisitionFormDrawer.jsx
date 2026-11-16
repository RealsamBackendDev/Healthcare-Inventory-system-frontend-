import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import Input from '../../../components/ui/Input.jsx';
import { createRequisition, updateRequisition } from '../../../services/requisitions.service.js';
import { listDrugs } from '../../../services/drugs.service.js';
import { formatQuantity } from '../../../utils/format.js';

export default function RequisitionFormDrawer({ open, onClose, onSaved, requisition }) {
  const isEditing = Boolean(requisition);
  const [drugs, setDrugs] = useState([]);
  const [search, setSearch] = useState('');
  const [pickedDrugId, setPickedDrugId] = useState('');
  const [editingDrugId, setEditingDrugId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError('');
    setNotes(requisition?.notes || '');
    setSearch('');
    setPickedDrugId('');
    setQuantity('');
    setSelected(
      requisition && requisition.items?.length > 0
        ? requisition.items.map((item) => ({
            drugId: item.drugId,
            name: item.drugName,
            code: item.drugCode,
            unitOfMeasure: item.unitOfMeasure,
            quantity: Number(item.requestedQuantity)
          }))
        : []
    );

    listDrugs({ status: 'active', pageSize: 100 })
      .then((result) => setDrugs(result.items || []))
      .catch(() => setDrugs([]));
  }, [open, requisition]);

  const pickedDrug = drugs.find((drug) => drug.id === pickedDrugId) || null;

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || pickedDrug) {
      return [];
    }
    return drugs
      .filter(
        (drug) =>
          drug.name.toLowerCase().includes(term) || drug.code.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [drugs, search, pickedDrug]);

  const chooseDrug = (drug) => {
    setPickedDrugId(drug.id);
    setSearch(`${drug.name} (${drug.code})`);
    setError('');
  };

  const clearDrug = () => {
    setPickedDrugId('');
    setEditingDrugId('');
    setSearch('');
    setQuantity('');
  };

  const startEdit = (item) => {
    setPickedDrugId(item.drugId);
    setEditingDrugId(item.drugId);
    setSearch(`${item.name} (${item.code})`);
    setQuantity(String(item.quantity));
    setError('');
  };

  const addItem = () => {
    if (!pickedDrug) {
      setError('Search for a drug and pick it from the list first.');
      return;
    }
    const amount = Number(quantity);
    if (!amount || amount <= 0) {
      setError('Enter a quantity greater than zero for this drug.');
      return;
    }
    if (editingDrugId) {
      setSelected((current) =>
        current.map((item) =>
          item.drugId === editingDrugId ? { ...item, quantity: amount } : item
        )
      );
      setError('');
      clearDrug();
      return;
    }
    const existing = selected.find((item) => item.drugId === pickedDrug.id);
    if (existing) {
      setSelected((current) =>
        current.map((item) =>
          item.drugId === pickedDrug.id
            ? { ...item, quantity: Number(item.quantity) + amount }
            : item
        )
      );
    } else {
      setSelected((current) => [
        ...current,
        {
          drugId: pickedDrug.id,
          name: pickedDrug.name,
          code: pickedDrug.code,
          unitOfMeasure: pickedDrug.unitOfMeasure,
          quantity: amount
        }
      ]);
    }
    setError('');
    clearDrug();
  };

  const removeItem = (drugId) =>
    setSelected((current) => current.filter((item) => item.drugId !== drugId));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selected.length === 0) {
      setError('Add at least one drug to the requisition.');
      return;
    }

    const payload = {
      notes: notes.trim() || null,
      items: selected.map((item) => ({
        drugId: item.drugId,
        requestedQuantity: Number(item.quantity)
      }))
    };

    setSaving(true);
    setError('');
    try {
      const result = isEditing
        ? await updateRequisition(requisition.id, payload)
        : await createRequisition(payload);
      onSaved(result);
    } catch (submitError) {
      setError(submitError.message || 'The requisition could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${requisition.requisitionNumber}` : 'New requisition'}
      subtitle={isEditing ? 'Only drafts can be edited' : 'Saved as a draft you can review later'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/60 p-3">
          <h3 className="text-sm font-bold text-primary-900">Add a drug</h3>

          <div className="relative">
            <label className="field-label" htmlFor="requisition-drug-search">
              Drug
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                aria-hidden="true"
              />
              <input
                id="requisition-drug-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPickedDrugId('');
                }}
                placeholder="Type a drug name or code"
                autoComplete="off"
                className="field pl-9 pr-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={clearDrug}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Quantity needed"
                name="requisition-quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  if (error) {
                    setError('');
                  }
                }}
                placeholder="0"
              />
            </div>
            <Button type="button" variant="accent" size="md" onClick={addItem} className="sm:w-32">
              {editingDrugId ? (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {editingDrugId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-primary-900">
            Drugs requested {selected.length > 0 ? `(${selected.length})` : ''}
          </h3>

          {selected.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand-300 px-3 py-6 text-center text-xs text-primary-400">
              Nothing added yet. Search above, enter a quantity and tap Add.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200 bg-white">
              {selected.map((item) => (
                <li key={item.drugId} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-800">{item.name}</p>
                    <p className="text-[11px] text-primary-400">
                      {item.code} · {formatQuantity(item.quantity)} {item.unitOfMeasure}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label={`Edit ${item.name}`}
                      className="rounded-lg p-1.5 text-primary-600 transition hover:bg-primary-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.drugId)}
                      aria-label={`Remove ${item.name}`}
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

        <div>
          <label className="field-label" htmlFor="requisition-notes">
            Notes
          </label>
          <textarea
            id="requisition-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional context for the reviewer"
            className="field resize-none"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving' : isEditing ? 'Save changes' : 'Create draft'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
