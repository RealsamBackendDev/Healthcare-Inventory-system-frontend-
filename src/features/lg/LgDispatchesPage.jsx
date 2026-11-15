import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';
import { formatDateTime, formatQuantity, titleCase } from '../../utils/format.js';

export default function LgDispatchesPage() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lgService.listDispatches();
      setDispatches(result || []);
    } catch (loadError) {
      setError(loadError.message || 'Dispatches could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <LgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary-900">Dispatches</h1>
          <p className="text-xs text-primary-500">Stock sent from the warehouse to facilities</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}

      <section className="mt-4 rounded-2xl border border-sand-200 bg-white">
        <ul className="divide-y divide-sand-100">
          {dispatches.map((dispatch) => (
            <li key={dispatch.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-800">{dispatch.dispatchNumber}</p>
                  <p className="text-xs text-primary-500">
                    {dispatch.centreName} · {dispatch.itemCount} item(s) ·{' '}
                    {formatQuantity(dispatch.totalQuantity)} units
                  </p>
                </div>
                <div className="text-right text-xs text-primary-500">
                  <p className="font-semibold text-primary-700">{titleCase(dispatch.status)}</p>
                  <p>{formatDateTime(dispatch.dispatchedAt)}</p>
                </div>
              </div>
            </li>
          ))}
          {!loading && dispatches.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-primary-400">
              No dispatches yet. Approve a request and post a dispatch to see it here.
            </li>
          ) : null}
        </ul>
      </section>
    </LgShell>
  );
}
