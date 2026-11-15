import { useEffect, useState } from 'react';
import { Building2, Warehouse } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import Alert from '../../components/ui/Alert.jsx';
import LgShell from './LgShell.jsx';
import * as lgService from '../../services/lg.service.js';

const prettySetting = (key) =>
  key
    .replace(/^lg_/, '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());

const formatSettingValue = (setting) => {
  if (setting.key.endsWith('_hours')) {
    return `${setting.value} hours`;
  }
  if (setting.key.endsWith('_value_threshold')) {
    return `₦${Number(setting.value).toLocaleString()}`;
  }
  return Number(setting.value).toLocaleString();
};

export default function LgOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    lgService
      .getOverview()
      .then((result) => {
        if (active) {
          setOverview(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || 'The local government details could not be loaded.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading your local government" />;
  }

  const warehouse = overview?.locations?.find((location) => location.locationType === 'lg_warehouse');
  const centres = overview?.centres || [];

  return (
    <LgShell>
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary-400">Healthcare centres</p>
          <p className="mt-2 text-2xl font-bold text-primary-800">{centres.length}</p>
          <p className="mt-1 text-xs text-primary-500">Each with its own facility store</p>
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary-400">LG warehouse</p>
          <p className="mt-2 text-sm font-semibold text-primary-800">{warehouse?.name || 'Not set up'}</p>
          <p className="mt-1 text-xs text-primary-500">{warehouse?.code || 'Provisioned with the seed'}</p>
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary-400">Approval thresholds</p>
          <p className="mt-2 text-sm font-semibold text-primary-800">
            {overview?.settings?.length || 0} configured
          </p>
          <p className="mt-1 text-xs text-primary-500">Second Logistician above each limit</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-sand-200 bg-white">
        <div className="flex items-center gap-2 border-b border-sand-200 px-4 py-3">
          <Building2 className="h-4 w-4 text-primary-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-primary-800">Centres in this local government</h2>
        </div>
        <ul className="divide-y divide-sand-100">
          {centres.map((centre) => (
            <li key={centre.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-primary-800">{centre.name}</p>
                <p className="text-xs text-primary-500">{centre.code}</p>
              </div>
              <div className="text-right text-xs text-primary-500">
                {centre.stockLocation ? (
                  <>
                    <p className="font-semibold text-primary-700">{centre.stockLocation.name}</p>
                    <p>{centre.stockLocation.code}</p>
                  </>
                ) : (
                  <p>No store yet</p>
                )}
              </div>
            </li>
          ))}
          {centres.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-primary-400">No centres yet</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-sand-200 bg-white">
        <div className="flex items-center gap-2 border-b border-sand-200 px-4 py-3">
          <Warehouse className="h-4 w-4 text-primary-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-primary-800">Warehouse thresholds</h2>
        </div>
        <ul className="divide-y divide-sand-100">
          {(overview?.settings || []).map((setting) => (
            <li key={setting.key} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-primary-800">{prettySetting(setting.key)}</p>
                {setting.description ? (
                  <p className="mt-0.5 text-xs text-primary-500">{setting.description}</p>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-primary-700">{formatSettingValue(setting)}</p>
            </li>
          ))}
          {(overview?.settings || []).length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-primary-400">No thresholds configured yet</li>
          ) : null}
        </ul>
      </section>
    </LgShell>
  );
}
