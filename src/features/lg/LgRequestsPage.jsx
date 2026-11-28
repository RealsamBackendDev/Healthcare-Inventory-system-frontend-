import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCw, Search, Trash2, Truck, X } from 'lucide-react';
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
  const [reviewItems, setReviewItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [drugSearch, setDrugSearch] = useState('');
  const [pickedDrug, setPickedDrug] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
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
      const nextQuantities = {};
      (result.items || []).forEach((item) => {
        nextQuantities[item.drugId] = String(
          Math.min(item.outstandingQuantity ?? 0, item.warehouseQuantity ?? 0)
        );
      });
      setReviewItems(
        (result.items || []).map((item) => ({
          drugId: item.drugId,
          drugName: item.drugName,
          drugCode: item.drugCode,
          unitOfMeasure: item.unitOfMeasure,
          asked: toNumber(item.requestedQuantity),
          quantity: String(item.approvedQuantity ?? item.requestedQuantity)
        }))
      );
      setDrugSearch('');
      setPickedDrug(null);
      setAddQuantity('');
      setReviewError('');
      setShowHistory(false);
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

  useEffect(() => {
    if (!canReview || detail?.requisition?.status !== 'pending_approval') {
      return;
    }
    lgService
      .listLgDrugs({ status: 'active', pageSize: 100 })
      .then((result) => setDrugs(result.items || []))
      .catch(() => setDrugs([]));
  }, [canReview, detail?.requisition?.status]);

  const drugMatches = useMemo(() => {
    const term = drugSearch.trim().toLowerCase();
    if (!term || pickedDrug) {
      return [];
    }
    return drugs
      .filter((drug) => !reviewItems.some((item) => item.drugId === drug.id))
      .filter(
        (drug) => drug.name.toLowerCase().includes(term) || drug.code.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [drugs, drugSearch, pickedDrug, reviewItems]);

  const setReviewQuantity = (drugId, value) =>
    setReviewItems((current) =>
      current.map((item) => (item.drugId === drugId ? { ...item, quantity: value } : item))
    );

  const removeReviewItem = (drugId) => {
    setReviewItems((current) => current.filter((item) => item.drugId !== drugId));
    setReviewError('');
  };

  const addReviewItem = () => {
    if (!pickedDrug) {
      setReviewError('Pick a drug from the list first.');
      return;
    }
    const amount = toNumber(addQuantity);
    if (amount <= 0) {
      setReviewError('Enter a quantity greater than zero for this drug.');
      return;
    }
    setReviewItems((current) => [
      ...current,
      {
        drugId: pickedDrug.id,
        drugName: pickedDrug.name,
        drugCode: pickedDrug.code,
        unitOfMeasure: pickedDrug.unitOfMeasure,
        asked: 0,
        quantity: String(amount)
      }
    ]);
    setPickedDrug(null);
    setDrugSearch('');
    setAddQuantity('');
    setReviewError('');
  };

  const handleApprove = async () => {
    setError('');
    setNotice('');
    setReviewError('');
    if (reviewItems.length === 0) {
      setReviewError('Keep at least one drug on the request before approving.');
      return;
    }
    const negative = reviewItems.find((item) => toNumber(item.quantity) < 0);
    if (negative) {
      setReviewError('Quantities cannot be negative.');
      return;
    }
    const items = reviewItems
      .map((item) => ({ drugId: item.drugId, approvedQuantity: toNumber(item.quantity) }))
      .filter((entry) => entry.approvedQuantity > 0);
    if (items.length === 0) {
      setError('Approve at least one unit, or reject the request instead.');
      return;
    }

    setBusy(true);
    try {
      await lgService.approveRequest(selectedId, 'Approved by the Logistician', items);
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
                          {entry.drugName}
                          {toNumber(entry.missingQuantity) > 0
                            ? ` · ${formatQuantity(entry.missingQuantity)} missing`
                            : ''}
                          {toNumber(entry.damagedQuantity) > 0
                            ? ` · ${formatQuantity(entry.damagedQuantity)} damaged`
                            : ''}
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
                      label="What happened to the missing or damaged stock?"
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
                    <h3 className="text-sm font-semibold text-primary-800">
                      Review the drugs and quantities
                    </h3>
                    <p className="text-[11px] text-primary-400">
                      Raise or lower any quantity, remove a drug, or add one the facility did not ask
                      for. The facility sees what you approve here.
                    </p>
                    <div className="mt-2 space-y-2">
                      {reviewItems.length === 0 ? (
                        <p className="text-xs text-primary-400">
                          Every drug was removed. Add at least one to approve.
                        </p>
                      ) : null}
                      {reviewItems.map((item) => (
                        <div key={item.drugId} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary-800">{item.drugName}</p>
                            <p className="text-[11px] text-primary-400">
                              {item.drugCode} · {item.unitOfMeasure} · asked{' '}
                              {formatQuantity(item.asked)}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(event) => setReviewQuantity(item.drugId, event.target.value)}
                            aria-label={`Approved quantity for ${item.drugName}`}
                            className="field w-20"
                          />
                          <button
                            type="button"
                            onClick={() => removeReviewItem(item.drugId)}
                            aria-label={`Remove ${item.drugName}`}
                            className="rounded-lg p-1.5 text-maroon-600 transition hover:bg-maroon-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 space-y-2 rounded-xl border border-sand-200 bg-sand-50/60 p-3">
                      <p className="text-xs font-semibold text-primary-800">
                        Add a drug the facility did not ask for
                      </p>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                          aria-hidden="true"
                        />
                        <input
                          value={drugSearch}
                          onChange={(event) => {
                            setDrugSearch(event.target.value);
                            setPickedDrug(null);
                          }}
                          placeholder="Type a drug name or code"
                          autoComplete="off"
                          aria-label="Search drugs to add"
                          className="field pl-9"
                        />
                        {drugMatches.length > 0 ? (
                          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white shadow-lg">
                            {drugMatches.map((drug) => (
                              <li key={drug.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickedDrug(drug);
                                    setDrugSearch(`${drug.name} (${drug.code})`);
                                    setReviewError('');
                                  }}
                                  className="flex w-full flex-col items-start px-3 py-2 text-left text-xs hover:bg-primary-50"
                                >
                                  <span className="font-semibold text-primary-800">{drug.name}</span>
                                  <span className="text-primary-400">
                                    {drug.code} · {drug.unitOfMeasure}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      {pickedDrug ? (
                        <p className="text-[11px] font-semibold text-leaf-600">
                          Selected: {pickedDrug.name} ({pickedDrug.code}) · {pickedDrug.unitOfMeasure}
                        </p>
                      ) : null}
                      <div className="flex items-end gap-2">
                        <div className="w-28">
                          <label className="field-label" htmlFor="lg-add-quantity">
                            Quantity
                          </label>
                          <input
                            id="lg-add-quantity"
                            type="number"
                            min="0"
                            step="any"
                            value={addQuantity}
                            onChange={(event) => setAddQuantity(event.target.value)}
                            placeholder="0"
                            className="field py-1.5 text-sm"
                          />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addReviewItem}>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Add
                        </Button>
                      </div>
                      {reviewError ? <p className="text-xs text-maroon-600">{reviewError}</p> : null}
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
                <button
                  type="button"
                  onClick={() => setShowHistory((current) => !current)}
                  aria-expanded={showHistory}
                  className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-primary-400"
                >
                  <span>History ({detail.events.length})</span>
                  <span>{showHistory ? 'Hide' : 'Show'}</span>
                </button>
                {showHistory ? (
                  <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto">
                    {detail.events.map((event) => (
                      <li key={event.id} className="text-xs text-primary-600">
                        <span className="font-semibold">{titleCase(event.eventType)}</span> ·{' '}
                        {event.actorFullName} · {formatDate(event.createdAt)}
                        {event.comment ? ` — ${event.comment}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </LgShell>
  );
}
