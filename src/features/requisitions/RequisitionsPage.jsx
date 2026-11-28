import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Search, Sparkles } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ShortagePanel from './components/ShortagePanel.jsx';
import RequisitionStatusPill from './components/RequisitionStatusPill.jsx';
import RequisitionFormDrawer from './components/RequisitionFormDrawer.jsx';
import RequisitionDetailDrawer from './components/RequisitionDetailDrawer.jsx';
import {
  amendRequisition,
  approveRequisition,
  cancelRequisition,
  closeRequisition,
  deleteRequisition,
  generateSuggestions,
  getRequisition,
  getShortages,
  listRequisitions,
  rejectRequisition,
  submitRequisition
} from '../../services/requisitions.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const PAGE_SIZE = 20;

const filters = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending_oic', label: 'OIC approval' },
  { value: 'pending_approval', label: 'With Logistician' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' }
];

export default function RequisitionsPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.REQUISITIONS_CREATE);
  const canApprove = hasPermission(PERMISSIONS.REQUISITIONS_APPROVE);

  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [shortages, setShortages] = useState([]);
  const [loadingShortages, setLoadingShortages] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listRequisitions({
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE
      });
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Requisitions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  const loadShortages = useCallback(async () => {
    if (!canCreate) {
      setLoadingShortages(false);
      return;
    }
    setLoadingShortages(true);
    try {
      const result = await getShortages();
      setShortages(Array.isArray(result) ? result : result.items || []);
    } catch {
      setShortages([]);
    } finally {
      setLoadingShortages(false);
    }
  }, [canCreate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadShortages();
  }, [loadShortages]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const openDetail = useCallback(async (requisitionId) => {
    setDetailId(requisitionId);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const result = await getRequisition(requisitionId);
      setDetail(result);
    } catch (loadError) {
      setDetailError(loadError.message || 'The requisition could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
  };

  const refreshAll = () => {
    load();
    loadShortages();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const result = await generateSuggestions();
      if (!result.requisition) {
        setNotice(result.message || 'No shortages were found.');
        return;
      }
      setNotice(
        `Draft ${result.requisition.requisitionNumber} created with ${result.items.length} item${
          result.items.length === 1 ? '' : 's'
        }. Review it before submitting.`
      );
      refreshAll();
      setDetailId(result.requisition.id);
      setDetail(result);
      setDetailLoading(false);
    } catch (generateError) {
      setError(generateError.message || 'A draft could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDetailAction = async (action, payload) => {
    const requisition = detail?.requisition;
    if (!requisition) {
      return;
    }

    if (action === 'edit') {
      setEditing(detail);
      setFormOpen(true);
      return;
    }

    let reason = null;

    if (action === 'reject') {
      const input = window.prompt('Reason for rejection (at least 3 characters)');
      if (!input || input.trim().length < 3) {
        return;
      }
      reason = input.trim();
    } else if (action === 'cancel') {
      const input = window.prompt('Reason for cancelling (optional)');
      if (input === null) {
        return;
      }
      reason = input.trim() || null;
    } else if (action === 'delete') {
      if (!window.confirm(`Delete draft ${requisition.requisitionNumber}? This cannot be undone.`)) {
        return;
      }
    } else if (action === 'submit') {
      const message = canApprove
        ? 'Submit this requisition? As OIC it goes straight to the Logistician and can no longer be edited.'
        : 'Submit this requisition for OIC approval? It can no longer be edited.';
      if (!window.confirm(message)) {
        return;
      }
    } else if (action === 'approve') {
      const itemCount = payload?.items?.length || 0;
      const message =
        itemCount > 0
          ? `Approve ${requisition.requisitionNumber} with ${itemCount} item${
              itemCount === 1 ? '' : 's'
            } exactly as shown and send it to the Logistician?`
          : `Approve ${requisition.requisitionNumber} and send it to the Logistician?`;
      if (!window.confirm(message)) {
        return;
      }
    } else if (action === 'close') {
      if (!window.confirm('Close this requisition after handoff?')) {
        return;
      }
    } else if (
      action === 'amend' &&
      !window.confirm('Create a new draft that amends this requisition?')
    ) {
      return;
    }

    setBusy(true);
    setDetailError('');
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        await deleteRequisition(requisition.id);
        setNotice(`Draft ${requisition.requisitionNumber} deleted.`);
        closeDetail();
        refreshAll();
        return;
      }

      const result =
        action === 'submit'
          ? await submitRequisition(requisition.id)
          : action === 'approve'
            ? await approveRequisition(requisition.id, payload?.items)
            : action === 'reject'
              ? await rejectRequisition(requisition.id, reason)
              : action === 'cancel'
                ? await cancelRequisition(requisition.id, reason)
                : action === 'close'
                  ? await closeRequisition(requisition.id)
                  : await amendRequisition(requisition.id);

      const completedLabels = {
        submit: canApprove ? 'submitted to the Logistician' : 'submitted for OIC approval',
        reject: 'rejected',
        cancel: 'cancelled',
        close: 'closed'
      };

      setDetail(result);
      setDetailId(result.requisition.id);
      setNotice(
        action === 'amend'
          ? `Amendment draft ${result.requisition.requisitionNumber} created.`
          : action === 'approve'
            ? `${result.requisition.requisitionNumber} approved and sent to the Logistician.`
            : `${result.requisition.requisitionNumber} ${completedLabels[action] || action}.`
      );
      refreshAll();
    } catch (actionError) {
      setDetailError(actionError.message || 'The action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = (result) => {
    setFormOpen(false);
    setEditing(null);
    setNotice(
      `Draft ${result.requisition.requisitionNumber} saved. Submit it when you are ready for approval.`
    );
    refreshAll();
    setDetail(result);
    setDetailId(result.requisition.id);
    setDetailLoading(false);
  };

  const records = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Restocking
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Requisitions</h1>
          <p className="mt-1 text-sm text-primary-600">
            Raise requests, submit them, and approve what the centre needs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          {canCreate ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                loading={generating}
                disabled={loadingShortages || shortages.length === 0}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Auto-suggest
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                New request
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {canCreate ? (
        <ShortagePanel
          shortages={shortages}
          loading={loadingShortages}
          generating={generating}
          onGenerate={handleGenerate}
        />
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
        }}
        className="surface flex flex-col gap-2 p-3 sm:flex-row sm:items-end sm:px-5"
      >
        <div className="flex-1">
          <Input
            label="Search"
            name="requisitionSearch"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Requisition number or notes"
          />
        </div>
        <Button type="submit" variant="outline" className="sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      <div className="surface">
        <div className="flex flex-wrap gap-1 border-b border-sand-200 p-3 sm:px-5">
          {filters.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                status === filter.value
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-primary-600 hover:text-primary-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && records.length === 0 ? (
          <div className="divide-y divide-sand-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-5">
                <div className="h-4 w-1/3 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && records.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-primary-500 sm:px-5">
            No requisitions match this view.
          </p>
        ) : null}

        <ul className="divide-y divide-sand-100">
          {records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => openDetail(record.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-primary-50/40 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {record.requisitionNumber}
                  </p>
                  <p className="truncate text-xs text-primary-500">
                    {formatQuantity(record.itemCount)} item
                    {Number(record.itemCount) === 1 ? '' : 's'} ·{' '}
                    {formatQuantity(record.totalQuantity)} units ·{' '}
                    {titleCase(record.source)}
                  </p>
                  {record.approvedQuantity !== null && record.approvedQuantity !== undefined ? (
                    <p className="mt-1 text-[11px] text-primary-500">
                      Requested {formatQuantity(record.totalQuantity)} · Approved{' '}
                      {formatQuantity(record.approvedQuantity)} · Transit{' '}
                      {formatQuantity(record.inTransitQuantity)} · Accepted{' '}
                      {formatQuantity(record.acceptedQuantity)} · Owing{' '}
                      {formatQuantity(record.outstandingQuantity)}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-primary-400">
                    {record.createdByName} · {formatDateTime(record.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <RequisitionStatusPill status={record.status} />
                  <p className="mt-1 text-[11px] font-medium text-primary-500">Open</p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {pagination && pagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-xs text-primary-500">
              Page {pagination.page} of {pagination.totalPages || 1} ·{' '}
              {formatQuantity(pagination.total)} records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages || 1, current + 1))
                }
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-300 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <RequisitionFormDrawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
        requisition={editing?.requisition}
      />

      <RequisitionDetailDrawer
        open={Boolean(detailId)}
        onClose={closeDetail}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        busy={busy}
        canApprove={canApprove}
        canCreate={canCreate}
        currentUserId={user?.id}
        onAction={handleDetailAction}
        onEdit={() => {
          setEditing(detail);
          closeDetail();
          setFormOpen(true);
        }}
      />
    </div>
  );
}
