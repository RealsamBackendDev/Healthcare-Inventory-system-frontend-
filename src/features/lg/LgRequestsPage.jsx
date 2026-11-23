import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Truck, X } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity, titleCase } from '../../utils/format.js';

const tabs = [
  { value: '', label: 'All' },
  { value: 'pending_approval', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'closed', label: 'Completed' }
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function LgRequestsPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission(PERMISSIONS.REQUISITIONS_LG_REVIEW);
  const canDispatch = hasPermission(PERMISSIONS.DISPATCHES_POST);
  const canCloseDiscrepancies = hasPermission(PERMISSIONS.DISCREPANCIES_CLOSE);

  const [status, setStatus] = useState('pending_approval');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchKey, setDispatchKey] = useState('');
  const [approved, setApproved] = useState({});
  const [quantities, setQuantities] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [shortClosing, setShortClosing] = useState(false);
  const [shortQuantities, setShortQuantities] = useState({});
  const [shortReason, setShortReason] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listRequests({ status: status || undefined });
      setRequests(result.items || []);
    } catch (loadError) {
      setError(loadError.message || 'Requisitions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (requisitionId) => {
    setDetailLoading(true);
    setError('');
    try {
      const result = await lgService.getRequest(requisitionId);
      setDetail(result);
      const nextApproved = {};
      const nextQuantities = {};
      (result.items || []).forEach((item) => {
        nextApproved[item.drugId] = String(
          item.suggestedQuantity ?? item.approvedQuantity ?? item.requestedQuantity
        );
        nextQuantities[item.drugId] = String(
          Math.min(item.outstandingQuantity ?? 0, item.warehouseQuantity ?? 0)
        );
      });
      setApproved(nextApproved);
      setQuantities(nextQuantities);
      setDispatchNotes('');
      setResolutionNote('');
      setResolvingId(null);
      setShortClosing(false);
      setShortQuantities({});
      setShortReason('');
      setDispatching(false);
      setShowReject(false);
      setRejectReason('');
    } catch (loadError) {
      setError(loadError.message || 'The requisition could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openRequest = (requisitionId) => {
    setSelectedId(requisitionId);
    loadDetail(requisitionId);
  };

  const refreshAfterAction = async () => {
    await loadList();
    if (selectedId) {
      await loadDetail(selectedId);
    }
  };

  const handleApprove = async () => {
    setError('');
    setNotice('');
    const items = (detail?.items || []).map((item) => ({
      drugId: item.drugId,
      approvedQuantity: toNumber(approved[item.drugId])
    }));
    const over = items.find((entry, index) => {
      const requested = detail.items[index].requestedQuantity;
      return entry.approvedQuantity < 0 || entry.approvedQuantity > requested + 0.0005;
    });
    if (over) {
      setError('An approved quantity cannot be more than what the facility asked for.');
      return;
    }
    if (items.reduce((total, entry) => total + entry.approvedQuantity, 0) <= 0) {
      setError('Approve at least one unit, or reject the request instead.');
      return;
    }

    setBusy(true);
    try {
      await lgService.approveRequest(
        selectedId,
        'Approved by the local government',
        items
      );
      setNotice('Requisition approved. Only the approved quantities can be dispatched.');
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The requisition could not be approved.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await lgService.rejectRequest(selectedId, rejectReason.trim());
      setNotice('Requisition rejected.');
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The requisition could not be rejected.');
    } finally {
      setBusy(false);
    }
  };

  const handleDispatch = async () => {
    const items = Object.entries(quantities)
      .map(([drugId, value]) => ({ drugId, quantity: toNumber(value) }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      setError('Enter the quantity to dispatch for at least one drug.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const key = dispatchKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      setDispatchKey(key);

      const result = await lgService.dispatchRequest(selectedId, {
        notes: dispatchNotes || null,
        clientRequestId: key,
        items
      });
      setNotice(`Dispatch ${result.dispatchNumber} posted to ${result.centreName}.`);
      setDispatchKey('');
      setDispatching(false);
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The dispatch could not be posted.');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveDiscrepancy = async (itemId, resolution) => {
    if (resolutionNote.trim().length < 3) {
      setError('Write a short note explaining what happened to the missing stock.');
      return;
    }
    setResolvingId(itemId);
    setError('');
    setNotice('');
    try {
      const result = await lgService.resolveDiscrepancy(itemId, resolution, resolutionNote.trim());
      setNotice(
        resolution === 'reissue'
          ? `Shortage of ${result.drugName} reopened. What is owed can be dispatched again.`
          : `Shortage of ${result.drugName} written off.${
              result.requisitionClosed ? ' The request is now closed.' : ''
            }`
      );
      setResolutionNote('');
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The shortage could not be settled.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleCloseShort = async () => {
    const items = Object.entries(shortQuantities)
      .map(([drugId, value]) => ({ drugId, quantity: toNumber(value) }))
      .filter((entry) => entry.quantity > 0);
    if (items.length === 0) {
      setError('Enter the quantity you are closing for at least one drug.');
      return;
    }
    if (shortReason.trim().length < 3) {
      setError('Write a short reason for closing the balance.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await lgService.closeShort(selectedId, items, shortReason.trim());
      setNotice(
        result.requisitionClosed
          ? 'The balance is closed and the request is now complete.'
          : 'The balance is closed short. The rest of the request is still being supplied.'
      );
      setShortClosing(false);
      setShortQuantities({});
      setShortReason('');
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The balance could not be closed.');
    } finally {
      setBusy(false);
    }
  };

  const openDiscrepancies = (detail?.discrepancies || []).filter((entry) => entry.status === 'open');

  const outstandingTotal = (detail?.items || []).reduce(
    (total, item) => total + toNumber(item.outstandingQuantity),
    0
  );
  const pendingDispatchItems = (detail?.items || []).filter(
    (item) => toNumber(item.outstandingQuantity) > 0
  );

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Replenishment requests</h1>
          <p className="text-xs text-primary-500">Requests raised by facilities in this local government</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadList} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              status === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-primary-600 ring-1 ring-sand-200 hover:bg-primary-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {requests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  onClick={() => openRequest(request.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    selectedId === request.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-800">{request.centreName}</p>
                      <p className="text-xs text-primary-500">
                        {request.requisitionNumber} · {request.itemCount} item(s)
                      </p>
                      {request.approvedQuantity !== null && request.approvedQuantity !== undefined ? (
                        <p className="mt-1 text-[11px] text-primary-500">
                          Requested {formatQuantity(request.totalQuantity)} · Approved{' '}
                          {formatQuantity(request.approvedQuantity)} · Transit{' '}
                          {formatQuantity(request.inTransitQuantity)} · Accepted{' '}
                          {formatQuantity(request.acceptedQuantity)} · Owing{' '}
                          {formatQuantity(request.outstandingQuantity)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary-700">
                        {formatQuantity(request.totalQuantity)} units
                      </p>
                      <p className="text-[11px] text-primary-400">{titleCase(request.status)}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {!loading && requests.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                Nothing here. Requests appear as soon as a facility submits them.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white">
          {!selectedId ? (
            <div className="px-4 py-10 text-center text-xs text-primary-400">
              Pick a request to review it.
            </div>
          ) : detailLoading ? (
            <div className="px-4 py-10 text-center text-xs text-primary-400">Loading request…</div>
          ) : detail ? (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{detail.requisition.centreName}</p>
                  <p className="text-xs text-primary-500">
                    {detail.requisition.requisitionNumber} · {titleCase(detail.requisition.status)}
                  </p>
                </div>
                <p className="text-xs text-primary-500">{formatDate(detail.requisition.createdAt)}</p>
              </div>

              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                  <tr>
                    <th className="py-2">Drug</th>
                    <th className="py-2 text-right">Asked</th>
                    <th className="py-2 text-right">Approved</th>
                    <th className="py-2 text-right">Transit</th>
                    <th className="py-2 text-right">Accepted</th>
                    <th className="py-2 text-right">Owing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">
                        <p className="font-medium text-primary-800">{item.drugName}</p>
                        <p className="text-[11px] text-primary-400">
                          {item.drugCode}
                        </p>
                        {toNumber(item.replacementAuthorisedQuantity) > 0 ? (
                          <p className="text-[11px] text-maroon-600">
                            +{formatQuantity(item.replacementAuthorisedQuantity)} replacement owed
                          </p>
                        ) : null}
                        {toNumber(item.closedShortQuantity) > 0 ? (
                          <p className="text-[11px] text-primary-400">
                            {formatQuantity(item.closedShortQuantity)} closed short
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 text-right text-primary-700">
                        {formatQuantity(item.requestedQuantity)}
                      </td>
                      <td className="py-2 text-right font-semibold text-primary-800">
                        {formatQuantity(item.approvedQuantity)}
                      </td>
                      <td className="py-2 text-right text-primary-700">
                        {formatQuantity(item.inTransitQuantity)}
                      </td>
                      <td className="py-2 text-right text-primary-700">
                        {formatQuantity(item.acceptedQuantity)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          toNumber(item.outstandingQuantity) > 0 ? 'text-maroon-600' : 'text-primary-500'
                        }`}
                      >
                        {formatQuantity(item.outstandingQuantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {detail.dispatch ? (
                <Alert tone="info" className="mt-3">
                  Last dispatch {detail.dispatch.dispatchNumber} on{' '}
                  {formatDate(detail.dispatch.dispatchedAt)} · {titleCase(detail.dispatch.status)}
                  {detail.dispatch.missingQuantity > 0
                    ? ` · ${formatQuantity(detail.dispatch.missingQuantity)} missing at the facility`
                    : ''}
                  {detail.dispatch.rejectedQuantity > 0
                    ? ` · ${formatQuantity(detail.dispatch.rejectedQuantity)} rejected at the facility`
                    : ''}
                  {detail.dispatch.damagedQuantity > 0
                    ? ` · ${formatQuantity(detail.dispatch.damagedQuantity)} damaged`
                    : ''}
                </Alert>
              ) : null}

              {openDiscrepancies.length > 0 ? (
                <div className="mt-3 rounded-xl border border-maroon-200 bg-maroon-50 p-3">
                  <h3 className="text-sm font-semibold text-maroon-800">Shortages to settle</h3>
                  <p className="text-[11px] text-maroon-600">
                    Nothing more can be dispatched on this request until each shortage is settled.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {openDiscrepancies.map((entry) => (
                      <li key={entry.id} className="rounded-lg bg-white p-2">
                        <p className="text-xs font-semibold text-primary-800">
                          {entry.drugName} · {formatQuantity(entry.missingQuantity)} missing
                          {entry.rejectedQuantity > 0
                            ? ` · ${formatQuantity(entry.rejectedQuantity)} rejected`
                            : ''}
                        </p>
                        <p className="text-[11px] text-primary-500">
                          {entry.dispatchNumber}
                          {entry.reason ? ` · ${entry.reason}` : ''}
                        </p>
                        {canCloseDiscrepancies ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              loading={resolvingId === entry.id}
                              onClick={() => handleResolveDiscrepancy(entry.id, 'reissue')}
                            >
                              Replace stock
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={resolvingId === entry.id}
                              onClick={() => handleResolveDiscrepancy(entry.id, 'written_off')}
                            >
                              Write off
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {canCloseDiscrepancies ? (
                    <Input
                      label="What happened to the missing stock?"
                      className="mt-2"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                    />
                  ) : null}
                </div>
              ) : null}

              {canCloseDiscrepancies &&
              detail.requisition.status === 'approved' &&
              outstandingTotal > 0 ? (
                <div className="mt-3">
                  {shortClosing ? (
                    <div className="space-y-3 rounded-xl border border-sand-200 p-3">
                      <h3 className="text-sm font-semibold text-primary-800">Close an unfulfilled balance</h3>
                      <p className="text-[11px] text-primary-400">
                        Use this when the balance will not be supplied. Nothing is added to facility stock.
                      </p>
                      {pendingDispatchItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary-800">{item.drugName}</p>
                            <p className="text-[11px] text-primary-400">
                              Owing {formatQuantity(item.outstandingQuantity)}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={item.outstandingQuantity}
                            step="any"
                            value={shortQuantities[item.drugId] ?? ''}
                            onChange={(event) =>
                              setShortQuantities((current) => ({
                                ...current,
                                [item.drugId]: event.target.value
                              }))
                            }
                            className="field w-20"
                          />
                        </div>
                      ))}
                      <Input
                        label="Why is this balance not being supplied?"
                        value={shortReason}
                        onChange={(event) => setShortReason(event.target.value)}
                        placeholder="Out of stock at the state store"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShortClosing(false)}>
                          Cancel
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleCloseShort} loading={busy}>
                          Close these lines
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShortClosing(true)}>
                      Close an unfulfilled balance
                    </Button>
                  )}
                </div>
              ) : null}

              {canReview && detail.requisition.status === 'pending_approval' ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-sand-200 p-3">
                    <h3 className="text-sm font-semibold text-primary-800">Quantities to approve</h3>
                    <p className="text-[11px] text-primary-400">
                      Lower a quantity where the warehouse cannot cover the full request.
                    </p>
                    <div className="mt-2 space-y-2">
                      {detail.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary-800">{item.drugName}</p>
                            <p className="text-[11px] text-primary-400">
                              Asked {formatQuantity(item.requestedQuantity)} · warehouse{' '}
                              {formatQuantity(item.warehouseQuantity)}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={item.requestedQuantity}
                            step="any"
                            value={approved[item.drugId] ?? ''}
                            onChange={(event) =>
                              setApproved((current) => ({ ...current, [item.drugId]: event.target.value }))
                            }
                            className="field w-20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleApprove} loading={busy}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setShowReject((current) => !current)}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                  {showReject ? (
                    <div className="rounded-xl border border-sand-200 p-3">
                      <Input
                        label="Reason for rejection"
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleReject}
                          disabled={rejectReason.trim().length < 3}
                          loading={busy}
                        >
                          Confirm rejection
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {canDispatch && detail.requisition.status === 'approved' && outstandingTotal > 0 ? (
                <div className="mt-4">
                  {dispatching ? (
                    <div className="space-y-3 rounded-xl border border-sand-200 p-3">
                      <h3 className="text-sm font-semibold text-primary-800">Quantities to dispatch</h3>
                      <p className="text-[11px] text-primary-400">
                        {formatQuantity(outstandingTotal)} unit(s) still owed on this request.
                      </p>
                      {pendingDispatchItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary-800">{item.drugName}</p>
                            <p className="text-[11px] text-primary-400">
                              Owing {formatQuantity(item.outstandingQuantity)} · warehouse{' '}
                              {formatQuantity(item.warehouseQuantity)}
                              {toNumber(item.inTransitQuantity) > 0
                                ? ` · ${formatQuantity(item.inTransitQuantity)} already on the road`
                                : ''}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={item.outstandingQuantity}
                            step="any"
                            value={quantities[item.drugId] ?? ''}
                            onChange={(event) =>
                              setQuantities((current) => ({ ...current, [item.drugId]: event.target.value }))
                            }
                            className="field w-20"
                          />
                        </div>
                      ))}
                      <Input
                        label="Dispatch note"
                        value={dispatchNotes}
                        onChange={(event) => setDispatchNotes(event.target.value)}
                        placeholder="Vehicle, driver or handover note"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDispatching(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleDispatch} loading={busy}>
                          <Truck className="h-4 w-4" aria-hidden="true" />
                          Post dispatch
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setDispatching(true)}>
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      {detail.dispatch ? 'Send the outstanding balance' : 'Prepare dispatch'}
                    </Button>
                  )}
                </div>
              ) : null}

              <div className="mt-4 border-t border-sand-100 pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">
                  History
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {detail.events.map((event) => (
                    <li key={event.id} className="text-xs text-primary-600">
                      <span className="font-semibold">{titleCase(event.eventType)}</span> ·{' '}
                      {event.actorFullName} · {formatDate(event.createdAt)}
                      {event.comment ? ` — ${event.comment}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </LgShell>
  );
}
