import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Plus, RefreshCw, Send, Trash2, X } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as inventoryService from '../../services/inventory.service.js';
import * as transfersService from '../../services/transfers.service.js';
import { formatDateTime, formatQuantity } from '../../utils/format.js';

const statusLabels = {
  pending_approval: 'Waiting for OIC approval',
  requested: 'Waiting for the source facility',
  in_transit: 'Approved, on the way',
  partially_received: 'Part received',
  received: 'Received',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

const statusStyles = {
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  requested: 'bg-amber-50 text-amber-700 border-amber-200',
  in_transit: 'bg-leaf-50 text-primary-700 border-leaf-200',
  partially_received: 'bg-amber-50 text-amber-700 border-amber-200',
  received: 'bg-primary-50 text-primary-700 border-primary-200',
  declined: 'bg-maroon-50 text-maroon-700 border-maroon-200',
  cancelled: 'bg-sand-100 text-primary-500 border-sand-200'
};

export default function TransferRequestsPage() {
  const { activeCentre, user, isAdministrator } = useAuth();

  const [tab, setTab] = useState('sent');
  const [sent, setSent] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
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
  const [lines, setLines] = useState([{ key: 'line-1', drugId: '', quantity: '' }]);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendFacilityId, setSendFacilityId] = useState('');
  const [sendStock, setSendStock] = useState([]);
  const [sendLines, setSendLines] = useState([{ key: 'send-1', drugId: '', quantity: '' }]);
  const [sendNote, setSendNote] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sentRows, incomingRows, endorseRows] = await Promise.all([
        transfersService.listTransferRequests('outgoing'),
        transfersService.listTransferRequests('incoming'),
        transfersService.listTransferRequests('endorse').catch(() => [])
      ]);
      setSent(sentRows || []);
      setIncoming(incomingRows || []);
      const endorsed = await Promise.all(
        (endorseRows || []).map(async (row) => {
          try {
            const detail = await transfersService.getTransferRequest(row.id);
            return { ...row, items: detail.items || [] };
          } catch (detailError) {
            return row;
          }
        })
      );
      setEndorsements(endorsed);
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
        setLines([
          {
            key: 'line-1',
            drugId: result.items && result.items.length > 0 ? result.items[0].drugId : '',
            quantity: ''
          }
        ]);
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

  const addLine = () => {
    const used = new Set(lines.map((line) => line.drugId));
    const next = stock.find((item) => !used.has(item.drugId)) || stock[0] || null;
    setLines((current) => [
      ...current,
      {
        key: `line-${Math.random().toString(36).slice(2, 9)}`,
        drugId: next ? next.drugId : '',
        quantity: ''
      }
    ]);
  };

  const removeLine = (key) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  };

  const updateLine = (key, patch) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const prepared = lines
      .map((line) => ({ drugId: line.drugId, quantity: Number(line.quantity) }))
      .filter((line) => line.drugId && line.quantity > 0);
    if (prepared.length === 0) {
      setError('Choose at least one drug and enter a quantity above zero.');
      return;
    }
    if (prepared.length !== lines.length) {
      setError('Every drug line needs a quantity above zero, or remove the line.');
      return;
    }
    const chosen = new Set(prepared.map((line) => line.drugId));
    if (chosen.size !== prepared.length) {
      setError('Remove the duplicate drug line before sending.');
      return;
    }
    const overAsk = prepared.find((line) => {
      const row = stock.find((item) => item.drugId === line.drugId);
      return row && line.quantity > Number(row.quantity);
    });
    if (overAsk) {
      const row = stock.find((item) => item.drugId === overAsk.drugId);
      setError(
        `${row.name} only has ${formatQuantity(row.quantity)} ${
          row.unitOfMeasure || 'units'
        } available there, so the quantity cannot go above that.`
      );
      return;
    }
    setCreating(true);
    try {
      const created = await transfersService.createTransferRequest({
        fromCentreId: facilityId,
        note: note || null,
        items: prepared
      });
      setNotice(`Request ${created.transferNumber} sent to ${created.fromCentreName}.`);
      setFormOpen(false);
      setLines([{ key: 'line-1', drugId: stock.length > 0 ? stock[0].drugId : '', quantity: '' }]);
      setNote('');
      setTab('sent');
      await load();
    } catch (createError) {
      setError(createError.message || 'The request could not be sent.');
    } finally {
      setCreating(false);
    }
  };

  const openSendForm = async () => {
    setSendOpen(true);
    setError('');
    setNotice('');
    if (neighbours.length === 0) {
      try {
        const rows = await transfersService.listNeighbours();
        setNeighbours(rows || []);
        if (rows && rows.length > 0) {
          setSendFacilityId(rows[0].id);
        }
      } catch (loadError) {
        setError(loadError.message || 'Neighbouring facilities could not be loaded.');
      }
    } else if (!sendFacilityId) {
      setSendFacilityId(neighbours[0].id);
    }
    try {
      const result = await inventoryService.listInventory({ pageSize: 100 });
      const items = (result.items || []).filter((row) => Number(row.usableQuantity) > 0);
      setSendStock(items);
      setSendLines([
        { key: 'send-1', drugId: items.length > 0 ? items[0].drugId : '', quantity: '' }
      ]);
    } catch (loadError) {
      setError(loadError.message || 'Your store stock could not be loaded.');
    }
  };

  const addSendLine = () => {
    const used = new Set(sendLines.map((line) => line.drugId));
    const next = sendStock.find((item) => !used.has(item.drugId)) || sendStock[0] || null;
    setSendLines((current) => [
      ...current,
      {
        key: `send-${Math.random().toString(36).slice(2, 9)}`,
        drugId: next ? next.drugId : '',
        quantity: ''
      }
    ]);
  };

  const removeSendLine = (key) => {
    setSendLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key)
    );
  };

  const updateSendLine = (key, patch) => {
    setSendLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const submitSend = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const prepared = sendLines
      .map((line) => ({ drugId: line.drugId, quantity: Number(line.quantity) }))
      .filter((line) => line.drugId && line.quantity > 0);
    if (prepared.length === 0) {
      setError('Choose at least one drug and enter a quantity above zero.');
      return;
    }
    if (prepared.length !== sendLines.length) {
      setError('Every drug line needs a quantity above zero, or remove the line.');
      return;
    }
    if (new Set(prepared.map((line) => line.drugId)).size !== prepared.length) {
      setError('Remove the duplicate drug line before sending.');
      return;
    }
    const tooMuch = prepared.find((line) => {
      const row = sendStock.find((item) => item.drugId === line.drugId);
      return row && line.quantity > Number(row.usableQuantity);
    });
    if (tooMuch) {
      const row = sendStock.find((item) => item.drugId === tooMuch.drugId);
      setError(
        `You only have ${formatQuantity(row.usableQuantity)} ${
          row.unitOfMeasure || 'units'
        } of ${row.name}, so the quantity cannot go above that.`
      );
      return;
    }
    setSending(true);
    try {
      const created = await transfersService.sendStock({
        toCentreId: sendFacilityId,
        note: sendNote || null,
        items: prepared
      });
      setNotice(
        created.status === 'pending_approval'
          ? `${created.transferNumber} is waiting for the OIC to approve sending it to ${created.toCentreName}.`
          : `${created.transferNumber} sent to ${created.toCentreName}. They confirm when it arrives.`
      );
      setSendOpen(false);
      setSendNote('');
      setSendLines([{ key: 'send-1', drugId: '', quantity: '' }]);
      setTab('sent');
      await load();
    } catch (sendError) {
      setError(sendError.message || 'The stock could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const endorse = async (requestId) => {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.endorseTransferRequest(requestId, null);
      setNotice(
        result.direction === 'out'
          ? `Approved ${result.transferNumber}. The stock is on its way to ${result.toCentreName}.`
          : `Approved ${result.transferNumber}. ${result.fromCentreName} has been asked for the stock.`
      );
      await load();
    } catch (actionError) {
      setError(actionError.message || 'This request could not be approved.');
    } finally {
      setBusyId(null);
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
              : mode === 'endorse'
                ? request.direction === 'out'
                  ? `${request.requestedByName || 'Staff'} wants to send stock to ${request.toCentreName}`
                  : `Raised by ${request.requestedByName || 'staff'}`
                : request.direction === 'out'
                  ? `Sent to ${request.toCentreName}`
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

      {mode === 'sent' && request.status === 'pending_approval' ? (
        <p className="mt-2 text-[11px] text-amber-700">
          {request.direction === 'out'
            ? 'Waiting for the OIC to approve this before the stock leaves your store.'
            : `Waiting for the OIC to approve this before ${request.fromCentreName} sees it.`}
        </p>
      ) : null}

      {mode === 'sent' && request.direction === 'out' && request.status !== 'pending_approval' ? (
        <p className="mt-2 text-[11px] text-primary-400">
          {request.toCentreName} confirms when the stock arrives.
        </p>
      ) : null}

      {mode === 'endorse' && Array.isArray(request.items) && request.items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {request.items.map((item) => (
            <li key={item.drugId} className="text-[11px] text-primary-600">
              {item.name}: {formatQuantity(item.quantity)} {item.unitOfMeasure}
            </li>
          ))}
        </ul>
      ) : null}

      {mode === 'endorse' && request.status === 'pending_approval' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => endorse(request.id)} loading={busyId === request.id}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {request.direction === 'out' ? 'Approve and release stock' : 'Approve request'}
          </Button>
        </div>
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
      request.direction !== 'out' &&
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

      {mode === 'sent' && request.direction !== 'out' && request.openShortages > 0 ? (
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

      {mode === 'sent' &&
      (request.status === 'requested' || request.status === 'pending_approval') &&
      (request.requestedById === (user && user.id) || isAdministrator) ? (
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Transfer requests</h1>
          <p className="text-xs text-primary-500">
            Ask a neighbouring facility for stock, send them stock, or answer a request sent to{' '}
            {activeCentre?.name || 'your store'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={openSendForm}>
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Send stock
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-600">Drugs to request</span>
              <span className="text-[11px] text-primary-400">
                {lines.length} line{lines.length === 1 ? '' : 's'}
              </span>
            </div>
            {stockLoading ? (
              <span className="text-[11px] text-primary-400">Loading facility stock…</span>
            ) : null}
            {lines.map((line) => {
              const lineDrug = stock.find((item) => item.drugId === line.drugId);
              return (
                <div key={line.key} className="space-y-2 rounded-xl border border-sand-200 p-3">
                  <div className="flex items-start gap-2">
                    <label className="block min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-semibold text-primary-600">Drug</span>
                      <select
                        value={line.drugId}
                        onChange={(event) => updateLine(line.key, { drugId: event.target.value })}
                        className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
                      >
                        {stock.map((item) => (
                          <option key={item.drugId} value={item.drugId}>
                            {item.name} ({item.code}) — {formatQuantity(item.quantity)} available
                          </option>
                        ))}
                        {stock.length === 0 ? <option value="">No stock at this facility</option> : null}
                      </select>
                    </label>
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="mt-6 rounded-lg p-2 text-maroon-600 transition hover:bg-maroon-50"
                        aria-label="Remove drug line"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    placeholder={lineDrug ? `Up to ${formatQuantity(lineDrug.quantity)}` : ''}
                  />
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={stock.length === 0}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add another drug
            </Button>
          </div>

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

      {sendOpen ? (
        <form
          onSubmit={submitSend}
          className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary-900">Send stock to a facility</p>
            <button
              type="button"
              onClick={() => setSendOpen(false)}
              className="rounded-lg p-1 text-primary-400 transition hover:bg-primary-50"
              aria-label="Close send form"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-primary-600">Send to</span>
            <select
              value={sendFacilityId}
              onChange={(event) => setSendFacilityId(event.target.value)}
              className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
            >
              {neighbours.map((neighbour) => (
                <option key={neighbour.id} value={neighbour.id}>
                  {neighbour.name} ({neighbour.code})
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-600">Drugs to send</span>
              <span className="text-[11px] text-primary-400">
                {sendLines.length} line{sendLines.length === 1 ? '' : 's'}
              </span>
            </div>
            {sendLines.map((line) => {
              const lineDrug = sendStock.find((item) => item.drugId === line.drugId);
              return (
                <div key={line.key} className="space-y-2 rounded-xl border border-sand-200 p-3">
                  <div className="flex items-start gap-2">
                    <label className="block min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-semibold text-primary-600">Drug</span>
                      <select
                        value={line.drugId}
                        onChange={(event) => updateSendLine(line.key, { drugId: event.target.value })}
                        className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
                      >
                        {sendStock.map((item) => (
                          <option key={item.drugId} value={item.drugId}>
                            {item.name} ({item.code}) — {formatQuantity(item.usableQuantity)} available
                          </option>
                        ))}
                        {sendStock.length === 0 ? <option value="">No stock in your store</option> : null}
                      </select>
                    </label>
                    {sendLines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSendLine(line.key)}
                        className="mt-6 rounded-lg p-2 text-maroon-600 transition hover:bg-maroon-50"
                        aria-label="Remove drug line"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) => updateSendLine(line.key, { quantity: event.target.value })}
                    placeholder={lineDrug ? `Up to ${formatQuantity(lineDrug.usableQuantity)}` : ''}
                  />
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSendLine}
              disabled={sendStock.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add another drug
            </Button>
          </div>

          <Input
            label="Note"
            value={sendNote}
            onChange={(event) => setSendNote(event.target.value)}
            placeholder="Optional note for the facility"
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={sending} disabled={sendStock.length === 0}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Send stock
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
        {isAdministrator ? (
          <button
            type="button"
            onClick={() => setTab('endorse')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === 'endorse' ? 'bg-primary-50 text-primary-800' : 'text-primary-400'
            }`}
          >
            OIC approval ({endorsements.length})
          </button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {(tab === 'sent' ? sent : tab === 'incoming' ? incoming : endorsements).map((request) =>
          renderCard(request, tab === 'sent' ? 'sent' : tab === 'incoming' ? 'incoming' : 'endorse')
        )}
        {!loading &&
        (tab === 'sent' ? sent : tab === 'incoming' ? incoming : endorsements).length === 0 ? (
          <li className="rounded-2xl border border-sand-200 bg-white px-4 py-8 text-center text-xs text-primary-400">
            {tab === 'sent'
              ? 'You have not asked a neighbouring facility for stock yet.'
              : tab === 'incoming'
                ? 'No facility has asked you for stock.'
                : 'No staff request is waiting for your approval.'}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
