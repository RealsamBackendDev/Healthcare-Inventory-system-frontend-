import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatCurrency, formatQuantity } from '../../utils/format.js';

const tabs = [
  { value: 'demand', label: 'Demand', withStatus: true },
  { value: 'warehouse', label: 'Warehouse stock', withStatus: false },
  { value: 'dispatches', label: 'Dispatches', withStatus: true },
  { value: 'receipts', label: 'Receipts', withStatus: false }
];

const statusOptions = ['', 'pending_approval', 'approved', 'closed', 'rejected', 'cancelled'];

export default function LgReportsPage() {
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('demand');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await lgService.getReportsSummary());
    } catch (loadError) {
      setSummary(null);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const active = tabs.find((item) => item.value === tab);
      const result = await lgService.runLgReport(tab, {
        from: from || undefined,
        to: to || undefined,
        status: active?.withStatus ? status || undefined : undefined
      });
      setReport(result);
    } catch (loadError) {
      setError(loadError.message || 'The report could not be loaded.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, status]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const active = tabs.find((item) => item.value === tab);
      const blob = await lgService.downloadLgReport(tab, {
        from: from || undefined,
        to: to || undefined,
        status: active?.withStatus ? status || undefined : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lg-${tab}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || 'The report could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const tiles = [
    { label: 'Awaiting review', value: summary?.pendingRequests ?? '—' },
    { label: 'Approved to dispatch', value: summary?.approvedRequests ?? '—' },
    { label: 'In transit', value: summary?.inTransit ?? '—' },
    { label: 'Warehouse units', value: summary ? formatQuantity(summary.warehouseQuantity) : '—' },
    { label: 'Warehouse value', value: summary ? formatCurrency(summary.warehouseValue) : '—' },
    { label: 'Facilities', value: summary?.facilityCount ?? '—' }
  ];

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Local government reports</h1>
          <p className="text-xs text-primary-500">Demand, warehouse stock and distribution</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadReport} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleDownload} loading={downloading} disabled={!report}>
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-sand-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-primary-400">{tile.label}</p>
            <p className="mt-1 text-lg font-bold text-primary-900">{tile.value}</p>
          </div>
        ))}
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === item.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-primary-600 ring-1 ring-sand-200 hover:bg-primary-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        {tabs.find((item) => item.value === tab)?.withStatus ? (
          <label className="block">
            <span className="field-label">Status</span>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option ? option.replace(/_/g, ' ') : 'All statuses'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <section className="mt-4 overflow-x-auto rounded-2xl border border-sand-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-sand-100 text-left text-[11px] uppercase tracking-wide text-primary-500">
            <tr>
              {(report?.columns || []).map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-3">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {(report?.rows || []).map((row, index) => (
              <tr key={index}>
                {(report?.columns || []).map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-3 py-2 text-primary-700">
                    {row[column.key] === '' || row[column.key] === null ? '—' : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && (report?.rows || []).length === 0 ? (
              <tr>
                <td
                  colSpan={report?.columns?.length || 1}
                  className="px-3 py-8 text-center text-xs text-primary-400"
                >
                  No rows for this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <p className="mt-2 text-right text-[11px] text-primary-400">
        {report?.rows ? `${report.rows.length} row(s)` : ''}
      </p>
    </LgShell>
  );
}
