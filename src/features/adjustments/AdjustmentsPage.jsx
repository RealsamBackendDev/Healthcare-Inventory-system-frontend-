import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
    ChevronRight,
      ClipboardCheck,
        RefreshCw,
          RotateCcw,
            SlidersHorizontal
            } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusPill from './components/StatusPill.jsx';
import AdjustmentFormDrawer from './components/AdjustmentFormDrawer.jsx';
import ReturnFormDrawer from './components/ReturnFormDrawer.jsx';
import {
  approveAdjustment,
  approveReturn,
  listAdjustments,
  listReturns,
  rejectAdjustment,
  rejectReturn
} from '../../services/adjustments.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
  titleCase
} from '../../utils/format.js';

const PAGE_SIZE = 20;

const filters = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const ReviewButtons = ({ onApprove, onReject }) => (
  <div className="mt-2 flex gap-2">
    <button
      type="button"
      onClick={onApprove}
      className="rounded-lg bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-primary-700"
    >
      Approve
    </button>
    <button
      type="button"
      onClick={onReject}
      className="rounded-lg border border-maroon-200 px-2.5 py-1 text-[11px] font-semibold text-maroon-600 transition hover:bg-maroon-50"
    >
      Reject
    </button>
  </div>
);

export default function AdjustmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreateAdjustment = hasPermission(PERMISSIONS.ADJUSTMENTS_CREATE);
  const canApproveAdjustment = hasPermission(PERMISSIONS.ADJUSTMENTS_APPROVE);
  const canCreateReturn = hasPermission(PERMISSIONS.RETURNS_REQUEST);
  const canApproveReturn = hasPermission(PERMISSIONS.RETURNS_APPROVE);

  const [tab, setTab] = useState('adjustments');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adjustmentDrawer, setAdjustmentDrawer] = useState(false);
  const [returnDrawer, setReturnDrawer] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { status: status || undefined, page, pageSize: PAGE_SIZE };
      const result = tab === 'adjustments' ? await listAdjustments(params) : await listReturns(params);
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [tab, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setData(null);
    setNotice('');
  }, [tab, status]);

  const handleReview = async (kind, record, action) => {
    let comment = null;

    if (action === 'reject') {
      const input = window.prompt('Reason for rejection (at least 3 characters)');
      if (!input || input.trim().length < 3) {
        return;
      }
      comment = input.trim();
    } else if (
      !window.confirm(
        kind === 'adjustment'
          ? 'Approve this adjustment? Batch stock will be updated.'
          : 'Approve this return? Batch status and stock will be updated.'
      )
    ) {
      return;
    }

    setBusyId(record.id);
    setError('');
    setNotice('');
    try {
      if (kind === 'adjustment') {
        if (action === 'approve') {
          await approveAdjustment(record.id);
        } else {
          await rejectAdjustment(record.id, comment);
        }
      } else if (action === 'approve') {
        await approveReturn(record.id);
      } else {
        await rejectReturn(record.id, comment);
      }
      setNotice(`${kind === 'adjustment' ? 'Adjustment' : 'Return'} ${action}d.`);
      load();
    } catch (reviewError) {
      setError(reviewError.message || 'The review could not be saved.');
    } finally {
      setBusyId(null);
    }
  };

  const records = data?.items || [];
  const pagination = data?.pagination;
  const canApprove = tab === 'adjustments' ? canApproveAdjustment : canApproveReturn;
  const canCreate = tab === 'adjustments' ? canCreateAdjustment : canCreateReturn;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Stock corrections
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">
            Adjustments and returns
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Corrections above threshold wait here for an administrator.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={load} loading={loading}>
                                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                              Refresh
                                                        </Button>
                                                                  {canCreateAdjustment ? (
                                                                              <Button
                                                                                            variant="outline"
                                                                                                          size="sm"
                                                                                                                        onClick={() => navigate('/adjustments/stock-count')}
                                                                                                                                    >
                                                                                                                                                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                                                                                                                                                                Stock count
                                                                                                                                                                            </Button>
                                                                                                                                                                                      ) : null}
        </div>
      </header>

      <div className="flex gap-1 rounded-xl bg-sand-100 p-1">
        {[
          { value: 'adjustments', label: 'Adjustments' },
          { value: 'returns', label: 'Returns' }
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === option.value
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

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
                <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && records.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-primary-500 sm:px-5">
            Nothing to show for this filter.
          </p>
        ) : null}

        <ul className="divide-y divide-sand-100">
          {records.map((record) => {
            const isAdjustment = tab === 'adjustments';
            const pending = record.status === 'pending';
            return (
              <li key={record.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {isAdjustment
                        ? `${record.drugName} (${record.batchNumber})`
                        : record.requestNumber}
                    </p>
                    <p className="truncate text-xs text-primary-500">
                      {isAdjustment
                        ? `${titleCase(record.adjustmentType)} �� ${record.reason}`
                        : `${record.itemCount} item${record.itemCount === 1 ? '' : 's'} �� ${
                            record.reason
                          }`}
                    </p>
                    <p className="text-[11px] text-primary-400">
                      {record.requestedByName} �� {formatDateTime(record.createdAt)}
                      {record.reviewedByName ? ` �� reviewed by ${record.reviewedByName}` : ''}
                    </p>
                    {record.reviewComment ? (
                      <p className="mt-0.5 text-[11px] text-primary-500">
                        Comment: {record.reviewComment}
                      </p>
                    ) : null}
                    {pending && canApprove ? (
                      <ReviewButtons
                        onApprove={() =>
                          handleReview(isAdjustment ? 'adjustment' : 'return', record, 'approve')
                        }
                        onReject={() =>
                          handleReview(isAdjustment ? 'adjustment' : 'return', record, 'reject')
                        }
                      />
                    ) : null}
                    {busyId === record.id ? (
                      <p className="mt-1 text-[11px] font-medium text-primary-500">Working��</p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <StatusPill status={record.status} />
                    <p
                      className={`mt-1 text-sm font-bold ${
                        isAdjustment && Number(record.quantity) < 0
                          ? 'text-maroon-600'
                          : 'text-primary-900'
                      }`}
                    >
                      {isAdjustment
                        ? `${Number(record.quantity) > 0 ? '+' : ''}${formatQuantity(
                            record.quantity
                          )} ${record.unitOfMeasure}`
                        : formatQuantity(record.totalQuantity)}
                    </p>
                    {isAdjustment && record.valueImpact !== null ? (
                      <p className="text-[11px] text-primary-500">
                        {formatCurrency(record.valueImpact)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {pagination && pagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 sm:px-5">
            <p className="text-xs text-primary-500">
              Page {pagination.page} of {pagination.totalPages || 1} ��{' '}
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

      <AdjustmentFormDrawer
        open={adjustmentDrawer}
        onClose={() => setAdjustmentDrawer(false)}
        onSaved={(result) => {
          setAdjustmentDrawer(false);
          setNotice(
            result.requiresApproval
              ? 'Adjustment submitted and waiting for an administrator.'
              : 'Adjustment applied to stock.'
          );
          load();
        }}
      />

      <ReturnFormDrawer
        open={returnDrawer}
        onClose={() => setReturnDrawer(false)}
        onSaved={(result) => {
          setReturnDrawer(false);
          setNotice(`Return request ${result.returnRequest.requestNumber} submitted for approval.`);
          load();
        }}
      />
    </div>
  );
}
