import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

export default function MembershipSwitcher() {
  const { memberships, activeMembershipId, switchMembership } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!memberships || memberships.length < 2) {
    return null;
  }

  const handleChange = async (event) => {
    const nextId = event.target.value;
    if (!nextId || nextId === activeMembershipId) {
      return;
    }
    setBusy(true);
    try {
      await switchMembership(nextId);
      navigate('/', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-xl border border-sand-200 px-2 py-1.5 text-primary-700">
      <Building2 className="h-4 w-4 text-primary-400" aria-hidden="true" />
      <span className="sr-only">Switch facility</span>
      <select
        value={activeMembershipId || ''}
        onChange={handleChange}
        disabled={busy}
        className="max-w-[10rem] truncate bg-transparent text-xs font-semibold text-primary-800 focus:outline-none disabled:opacity-60"
      >
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.id}>
            {membership.centreName || membership.localGovernmentName}
            {membership.roleName ? ` · ${membership.roleName}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
