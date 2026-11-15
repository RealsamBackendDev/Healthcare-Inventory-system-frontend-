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

export default function LgRequestsPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission(PERMISSIONS.REQUISITIONS_LG_REVIEW);
  const canDispatch = hasPermission(PERMISSIONS.DISPATCHES_POST);

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
  const [quantities, setQuantities] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [busy, setBusy] = useState(false);

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
      const nextQuantities = {};
      (result.items || []).forEach((item) => {
        nextQuantities[item.drugId] = String(Math.min(item.requestedQuantity, item.warehouseQuantity));
      });
      setQuantities(nextQuantities);
      setDispatchNotes('');
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
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await lgService.approveRequest(selectedId, 'Approved by the local government');
      setNotice('Requisition approved. You can dispatch it from the warehouse.');
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
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const items = Object.entries(quantities)
        .map(([drugId, value]) => ({ drugId, quantity: Number(value) }))
        .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
      const result = await lgService.dispatchRequest(selectedId, {
        notes: dispatchNotes || null,
        items: items.length > 0 ? items : undefined
      });
      setNotice(
        result.requiresApproval
          ? 'Dispatch sent for a second officer to approve.'
          : `Dispatch ${result.dispatchNumber} posted to ${result.centreName}.`
      );
      setDispatching(false);
      await refreshAfterAction();
    } catch (actionError) {
      setError(actionError.message || 'The dispatch could not be posted.');
    } finally {
      setBusy(false);
    }
  };

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
                    <th className="py-2 text-right">Requested</th>
                    <th className="py-2 text-right">In warehouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">
                        <p className="font-medium text-primary-800">{item.drugName}</p>
                        <p className="text-[11px] text-primary-400">{item.drugCode}</p>
                      </td>
                      <td className="py-2 text-right text-primary-700">
                        {formatQuantity(item.requestedQuantity)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          item.warehouseQuantity >= item.requestedQuantity
                            ? 'text-primary-700'
                            : 'text-maroon-600'
                        }`}
                      >
                        {formatQuantity(item.warehouseQuantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {detail.dispatch ? (
                <Alert tone="info" className="mt-3">
                  Dispatched as {detail.dispatch.dispatchNumber} on {formatDate(detail.dispatch.dispatchedAt)}.
                </Alert>
              ) : null}

              {canReview && detail.requisition.status === 'pending_approval' ? (
                <div className="mt-4 space-y-2">
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

              {canDispatch && detail.requisition.status === 'approved' && !detail.dispatch ? (
                <div className="mt-4">
                  {dispatching ? (
                    <div className="space-y-3 rounded-xl border border-sand-200 p-3">
                      <h3 className="text-sm font-semibold text-primary-800">Quantities to dispatch</h3>
                      {detail.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary-800">{item.drugName}</p>
                            <p className="text-[11px] text-primary-400">
                              Requested {formatQuantity(item.requestedQuantity)} · warehouse{' '}
                              {formatQuantity(item.warehouseQuantity)}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(item.requestedQuantity, item.warehouseQuantity)}
                            value={quantities[item.drugId] ?? ''}
                            onChange={(event) =>
                              setQuantities((current) => ({ ...current, [item.drugId]: event.target.value }))
                            }
                            className="field w-24"
                          />
                        </div>
                      ))}
                      <Input
                        label="Dispatch note"
                        value={dispatchNotes}
                        onChange={(event) => setDispatchNotes(event.target.value)}
                        placeholder="Vehicle, driver or handover note"
                      />
                      {thresholdNeeded ? (
                        <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={thresholdApproved}
                            onChange={(event) => setThresholdApproved(event.target.checked)}
                          />
                          <span>I confirm this dispatch is above the configured threshold.</span>
                        </label>
                      ) : null}
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
                      Prepare dispatch
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
