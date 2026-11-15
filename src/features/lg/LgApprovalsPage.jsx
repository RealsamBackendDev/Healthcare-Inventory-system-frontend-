import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import * as lgService from '../../services/lg.service.js';
import { formatCurrency, formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const tabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

export default function LgApprovalsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('pending');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listApprovals({ status });
      setApprovals(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Approvals could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = approvals.find((item) => item.id === selectedId) || null;
  const isOwnRequest = selected && selected.requestedByName === user?.fullName;

  const handleApprove = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await lgService.approveApproval(selectedId, comment || null);
      setNotice(
        result.reference
          ? `Approved and posted as ${result.reference.label}.`
          : 'Approval granted.'
      );
      setSelectedId(null);
      setComment('');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The request could not be approved.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await lgService.rejectApproval(selectedId, rejectReason.trim());
      setNotice('Request rejected.');
      setSelectedId(null);
      setShowReject(false);
      setRejectReason('');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'The request could not be rejected.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Second approvals</h1>
          <p className="text-xs text-primary-500">
            Receipts and dispatches above your thresholds wait here for a different officer
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
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
            onClick={() => {
              setStatus(tab.value);
              setSelectedId(null);
            }}
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
            {approvals.map((approval) => (
              <li key={approval.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(approval.id);
                    setShowReject(false);
                    setRejectReason('');
                    setComment('');
                  }}
                  className={`w-full px-4 py-3 text-left transition hover:bg-primary-50 ${
                    selectedId === approval.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-800">
                        {titleCase(approval.type)} · {formatQuantity(approval.quantity)} units
                      </p>
                      <p className="text-xs text-primary-500">
                        {approval.requestedByName} · {formatDateTime(approval.requestedAt)}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold uppercase text-primary-400">
                      {titleCase(approval.status)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {!loading && approvals.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-primary-400">
                Nothing waiting. Large receipts and dispatches appear here for a second officer.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-4">
          {!selected ? (
            <p className="py-10 text-center text-xs text-primary-400">Pick a request to review it.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary-900">{selected.summary}</p>
                  <p className="text-xs text-primary-500">
                    Requested by {selected.requestedByName} · {formatDateTime(selected.requestedAt)}
                  </p>
                </div>
                <p className="text-[11px] font-semibold uppercase text-primary-400">
                  {titleCase(selected.status)}
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-primary-400">Quantity</dt>
                  <dd className="font-semibold text-primary-800">{formatQuantity(selected.quantity)} units</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-primary-400">Value</dt>
                  <dd className="font-semibold text-primary-800">
                    {selected.value === null ? '—' : formatCurrency(selected.value)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-primary-400">Expires</dt>
                  <dd className="text-primary-700">{formatDateTime(selected.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-primary-400">Decided by</dt>
                  <dd className="text-primary-700">{selected.decidedByName || '—'}</dd>
                </div>
              </dl>

              {selected.reason ? (
                <Alert tone="info" className="mt-3">
                  {selected.reason}
                </Alert>
              ) : null}

              {selected.status === 'pending' ? (
                isOwnRequest ? (
                  <Alert tone="warning" className="mt-3">
                    You raised this request. A different officer has to approve it.
                  </Alert>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Input
                      label="Approval note"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Optional note for the record"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleApprove} loading={busy}>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Approve and post
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
                )
              ) : null}
            </>
          )}
        </section>
      </div>
    </LgShell>
  );
}
