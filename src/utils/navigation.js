import {
  LayoutDashboard,
  Pill,
  Boxes,
  PackagePlus,
  HandHeart,
  SlidersHorizontal,
  ClipboardList,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  ScrollText,
  UserCircle
} from 'lucide-react';
import { PERMISSIONS } from './permissions.js';

export const navigationGroups = [
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: PERMISSIONS.REPORTS_VIEW
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/inventory',
        label: 'Inventory',
        icon: Boxes,
        permission: PERMISSIONS.INVENTORY_VIEW
      },
      {
        to: '/drugs',
        label: 'Drug catalogue',
        icon: Pill,
        permission: PERMISSIONS.DRUGS_VIEW
      },
      {
        to: '/receiving',
        label: 'Receiving',
        icon: PackagePlus,
        permission: PERMISSIONS.STOCK_RECEIVE
      },
      {
        to: '/dispensing',
        label: 'Dispensing',
        icon: HandHeart,
        permission: PERMISSIONS.STOCK_DISPENSE
      },
      {
        to: '/adjustments',
        label: 'Adjustments',
        icon: SlidersHorizontal,
        permission: PERMISSIONS.ADJUSTMENTS_CREATE
      },
      {
        to: '/requisitions',
        label: 'Requisitions',
        icon: ClipboardList,
        permission: PERMISSIONS.REQUISITIONS_CREATE
      },
      {
        to: '/expiry',
        label: 'Expiry monitoring',
        icon: CalendarClock,
        permission: PERMISSIONS.EXPIRY_VIEW
      }
    ]
  },
  {
    label: 'Insight',
    items: [
      {
        to: '/reports',
        label: 'Reports',
        icon: BarChart3,
        permission: PERMISSIONS.REPORTS_VIEW
      }
    ]
  },
  {
    label: 'Administration',
    items: [
      {
        to: '/users',
        label: 'Users',
        icon: Users,
        permission: PERMISSIONS.USERS_MANAGE
      },
      {
        to: '/settings',
        label: 'Settings',
        icon: Settings,
        permission: PERMISSIONS.SETTINGS_MANAGE
      },
      {
        to: '/audit',
        label: 'Audit trail',
        icon: ScrollText,
        permission: PERMISSIONS.AUDIT_VIEW
      }
    ]
  }
];

export const accountNavigation = [
  { to: '/profile', label: 'My profile', icon: UserCircle },
  { to: '/change-password', label: 'Change password', icon: Settings }
];

export const allNavigationItems = navigationGroups.flatMap((group) => group.items);

export const findNavigationItem = (pathname) =>
  allNavigationItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ||
  accountNavigation.find((item) => item.to === pathname) ||
  null;
