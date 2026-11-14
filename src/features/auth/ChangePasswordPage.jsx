import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function ChangePasswordPage() {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (form.newPassword.length < 8) {
      errors.newPassword = 'Use at least 8 characters';
    }
    if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'The two passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await changePassword(form.currentPassword, form.newPassword);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'The password could not be changed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary-900">Change password</h1>
            <p className="text-xs text-primary-500">
              Signed in as {user?.email || 'your account'}
            </p>
          </div>
        </div>

        {user?.mustChangePassword ? (
          <Alert tone="warning" className="mt-5">
            Your account still uses its first password. Set a new one to continue.
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={updateField('currentPassword')}
            required
          />

          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            value={form.newPassword}
            onChange={updateField('newPassword')}
            error={fieldErrors.newPassword}
            required
          />

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={updateField('confirmPassword')}
            error={fieldErrors.confirmPassword}
            required
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" loading={submitting} className="sm:flex-1">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Saving' : 'Save new password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
