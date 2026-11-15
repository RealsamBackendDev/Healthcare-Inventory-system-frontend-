import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

export default function LgConsolidationsPage() {
  const [consolidations, setConsolidations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selection, setSelection] = useState([]);
  const [preview, setPreview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState('list');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listConsolidations();
      setConsolidations(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Consolidations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalSelected = useMemo(
    () =>
      candidates
        .filter((candidate) => selection.includes(candidate.requisitionId))
        .reduce((total, candidate) => total + candidate.totalQuantity, 0),
    [candidates, selection]
  );

  const openNew = async () => {
    setMode('new');
    setPreview(null);
    setSelection([]);
    setDetail(null);
    setError('');
    try {
      const result = await lgService.getConsolidationCandidates();
      setCandidates(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Approved requests could not be loaded.');
    }
  };

  const toggleCandidate = (requisitionId) => {
    setPreview(null);
    setSelection((current) =>
      current.includes(requisitionId)
        ? current.filter((id) => id !== requisitionId)
        : [...current, requisitionId]
    );
  };

  const runPreview = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await lgService.previewConsolidation(selection);
      setPreview(result);
    } catch (previewError) {
      setError(previewError.message || 'The selection could not be reviewed.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await lgService.createConsolidation(selection);
      setNotice(`Draft ${created.reference} saved.`);
      setMode('list');
      setPreview(null);
      setSelection([]);
      setDetail(created);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'The consolidation could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (consolidationId) => {
    setMode('list');
    setPreview(null);
    setError('');
    try {
      const result = await lgService.getConsolidation(consolidationId);
      setDetail(result);
    } catch (loadError) {
      setError(loadError.message || 'The consolidation could not be opened.');
    }
  };

  const changeStatus = async (consolidationId, action) => {
    setBusy(true);
    setError('');
    try {
      const result =
        action === 'finalize'
          ? await lgService.finalizeConsolidation(consolidationId)
          : await lgService.cancelConsolidation(consolidationId);
      setDetail(result);
      setNotice(action === 'finalize' ? `${result.reference} finalized.` : `${result.reference} cancelled.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The consolidation could not be updated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Consolidations</h1>
          <p className="text-xs text-primary-500">
            Combine approved requests from several facilities into one demand, with the warehouse gap
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            New consolidation
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {notice ? <Alert tone="success" className="mt-4">{notice}</Alert> : null}

      {mode === 'new' ? (
        <section className="mt-4 rounded-2xl border border-sand-200 bg-white p-4">
          <h2 className="text-sm font-bold text-primary-900">1. Approved requests</h2>
          <p className="text-xs text-primary-500">
            Requests already consolidated do not appear here.
          </p>

          <ul className="mt-3 divide-y divide-sand-100">
            {candidates.map((candidate) => (
              <li key={candidate.requisitionId} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selection.includes(candidate.requisitionId)}
                  onChange={() => toggleCandidate(candidate.requisitionId)}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary-800">{candidate.centreName}</p>
                  <p className="text-xs text-primary-500">
                    {candidate.requisitionNumber} · {candidate.itemCount} item(s)
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary-700">
                  {formatQuantity(candidate.totalQuantity)} units
                </p>
              </li>
            ))}
            {candidates.length === 0 ? (
              <li className="py-6 text-center text-xs text-primary-400">
                No approved requests are waiting to be consolidated.
              </li>
            ) : null}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-primary-500">
              {selection.length} selected · {formatQuantity(totalSelected)} units
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('list')}>
                Close
              </Button>
              <Button size="sm" onClick={runPreview} disabled={selection.length === 0} loading={busy}>
                Review selection
              </Button>
            </div>
          </div>

          {preview ? (
            <div className="mt-4 rounded-xl border border-sand-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-primary-900">2. Combined demand</h3>
                <p className="text-xs text-primary-500">
                  {preview.totals.itemCount} drug(s) · {formatQuantity(preview.totals.requestedQuantity)} requested ·{' '}
                  {formatQuantity(preview.totals.gapQuantity)} short
                </p>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                      <th className="py-1 pr-3">Drug</th>
                      <th className="py-1 pr-3 text-right">Requested</th>
                      <th className="py-1 pr-3 text-right">In warehouse</th>
                      <th className="py-1 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {preview.items.map((item) => (
                      <tr key={item.drugId}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-primary-800">{item.name}</p>
                          <p className="text-xs text-primary-400">{item.code}</p>
                        </td>
                        <td className="py-2 pr-3 text-right text-primary-700">
                          {formatQuantity(item.requestedQuantity)}
                        </td>
                        <td className="py-2 pr-3 text-right text-primary-700">
                          {formatQuantity(item.warehouseQuantity)}
                        </td>
                        <td
                          className={`py-2 text-right font-semibold ${
                            item.gapQuantity > 0 ? 'text-maroon-600' : 'text-primary-600'
                          }`}
                        >
                          {formatQuantity(item.gapQuantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={saveDraft} loading={busy}>
                  Save as draft
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {consolidations.map((consolidation) => (
              <li key={consolidation.id}>
                <button
                  type="button"
                  onClick={() => openDetail(consolidation.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    detail?.id === consolidation.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-800">{consolidation.reference}</p>
                      <p className="text-xs text-primary-500">
                        {consolidation.sourceCount} request(s) · {consolidation.itemCount} drug(s) ·{' '}
                        {formatDateTime(consolidation.createdAt)}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold uppercase text-primary-400">
                      {titleCase(consolidation.status)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-primary-500">
                    {formatQuantity(consolidation.totalQuantity)} units requested ·{' '}
                    {formatQuantity(consolidation.gapQuantity)} short
                  </p>
                </button>
              </li>
            ))}
            {!loading && consolidations.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                No consolidations yet. Start one from your approved requests.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-4">
          {!detail ? (
            <p className="py-10 text-center text-xs text-primary-400">Pick a consolidation to see its demand.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{detail.reference}</p>
                  <p className="text-xs text-primary-500">
                    {detail.createdByName} · {formatDateTime(detail.createdAt)}
                  </p>
                </div>
                <p className="text-[11px] font-semibold uppercase text-primary-400">
                  {titleCase(detail.status)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-primary-50 p-2">
                  <p className="text-[11px] uppercase text-primary-400">Requested</p>
                  <p className="text-sm font-bold text-primary-800">{formatQuantity(detail.totalQuantity)}</p>
                </div>
                <div className="rounded-xl bg-primary-50 p-2">
                  <p className="text-[11px] uppercase text-primary-400">In warehouse</p>
                  <p className="text-sm font-bold text-primary-800">
                    {formatQuantity(
                      detail.items.reduce((total, item) => total + item.warehouseQuantity, 0)
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-maroon-50 p-2">
                  <p className="text-[11px] uppercase text-maroon-500">Short</p>
                  <p className="text-sm font-bold text-maroon-700">{formatQuantity(detail.gapQuantity)}</p>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-primary-400">
                      <th className="py-1 pr-3">Drug</th>
                      <th className="py-1 pr-3 text-right">Requested</th>
                      <th className="py-1 pr-3 text-right">In store</th>
                      <th className="py-1 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {detail.items.map((item) => (
                      <tr key={item.drugId}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-primary-800">{item.name}</p>
                          <p className="text-xs text-primary-400">{item.code}</p>
                        </td>
                        <td className="py-2 pr-3 text-right text-primary-700">
                          {formatQuantity(item.requestedQuantity)}
                        </td>
                        <td className="py-2 pr-3 text-right text-primary-700">
                          {formatQuantity(item.warehouseQuantity)}
                        </td>
                        <td
                          className={`py-2 text-right font-semibold ${
                            item.gapQuantity > 0 ? 'text-maroon-600' : 'text-primary-600'
                          }`}
                        >
                          {formatQuantity(item.gapQuantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wide text-primary-400">Requests included</p>
                <ul className="mt-1 space-y-1 text-xs text-primary-600">
                  {detail.sources.map((source) => (
                    <li key={source.requisitionId} className="flex justify-between gap-2">
                      <span>
                        {source.centreName} · {source.requisitionNumber}
                      </span>
                      <span>{formatQuantity(source.requestedQuantity)} units</span>
                    </li>
                  ))}
                </ul>
              </div>

              {detail.status === 'draft' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => changeStatus(detail.id, 'finalize')} loading={busy}>
                    Finalize
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => changeStatus(detail.id, 'cancel')} loading={busy}>
                    Cancel draft
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-primary-500">
                  {detail.status === 'finalized'
                    ? `Finalized by ${detail.finalizedByName || '—'} on ${formatDateTime(detail.finalizedAt)}`
                    : `Cancelled by ${detail.cancelledByName || '—'} on ${formatDateTime(detail.cancelledAt)}`}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </LgShell>
  );
}
