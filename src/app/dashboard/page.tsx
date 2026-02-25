'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import { getRestaurants, getMenus, getTables } from '@/lib/api';
import { Table } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    restaurants: 0,
    menus: 0,
    tables: 0,
    activeTables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [restaurantsRes, menusRes, tablesRes] = await Promise.all([
          getRestaurants(),
          getMenus(),
          getTables(),
        ]);

        const tables = tablesRes.data as Table[];
        setStats({
          restaurants: restaurantsRes.data.length,
          menus: menusRes.data.length,
          tables: tables.length,
          activeTables: tables.filter((t) => t.isActive).length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Рестораны',
      value: stats.restaurants,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      link: '/restaurants',
    },
    {
      title: 'Меню',
      value: stats.menus,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      link: '/menus',
    },
    {
      title: 'Всего столов',
      value: stats.tables,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      link: '/tables',
    },
    {
      title: 'Активных столов',
      value: stats.activeTables,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      link: '/tables',
    },
  ];

  const quickActions = [
    {
      title: 'Добавить ресторан',
      description: 'Создать новый ресторан в системе',
      href: '/restaurants',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Создать меню',
      description: 'Добавить новое меню для ресторана',
      href: '/menus',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Генерация QR',
      description: 'Создать QR-коды для столов',
      href: '/qr-codes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Просмотр заказов',
      description: 'Управление текущими заказами',
      href: '/orders',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Панель управления</h1>
        <p className="text-slate-500 mt-2">Добро пожаловать в систему управления QR-меню</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-shimmer">
              <div className="h-12 w-12 bg-slate-200 rounded-xl mb-4" />
              <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.link}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 card-hover"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
              <p className="text-4xl font-bold text-slate-900">{card.value}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Быстрые действия</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.gradient} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{action.title}</h3>
              <p className="text-sm text-slate-500">{action.description}</p>

              <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Перейти</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-10 relative overflow-hidden rounded-2xl p-8" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 flex items-center justify-between">
          <div className="text-white">
            <h3 className="text-xl font-bold mb-2">Нужна помощь?</h3>
            <p className="text-indigo-200 max-w-xl">
              Если у вас возникли вопросы по работе с системой, свяжитесь с нашей службой поддержки.
            </p>
          </div>
          <Link
            href="/orders"
            className="flex-shrink-0 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-200 backdrop-blur-sm"
          >
            Смотреть заказы
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>
    </AdminLayout>
  );
}
