import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDate, formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const statusTone = {
  in_transit: 'text-leaf-600',
  received: 'text-primary-700',
  cancelled: 'text-maroon-600'
};

export default function LgTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState('list');
  const [fromCentreId, setFromCentreId] = useState('');
  const [toCentreId, setToCentreId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
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
      const result = await lgService.listTransfers();
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

  const openNew = async () => {
    setMode('new');
    setDetail(null);
    setFromCentreId('');
    setToCentreId('');
    setNotes('');
    setLines([]);
    setError('');
    try {
      const result = await lgService.listTransferFacilities();
      setFacilities(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Facilities could not be loaded.');
    }
  };

  const chooseSource = async (facilityId) => {
    setFromCentreId(facilityId);
    setLines([]);
    if (!facilityId) {
      return;
    }
    setStockLoading(true);
    setError('');
    try {
      const result = await lgService.getTransferFacilityStock(facilityId);
      setLines(
        (result.items || [])
          .filter((item) => item.usableQuantity > 0)
          .map((item) => ({
            drugId: item.drugId,
            name: item.drugName,
            code: item.drugCode,
            available: item.usableQuantity,
            quantity: ''
          }))
      );
    } catch (loadError) {
      setError(loadError.message || 'The source facility stock could not be loaded.');
    } finally {
      setStockLoading(false);
    }
  };

  const setLineQuantity = (drugId, value) => {
    setLines((current) =>
      current.map((line) => (line.drugId === drugId ? { ...line, quantity: value } : line))
    );
  };

  const submit = async () => {
    const items = lines
      .map((line) => ({ drugId: line.drugId, quantity: Number(line.quantity) }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (items.length === 0) {
      setError('Enter a quantity for at least one drug.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const created = await lgService.createTransfer({
        fromCentreId,
        toCentreId,
        notes: notes || null,
        items
      });
      setNotice(`Transfer ${created.transferNumber} sent to ${created.toCentreName}.`);
      setMode('list');
      setDetail(created);
      await load();
    } catch (createError) {
      setError(createError.message || 'The transfer could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (transferId) => {
    setMode('list');
    setShowCancel(false);
    setCancelReason('');
    setError('');
    try {
      const result = await lgService.getTransfer(transferId);
      setDetail(result);
    } catch (loadError) {
      setError(loadError.message || 'The transfer could not be opened.');
    }
  };

  const cancelTransfer = async (transferId) => {
    setBusy(true);
    setError('');
    try {
      const result = await lgService.cancelTransfer(transferId, cancelReason.trim());
      setDetail(result);
      setNotice(`${result.transferNumber} cancelled and the stock returned.`);
      setShowCancel(false);
      setCancelReason('');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The transfer could not be cancelled.');
    } finally {
      setBusy(false);
    }
  };

  const total = lines.reduce((sum, line) => {
    const value = Number(line.quantity);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Transfers</h1>
          <p className="text-xs text-primary-500">
            Move stock between facilities in this LG without going through the warehouse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            New transfer
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      {mode === 'new' ? (
        <section className="mt-4 rounded-2xl border border-sand-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary-500">
                From facility
              </span>
              <select
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-primary-800"
                value={fromCentreId}
                onChange={(event) => chooseSource(event.target.value)}
              >
                <option value="">Select the sending facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary-500">
                To facility
              </span>
              <select
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-primary-800"
                value={toCentreId}
                onChange={(event) => setToCentreId(event.target.value)}
              >
                <option value="">Select the receiving facility</option>
                {facilities
                  .filter((facility) => facility.id !== fromCentreId)
                  .map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {stockLoading ? <p className="mt-3 text-xs text-primary-400">Loading stock…</p> : null}

          {!stockLoading && fromCentreId && lines.length === 0 ? (
            <p className="mt-3 text-xs text-primary-400">That facility has no usable stock to transfer.</p>
          ) : null}

          {lines.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                    <th className="py-1 pr-3">Drug</th>
                    <th className="py-1 pr-3 text-right">Available</th>
                    <th className="py-1 text-right">Send</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {lines.map((line) => (
                    <tr key={line.drugId}>
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-primary-800">{line.name}</p>
                        <p className="text-xs text-primary-400">{line.code}</p>
                      </td>
                      <td className="py-2 pr-3 text-right text-primary-700">{formatQuantity(line.available)}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={line.available}
                          step="1"
                          className="w-24 rounded-lg border border-sand-200 px-2 py-1 text-right text-sm"
                          value={line.quantity}
                          onChange={(event) => setLineQuantity(line.drugId, event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-3">
            <Input
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for the transfer"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-primary-500">{formatQuantity(total)} units to send</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('list')}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={!fromCentreId || !toCentreId || total <= 0}
                loading={busy}
              >
                Create and send
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {transfers.map((transfer) => (
              <li key={transfer.id}>
                <button
                  type="button"
                  onClick={() => openDetail(transfer.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    detail?.id === transfer.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-800">{transfer.transferNumber}</p>
                      <p className="text-xs text-primary-500">
                        {transfer.fromCentreName} → {transfer.toCentreName}
                      </p>
                      <p className="text-xs text-primary-400">
                        {formatQuantity(transfer.totalQuantity)} units · {formatDateTime(transfer.createdAt)}
                      </p>
                    </div>
                    <p className={`text-[11px] font-semibold uppercase ${statusTone[transfer.status] || ''}`}>
                      {titleCase(transfer.status)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {!loading && transfers.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                No transfers yet. Move stock between facilities from here.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-4">
          {!detail ? (
            <p className="py-10 text-center text-xs text-primary-400">Pick a transfer to see its batches.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{detail.transferNumber}</p>
                  <p className="text-xs text-primary-500">
                    {detail.fromCentreName} → {detail.toCentreName}
                  </p>
                  <p className="text-xs text-primary-500">
                    {detail.createdByName} · {formatDateTime(detail.createdAt)}
                  </p>
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
                      <th className="py-1 pr-3">Batch</th>
                      <th className="py-1 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {detail.items.map((item) => (
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

              {detail.status === 'in_transit' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCancel((current) => !current)}>
                    Cancel transfer
                  </Button>
                </div>
              ) : null}

              {showCancel && detail.status === 'in_transit' ? (
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
                      onClick={() => cancelTransfer(detail.id)}
                      loading={busy}
                    >
                      Confirm cancellation
                    </Button>
                  </div>
                </div>
              ) : null}

              {detail.status === 'received' ? (
                <p className="mt-3 text-xs text-primary-500">
                  Received by {detail.receivedByName || '—'} on {formatDateTime(detail.receivedAt)}
                  {detail.receivedNote ? ` — ${detail.receivedNote}` : ''}
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
