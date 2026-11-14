import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, RefreshCw, Table2 } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ReportTable from './components/ReportTable.jsx';
import { downloadReport, fileExtension, getReportOptions, runReport } from '../../services/reports.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDate, formatQuantity } from '../../utils/format.js';

const today = new Date();
const isoDay = (date) => date.toISOString().slice(0, 10);
const shiftDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const reportTypes = [
  {
    value: 'inventory',
    label: 'Stock status',
    filename: 'inventory-report',
    search: true
  },
  {
    value: 'stock-movements',
    label: 'Stock movements',
    filename: 'stock-movement-report',
    dates: true,
    drug: true,
    user: true,
    movementType: true
  },
  {
    value: 'dispensing',
    label: 'Dispensing',
    filename: 'dispensing-report',
    dates: true,
    drug: true,
    user: true
  },
  {
    value: 'expiry',
    label: 'Expiry',
    filename: 'expiry-report',
    days: true,
    expiryStatus: true
  },
  {
    value: 'requisitions',
    label: 'Requisitions',
    filename: 'requisition-report',
    dates: true,
    requisitionStatus: true
  },
  {
    value: 'adjustments',
    label: 'Adjustments',
    filename: 'adjustment-report',
    dates: true,
    drug: true,
    reviewStatus: true
  },
  {
    value: 'returns',
    label: 'Returns',
    filename: 'return-report',
    dates: true,
    reviewStatus: true
  },
  {
    value: 'audit',
    label: 'Audit history',
    filename: 'audit-history-report',
    dates: true,
    user: true,
    permission: PERMISSIONS.AUDIT_VIEW
  }
];

const dayWindows = [30, 60, 90, 180, 365];
const reviewStatuses = ['pending', 'approved', 'rejected'];
const datePresets = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'This year', days: null }
];

const initialFilters = () => ({
  from: isoDay(shiftDays(today, -30)),
  to: isoDay(today),
  drugId: '',
  userId: '',
  status: '',
  movementType: '',
  days: 90,
  search: ''
});

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const canViewAudit = hasPermission(PERMISSIONS.AUDIT_VIEW);

  const available = useMemo(
    () => reportTypes.filter((type) => !type.permission || hasPermission(type.permission)),
    [hasPermission]
  );

  const [reportKey, setReportKey] = useState('inventory');
  const [filters, setFilters] = useState(initialFilters);
  const [options, setOptions] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const definition = useMemo(
    () => reportTypes.find((type) => type.value === reportKey) || reportTypes[0],
    [reportKey]
  );

  useEffect(() => {
    getReportOptions()
      .then((data) => setOptions(data))
      .catch(() => setOptions(null));
  }, []);

  const params = useMemo(() => {
    const selected = {};

    if (definition.search && filters.search.trim()) {
      selected.search = filters.search.trim();
    }
    if (definition.dates) {
      if (filters.from) {
        selected.from = filters.from;
      }
      if (filters.to) {
        selected.to = filters.to;
      }
    }
    if (definition.drug && filters.drugId) {
      selected.drugId = filters.drugId;
    }
    if (definition.user && filters.userId) {
      selected.userId = filters.userId;
    }
    if (definition.movementType && filters.movementType) {
      selected.movementType = filters.movementType;
    }
    if (definition.days) {
      selected.days = filters.days;
    }
    if (definition.expiryStatus && filters.status) {
      selected.status = filters.status;
    }
    if ((definition.requisitionStatus || definition.reviewStatus) && filters.status) {
      selected.status = filters.status;
    }

    return selected;
  }, [definition, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await runReport(reportKey, params);
      setResult(data);
    } catch (loadError) {
      setError(loadError.message || 'The report could not be generated.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [reportKey, params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const changeReport = (value) => {
    setReportKey(value);
    setNotice('');
    setError('');
    setFilters((current) => ({ ...current, status: '', movementType: '', search: '' }));
  };

  const updateFilter = (field) => (event) => {
    const value = event.target.value;
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const applyPreset = (preset) => {
    const to = isoDay(today);
    if (preset.days === null) {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setFilters((current) => ({ ...current, from: isoDay(yearStart), to }));
      return;
    }
    setFilters((current) => ({
      ...current,
      from: isoDay(shiftDays(today, -preset.days)),
      to
    }));
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    setError('');
    setNotice('');
    try {
      const blob = await downloadReport(reportKey, params, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${definition.filename}-${isoDay(new Date())}.${fileExtension(format)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('Download started. Check your Downloads folder.');
    } catch (downloadError) {
      setError(downloadError.message || 'The report could not be downloaded.');
    } finally {
      setDownloading('');
    }
  };

  const statusOptions =
    definition.requisitionStatus
      ? (options?.requisitionStatuses || []).map((value) => ({ value, label: value }))
      : definition.expiryStatus
        ? (options?.expiryStatuses || []).map((value) => ({ value, label: value }))
        : definition.reviewStatus
          ? reviewStatuses.map((value) => ({ value, label: value }))
          : [];

  const showFilters =
    definition.dates ||
    definition.search ||
    definition.days ||
    definition.drug ||
    definition.user ||
    definition.movementType ||
    statusOptions.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Reporting
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Reports</h1>
          <p className="mt-1 text-sm text-primary-600">
            Preview a report, then download it as CSV, Excel or PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload('csv')}
            loading={downloading === 'csv'}
            disabled={Boolean(downloading)}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload('excel')}
            loading={downloading === 'excel'}
            disabled={Boolean(downloading)}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Excel
          </Button>
          <Button
            size="sm"
            onClick={() => handleDownload('pdf')}
            loading={downloading === 'pdf'}
            disabled={Boolean(downloading)}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            PDF
          </Button>
        </div>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-sand-200 p-3 sm:px-5">
          {available.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => changeReport(type.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                reportKey === type.value
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-primary-600 hover:text-primary-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {showFilters ? (
          <div className="space-y-3 p-3 sm:p-5">
            {definition.dates ? (
              <div className="flex flex-wrap gap-1">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-lg border border-sand-300 px-2.5 py-1 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {definition.dates ? (
                <>
                  <Input
                    label="From"
                    name="reportFrom"
                    type="date"
                    value={filters.from}
                    onChange={updateFilter('from')}
                  />
                  <Input
                    label="To"
                    name="reportTo"
                    type="date"
                    value={filters.to}
                    onChange={updateFilter('to')}
                  />
                </>
              ) : null}

              {definition.search ? (
                <Input
                  label="Search drug"
                  name="reportSearch"
                  value={filters.search}
                  onChange={updateFilter('search')}
                  placeholder="Name or code"
                />
              ) : null}

              {definition.days ? (
                <div>
                  <label className="field-label" htmlFor="report-days">
                    Expiry window
                  </label>
                  <select
                    id="report-days"
                    value={filters.days}
                    onChange={updateFilter('days')}
                    className="field"
                  >
                    {dayWindows.map((days) => (
                      <option key={days} value={days}>
                        Next {days} days
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {definition.drug ? (
                <div>
                  <label className="field-label" htmlFor="report-drug">
                    Drug
                  </label>
                  <select
                    id="report-drug"
                    value={filters.drugId}
                    onChange={updateFilter('drugId')}
                    className="field"
                  >
                    <option value="">All drugs</option>
                    {(options?.drugs || []).map((drug) => (
                      <option key={drug.id} value={drug.id}>
                        {drug.name} ({drug.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {definition.user ? (
                <div>
                  <label className="field-label" htmlFor="report-user">
                    Staff member
                  </label>
                  <select
                    id="report-user"
                    value={filters.userId}
                    onChange={updateFilter('userId')}
                    className="field"
                  >
                    <option value="">Everyone</option>
                    {(options?.users || []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {definition.movementType ? (
                <div>
                  <label className="field-label" htmlFor="report-movement">
                    Movement type
                  </label>
                  <select
                    id="report-movement"
                    value={filters.movementType}
                    onChange={updateFilter('movementType')}
                    className="field"
                  >
                    <option value="">All movements</option>
                    {(options?.movementTypes || []).map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {statusOptions.length > 0 ? (
                <div>
                  <label className="field-label" htmlFor="report-status">
                    Status
                  </label>
                  <select
                    id="report-status"
                    value={filters.status}
                    onChange={updateFilter('status')}
                    className="field"
                  >
                    <option value="">All statuses</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="surface space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-sand-200" />
          ))}
        </div>
      ) : null}

      {!loading && result ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-primary-900">{result.title}</h2>
              <p className="text-xs text-primary-500">
                {formatQuantity(result.totalRows)} row
                {Number(result.totalRows) === 1 ? '' : 's'} · generated {formatDate(new Date())}
              </p>
            </div>
            <p className="text-[11px] text-primary-400">
              Use the CSV, Excel or PDF buttons above to keep a copy.
            </p>
          </div>

          {result.rows.length === 0 ? (
            <div className="surface flex flex-col items-center gap-2 px-4 py-14 text-center">
              <Table2 className="h-6 w-6 text-leaf-400" aria-hidden="true" />
              <p className="text-sm text-primary-500">
                Nothing matched these filters. Widen the dates or clear a filter.
              </p>
            </div>
          ) : (
            <ReportTable columns={result.columns} rows={result.rows} />
          )}
        </div>
      ) : null}
    </div>
  );
}
