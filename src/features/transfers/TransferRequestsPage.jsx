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
  received: 'Received',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

const statusStyles = {
  requested: 'bg-amber-50 text-amber-700 border-amber-200',
  in_transit: 'bg-leaf-50 text-primary-700 border-leaf-200',
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

  const receive = async (requestId) => {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const result = await transfersService.receiveTransferRequest(requestId, null);
      setNotice(`Received ${result.transferNumber}. Stock added to your store.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The stock could not be received.');
    } finally {
      setBusyId(null);
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

      {mode === 'sent' && request.status === 'in_transit' ? (
        <div className="mt-3">
          <Button size="sm" onClick={() => receive(request.id)} loading={busyId === request.id}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Confirm received
          </Button>
        </div>
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
