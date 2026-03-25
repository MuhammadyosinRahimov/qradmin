'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import { getRestaurants, getMenus, getTables, getTableSessions, getOrders } from '@/lib/api';
import { Table, TableSession } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

interface OrderStats {
  pending: number;
  confirmed: number;
  paid: number;
  cancelled: number;
  total: number;
  totalRevenue: number;
}

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    restaurants: 0,
    menus: 0,
    tables: 0,
    activeTables: 0,
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({
    pending: 0,
    confirmed: 0,
    paid: 0,
    cancelled: 0,
    total: 0,
    totalRevenue: 0,
  });
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [restaurantsRes, menusRes, tablesRes, sessionsRes, ordersRes] = await Promise.all([
          getRestaurants(),
          getMenus(),
          getTables(),
          getTableSessions(undefined, 'Active'),
          getOrders(),
        ]);

        const tables = tablesRes.data as Table[];
        setStats({
          restaurants: restaurantsRes.data.length,
          menus: menusRes.data.length,
          tables: tables.length,
          activeTables: tables.filter((t) => t.isActive).length,
        });

        setActiveSessions(sessionsRes.data || []);

        // Calculate order statistics
        const orders = ordersRes.data || [];
        const stats: OrderStats = {
          pending: 0,
          confirmed: 0,
          paid: 0,
          cancelled: 0,
          total: orders.length,
          totalRevenue: 0,
        };

        orders.forEach((order: any) => {
          switch (order.status) {
            case 0: stats.pending++; break;
            case 1: stats.confirmed++; break;
            case 2: stats.paid++; stats.totalRevenue += order.totalAmount || 0; break;
            case 3: stats.cancelled++; break;
          }
        });

        setOrderStats(stats);

        // Generate daily data for the last 7 days
        const last7Days: DailyData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });

          const dayOrders = orders.filter((o: any) => {
            const orderDate = new Date(o.createdAt);
            return orderDate.toDateString() === date.toDateString();
          });

          last7Days.push({
            date: dateStr,
            orders: dayOrders.length,
            revenue: dayOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
          });
        }
        setDailyData(last7Days);
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
      color: 'var(--status-info)',
      bgColor: 'var(--status-info-bg)',
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
      color: 'var(--status-success)',
      bgColor: 'var(--status-success-bg)',
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
      color: 'var(--primary)',
      bgColor: 'var(--primary-bg)',
      link: '/tables',
    },
    {
      title: 'Активных сессий',
      value: activeSessions.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'var(--status-warning)',
      bgColor: 'var(--status-warning-bg)',
      link: '/orders',
    },
  ];

  const orderStatusData = [
    { name: 'Новые', value: orderStats.pending, color: '#fbbf24' },
    { name: 'Готовится', value: orderStats.confirmed, color: '#60a5fa' },
    { name: 'Оплачены', value: orderStats.paid, color: '#4ce08a' },
    { name: 'Отменены', value: orderStats.cancelled, color: '#f87171' },
  ].filter(item => item.value > 0);

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
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₸';
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Панель управления</h1>
        <p className="text-[var(--text-secondary)] mt-2">Добро пожаловать в систему управления QR-меню</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm animate-shimmer border border-[var(--border-primary)]">
              <div className="h-12 w-12 bg-[var(--bg-muted)] rounded-xl mb-4" />
              <div className="h-4 w-20 bg-[var(--bg-muted)] rounded mb-2" />
              <div className="h-8 w-16 bg-[var(--bg-muted)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.link}
              className="group bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all duration-300"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: card.bgColor, color: card.color }}
              >
                {card.icon}
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{card.title}</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">{card.value}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Chart */}
        <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Заказы за неделю</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="Заказы"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-muted)]">
              Нет данных о заказах
            </div>
          )}
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Статусы заказов</h3>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-muted)]">
              Нет данных о заказах
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Выручка за неделю</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Выручка']}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar
                  dataKey="revenue"
                  name="Выручка"
                  fill="var(--status-success)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-muted)]">
              Нет данных о выручке
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Сводка</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-bg)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="var(--status-success)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Общая выручка</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(orderStats.totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--status-info-bg)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="var(--status-info)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Всего заказов</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{orderStats.total}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--status-warning-bg)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="var(--status-warning)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Ожидают обработки</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{orderStats.pending + orderStats.confirmed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Быстрые действия</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm border border-[var(--border-primary)] hover:border-[var(--primary)] transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity" />

              <div className="w-12 h-12 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center mb-4 text-[var(--primary)] group-hover:scale-110 transition-transform duration-300">
                {action.icon}
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--primary)] transition-colors">{action.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{action.description}</p>

              <div className="mt-4 flex items-center text-sm font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="mt-10 relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 flex items-center justify-between">
          <div className="text-white">
            <h3 className="text-xl font-bold mb-2">Управление заказами</h3>
            <p className="text-white/80 max-w-xl">
              Перейдите к панели заказов для просмотра и управления всеми текущими заказами в режиме реального времени.
            </p>
          </div>
          <Link
            href="/orders"
            className="flex-shrink-0 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl border border-white/30 transition-all duration-200 backdrop-blur-sm"
          >
            Смотреть заказы
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>
    </AdminLayout>
  );
}
