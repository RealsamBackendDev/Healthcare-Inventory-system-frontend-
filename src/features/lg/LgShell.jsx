import { useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
  X
} from 'lucide-react';
import BrandMark from '../../components/common/BrandMark.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { initialsOf } from '../../utils/format.js';

const groups = [
  {
    label: 'Overview',
    items: [{ to: '/lg', label: 'Overview', icon: LayoutDashboard, end: true }]
  },
  {
    label: 'Supply',
    items: [
      { to: '/lg/warehouse', label: 'Warehouse', icon: Warehouse },
      { to: '/lg/requests', label: 'Requests', icon: ClipboardList },
      { to: '/lg/consolidations', label: 'Consolidations', icon: Layers },
      { to: '/lg/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/lg/dispatches', label: 'Dispatches', icon: Truck },
      { to: '/lg/transfers', label: 'Transfers', icon: ArrowLeftRight }
    ]
  },
  {
    label: 'Control',
    items: [
      { to: '/lg/approvals', label: 'Approvals', icon: ShieldCheck },
      { to: '/lg/reports', label: 'Reports', icon: BarChart3 }
    ]
  }
];

const flatItems = groups.flatMap((group) => group.items);

export default function LgShell({ children }) {
  const { user, activeLocalGovernment, role, logout, isLocalGovernment } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!isLocalGovernment) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const current =
    flatItems.find(
      (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    ) || flatItems[0];

