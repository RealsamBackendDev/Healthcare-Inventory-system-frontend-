import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardList, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const statusTone = {
  draft: 'text-primary-500',
  submitted: 'text-leaf-600',
  partially_received: 'text-amber-600',
  received: 'text-primary-700',
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

  const [showReceipt, setShowReceipt] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptLines, setReceiptLines] = useState({});

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

  const openReceipt = (order) => {
    const next = {};
    (order.items || []).forEach((item) => {
      next[item.drugId] = {
        batchNumber: '',
        expiryDate: '',
        quantity: item.remainingQuantity > 0 ? String(item.remainingQuantity) : '',
        unitCost: ''
      };
    });
    setReceiptLines(next);
    setSupplierName('');
    setSupplierReference('');
    setReceiptNote('');
    setShowReceipt(true);
    setError('');
    setNotice('');
  };

  const updateReceiptLine = (drugId, key, value) => {
    setReceiptLines((current) => ({
      ...current,
      [drugId]: { ...(current[drugId] || {}), [key]: value }
    }));
  };

  const submitReceipt = async () => {
    const items = Object.entries(receiptLines)
      .map(([drugId, line]) => ({
        drugId,
        batchNumber: (line.batchNumber || '').trim(),
        expiryDate: line.expiryDate || null,
        quantity: Number(line.quantity || 0),
        unitCost: line.unitCost === '' || line.unitCost === undefined ? null : Number(line.unitCost)
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setError('Enter a quantity for at least one drug.');
      return;
    }
    if (items.some((item) => !item.batchNumber)) {
      setError('Every drug being received needs a batch number.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await lgService.receiveOrder(detail.id, {
        supplierName: supplierName.trim() || null,
        supplierReference: supplierReference.trim() || null,
        notes: receiptNote.trim() || null,
        items
      });
      setDetail(result);
      setNotice(
        `${result.receiptNumber} received. ${result.orderNumber} is now ${titleCase(result.status)}.`
      );
      setShowReceipt(false);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The receipt could not be posted.');
    } finally {
      setBusy(false);
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
                      <th className="py-1 pr-3 text-right">Received</th>
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
                          {formatQuantity(item.receivedQuantity)}
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

              {detail.status === 'submitted' || detail.status === 'partially_received' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openReceipt(detail)} disabled={busy}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Receive into warehouse
                  </Button>
                  {detail.status === 'submitted' ? (
                    <Button variant="danger" size="sm" onClick={() => setShowCancel((current) => !current)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {showReceipt &&
              (detail.status === 'submitted' || detail.status === 'partially_received') ? (
                <div className="mt-3 rounded-xl border border-sand-200 p-3">
                  <p className="text-sm font-semibold text-primary-800">Receive supplier delivery</p>
                  <p className="text-xs text-primary-500">
                    Enter the batch details for what arrived. Anything you leave out stays outstanding on the
                    order.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      label="Supplier"
                      value={supplierName}
                      onChange={(event) => setSupplierName(event.target.value)}
                      placeholder="Optional"
                    />
                    <Input
                      label="Supplier reference"
                      value={supplierReference}
                      onChange={(event) => setSupplierReference(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="mt-3 space-y-3">
                    {detail.items
                      .filter((item) => item.remainingQuantity > 0)
                      .map((item) => (
                        <div key={item.drugId} className="rounded-xl border border-sand-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-primary-800">{item.name}</p>
                            <p className="whitespace-nowrap text-xs text-primary-500">
                              {formatQuantity(item.remainingQuantity)} outstanding
                            </p>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Input
                              label="Batch number"
                              value={receiptLines[item.drugId]?.batchNumber ?? ''}
                              onChange={(event) =>
                                updateReceiptLine(item.drugId, 'batchNumber', event.target.value)
                              }
                            />
                            <Input
                              label="Expiry date"
                              type="date"
                              value={receiptLines[item.drugId]?.expiryDate ?? ''}
                              onChange={(event) =>
                                updateReceiptLine(item.drugId, 'expiryDate', event.target.value)
                              }
                            />
                            <Input
                              label="Quantity received"
                              type="number"
                              min="0"
                              step="any"
                              value={receiptLines[item.drugId]?.quantity ?? ''}
                              onChange={(event) =>
                                updateReceiptLine(item.drugId, 'quantity', event.target.value)
                              }
                            />
                            <Input
                              label="Unit cost"
                              type="number"
                              min="0"
                              step="any"
                              value={receiptLines[item.drugId]?.unitCost ?? ''}
                              onChange={(event) =>
                                updateReceiptLine(item.drugId, 'unitCost', event.target.value)
                              }
                            />
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="mt-2">
                    <Input
                      label="Note"
                      value={receiptNote}
                      onChange={(event) => setReceiptNote(event.target.value)}
                      placeholder="Optional note for the record"
                    />
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowReceipt(false)}>
                      Close
                    </Button>
                    <Button size="sm" onClick={submitReceipt} loading={busy}>
                      Post receipt
                    </Button>
                  </div>
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

              {detail.status === 'fulfilled' || detail.status === 'received' ? (
                <p className="mt-3 text-xs text-primary-500">
                  Received by {detail.fulfilledByName || '—'} on {formatDateTime(detail.fulfilledAt)}
                  {detail.fulfilledNote ? ` — ${detail.fulfilledNote}` : ''}
                </p>
              ) : null}

              {detail.receipts && detail.receipts.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">
                    Warehouse receipts
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-primary-600">
                    {detail.receipts.map((receipt) => (
                      <li key={receipt.id}>
                        {receipt.receiptNumber} · {formatQuantity(receipt.totalQuantity)} units ·{' '}
                        {formatDateTime(receipt.receivedAt)} · {receipt.receivedByName}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.sources && detail.sources.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">
                    Requested by
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-primary-600">
                    {detail.sources.map((source) => (
                      <li key={source.requisitionId}>
                        {source.centreName} · {source.requisitionNumber} ·{' '}
                        {formatQuantity(source.requestedQuantity)} requested
                      </li>
                    ))}
                  </ul>
                </div>
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
