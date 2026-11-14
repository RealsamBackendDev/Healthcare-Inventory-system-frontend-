import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const tones = {
  neutral: 'bg-primary-50 text-primary-600',
  success: 'bg-leaf-50 text-primary-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-maroon-50 text-maroon-600'
};

export default function KpiCard({ label, value, hint, icon: Icon, tone = 'neutral', to }) {
  const content = (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500">
          {label}
        </p>
        {Icon ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight tracking-tight text-primary-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-primary-500">{hint}</p> : null}
      </div>
      {to ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
          View
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );

  const className =
    'surface block p-4 transition hover:border-primary-200 hover:shadow-lift sm:p-5';

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
