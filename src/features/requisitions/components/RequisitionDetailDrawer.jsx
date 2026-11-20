import { useState } from 'react';
import { Check, ClipboardCheck, FilePenLine, Handshake, Pencil, Trash2, X } from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import RequisitionStatusPill from './RequisitionStatusPill.jsx';
import { formatDate, formatDateTime, formatQuantity, titleCase } from '../../../utils/format.js';

export default function RequisitionDetailDrawer({
  open,
  onClose,
  detail,
  loading,
  error,
  busy,
  canApprove,
  canCreate,
  currentUserId,
  onAction,
  onEdit
}) {
  const requisition = detail?.requisition;
  const items = detail?.items || [];
  const events = detail?.events || [];
  const [suggestions, setSuggestions] = useState({});

  const isOwner = requisition ? requisition.createdBy === currentUserId : false;
  const status = requisition?.status;
  const canEditDraft = status === 'draft' && (isOwner || canApprove);
  const canSubmit = status === 'draft' && (isOwner || canApprove);
  const canReview = status === 'pending_approval' && canApprove;
  const selfReviewBlocked = status === 'pending_approval' && canApprove && isOwner;
  const canCancel = canCreate && ['draft', 'pending_approval'].includes(status) && (isOwner || canApprove);
  const canClose = status === 'approved' && canApprove;
  const canAmend = canCreate && ['approved', 'rejected'].includes(status);
  const showBalances = ['approved', 'closed'].includes(status);
  const totals = items.reduce(
    (accumulator, item) => ({
      requested: accumulator.requested + Number(item.requestedQuantity || 0),
      approved: accumulator.approved + Number(item.approvedQuantity || 0),
      outstanding: accumulator.outstanding + Number(item.outstandingQuantity || 0),
      inTransit: accumulator.inTransit + Number(item.inTransitQuantity || 0),
      accepted: accumulator.accepted + Number(item.acceptedQuantity || 0)
    }),
    { requested: 0, approved: 0, outstanding: 0, inTransit: 0, accepted: 0 }
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={requisition ? requisition.requisitionNumber : 'Requisition'}
      subtitle={
        requisition
          ? `${titleCase(requisition.source)} request · raised by ${requisition.createdByName}`
          : undefined
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-sand-100" />
          ))}
        </div>
      ) : null}

      {error && !loading ? <Alert tone="error">{error}</Alert> : null}

      {requisition && !loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-primary-900">
                {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
                {formatQuantity(requisition.totalQuantity)} units
              </p>
              {showBalances ? (
                <p className="mt-1 text-[11px] text-primary-600">
                  Requested {formatQuantity(totals.requested)} · Approved{' '}
                  {formatQuantity(totals.approved)} · In transit {formatQuantity(totals.inTransit)} ·
                  Accepted {formatQuantity(totals.accepted)} · Owing{' '}
                  {formatQuantity(totals.outstanding)}
                </p>
              ) : null}
            </div>
            <RequisitionStatusPill status={requisition.status} />
          </div>

          {requisition.notes ? (
            <div>
              <p className="field-label">Notes</p>
              <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-primary-700">
                {requisition.notes}
              </p>
            </div>
          ) : null}

          {requisition.reviewReason ? (
            <div>
              <p className="field-label">Review comment</p>
              <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-700">
                {requisition.reviewReason}
              </p>
            </div>
          ) : null}

          <div>
            <p className="field-label">Requested drugs</p>
            <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200">
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-900">
                        {item.drugName}
                      </p>
                      <p className="text-[11px] text-primary-500">
                        {item.drugCode} · on hand {formatQuantity(item.usableQuantity)} · minimum{' '}
                        {formatQuantity(item.minimumStockLevel)}
                      </p>
                      {item.isAutoGenerated ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Auto-suggested
                        </span>
                      ) : null}
                      {canReview ? (
                        <div className="mt-2 max-w-[160px]">
                          <Input
                            label="Suggested quantity"
                            type="number"
                            min="0"
                            step="any"
                            max={item.requestedQuantity}
                            value={
                              suggestions[item.id] ??
                              (item.suggestedQuantity === null || item.suggestedQuantity === undefined
                                ? String(item.requestedQuantity)
                                : String(item.suggestedQuantity))
                            }
                            onChange={(event) =>
                              setSuggestions((current) => ({
                                ...current,
                                [item.id]: event.target.value
                              }))
                            }
                          />
                        </div>
                      ) : null}
                      {showBalances ? (
                        <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg bg-sand-50 px-2 py-1.5 text-[11px]">
                          <div>
                            <span className="block text-primary-500">Approved</span>
                            <span className="font-semibold text-primary-800">
                              {formatQuantity(item.approvedQuantity)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-primary-500">In transit</span>
                            <span
                              className={
                                Number(item.inTransitQuantity) > 0
                                  ? 'font-semibold text-leaf-700'
                                  : 'font-semibold text-primary-800'
                              }
                            >
                              {formatQuantity(item.inTransitQuantity)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-primary-500">Accepted</span>
                            <span className="font-semibold text-primary-800">
                              {formatQuantity(item.acceptedQuantity)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-primary-500">Owing</span>
                            <span
                              className={
                                Number(item.outstandingQuantity) > 0
                                  ? 'font-semibold text-maroon-600'
                                  : 'font-semibold text-primary-800'
                              }
                            >
                              {formatQuantity(item.outstandingQuantity)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-wide text-primary-400">Requested</p>
                      <p className="text-sm font-bold text-primary-900">
                        {formatQuantity(item.requestedQuantity)} {item.unitOfMeasure}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 text-xs text-primary-500">
            <p>Created {formatDateTime(requisition.createdAt)}</p>
            {requisition.submittedAt ? <p>Submitted {formatDateTime(requisition.submittedAt)}</p> : null}
            {requisition.reviewedAt ? (
              <p>
                Reviewed by {requisition.reviewedByName} · {formatDateTime(requisition.reviewedAt)}
              </p>
            ) : null}
            {requisition.closedAt ? <p>Closed {formatDateTime(requisition.closedAt)}</p> : null}
          </div>

          {events.length > 0 ? (
            <div>
              <p className="field-label">History</p>
              <ul className="space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-2 text-xs text-primary-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                    <span>
                      <span className="font-semibold text-primary-800">
                        {titleCase(event.eventType)}
                      </span>{' '}
                      by {event.actorFullName} · {formatDate(event.createdAt)}
                      {event.comment ? ` — ${event.comment}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selfReviewBlocked ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              The local government reviews and approves this request. Your quantities are a suggestion.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-sand-200 pt-4">
            {canEditDraft ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => (onEdit ? onEdit() : onAction('edit'))}
                disabled={busy}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit draft
              </Button>
            ) : null}

            {canSubmit || canReview || canClose ? (
              <Button
                size="sm"
                onClick={() =>
                  onAction(
                    canReview ? 'suggest' : canClose ? 'close' : 'submit',
                    canReview
                      ? {
                          items: items.map((item) => ({
                            drugId: item.drugId,
                            quantity: Number(
                              suggestions[item.id] ??
                                (item.suggestedQuantity === null || item.suggestedQuantity === undefined
                                  ? item.requestedQuantity
                                  : item.suggestedQuantity)
                            )
                          }))
                        }
                      : undefined
                  )
                }
                loading={busy}
              >
                {canReview ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : canClose ? (
                  <Handshake className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {canReview ? 'Send suggested quantities' : canClose ? 'Close request' : 'Submit for approval'}
              </Button>
            ) : null}

            {canReview ? (
              <p className="text-xs text-primary-500">
                The local government will review this request.
              </p>
            ) : null}

            {canAmend ? (
              <Button size="sm" variant="outline" onClick={() => onAction('amend')} disabled={busy}>
                <FilePenLine className="h-4 w-4" aria-hidden="true" />
                Amend
              </Button>
            ) : null}

            {canCancel ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('cancel')}
                disabled={busy}
                className="text-maroon-600 hover:bg-maroon-50"
              >
                Cancel request
              </Button>
            ) : null}

            {status === 'draft' && canEditDraft ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction('delete')}
                disabled={busy}
                className="text-maroon-600 hover:bg-maroon-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete draft
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
