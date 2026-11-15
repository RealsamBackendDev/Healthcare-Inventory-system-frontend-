import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Truck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { formatDate, formatDateTime, formatQuantity } from '../../utils/format.js';

export default function DeliveriesPage() {
  const { activeCentre } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listIncomingDeliveries();
      setDeliveries(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Deliveries could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDelivery = async (requisitionId) => {
    setSelectedId(requisitionId);
    setDetailLoading(true);
    setError('');
    try {
      const result = await lgService.getDelivery(requisitionId);
      setDelivery(result);
      setNote('');
    } catch (loadError) {
      setError(loadError.message || 'The delivery could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReceive = async () => {
    setReceiving(true);
    setError('');
    setNotice('');
    try {
      const result = await lgService.receiveDelivery(selectedId, note || null);
      setNotice(
        `Delivery confirmed. ${result.receivedItems.length} batch(es) added to ${activeCentre?.name || 'the store'}.`
      );
      setDelivery(null);
      setSelectedId(null);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The delivery could not be confirmed.');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Incoming deliveries</h1>
          <p className="text-xs text-primary-500">
            Stock dispatched to {activeCentre?.name || 'this facility'} by the local government
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      <section className="mt-4 rounded-2xl border border-sand-200 bg-white">
        <ul className="divide-y divide-sand-100">
          {deliveries.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openDelivery(item.requisitionId)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-primary-50 ${
                  selectedId === item.requisitionId ? 'bg-primary-50' : ''
                }`}
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary-800">
                    <Truck className="h-4 w-4 text-primary-500" aria-hidden="true" />
                    {item.dispatchNumber}
                  </p>
                  <p className="text-xs text-primary-500">
                    {item.itemCount} item(s) · {formatQuantity(item.totalQuantity)} units · dispatched by{' '}
                    {item.dispatchedByName}
                  </p>
                </div>
                <p className="text-xs text-primary-400">{formatDate(item.dispatchedAt)}</p>
              </button>
            </li>
          ))}
          {!loading && deliveries.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-primary-400">
              Nothing on the way. Dispatches from the LG warehouse appear here for confirmation.
            </li>
          ) : null}
        </ul>
      </section>

      {selectedId ? (
        <section className="mt-4 rounded-2xl border border-sand-200 bg-white p-4">
          {detailLoading || !delivery ? (
            <p className="py-6 text-center text-xs text-primary-400">Loading delivery…</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{delivery.dispatchNumber}</p>
                  <p className="text-xs text-primary-500">
                    Dispatched {formatDateTime(delivery.dispatchedAt)} by {delivery.dispatchedByName}
                  </p>
                </div>
              </div>

              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                  <tr>
                    <th className="py-2">Drug</th>
                    <th className="py-2">Batch</th>
                    <th className="py-2">Expiry</th>
                    <th className="py-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {(delivery.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">
                        <p className="font-medium text-primary-800">{item.drugName}</p>
                        <p className="text-[11px] text-primary-400">{item.drugCode}</p>
                      </td>
                      <td className="py-2 text-primary-600">{item.batchNumber}</td>
                      <td className="py-2 text-primary-600">{formatDate(item.expiryDate)}</td>
                      <td className="py-2 text-right font-semibold text-primary-800">
                        {formatQuantity(item.quantity)} {item.unitOfMeasure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3">
                <Input
                  label="Receiving note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note, e.g. two cartons damaged"
                />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedId(null);
                    setDelivery(null);
                  }}
                >
                  Close
                </Button>
                <Button onClick={handleReceive} loading={receiving}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Confirm delivery
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
