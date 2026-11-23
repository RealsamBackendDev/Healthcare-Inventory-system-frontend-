import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import Input from '../../../components/ui/Input.jsx';
import { createDrug, updateDrug } from '../../../services/drugs.service.js';

const emptyForm = {
  code: '',
  name: '',
  genericName: '',
  brandName: '',
  strength: '',
  dosageForm: '',
  unitOfMeasure: '',
  minimumStockLevel: '0'
};

const dosageForms = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Infusion',
  'Cream',
  'Ointment',
  'Drops',
  'Inhaler',
  'Suppository',
  'Sachet'
];

const units = ['tablet', 'capsule', 'bottle', 'vial', 'ampoule', 'sachet', 'tube', 'pack', 'ml', 'g'];

const toFormState = (drug) =>
  drug
    ? {
        code: drug.code || '',
        name: drug.name || '',
        genericName: drug.genericName || '',
        brandName: drug.brandName || '',
        strength: drug.strength || '',
        dosageForm: drug.dosageForm || '',
        unitOfMeasure: drug.unitOfMeasure || '',
        minimumStockLevel: String(drug.minimumStockLevel ?? 0)
      }
    : { ...emptyForm };

export default function DrugFormDrawer({
  open,
  drug,
  onClose,
  onSaved,
  onCreate,
  onUpdate,
  showMinimumStockLevel = true,
  catalogueLabel = 'this centre’s catalogue'
}) {
  const [form, setForm] = useState(toFormState(drug));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(drug);

  useEffect(() => {
    if (open) {
      setForm(toFormState(drug));
      setErrors({});
      setError('');
    }
  }, [open, drug]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.code.trim()) {
      nextErrors.code = 'A code is required';
    }
    if (!form.name.trim()) {
      nextErrors.name = 'A name is required';
    }
    if (!form.dosageForm.trim()) {
      nextErrors.dosageForm = 'A dosage form is required';
    }
    if (!form.unitOfMeasure.trim()) {
      nextErrors.unitOfMeasure = 'A unit of measure is required';
    }
    const minimum = Number(form.minimumStockLevel);
    if (showMinimumStockLevel && (!Number.isFinite(minimum) || minimum < 0)) {
      nextErrors.minimumStockLevel = 'Enter a number of 0 or more';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      genericName: form.genericName.trim() || null,
      brandName: form.brandName.trim() || null,
      strength: form.strength.trim() || null,
      dosageForm: form.dosageForm.trim(),
      unitOfMeasure: form.unitOfMeasure.trim()
    };
    if (showMinimumStockLevel) {
      payload.minimumStockLevel = minimum;
    }

    setSaving(true);
    setError('');
    try {
      const save = isEdit ? onUpdate || updateDrug : onCreate || createDrug;
      const saved = isEdit ? await save(drug.id, payload) : await save(payload);
      onSaved(saved, isEdit);
    } catch (submitError) {
      setError(submitError.message || 'The drug could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit drug' : 'Add drug'}
      subtitle={
        isEdit ? `${drug.code} · ${drug.name}` : `Add a drug to ${catalogueLabel}`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Drug code"
            name="code"
            value={form.code}
            onChange={updateField('code')}
            placeholder="PCM-500"
            hint="Letters, numbers, dots, dashes"
            error={errors.code}
            required
          />
          <Input
            label="Brand name"
            name="brandName"
            value={form.brandName}
            onChange={updateField('brandName')}
            placeholder="Optional"
          />
        </div>

        <Input
          label="Drug name"
          name="name"
          value={form.name}
          onChange={updateField('name')}
          placeholder="Paracetamol"
          error={errors.name}
          required
        />

        <Input
          label="Generic name"
          name="genericName"
          value={form.genericName}
          onChange={updateField('genericName')}
          placeholder="Acetaminophen"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Strength"
            name="strength"
            value={form.strength}
            onChange={updateField('strength')}
            placeholder="500 mg"
          />
          <Input
            label="Dosage form"
            name="dosageForm"
            list="dosage-forms"
            value={form.dosageForm}
            onChange={updateField('dosageForm')}
            placeholder="Tablet"
            error={errors.dosageForm}
            required
          />
          <datalist id="dosage-forms">
            {dosageForms.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Unit of measure"
            name="unitOfMeasure"
            list="units-of-measure"
            value={form.unitOfMeasure}
            onChange={updateField('unitOfMeasure')}
            placeholder="tablet"
            error={errors.unitOfMeasure}
            required
          />
          <datalist id="units-of-measure">
            {units.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          {showMinimumStockLevel ? (
            <Input
              label="Minimum stock level"
              name="minimumStockLevel"
              type="number"
              min="0"
              step="any"
              value={form.minimumStockLevel}
              onChange={updateField('minimumStockLevel')}
              error={errors.minimumStockLevel}
              hint="Low stock alerts below this level"
              required
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
          <Button type="submit" loading={saving} className="sm:flex-1">
            <Check className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving' : isEdit ? 'Save changes' : 'Add drug'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
