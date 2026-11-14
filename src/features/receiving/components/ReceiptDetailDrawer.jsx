import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import { getReceipt } from '../../../services/receiving.service.js';
import { formatCurrency, formatDate, formatDateTime, formatQuantity } from '../../../utils/format.js';

export default function ReceiptDetailDrawer({ receiptId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      const result = await getReceipt(id);
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'The receipt could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && receiptId) {
      load(receiptId);
    }
  }, [open, receiptId, load]);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError('');
    }
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={data?.receipt?.receiptReference || 'Receipt'}
      subtitle={data?.receipt ? formatDateTime(data.receipt.createdAt) : 'Loading receipt'}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-primary-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading receipt
        </div>
      ) : null}

      {error ? (
        <Alert tone="error" title="Could not load receipt">
          {error}
        </Alert>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sand-200 bg-sand-50 p-3 text-xs leading-relaxed text-primary-600">
            <p>
              <strong className="font-semibold text-primary-900">Supplier:</strong>{' '}
              {data.receipt.supplier || '—'}
            </p>
            <p>
              <strong className="font-semibold text-primary-900">Source:</strong>{' '}
              {data.receipt.source}
            </p>
            <p>
              <strong className="font-semibold text-primary-900">Recorded by:</strong>{' '}
              {data.receipt.createdByName}
            </p>
            {data.receipt.note ? (
              <p>
                <strong className="font-semibold text-primary-900">Note:</strong>{' '}
                {data.receipt.note}
              </p>
            ) : null}
          </div>

          <ul className="space-y-2.5">
            {data.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-sand-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {item.drugName}
                    </p>
                    <p className="text-xs text-primary-500">
                      {item.drugCode} · batch {item.batchNumber}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-primary-800">
                    {formatQuantity(item.quantity)}
                    <span className="ml-1 text-[11px] font-medium text-primary-500">
                      {item.unitOfMeasure}
                    </span>
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-primary-500">
                  <span>Expiry {formatDate(item.expiryDate)}</span>
                  {item.unitCost !== null ? (
                    <span>Unit cost {formatCurrency(item.unitCost)}</span>
                  ) : null}
                  {item.supplierReference ? <span>Ref {item.supplierReference}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Drawer>
  );
}
