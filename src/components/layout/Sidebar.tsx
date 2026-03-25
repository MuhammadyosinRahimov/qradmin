'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/contexts/ThemeContext';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    href: '/dashboard',
    label: 'Панель',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'Заказы',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/restaurants',
    label: 'Рестораны',
    superAdminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/menus',
    label: 'Меню',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: '/tables',
    label: 'Столы',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    href: '/qr-codes',
    label: 'QR-коды',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    href: '/categories',
    label: 'Категории',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/products',
    label: 'Продукты',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  // Check role directly to avoid hydration issues
  const isSuper = admin?.role === 'Admin';

  // Filter menu items based on role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.superAdminOnly && !isSuper) {
      return false;
    }
    return true;
  });

  // Keyboard shortcut (Cmd/Ctrl + B to toggle)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen flex flex-col
        bg-[var(--bg-secondary)] border-r border-[var(--border-primary)]
        sidebar-transition z-40 theme-transition
        ${isCollapsed ? 'w-[72px]' : 'w-60'}
      `}
    >
      {/* Logo and toggle */}
      <div className={`h-14 flex items-center border-b border-[var(--border-primary)] ${isCollapsed ? 'px-3 justify-center' : 'px-4 justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-muted)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--primary)]/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">QR Меню</h1>
              <span className={`text-[10px] font-medium ${isSuper ? 'text-purple-400' : 'text-[var(--primary)]'}`}>
                {isSuper ? 'Super Admin' : 'Restaurant'}
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all duration-200"
            title="Свернуть (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Toggle button when collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="mx-auto mt-3 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all duration-200"
          title="Развернуть (Ctrl+B)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Restaurant name for restaurant admin */}
      {!isSuper && admin?.restaurantName && !isCollapsed && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Ресторан</p>
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{admin.restaurantName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 py-4 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {!isCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Навигация</p>
        )}
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    group relative flex items-center rounded-lg
                    transition-all duration-200
                    ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                    ${isActive
                      ? 'bg-[var(--primary-bg)] text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  data-tooltip={isCollapsed ? item.label : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--primary)] rounded-r" />
                  )}

                  <span className={`flex-shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
                    {item.icon}
                  </span>

                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-[var(--border-primary)] shadow-lg">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme toggle */}
      <div className={`border-t border-[var(--border-primary)] ${isCollapsed ? 'p-2' : 'px-3 py-2'}`}>
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center rounded-lg transition-all duration-200
            text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
            ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
          `}
          title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-[var(--status-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--status-info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
            </span>
          )}
        </button>
      </div>

      {/* User section */}
      <div className={`border-t border-[var(--border-primary)] ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            {/* Compact avatar */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg ${
              isSuper ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-muted)]'
            }`}>
              <span className="font-semibold text-white text-sm">
                {admin?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            {/* Compact logout */}
            <button
              onClick={logout}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--bg-hover)] rounded-lg transition-all duration-200"
              title="Выйти"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] mb-2">
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow ${
                isSuper ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-muted)]'
              }`}>
                <span className="font-semibold text-white text-xs">
                  {admin?.name?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{admin?.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{admin?.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--status-error)] hover:bg-[var(--bg-hover)] rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выйти
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
