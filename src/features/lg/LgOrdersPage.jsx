import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const statusTone = {
  draft: 'text-primary-500',
  submitted: 'text-leaf-600',
  fulfilled: 'text-primary-700',
  cancelled: 'text-maroon-600'
};

export default function LgOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState('list');
  const [consolidationId, setConsolidationId] = useState('');
  const [orderMode, setOrderMode] = useState('gap');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listOrders();
      setOrders(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Orders could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = async () => {
    setMode('new');
    setDetail(null);
    setConsolidationId('');
    setOrderMode('gap');
    setNotes('');
    setError('');
    try {
      const result = await lgService.listOrderCandidates();
      setCandidates(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Finalized consolidations could not be loaded.');
    }
  };

  const createOrder = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await lgService.createOrder(consolidationId, orderMode, notes);
      setNotice(`Order ${created.orderNumber} created.`);
      setMode('list');
      setDetail(created);
      await load();
    } catch (createError) {
      setError(createError.message || 'The order could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (orderId) => {
    setMode('list');
    setShowCancel(false);
    setCancelReason('');
    setError('');
    try {
      const result = await lgService.getOrder(orderId);
      setDetail(result);
    } catch (loadError) {
      setError(loadError.message || 'The order could not be opened.');
    }
  };

  const act = async (orderId, action) => {
    setBusy(true);
    setError('');
    try {
      let result;
      if (action === 'submit') result = await lgService.submitOrder(orderId);
      if (action === 'fulfil') result = await lgService.fulfillOrder(orderId);
      if (action === 'cancel') result = await lgService.cancelOrder(orderId, cancelReason.trim());
      setDetail(result);
      setNotice(`Order ${result.orderNumber} is now ${result.status}.`);
      setShowCancel(false);
      setCancelReason('');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The order could not be updated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Orders</h1>
          <p className="text-xs text-primary-500">
            Turn a finalized consolidation into an order for what the warehouse cannot cover
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            New order
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      {mode === 'new' ? (
        <section className="mt-4 rounded-2xl border border-sand-200 bg-white p-4">
          <h2 className="text-sm font-bold text-primary-900">New order</h2>
          <p className="text-xs text-primary-500">Only finalized consolidations can be ordered.</p>

          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary-500">
                Consolidation
              </span>
              <select
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-primary-800"
                value={consolidationId}
                onChange={(event) => setConsolidationId(event.target.value)}
              >
                <option value="">Select a consolidation</option>
                {candidates.map((candidate) => (
                  <option key={candidate.consolidationId} value={candidate.consolidationId}>
                    {candidate.reference} · {formatQuantity(candidate.gapQuantity)} short of{' '}
                    {formatQuantity(candidate.totalQuantity)}
                  </option>
                ))}
              </select>
            </label>

            {candidates.length === 0 ? (
              <p className="text-xs text-primary-400">
                No finalized consolidations yet. Finalize one on the Consolidations tab first.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-4 text-sm text-primary-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="order-mode"
                  checked={orderMode === 'gap'}
                  onChange={() => setOrderMode('gap')}
                />
                Only the gap
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="order-mode"
                  checked={orderMode === 'full'}
                  onChange={() => setOrderMode('full')}
                />
                Full requested quantity
              </label>
            </div>

            <Input
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for this order"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('list')}>
                Close
              </Button>
              <Button size="sm" onClick={createOrder} disabled={!consolidationId} loading={busy}>
                Create order
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => openDetail(order.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    detail?.id === order.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-800">{order.orderNumber}</p>
                      <p className="text-xs text-primary-500">
                        {order.consolidationReference || 'No consolidation'} · {order.itemCount} drug(s) ·{' '}
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <p className={`text-[11px] font-semibold uppercase ${statusTone[order.status] || ''}`}>
                      {titleCase(order.status)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-primary-500">
                    {formatQuantity(order.totalQuantity)} units ordered
                  </p>
                </button>
              </li>
            ))}
            {!loading && orders.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                No orders yet. Create one from a finalized consolidation.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-4">
          {!detail ? (
            <p className="py-10 text-center text-xs text-primary-400">Pick an order to see its lines.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{detail.orderNumber}</p>
                  <p className="text-xs text-primary-500">
                    {detail.createdByName} · {formatDateTime(detail.createdAt)}
                  </p>
                  {detail.consolidationReference ? (
                    <p className="text-xs text-primary-500">From {detail.consolidationReference}</p>
                  ) : null}
                </div>
                <p className={`text-[11px] font-semibold uppercase ${statusTone[detail.status] || ''}`}>
                  {titleCase(detail.status)}
                </p>
              </div>

              {detail.notes ? (
                <Alert tone="info" className="mt-3">
                  {detail.notes}
                </Alert>
              ) : null}

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                      <th className="py-1 pr-3">Drug</th>
                      <th className="py-1 pr-3 text-right">Ordered</th>
                      <th className="py-1 pr-3 text-right">Requested</th>
                      <th className="py-1 text-right">In store</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {detail.items.map((item) => (
                      <tr key={item.drugId}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-primary-800">{item.name}</p>
                          <p className="text-xs text-primary-400">{item.code}</p>
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-primary-800">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-2 pr-3 text-right text-primary-700">
                          {formatQuantity(item.requestedQuantity)}
                        </td>
                        <td className="py-2 text-right text-primary-700">
                          {formatQuantity(item.warehouseQuantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs font-semibold text-primary-700">
                {formatQuantity(detail.totalQuantity)} units across {detail.itemCount} drug(s)
              </p>

              {detail.status === 'draft' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(detail.id, 'submit')} loading={busy}>
                    Submit order
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setShowCancel((current) => !current)}>
                    Cancel
                  </Button>
                </div>
              ) : null}

              {detail.status === 'submitted' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(detail.id, 'fulfil')} loading={busy}>
                    Mark fulfilled
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setShowCancel((current) => !current)}>
                    Cancel
                  </Button>
                </div>
              ) : null}

              {showCancel && (detail.status === 'draft' || detail.status === 'submitted') ? (
                <div className="mt-3 rounded-xl border border-sand-200 p-3">
                  <Input
                    label="Reason for cancelling"
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={cancelReason.trim().length < 3}
                      onClick={() => act(detail.id, 'cancel')}
                      loading={busy}
                    >
                      Confirm cancellation
                    </Button>
                  </div>
                </div>
              ) : null}

              {detail.status === 'fulfilled' ? (
                <p className="mt-3 text-xs text-primary-500">
                  Fulfilled by {detail.fulfilledByName || '—'} on {formatDateTime(detail.fulfilledAt)}
                  {detail.fulfilledNote ? ` — ${detail.fulfilledNote}` : ''}
                </p>
              ) : null}

              {detail.status === 'cancelled' ? (
                <p className="mt-3 text-xs text-maroon-600">
                  Cancelled by {detail.cancelledByName || '—'} on {formatDateTime(detail.cancelledAt)}
                  {detail.cancelReason ? ` — ${detail.cancelReason}` : ''}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </LgShell>
  );
}
