import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const tones = {
  error: {
    wrapper: 'border-maroon-200 bg-maroon-50 text-maroon-700',
    icon: XCircle
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle
  },
  success: {
    wrapper: 'border-leaf-200 bg-leaf-50 text-primary-700',
    icon: CheckCircle2
  },
  info: {
    wrapper: 'border-primary-200 bg-primary-50 text-primary-700',
    icon: Info
  }
};

export default function Alert({ tone = 'info', title, children, className = '' }) {
  const { wrapper, icon: Icon } = tones[tone] || tones.info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${wrapper} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
