import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Check, RefreshCw, Send, X } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as transfersService from '../../services/transfers.service.js';
import { formatDateTime, formatQuantity } from '../../utils/format.js';

const statusLabels = {
  requested: 'Waiting for the source facility',
  in_transit: 'Approved, on the way',
  partially_received: 'Part received',
  received: 'Received',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

const statusStyles = {
  requested: 'bg-amber-50 text-amber-700 border-amber-200',
  in_transit: 'bg-leaf-50 text-primary-700 border-leaf-200',
  partially_received: 'bg-amber-50 text-amber-700 border-amber-200',
  received: 'bg-primary-50 text-primary-700 border-primary-200',
  declined: 'bg-maroon-50 text-maroon-700 border-maroon-200',
  cancelled: 'bg-sand-100 text-primary-500 border-sand-200'
};

export default function TransferRequestsPage() {
  const { activeCentre } = useAuth();

  const [tab, setTab] = useState('sent');
  const [sent, setSent] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reasons, setReasons] = useState({});
  const [receiptDraft, setReceiptDraft] = useState(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [shortageDraft, setShortageDraft] = useState(null);
  const [shortageBusy, setShortageBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [neighbours, setNeighbours] = useState([]);
  const [facilityId, setFacilityId] = useState('');
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [drugId, setDrugId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sentRows, incomingRows] = await Promise.all([
        transfersService.listTransferRequests('outgoing'),
        transfersService.listTransferRequests('incoming')
      ]);
      setSent(sentRows || []);
      setIncoming(incomingRows || []);
    } catch (loadError) {
      setError(loadError.message || 'Transfer requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = async () => {
    setFormOpen(true);
    setError('');
    if (neighbours.length > 0) {
      return;
    }
    try {
      const rows = await transfersService.listNeighbours();
      setNeighbours(rows || []);
      if (rows && rows.length > 0) {
        setFacilityId(rows[0].id);
      }
    } catch (loadError) {
      setError(loadError.message || 'Neighbouring facilities could not be loaded.');
    }
  };

  useEffect(() => {
    if (!facilityId) {
      setStock([]);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    transfersService
      .getNeighbourStock(facilityId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setStock(result.items || []);
        setDrugId(result.items && result.items.length > 0 ? result.items[0].drugId : '');
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message || 'That facility stock could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStockLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const amount = Number(quantity);
    if (!drugId || !amount || amount <= 0) {
      setError('Choose a drug and enter a quantity above zero.');
      return;
    }
    setCreating(true);
    try {
      const created = await transfersService.createTransferRequest({
        fromCentreId: facilityId,
        note: note || null,
        items: [{ drugId, quantity: amount }]
      });
      setNotice(`Request ${created.transferNumber} sent to ${created.fromCentreName}.`);
      setFormOpen(false);
      setQuantity('');
      setNote('');
      setTab('sent');
      await load();
    } catch (createError) {
      setError(createError.message || 'The request could not be sent.');
    } finally {
      setCreating(false);
    }
  };

  const approve = async (requestId) => {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.approveTransferRequest(requestId, null);
      setNotice(`Approved ${result.transferNumber}. ${result.fromCentreName} stock has been reduced.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The request could not be approved.');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (requestId) => {
    const reason = (reasons[requestId] || '').trim();
    if (reason.length < 3) {
      setError('Type a short reason before declining.');
      return;
    }
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.declineTransferRequest(requestId, reason);
      setNotice(`Declined ${result.transferNumber}.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The request could not be declined.');
    } finally {
      setBusyId(null);
    }
  };

  const openReceive = async (requestId) => {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const detail = await transfersService.getTransferRequest(requestId);
      const lines = (detail.batches || [])
        .filter((line) => Number(line.pendingQuantity || 0) > 0)
        .map((line) => ({
          transferItemId: line.id,
          name: line.name,
          batchNumber: line.batchNumber,
          unitOfMeasure: line.unitOfMeasure,
          pending: Number(line.pendingQuantity || 0),
          accepted: String(line.pendingQuantity || ''),
          damaged: '',
          missing: '',
          rejected: ''
        }));
      if (lines.length === 0) {
        setError('Everything on this transfer has already been received.');
        return;
      }
      setReceiptDraft({
        requestId,
        transferNumber: detail.transferNumber,
        fromCentreName: detail.fromCentreName,
        note: '',
        lines
      });
    } catch (actionError) {
      setError(actionError.message || 'This transfer could not be opened.');
    } finally {
      setBusyId(null);
    }
  };

  const updateReceiptLine = (transferItemId, key, value) => {
    setReceiptDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.transferItemId === transferItemId ? { ...line, [key]: value } : line
            )
          }
        : current
    );
  };

  const openShortages = async (requestId) => {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const detail = await transfersService.getTransferRequest(requestId);
      const lines = (detail.batches || [])
        .filter(
          (line) =>
            line.discrepancyStatus === 'open' &&
            Number(line.missingQuantity || 0) + Number(line.rejectedQuantity || 0) > 0
        )
        .map((line) => ({
          lineId: line.id,
          name: line.name,
          batchNumber: line.batchNumber,
          missing: Number(line.missingQuantity || 0),
          rejected: Number(line.rejectedQuantity || 0),
          resolution: 'reissue',
          note: ''
        }));
      if (lines.length === 0) {
        setError('There are no shortages waiting for a decision on this transfer.');
        return;
      }
      setShortageDraft({
        requestId,
        transferNumber: detail.transferNumber,
        fromCentreName: detail.fromCentreName,
        lines
      });
    } catch (actionError) {
      setError(actionError.message || 'This transfer could not be opened.');
    } finally {
      setBusyId(null);
    }
  };

  const updateShortageLine = (lineId, key, value) => {
    setShortageDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.lineId === lineId ? { ...line, [key]: value } : line
            )
          }
        : current
    );
  };

  const submitShortage = async (line) => {
    if (!shortageDraft) {
      return;
    }
    const note = (line.note || '').trim();
    if (note.length < 3) {
      setError('Explain the decision in a few words.');
      return;
    }

    setShortageBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.resolveTransferShortage(
        shortageDraft.requestId,
        line.lineId,
        line.resolution,
        note
      );
      const outcome = result.resolution || {};
      setNotice(
        outcome.resolution === 'reissue'
          ? `Replacement of ${formatQuantity(
              outcome.shortageQuantity || 0
            )} ${line.name} requested as ${outcome.replacementTransferNumber || 'a new transfer'}.`
          : `Wrote off ${formatQuantity(outcome.shortageQuantity || 0)} ${
              line.name
            } on ${shortageDraft.transferNumber}.`
      );
      const remaining = shortageDraft.lines.filter((row) => row.lineId !== line.lineId);
      setShortageDraft(remaining.length > 0 ? { ...shortageDraft, lines: remaining } : null);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The decision could not be saved.');
    } finally {
      setShortageBusy(false);
    }
  };

  const submitReceive = async () => {
    if (!receiptDraft) {
      return;
    }
    const items = receiptDraft.lines
      .map((line) => ({
        transferItemId: line.transferItemId,
        acceptedQuantity: Number(line.accepted || 0),
        damagedQuantity: Number(line.damaged || 0),
        missingQuantity: Number(line.missing || 0),
        rejectedQuantity: Number(line.rejected || 0)
      }))
      .filter(
        (line) =>
          line.acceptedQuantity +
            line.damagedQuantity +
            line.missingQuantity +
            line.rejectedQuantity >
          0
      );

    if (items.length === 0) {
      setError('Enter at least one quantity that arrived.');
      return;
    }

    setReceiptBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.receiveTransferRequest(
        receiptDraft.requestId,
        receiptDraft.note || null,
        items
      );
      const summary = result.receipt || {};
      setNotice(
        summary.status === 'received'
          ? `Received ${result.transferNumber}. Accepted ${formatQuantity(
              summary.acceptedQuantity || 0
            )}, damaged ${formatQuantity(summary.damagedQuantity || 0)}, missing ${formatQuantity(
              summary.missingQuantity || 0
            )}, rejected ${formatQuantity(summary.rejectedQuantity || 0)}.`
          : `Saved. ${formatQuantity(summary.remainingQuantity || 0)} still on the way for ${
              result.transferNumber
            }.`
      );
      setReceiptDraft(null);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The receipt could not be saved.');
    } finally {
      setReceiptBusy(false);
    }
  };

  const cancel = async (requestId) => {
    const reason = (reasons[requestId] || '').trim();
    if (reason.length < 3) {
      setError('Type a short reason before cancelling.');
      return;
    }
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.cancelTransferRequest(requestId, reason);
      setNotice(`Cancelled ${result.transferNumber}.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The request could not be cancelled.');
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (request, mode) => (
    <li key={request.id} className="rounded-2xl border border-sand-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-primary-900">{request.transferNumber}</p>
          <p className="text-xs text-primary-500">
            {mode === 'incoming'
              ? `Requested by ${request.toCentreName}`
              : `From ${request.fromCentreName}`}
          </p>
          <p className="text-xs text-primary-400">
            {formatQuantity(request.totalQuantity)} units · {formatDateTime(request.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            statusStyles[request.status] || statusStyles.cancelled
          }`}
        >
          {statusLabels[request.status] || request.status}
        </span>
      </div>

      {request.decisionNote ? (
        <p className="mt-2 text-xs text-primary-500">Note: {request.decisionNote}</p>
      ) : null}

      {mode === 'incoming' && request.status === 'requested' ? (
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Reason if you decline"
            value={reasons[request.id] || ''}
            onChange={(event) =>
              setReasons((current) => ({ ...current, [request.id]: event.target.value }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => approve(request.id)}
              loading={busyId === request.id}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Approve and release
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => decline(request.id)}
              disabled={busyId === request.id}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Decline
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'sent' &&
      (request.status === 'in_transit' || request.status === 'partially_received') ? (
        <div className="mt-3 space-y-2">
          {request.status === 'partially_received' ? (
            <p className="text-[11px] text-primary-400">
              Part of this delivery is already in your store. Open the receipt to record the rest.
            </p>
          ) : null}
          <Button size="sm" onClick={() => openReceive(request.id)} loading={busyId === request.id}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Receive stock
          </Button>
        </div>
      ) : null}

      {mode === 'sent' && request.openShortages > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-amber-700">
            {request.openShortages} line{request.openShortages === 1 ? '' : 's'} short and waiting for a
            decision.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openShortages(request.id)}
            loading={busyId === request.id}
          >
            Resolve shortage
          </Button>
        </div>
      ) : null}

      {request.status === 'received' && request.receivedAt ? (
        <p className="mt-2 text-[11px] text-primary-400">
          Confirmed by {request.receivedByName || 'the store'} · {formatDateTime(request.receivedAt)}
        </p>
      ) : null}

      {mode === 'sent' && request.status === 'requested' ? (
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Reason if you cancel"
            value={reasons[request.id] || ''}
            onChange={(event) =>
              setReasons((current) => ({ ...current, [request.id]: event.target.value }))
            }
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancel(request.id)}
            disabled={busyId === request.id}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel request
          </Button>
        </div>
      ) : null}
    </li>
  );

  const selectedDrug = stock.find((item) => item.drugId === drugId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Transfer requests</h1>
          <p className="text-xs text-primary-500">
            Ask a neighbouring facility for stock, or answer a request sent to{' '}
            {activeCentre?.name || 'your store'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openForm}>
            <Send className="h-4 w-4" aria-hidden="true" />
            New request
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {formOpen ? (
        <form
          onSubmit={submitRequest}
          className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary-900">Request stock from a neighbour</p>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg p-1 text-primary-400 transition hover:bg-primary-50"
              aria-label="Close request form"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-primary-600">Facility</span>
            <select
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
            >
              {neighbours.map((neighbour) => (
                <option key={neighbour.id} value={neighbour.id}>
                  {neighbour.name} ({neighbour.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-primary-600">Drug</span>
            <select
              value={drugId}
              onChange={(event) => setDrugId(event.target.value)}
              className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
            >
              {stock.map((item) => (
                <option key={item.drugId} value={item.drugId}>
                  {item.name} ({item.code}) — {formatQuantity(item.quantity)} available
                </option>
              ))}
              {stock.length === 0 ? <option value="">No stock at this facility</option> : null}
            </select>
            {stockLoading ? (
              <span className="text-[11px] text-primary-400">Loading facility stock…</span>
            ) : null}
          </label>

          <Input
            label="Quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={selectedDrug ? `Up to ${formatQuantity(selectedDrug.quantity)}` : ''}
          />

          <Input
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for the facility"
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={creating} disabled={stock.length === 0}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Send request
            </Button>
          </div>
        </form>
      ) : null}

      {receiptDraft ? (
        <section className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-primary-900">
                Receive {receiptDraft.transferNumber}
              </p>
              <p className="text-xs text-primary-500">
                From {receiptDraft.fromCentreName}. Enter what actually arrived.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReceiptDraft(null)}
              className="rounded-lg p-1 text-primary-400 transition hover:bg-primary-50"
              aria-label="Close receipt form"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {receiptDraft.lines.map((line) => (
            <div key={line.transferItemId} className="rounded-xl border border-sand-200 p-3">
              <p className="text-sm font-semibold text-primary-800">{line.name}</p>
              <p className="text-[11px] text-primary-400">
                Batch {line.batchNumber} · {formatQuantity(line.pending)} {line.unitOfMeasure} still on
                the way
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  label="Accepted"
                  type="number"
                  min="0"
                  value={line.accepted}
                  onChange={(event) =>
                    updateReceiptLine(line.transferItemId, 'accepted', event.target.value)
                  }
                />
                <Input
                  label="Damaged"
                  type="number"
                  min="0"
                  value={line.damaged}
                  onChange={(event) =>
                    updateReceiptLine(line.transferItemId, 'damaged', event.target.value)
                  }
                />
                <Input
                  label="Missing"
                  type="number"
                  min="0"
                  value={line.missing}
                  onChange={(event) =>
                    updateReceiptLine(line.transferItemId, 'missing', event.target.value)
                  }
                />
                <Input
                  label="Rejected"
                  type="number"
                  min="0"
                  value={line.rejected}
                  onChange={(event) =>
                    updateReceiptLine(line.transferItemId, 'rejected', event.target.value)
                  }
                />
              </div>
            </div>
          ))}

          <Input
            label="Note"
            value={receiptDraft.note}
            onChange={(event) =>
              setReceiptDraft((current) => (current ? { ...current, note: event.target.value } : current))
            }
            placeholder="Optional note about this delivery"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptDraft(null)}
              disabled={receiptBusy}
            >
              Close
            </Button>
            <Button size="sm" onClick={submitReceive} loading={receiptBusy}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Save receipt
            </Button>
          </div>
        </section>
      ) : null}

      {shortageDraft ? (
        <section className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-primary-900">
                Shortage on {shortageDraft.transferNumber}
              </p>
              <p className="text-xs text-primary-500">
                From {shortageDraft.fromCentreName}. Ask for a replacement or accept the loss.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShortageDraft(null)}
              className="rounded-lg p-1 text-primary-400 transition hover:bg-primary-50"
              aria-label="Close shortage form"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {shortageDraft.lines.map((line) => (
            <div key={line.lineId} className="space-y-2 rounded-xl border border-sand-200 p-3">
              <p className="text-sm font-semibold text-primary-800">{line.name}</p>
              <p className="text-[11px] text-primary-400">
                Batch {line.batchNumber} · {formatQuantity(line.missing)} missing ·{' '}
                {formatQuantity(line.rejected)} rejected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={line.resolution === 'reissue' ? 'primary' : 'outline'}
                  onClick={() => updateShortageLine(line.lineId, 'resolution', 'reissue')}
                >
                  Ask for replacement
                </Button>
                <Button
                  size="sm"
                  variant={line.resolution === 'written_off' ? 'primary' : 'outline'}
                  onClick={() => updateShortageLine(line.lineId, 'resolution', 'written_off')}
                >
                  Write off
                </Button>
              </div>
              <Input
                label="Why"
                value={line.note}
                onChange={(event) =>
                  updateShortageLine(line.lineId, 'note', event.target.value)
                }
                placeholder="Short reason for this decision"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => submitShortage(line)}
                  loading={shortageBusy}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Save decision
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-sand-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('sent')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'sent' ? 'bg-primary-50 text-primary-800' : 'text-primary-400'
          }`}
        >
          My requests ({sent.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'incoming' ? 'bg-primary-50 text-primary-800' : 'text-primary-400'
          }`}
        >
          To approve ({incoming.length})
        </button>
      </div>

      <ul className="space-y-3">
        {(tab === 'sent' ? sent : incoming).map((request) =>
          renderCard(request, tab === 'sent' ? 'sent' : 'incoming')
        )}
        {!loading && (tab === 'sent' ? sent : incoming).length === 0 ? (
          <li className="rounded-2xl border border-sand-200 bg-white px-4 py-8 text-center text-xs text-primary-400">
            {tab === 'sent'
              ? 'You have not asked a neighbouring facility for stock yet.'
              : 'No facility has asked you for stock.'}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
