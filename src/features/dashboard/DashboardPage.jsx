import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Boxes,
  CalendarClock,
  ClipboardList,
  PackageX,
  Pill,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import KpiCard from './components/KpiCard.jsx';
import DataPanel from './components/DataPanel.jsx';
import { getDashboard } from '../../services/dashboard.service.js';
import { formatDate, formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';
import { useAuth } from '../../hooks/useAuth.js';

const expiryTone = (days) => {
  if (days <= 30) {
    return 'bg-maroon-50 text-maroon-600';
  }
  if (days <= 90) {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-primary-50 text-primary-600';
};

const expiryLabel = (days) => {
  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  }
  if (days === 0) {
    return 'Today';
  }
  return `${days}d left`;
};

export default function DashboardPage() {
  const { user, activeCentre } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDashboard(90);
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'The dashboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = (user?.fullName || '').split(' ')[0];
  const pendingTotal = data
    ? data.pending.requisitions + data.pending.adjustments + data.pending.returns
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            {activeCentre?.name || 'Healthcare centre'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">
            {firstName ? `Good to see you, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-primary-600">
            Live picture of stock, expiry and approvals at your centre.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? (
        <Alert tone="error" title="Dashboard unavailable">
          {error}
        </Alert>
      ) : null}

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="surface h-28 animate-pulse bg-white/60" />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Active drugs"
              value={data.overview.activeDrugs}
              hint="In the catalogue"
              icon={Pill}
              tone="neutral"
            />
            <KpiCard
              label="Usable stock"
              value={formatQuantity(data.overview.usableQuantity)}
              hint="Across all usable batches"
              icon={Boxes}
              tone="success"
            />
            <KpiCard
              label="Pending approvals"
              value={pendingTotal}
              hint={`${data.pending.requisitions} requisitions · ${data.pending.adjustments} adjustments · ${data.pending.returns} returns`}
              icon={ClipboardList}
              tone={pendingTotal > 0 ? 'warning' : 'neutral'}
            />
            <KpiCard
              label="Low stock items"
              value={data.overview.lowStockCount}
              hint={`${data.overview.outOfStockCount} out of stock`}
              icon={Activity}
              tone={data.overview.lowStockCount > 0 ? 'warning' : 'success'}
              to="/inventory"
            />
            <KpiCard
              label={`Expiring in ${data.expiry.nearExpiryDays} days`}
              value={data.expiry.nearExpiryBatches}
              hint={`${formatQuantity(data.expiry.nearExpiryQuantity)} units near expiry`}
              icon={CalendarClock}
              tone={data.expiry.nearExpiryBatches > 0 ? 'warning' : 'success'}
              to="/expiry"
            />
            <KpiCard
              label="Expired stock"
              value={data.expiry.expiredBatches}
              hint={`${formatQuantity(data.expiry.expiredQuantity)} units expired`}
              icon={PackageX}
              tone={data.expiry.expiredBatches > 0 ? 'danger' : 'success'}
              to="/expiry"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DataPanel
              title="Low stock"
              subtitle="Usable quantity at or below the minimum level"
              actionTo="/inventory"
              actionLabel="Inventory"
              isEmpty={data.lowStockItems.length === 0}
              emptyMessage="Every drug is above its minimum level."
            >
              <ul className="divide-y divide-sand-100">
                {data.lowStockItems.map((item) => (
                  <li key={item.drugId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-900">{item.name}</p>
                      <p className="text-xs text-primary-500">
                        {item.code} · minimum {formatQuantity(item.minimumStockLevel)}{' '}
                        {item.unitOfMeasure}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                        item.usableQuantity <= 0
                          ? 'bg-maroon-50 text-maroon-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {formatQuantity(item.usableQuantity)} {item.unitOfMeasure}
                    </span>
                  </li>
                ))}
              </ul>
            </DataPanel>

            <DataPanel
              title="Upcoming expiries"
              subtitle={`Batches expiring within ${data.expiry.nearExpiryDays} days`}
              actionTo="/expiry"
              actionLabel="Expiry"
              isEmpty={data.upcomingExpiries.length === 0}
              emptyMessage="No batches are nearing expiry."
            >
              <ul className="divide-y divide-sand-100">
                {data.upcomingExpiries.map((batch) => (
                  <li key={batch.batchId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-900">
                        {batch.drugName}
                      </p>
                      <p className="text-xs text-primary-500">
                        {batch.drugCode} · batch {batch.batchNumber} · {formatDate(batch.expiryDate)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${expiryTone(
                        batch.daysToExpiry
                      )}`}
                    >
                      {expiryLabel(batch.daysToExpiry)}
                    </span>
                  </li>
                ))}
              </ul>
            </DataPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DataPanel
              title="Recent stock movements"
              subtitle="Latest receipts, dispensing and adjustments"
              actionTo="/inventory"
              actionLabel="Inventory"
              isEmpty={data.recentMovements.length === 0}
              emptyMessage="No stock movements recorded yet."
            >
              <ul className="divide-y divide-sand-100">
                {data.recentMovements.map((movement) => (
                  <li key={movement.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-900">
                        {movement.drugName}
                      </p>
                      <p className="text-xs text-primary-500">
                        {titleCase(movement.movementType)} · batch {movement.batchNumber} ·{' '}
                        {movement.actorFullName}
                      </p>
                      <p className="text-[11px] text-primary-400">
                        {formatDateTime(movement.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary-800">
                      {formatQuantity(movement.quantity)}
                      <span className="ml-1 text-[11px] font-medium text-primary-500">
                        {movement.unitOfMeasure}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </DataPanel>

            <DataPanel
              title="Recent requisitions"
              subtitle="Latest requests raised by the centre"
              actionTo="/requisitions"
              actionLabel="All"
              isEmpty={data.recentRequisitions.length === 0}
              emptyMessage="No requisitions have been raised yet."
            >
              <ul className="divide-y divide-sand-100">
                {data.recentRequisitions.map((requisition) => (
                  <li key={requisition.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-900">
                        {requisition.requisitionNumber}
                      </p>
                      <p className="text-xs text-primary-500">
                        {requisition.itemCount} item{requisition.itemCount === 1 ? '' : 's'} ·{' '}
                        {requisition.createdByName}
                      </p>
                      <p className="text-[11px] text-primary-400">
                        {formatDateTime(requisition.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700">
                      {titleCase(requisition.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </DataPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
