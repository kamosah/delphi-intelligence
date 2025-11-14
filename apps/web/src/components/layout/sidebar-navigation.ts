import type { NavItem, NavSection } from '@olympus/types';
import {
  Bell,
  Building2,
  Database,
  FileText,
  Key,
  MessageSquare,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';

/**
 * Dashboard navigation items (flat list)
 * Used when NOT on settings routes
 */
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    id: 'spaces',
    icon: Database,
    label: 'Spaces',
    href: '/dashboard/spaces',
    description: 'Manage your data spaces',
  },
  {
    id: 'threads',
    icon: MessageSquare,
    label: 'Threads',
    href: '/threads',
    description: 'Conversational queries',
  },
  {
    id: 'documents',
    icon: FileText,
    label: 'Documents',
    href: '/dashboard/documents',
    description: 'Document intelligence',
  },
];

/**
 * Settings navigation sections (Hex-style grouped sections)
 * Used when on settings routes
 */
export const SETTINGS_NAV_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    title: 'WORKSPACE',
    items: [
      {
        id: 'organization',
        icon: Building2,
        label: 'Organization',
        href: (orgId) => `/settings/organizations/${orgId}`,
        description: 'Manage organization details',
      },
      {
        id: 'threads-settings',
        icon: MessageSquare,
        label: 'Threads',
        href: (orgId) => `/settings/organizations/${orgId}/threads`,
        description: 'Thread configuration',
      },
    ],
  },
  {
    id: 'access-security',
    title: 'ACCESS & SECURITY',
    items: [
      {
        id: 'members',
        icon: Users,
        label: 'Users',
        href: (orgId) => `/settings/organizations/${orgId}/members`,
        description: 'Manage team members',
      },
      {
        id: 'groups',
        icon: Shield,
        label: 'Groups',
        href: (orgId) => `/settings/organizations/${orgId}/groups`,
        description: 'Manage access groups',
      },
    ],
  },
  {
    id: 'account',
    title: 'ACCOUNT',
    items: [
      {
        id: 'profile',
        icon: User,
        label: 'Preferences',
        href: '/settings/profile',
        description: 'Personal preferences',
      },
      {
        id: 'notifications',
        icon: Bell,
        label: 'Notifications',
        href: '/settings/notifications',
        description: 'Notification settings',
      },
      {
        id: 'api-keys',
        icon: Key,
        label: 'API keys',
        href: '/settings/api-keys',
        description: 'Manage API credentials',
      },
    ],
  },
];

/**
 * Settings navigation item (footer in dashboard)
 */
export const SETTINGS_NAV_ITEM: NavItem = {
  id: 'settings',
  icon: Settings,
  label: 'Settings',
  href: (orgId) => `/settings/organizations/${orgId}`,
  description: 'Organization and user settings',
};
