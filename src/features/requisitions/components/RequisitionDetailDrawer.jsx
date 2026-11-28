import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardCheck,
  FilePenLine,
  Handshake,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import Alert from '../../../components/ui/Alert.jsx';
import Button from '../../../components/ui/Button.jsx';
import Drawer from '../../../components/ui/Drawer.jsx';
import RequisitionStatusPill from './RequisitionStatusPill.jsx';
import { listDrugs } from '../../../services/drugs.service.js';
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

  const isOwner = requisition ? requisition.createdBy === currentUserId : false;
  const status = requisition?.status;
  const canEditDraft = status === 'draft' && isOwner;
  const canSubmit = status === 'draft' && (isOwner || canApprove);
  const canReview = status === 'pending_oic' && canApprove;
  const awaitingOic = status === 'pending_oic';
  const awaitingLogistician = status === 'pending_approval';
  const canCancel =
    canCreate && ['draft', 'pending_oic', 'pending_approval'].includes(status) && (isOwner || canApprove);
  const canClose = status === 'approved' && canApprove;
  const canAmend = canCreate && ['approved', 'rejected'].includes(status);
  const showBalances = ['approved', 'closed'].includes(status);

  const [reviewItems, setReviewItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [drugSearch, setDrugSearch] = useState('');
  const [pickedDrug, setPickedDrug] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!requisition) {
      setReviewItems([]);
      return;
    }
    setReviewItems(
      (detail?.items || []).map((item) => ({
        drugId: item.drugId,
        drugName: item.drugName,
        drugCode: item.drugCode,
        unitOfMeasure: item.unitOfMeasure,
        quantity: String(Number(item.requestedQuantity))
      }))
    );
    setDrugSearch('');
    setPickedDrug(null);
    setAddQuantity('');
    setReviewError('');
    setShowHistory(false);
  }, [requisition?.id, requisition?.status]);

  useEffect(() => {
    if (!open || !canReview) {
      return;
    }
    listDrugs({ status: 'active', pageSize: 100 })
      .then((result) => setDrugs(result.items || []))
      .catch(() => setDrugs([]));
  }, [open, canReview]);

  const drugMatches = useMemo(() => {
    const term = drugSearch.trim().toLowerCase();
    if (!term || pickedDrug) {
      return [];
    }
    return drugs
      .filter((drug) => !reviewItems.some((item) => item.drugId === drug.id))
      .filter(
        (drug) => drug.name.toLowerCase().includes(term) || drug.code.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [drugs, drugSearch, pickedDrug, reviewItems]);

  const setReviewQuantity = (drugId, value) =>
    setReviewItems((current) =>
      current.map((item) => (item.drugId === drugId ? { ...item, quantity: value } : item))
    );

  const removeReviewItem = (drugId) => {
    setReviewItems((current) => current.filter((item) => item.drugId !== drugId));
    setReviewError('');
  };

  const addReviewItem = () => {
    if (!pickedDrug) {
      setReviewError('Pick a drug from the list first.');
      return;
    }
    const amount = Number(addQuantity);
    if (!amount || amount <= 0) {
      setReviewError('Enter a quantity greater than zero for this drug.');
      return;
    }
    setReviewItems((current) => [
      ...current,
      {
        drugId: pickedDrug.id,
        drugName: pickedDrug.name,
        drugCode: pickedDrug.code,
        unitOfMeasure: pickedDrug.unitOfMeasure,
        quantity: String(amount)
      }
    ]);
    setPickedDrug(null);
    setDrugSearch('');
    setAddQuantity('');
    setReviewError('');
  };

  const handleApprove = () => {
    const cleaned = reviewItems
      .map((item) => ({ drugId: item.drugId, requestedQuantity: Number(item.quantity) }))
      .filter((item) => Number.isFinite(item.requestedQuantity) && item.requestedQuantity > 0);
    if (cleaned.length === 0) {
      setReviewError('Keep at least one drug with a quantity above zero before approving.');
      return;
    }
    setReviewError('');
    onAction('approve', { items: cleaned });
  };

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
            <p className="field-label">{canReview ? 'Review the drugs and quantities' : 'Requested drugs'}</p>
            <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200">
              {(canReview ? reviewItems : items).map((item) => (
                <li key={item.drugId} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-900">
                        {item.drugName}
                      </p>
                      <p className="text-[11px] text-primary-500">
                        {item.drugCode}
                        {canReview
                          ? ` · ${item.unitOfMeasure}`
                          : ` · on hand ${formatQuantity(item.usableQuantity)} · minimum ${formatQuantity(
                              item.minimumStockLevel
                            )}`}
                      </p>
                      {!canReview && item.isAutoGenerated ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Auto-suggested
                        </span>
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
                      {canReview ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(event) => setReviewQuantity(item.drugId, event.target.value)}
                            aria-label={`Quantity for ${item.drugName}`}
                            className="field w-24 py-1 text-right text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeReviewItem(item.drugId)}
                            aria-label={`Remove ${item.drugName}`}
                            className="rounded-lg p-1.5 text-maroon-600 transition hover:bg-maroon-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] uppercase tracking-wide text-primary-400">
                            Requested
                          </p>
                          <p className="text-sm font-bold text-primary-900">
                            {formatQuantity(item.requestedQuantity)} {item.unitOfMeasure}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {canReview ? (
              <div className="mt-3 space-y-2 rounded-xl border border-sand-200 bg-sand-50/60 p-3">
                <p className="text-xs font-semibold text-primary-800">Add a drug the staff missed</p>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
                    aria-hidden="true"
                  />
                  <input
                    value={drugSearch}
                    onChange={(event) => {
                      setDrugSearch(event.target.value);
                      setPickedDrug(null);
                    }}
                    placeholder="Type a drug name or code"
                    autoComplete="off"
                    aria-label="Search drugs to add"
                    className="field pl-9"
                  />
                  {drugMatches.length > 0 ? (
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white shadow-lg">
                      {drugMatches.map((drug) => (
                        <li key={drug.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPickedDrug(drug);
                              setDrugSearch(`${drug.name} (${drug.code})`);
                              setReviewError('');
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-primary-800 transition hover:bg-primary-50"
                          >
                            {drug.name} ({drug.code})
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {pickedDrug ? (
                  <p className="text-[11px] font-semibold text-leaf-600">
                    Selected: {pickedDrug.name} ({pickedDrug.code}) · {pickedDrug.unitOfMeasure}
                  </p>
                ) : null}
                <div className="flex items-end gap-2">
                  <div className="w-28">
                    <label className="field-label" htmlFor="oic-add-quantity">
                      Quantity
                    </label>
                    <input
                      id="oic-add-quantity"
                      type="number"
                      min="0"
                      step="any"
                      value={addQuantity}
                      onChange={(event) => setAddQuantity(event.target.value)}
                      placeholder="0"
                      className="field py-1.5 text-sm"
                    />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addReviewItem}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add
                  </Button>
                </div>
                {reviewError ? <p className="text-xs text-maroon-600">{reviewError}</p> : null}
              </div>
            ) : null}
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

          <div>
            <button
              type="button"
              onClick={() => setShowHistory((current) => !current)}
              aria-expanded={showHistory}
              className="flex w-full items-center justify-between text-xs font-semibold text-primary-500"
            >
              <span>History ({events.length})</span>
              <span>{showHistory ? 'Hide' : 'Show'}</span>
            </button>
            {showHistory && events.length > 0 ? (
              <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto">
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
            ) : null}
          </div>

          {awaitingOic ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {canApprove
                ? 'Change any quantity, add a drug the staff missed or remove one, then approve. The Logistician only sees what you approve here.'
                : 'Waiting for the OIC to approve this request before it goes to the Logistician.'}
            </p>
          ) : null}

          {awaitingLogistician ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Sent to the Logistician. Waiting for the request to be reviewed and dispatched.
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
                onClick={canReview ? handleApprove : () => onAction(canClose ? 'close' : 'submit')}
                loading={busy}
              >
                {canReview ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : canClose ? (
                  <Handshake className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {canReview
                  ? 'Approve request'
                  : canClose
                    ? 'Close request'
                    : canApprove
                      ? 'Send to Logistician'
                      : 'Submit for approval'}
              </Button>
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
