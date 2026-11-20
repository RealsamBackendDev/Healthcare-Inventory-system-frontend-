import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service.js';
import {
  clearStoredSession,
  getStoredSession,
  storeSession
} from '../services/api.js';
import { ROLES } from '../utils/permissions.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [status, setStatus] = useState(() => (getStoredSession()?.token ? 'loading' : 'anonymous'));

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setStatus('anonymous');
  }, []);

  const applySession = useCallback((nextSession) => {
    storeSession(nextSession);
    setSession(nextSession);
    setStatus('authenticated');
    return nextSession;
  }, []);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.token) {
      setStatus('anonymous');
      return;
    }

    let active = true;
    authService
      .fetchProfile()
      .then((profile) => {
        if (!active) {
          return;
        }
        applySession({ ...profile, expiresIn: stored.expiresIn });
      })
      .catch(() => {
        if (active) {
          clearSession();
        }
      });

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    const handleExpired = () => clearSession();
    window.addEventListener('hcis:session-expired', handleExpired);
    return () => window.removeEventListener('hcis:session-expired', handleExpired);
  }, [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const result = await authService.login(email, password);
      return applySession(result);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      clearSession();
      return;
    }
    clearSession();
  }, [clearSession]);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const result = await authService.changePassword(currentPassword, newPassword);
      return applySession({ ...result, expiresIn: session?.expiresIn });
    },
    [applySession, session?.expiresIn]
  );

  const switchMembership = useCallback(
    async (membershipId) => {
      const result = await authService.switchMembership(membershipId);
      return applySession({ ...result, expiresIn: session?.expiresIn });
    },
    [applySession, session?.expiresIn]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) {
        return true;
      }
      return Boolean(session?.permissions?.includes(permission));
    },
    [session?.permissions]
  );

  const value = useMemo(() => {
    const memberships = session?.memberships || [];
    const activeMembershipId =
      memberships.find((item) =>
        session?.activeCentre
          ? item.healthcareCentreId === session.activeCentre.id
          : !item.healthcareCentreId &&
            item.localGovernmentId === session?.activeLocalGovernment?.id
      )?.id || null;

    return {
      session,
      user: session?.user || null,
      activeCentre: session?.activeCentre || null,
      activeLocalGovernment: session?.activeLocalGovernment || null,
      scopeType: session?.scopeType || 'facility',
      isLocalGovernment: Boolean(session?.activeLocalGovernment) && !session?.activeCentre,
      role: session?.role || null,
      memberships,
      activeMembershipId,
      permissions: session?.permissions || [],
      isAdministrator: session?.role?.code === ROLES.ADMINISTRATOR,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      switchMembership,
      changePassword,
      hasPermission
    };
  }, [session, status, login, logout, switchMembership, changePassword, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used inside an AuthProvider');
  }
  return context;
}
