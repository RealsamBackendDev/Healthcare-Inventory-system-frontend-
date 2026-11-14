import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ScrollText, Search } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { listAudit } from '../../services/audit.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSIONS } from '../../utils/permissions.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

const today = new Date();
const isoDay = (date) => date.toISOString().slice(0, 10);
const shiftDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const LIMIT = 200;

export default function AuditPage() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(PERMISSIONS.AUDIT_VIEW);

  const [from, setFrom] = useState(isoDay(shiftDays(today, -30)));
  const [to, setTo] = useState(isoDay(today));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await listAudit({ from, to });
      setRows(result.rows || []);
      setTotalRows(Number(result.totalRows || 0));
    } catch (loadError) {
      setError(loadError.message || 'The audit trail could not be loaded.');
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [allowed, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return rows.slice(0, LIMIT);
    }
    return rows
      .filter((row) =>
        [row.actorFullName, row.action, row.summary, row.reason, row.entityType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
      .slice(0, LIMIT);
  }, [rows, search]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert tone="error">You do not have permission to read the audit trail.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary-900">Audit trail</h1>
          <p className="mt-1 text-sm text-primary-600">
            Every stock change and approval, with who did it and when.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="surface space-y-3 p-3 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="From"
            name="auditFrom"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            label="To"
            name="auditTo"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <div>
            <label className="field-label" htmlFor="audit-search">
              Search
            </label>
            <div className="flex gap-2">
              <input
                id="audit-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Action, person or summary"
                className="field"
              />
              <button
                type="button"
                onClick={() => setSearch(searchInput.trim())}
                aria-label="Apply search"
                className="rounded-xl border border-sand-300 px-2.5 text-primary-600 transition hover:bg-primary-50"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-sand-200" />
          ))}
        </div>
      ) : null}

      {!loading && visible.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-4 py-14 text-center">
          <ScrollText className="h-6 w-6 text-leaf-400" aria-hidden="true" />
          <p className="text-sm text-primary-500">
            Nothing was recorded in this range. Try widening the dates.
          </p>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="surface">
          <p className="border-b border-sand-200 px-4 py-2.5 text-[11px] text-primary-500 sm:px-5">
            Showing {formatQuantity(visible.length)} of {formatQuantity(totalRows)} entries
            {rows.length > LIMIT ? ` · first ${LIMIT} loaded` : ''}
          </p>
          <ul className="divide-y divide-sand-100">
            {visible.map((row, index) => (
              <li key={`${row.createdAt}-${index}`} className="px-4 py-3 sm:px-5">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-900">
                      {titleCase(row.action)}
                    </p>
                    {row.summary ? (
                      <p className="text-xs text-primary-600">{row.summary}</p>
                    ) : null}
                    {row.reason ? (
                      <p className="text-[11px] text-maroon-600">Reason: {row.reason}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-primary-400">
                      {row.actorFullName || 'System'} · {titleCase(row.entityType)}
                      {row.entityId ? ' · ' : ''}
                      {row.entityId ? row.entityId.slice(0, 8) : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-[11px] text-primary-500">
                    {formatDateTime(row.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
