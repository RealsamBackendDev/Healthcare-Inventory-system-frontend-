import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDate, formatDateTime, formatQuantity } from '../../utils/format.js';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listIncomingTransfers();
      setTransfers(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Transfers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openTransfer = async (transferId) => {
    setSelectedId(transferId);
    setDetailLoading(true);
    setError('');
    try {
      const result = await lgService.getIncomingTransfer(transferId);
      setTransfer(result);
      setNote('');
    } catch (loadError) {
      setError(loadError.message || 'The transfer could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReceive = async () => {
    setReceiving(true);
    setError('');
    setNotice('');
    try {
      const result = await lgService.receiveTransfer(selectedId, note || null);
      setNotice(`Transfer ${result.transferNumber} received into your store.`);
      setTransfer(null);
      setSelectedId(null);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The transfer could not be received.');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Transfers</h1>
          <p className="text-xs text-primary-500">
            Stock being moved here from another facility in your local government
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {transfers.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openTransfer(item.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    selectedId === item.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <p className="text-sm font-semibold text-primary-800">{item.transferNumber}</p>
                  <p className="text-xs text-primary-500">From {item.fromCentreName}</p>
                  <p className="text-xs text-primary-400">
                    {formatQuantity(item.totalQuantity)} units · {formatDateTime(item.createdAt)}
                  </p>
                </button>
              </li>
            ))}
            {!loading && transfers.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                No transfers are on the way to your facility.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-4">
          {!transfer ? (
            <p className="py-10 text-center text-xs text-primary-400">
              {detailLoading ? 'Loading…' : 'Pick a transfer to see what is coming.'}
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-primary-900">{transfer.transferNumber}</p>
              <p className="text-xs text-primary-500">
                From {transfer.fromCentreName} · sent by {transfer.createdByName}
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                      <th className="py-1 pr-3">Drug</th>
                      <th className="py-1 pr-3">Batch</th>
                      <th className="py-1 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {transfer.items.map((item) => (
                      <tr key={`${item.drugId}-${item.batchNumber}`}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-primary-800">{item.name}</p>
                          <p className="text-xs text-primary-400">{item.code}</p>
                        </td>
                        <td className="py-2 pr-3 text-xs text-primary-600">
                          {item.batchNumber}
                          {item.expiryDate ? ` · exp ${formatDate(item.expiryDate)}` : ''}
                        </td>
                        <td className="py-2 text-right font-semibold text-primary-800">
                          {formatQuantity(item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs font-semibold text-primary-700">
                {formatQuantity(transfer.totalQuantity)} units in total
              </p>

              <div className="mt-3">
                <Input
                  label="Note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note when confirming"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={handleReceive} loading={receiving}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Confirm received
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
