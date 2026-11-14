import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Eye,
  EyeOff,
  HandHeart
} from 'lucide-react';
import BrandMark from '../../components/common/BrandMark.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const highlights = [
  {
    icon: HandHeart,
    title: 'First-expiry-first-out dispensing',
    text: 'The oldest usable batch is issued first, with expired stock locked out automatically.'
  },
  {
    icon: CalendarClock,
    title: 'Expiry and low stock alerts',
    text: 'Batches are flagged at 90, 30 and 7 days so nothing is written off by surprise.'
  },
  {
    icon: ClipboardCheck,
    title: 'Approvals that leave a trail',
    text: 'Adjustments, returns and requisitions above threshold need an administrator approval.'
  }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const session = await login(form.email.trim(), form.password);
      if (session?.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary-800 px-12 py-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full bg-leaf-500/20 blur-3xl" />
          <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-primary-600/50 blur-3xl" />
          <div className="absolute right-12 top-1/2 h-44 w-1 rounded-full bg-maroon-400/90" />
          <div className="absolute -right-10 bottom-16 h-24 w-24 rotate-12 rounded-2xl border border-white/10" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11" tone="light" />
            <div>
              <p className="text-sm font-bold tracking-tight text-white">Health Inventory</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-200">
                Primary Care Centre
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Every dose accounted for.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-100/90">
            Stock receiving, dispensing, returns and requisitions for your centre, in one
            place and with a complete audit trail.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <li key={highlight.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-500/20 text-leaf-300">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{highlight.title}</p>
                    <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-primary-200">
                      {highlight.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.16em] text-primary-300">
          Phase 1 · Inventory and Requisition Management
        </p>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-10 w-10" />
            <div>
              <p className="text-sm font-bold tracking-tight text-primary-900">Health Inventory</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary-500">
                Primary Care Centre
              </p>
            </div>
          </div>

          <span className="inline-flex h-1 w-12 rounded-full bg-maroon-500" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-primary-600">
            Use the account issued by your health centre administrator.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {error ? <Alert tone="error">{error}</Alert> : null}

            <Input
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@healthcentre.local"
              value={form.email}
              onChange={updateField('email')}
              required
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={updateField('password')}
              required
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-lg p-2 text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
              disabled={!form.email || !form.password}
            >
              {submitting ? 'Signing in' : 'Sign in'}
              {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-primary-500">
            Sessions expire after 8 hours. If you have forgotten your password, ask an
            administrator to reset it for you.
          </p>
        </div>
      </section>
    </div>
  );
}
