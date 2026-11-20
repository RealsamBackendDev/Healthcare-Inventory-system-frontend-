import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Printer, RefreshCw, Truck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { formatDate, formatDateTime, formatQuantity } from '../../utils/format.js';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isBalanced = (difference) => Math.abs(difference) < 0.0005;

const emptyLine = (quantity) => ({
  accepted: String(quantity),
  damaged: '0',
  missing: '0',
  reason: ''
});

export default function DeliveriesPage() {
  const { activeCentre } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [lines, setLines] = useState({});
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

  const openDelivery = async (dispatchId) => {
    setSelectedId(dispatchId);
    setDetailLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await lgService.getDispatchDelivery(dispatchId);
      setDelivery(result);
      const nextLines = {};
      (result.items || []).forEach((item) => {
        nextLines[item.id] = emptyLine(item.pendingQuantity);
      });
      setLines(nextLines);
      setNote('');
    } catch (loadError) {
      setError(loadError.message || 'The delivery could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateLine = (itemId, key, value) => {
    setLines((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] || {}), [key]: value }
    }));
  };

  const summaries = useMemo(() => {
    return (delivery?.items || []).map((item) => {
      const pending = toNumber(item.pendingQuantity);
      const line = lines[item.id] || emptyLine(pending);
      const accepted = toNumber(line.accepted);
      const damaged = toNumber(line.damaged);
      const missing = toNumber(line.missing);
      const counted = accepted + damaged + missing;
      const difference = Math.round((pending - counted) * 1000) / 1000;
      const hasDiscrepancy = damaged > 0 || missing > 0;
      const reason = (line.reason || '').trim();
      return {
        item,
        pending,
        accepted,
        damaged,
        missing,
        counted,
        difference: Math.abs(difference) < 0.001 ? 0 : difference,
        balanced: difference >= -0.0005,
        hasDiscrepancy,
        reason,
        reasonOk: !hasDiscrepancy || reason.length >= 3
      };
    });
  }, [delivery, lines]);

  const totals = summaries.reduce(
    (sum, line) => ({
      accepted: sum.accepted + line.accepted,
      damaged: sum.damaged + line.damaged,
      missing: sum.missing + line.missing
    }),
    { accepted: 0, damaged: 0, missing: 0 }
  );

  const canSubmit =
    summaries.length > 0 &&
    summaries.every((line) => line.balanced && line.reasonOk) &&
    totals.accepted + totals.damaged + totals.missing > 0 &&
    !receiving;

  const handleReceive = async () => {
    setReceiving(true);
    setError('');
    setNotice('');
    try {
      const items = summaries.map((line) => ({
        dispatchItemId: line.item.id,
        acceptedQuantity: line.accepted,
        damagedQuantity: line.damaged,
        missingQuantity: line.missing,
        reason: line.hasDiscrepancy ? line.reason : null
      }));
      const result = await lgService.receiveDispatchDelivery(selectedId, {
        note: note || null,
        items
      });
      const remaining = result.remainingQuantity || 0;
      setNotice(
        `${result.dispatchNumber} confirmed: ${formatQuantity(result.acceptedQuantity)} accepted, ${formatQuantity(
          result.damagedQuantity
        )} damaged, ${formatQuantity(result.missingQuantity)} missing. ${
          remaining > 0
            ? `${formatQuantity(remaining)} is still on the way — record another receipt when it arrives.`
            : result.requisitionClosed
              ? 'The requisition is now complete.'
              : 'The shortfall stays outstanding so the warehouse can send it again.'
        }`
      );
      setDelivery(null);
      setLines({});
      setSelectedId(null);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The delivery could not be confirmed.');
    } finally {
      setReceiving(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDelivery(null);
    setLines({});
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
                onClick={() => openDelivery(item.id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-primary-50 ${
                  selectedId === item.id ? 'bg-primary-50' : ''
                }`}
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary-800">
                    <Truck className="h-4 w-4 text-primary-500" aria-hidden="true" />
                    {item.dispatchNumber}
                  </p>
                  <p className="text-xs text-primary-500">
                    {item.itemCount} item(s) · {formatQuantity(item.totalQuantity)} units · sent by{' '}
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
              <div>
                <p className="text-sm font-bold text-primary-900">{delivery.dispatchNumber}</p>
                <p className="text-xs text-primary-500">
                  Dispatched {formatDateTime(delivery.dispatchedAt)}
                </p>
              </div>

              <p className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-600">
                Count what arrived in this trip. Anything you leave unaccounted stays on the
                dispatch, so you can record a second receipt when the rest turns up.
              </p>

              <ul className="mt-3 space-y-3">
                {summaries.map((line) => (
                  <li key={line.item.id} className="rounded-xl border border-sand-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary-800">
                          {line.item.drugName}
                        </p>
                        <p className="text-[11px] text-primary-400">
                          {line.item.batchNumber || 'No batch'} · exp {formatDate(line.item.expiryDate)}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-bold text-primary-800">
                        {formatQuantity(line.item.pendingQuantity)} of {formatQuantity(line.item.quantity)}
                      </p>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Input
                        label="Accepted"
                        type="number"
                        min="0"
                        step="any"
                        value={lines[line.item.id]?.accepted ?? ''}
                        onChange={(event) => updateLine(line.item.id, 'accepted', event.target.value)}
                      />
                      <Input
                        label="Damaged"
                        type="number"
                        min="0"
                        step="any"
                        value={lines[line.item.id]?.damaged ?? ''}
                        onChange={(event) => updateLine(line.item.id, 'damaged', event.target.value)}
                      />
                      <Input
                        label="Missing"
                        type="number"
                        min="0"
                        step="any"
                        value={lines[line.item.id]?.missing ?? ''}
                        onChange={(event) => updateLine(line.item.id, 'missing', event.target.value)}
                      />
                    </div>

                    {line.difference < 0 ? (
                      <p className="mt-1.5 text-[11px] font-semibold text-maroon-600">
                        {formatQuantity(Math.abs(line.difference))} more than is still on the way
                      </p>
                    ) : line.counted > 0 ? (
                      <p className="mt-1.5 text-[11px] text-primary-400">
                        {line.difference > 0
                          ? `${formatQuantity(line.difference)} stays outstanding for a later trip`
                          : 'This line is complete'}
                      </p>
                    ) : null}

                    {line.hasDiscrepancy ? (
                      <div className="mt-2">
                        <Input
                          label="Reason for the difference"
                          value={lines[line.item.id]?.reason ?? ''}
                          onChange={(event) => updateLine(line.item.id, 'reason', event.target.value)}
                          placeholder="e.g. two cartons crushed, one box short"
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-sand-100 px-3 py-2 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary-400">Accepted</p>
                  <p className="text-sm font-bold text-primary-800">{formatQuantity(totals.accepted)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary-400">Damaged</p>
                  <p className="text-sm font-bold text-primary-800">{formatQuantity(totals.damaged)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary-400">Missing</p>
                  <p className="text-sm font-bold text-primary-800">{formatQuantity(totals.missing)}</p>
                </div>
              </div>

              <div className="mt-3">
                <Input
                  label="Receiving note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note for the record"
                />
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/deliveries/${selectedId}/note`)}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Delivery note
                </Button>
                <Button variant="outline" onClick={closeDetail}>
                  Close
                </Button>
                <Button onClick={handleReceive} loading={receiving} disabled={!canSubmit}>
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
