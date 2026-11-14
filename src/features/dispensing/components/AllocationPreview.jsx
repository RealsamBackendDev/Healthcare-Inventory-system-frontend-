import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDate, formatQuantity } from '../../../utils/format.js';

const sortForFefo = (batches) =>
  [...batches].sort((left, right) => {
    const leftExpiry = left.expiryDate ? new Date(left.expiryDate).getTime() : Infinity;
    const rightExpiry = right.expiryDate ? new Date(right.expiryDate).getTime() : Infinity;
    if (leftExpiry !== rightExpiry) {
      return leftExpiry - rightExpiry;
    }
    return left.batchNumber.localeCompare(right.batchNumber);
  });

export default function AllocationPreview({ batches, quantity, unit }) {
  const requested = Number(quantity) || 0;
  const usableBatches = sortForFefo((batches || []).filter((batch) => batch.isUsable));
  const available = usableBatches.reduce((total, batch) => total + Number(batch.quantity || 0), 0);

  if (usableBatches.length === 0) {
    return (
      <p className="mt-2 rounded-lg bg-maroon-50 px-2.5 py-1.5 text-[11px] font-medium text-maroon-600">
        No usable batches for this drug. Receive stock first.
      </p>
    );
  }

  let remaining = requested;
  const plan = [];

  for (const batch of usableBatches) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(remaining, Number(batch.quantity));
    if (take > 0) {
      plan.push({ batch, take });
      remaining = Number((remaining - take).toFixed(6));
    }
  }

  const short = requested > 0 && remaining > 0;

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[11px] text-primary-500">
        Usable stock: <strong className="font-semibold text-primary-800">{formatQuantity(available)}</strong>{' '}
        {unit} across {usableBatches.length} batch{usableBatches.length === 1 ? '' : 'es'}
      </p>

      {requested > 0 ? (
        <div className="rounded-lg border border-sand-200 bg-white p-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary-500">
            {short ? (
              <AlertTriangle className="h-3 w-3 text-maroon-500" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-leaf-500" aria-hidden="true" />
            )}
            FEFO plan
          </p>
          <ul className="space-y-0.5 text-[11px] text-primary-700">
            {plan.map(({ batch, take }) => (
              <li key={batch.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {batch.batchNumber} ·{' '}
                  <span className="text-primary-500">{formatDate(batch.expiryDate)}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatQuantity(take)}</span>
              </li>
            ))}
          </ul>
          {short ? (
            <p className="mt-1 text-[11px] font-medium text-maroon-600">
              Short by {formatQuantity(remaining)} {unit}. Dispensing will be refused.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
