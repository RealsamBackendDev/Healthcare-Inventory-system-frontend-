import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDate, formatDateTime, formatQuantity } from '../../utils/format.js';

export default function DeliveryNotePage() {
  const { dispatchId } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.getDispatchDelivery(dispatchId);
      setDelivery(result);
    } catch (loadError) {
      setError(loadError.message || 'The delivery note could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [dispatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = delivery?.items || [];
  const totals = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate('/deliveries')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to deliveries
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!delivery || loading}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </Button>
      </div>

      {error ? (
        <Alert tone="error" className="print:hidden">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-xs text-primary-400 print:hidden">
          Preparing the delivery note…
        </p>
      ) : null}

      {!loading && delivery ? (
        <article className="rounded-2xl border border-sand-200 bg-white p-5 print:rounded-none print:border-0 print:p-0">
          <header className="border-b-2 border-primary-800 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-500">
              Delivery note
            </p>
            <h1 className="mt-1 text-lg font-bold text-primary-900">{delivery.centreName}</h1>
            <p className="text-xs text-primary-500">
              {delivery.centreCode ? `Centre code ${delivery.centreCode}` : 'Health facility'}
            </p>
          </header>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                Dispatch number
              </dt>
              <dd className="font-semibold text-primary-900">{delivery.dispatchNumber}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                Date
              </dt>
              <dd className="text-primary-800">{formatDateTime(delivery.dispatchedAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                Sent by
              </dt>
              <dd className="text-primary-800">{delivery.dispatchedByName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                Items
              </dt>
              <dd className="text-primary-800">{items.length}</dd>
            </div>
          </dl>

          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-800 text-left align-bottom">
                <th className="py-1.5 pr-2 font-semibold text-primary-800">#</th>
                <th className="py-1.5 pr-2 font-semibold text-primary-800">Drug</th>
                <th className="py-1.5 pr-2 font-semibold text-primary-800">Batch</th>
                <th className="py-1.5 pr-2 font-semibold text-primary-800">Expiry</th>
                <th className="py-1.5 text-right font-semibold text-primary-800">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-sand-200 align-top">
                  <td className="py-1.5 pr-2 text-primary-400">{index + 1}</td>
                  <td className="py-1.5 pr-2">
                    <span className="font-semibold text-primary-900">{item.drugName}</span>
                    {item.drugCode ? (
                      <span className="block text-[10px] text-primary-400">{item.drugCode}</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 text-primary-800">{item.batchNumber || '—'}</td>
                  <td className="py-1.5 pr-2 text-primary-800">{formatDate(item.expiryDate)}</td>
                  <td className="py-1.5 text-right font-semibold text-primary-900">
                    {formatQuantity(item.quantity)}
                    {item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-primary-400">
                    This dispatch has no lines.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-2 text-right font-semibold text-primary-800">
                  Total
                </td>
                <td className="pt-2 text-right text-sm font-bold text-primary-900">
                  {formatQuantity(totals)}
                </td>
              </tr>
            </tfoot>
          </table>

          {delivery.notes ? (
            <p className="mt-3 rounded-lg bg-sand-100 px-3 py-2 text-[11px] text-primary-600 print:bg-transparent print:px-0">
              {delivery.notes}
            </p>
          ) : null}

          <div className="mt-8 grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="font-semibold text-primary-800">Delivered by</p>
              <p className="mt-6 border-t border-primary-400 pt-1 text-[11px] text-primary-500">
                {delivery.dispatchedByName || 'Name and signature'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-primary-800">Received by</p>
              <p className="mt-6 border-t border-primary-400 pt-1 text-[11px] text-primary-500">
                Name, signature and date
              </p>
            </div>
          </div>

          <p className="mt-6 border-t border-sand-200 pt-2 text-[10px] text-primary-400">
            Check every line against the goods before signing. Record damaged or missing quantities on
            the Deliveries screen so the warehouse can follow up.
          </p>
        </article>
      ) : null}
    </div>
  );
}
