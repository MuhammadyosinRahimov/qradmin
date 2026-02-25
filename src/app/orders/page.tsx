'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { getOrders, updateOrderStatus, getSignalRUrl, cancelOrderItem, confirmPendingItems, getRestaurantStatus, toggleRestaurantOrders, getRestaurants, getTableSessions, markSessionPaid, closeTableSession, markOrderPaidInSession } from '@/lib/api';
import { Order, OrderStatus, OrderItemStatus, OrderItemStatusNames, Restaurant, TableSession, TableSessionStatus } from '@/types';
import Select from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';

const statusLabels: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Новый',
  [OrderStatus.Confirmed]: 'Подтверждён',
  [OrderStatus.Completed]: 'Завершён',
  [OrderStatus.Cancelled]: 'Отменён',
};

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800',
  [OrderStatus.Completed]: 'bg-gray-100 text-gray-800',
  [OrderStatus.Cancelled]: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const { getRestaurantId, admin } = useAuthStore();

  // Pause orders state
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [pauseMessage, setPauseMessage] = useState('');
  const [togglingPause, setTogglingPause] = useState(false);

  // Restaurant selection for super admin
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const isSuperAdmin = admin?.role === 'Admin';

  // View mode: 'orders' or 'tables'
  const [viewMode, setViewMode] = useState<'orders' | 'tables'>('orders');
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Initialize AudioContext on user interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setSoundEnabled(true);
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(async () => {
    try {
      // Create AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Resume if suspended (required by browsers)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      // Play three ascending beeps for attention
      const playBeep = (freq: number, startTime: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        // Start at 0 volume, ramp up quickly, then fade out
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.25);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      };

      // Three ascending beeps
      playBeep(600, now);
      playBeep(800, now + 0.2);
      playBeep(1000, now + 0.4);

      // Also show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Новый заказ!', {
          body: 'Поступил новый заказ',
          icon: '/favicon.ico',
        });
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, []);

  // Fetch restaurants for super admin
  const fetchRestaurants = useCallback(async () => {
    if (isSuperAdmin) {
      try {
        const response = await getRestaurants();
        setRestaurants(response.data);
        // Auto-select first restaurant if none selected
        if (response.data.length > 0 && !selectedRestaurantId) {
          setSelectedRestaurantId(response.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      }
    }
  }, [isSuperAdmin, selectedRestaurantId]);

  // Get the current restaurant ID (either from selection or from admin's restaurant)
  const getCurrentRestaurantId = useCallback(() => {
    if (isSuperAdmin) {
      return selectedRestaurantId;
    }
    return getRestaurantId() || admin?.restaurantId;
  }, [isSuperAdmin, selectedRestaurantId, getRestaurantId, admin]);

  // Fetch restaurant status
  const fetchRestaurantStatus = useCallback(async () => {
    const restaurantId = getCurrentRestaurantId();
    if (restaurantId) {
      try {
        const status = await getRestaurantStatus(restaurantId);
        setAcceptingOrders(status.data.acceptingOrders);
        setPauseMessage(status.data.pauseMessage || '');
      } catch (error) {
        console.error('Error fetching restaurant status:', error);
      }
    }
  }, [getCurrentRestaurantId]);

  // Toggle restaurant orders
  const handleTogglePause = async () => {
    const restaurantId = getCurrentRestaurantId();
    if (!restaurantId) {
      alert('Выберите ресторан');
      return;
    }

    setTogglingPause(true);
    try {
      await toggleRestaurantOrders(restaurantId, !acceptingOrders, pauseMessage || undefined);
      setAcceptingOrders(!acceptingOrders);
      setIsPauseModalOpen(false);
    } catch (error) {
      console.error('Error toggling restaurant orders:', error);
      alert('Ошибка при изменении статуса');
    } finally {
      setTogglingPause(false);
    }
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const restaurantId = getCurrentRestaurantId();
      const response = await getOrders(filter === 'all' ? undefined : filter, restaurantId || undefined);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, getCurrentRestaurantId]);

  // Fetch table sessions
  const fetchTableSessions = useCallback(async () => {
    try {
      const restaurantId = getCurrentRestaurantId();
      const response = await getTableSessions(restaurantId || undefined);
      setTableSessions(response.data);
    } catch (error) {
      console.error('Error fetching table sessions:', error);
    }
  }, [getCurrentRestaurantId]);

  // Handle mark session as paid
  const handleMarkSessionPaid = async (sessionId: string) => {
    setMarkingPaid(sessionId);
    try {
      await markSessionPaid(sessionId);
      fetchTableSessions();
      if (selectedSession?.id === sessionId) {
        const response = await getTableSessions();
        const updated = response.data.find((s: TableSession) => s.id === sessionId);
        if (updated) setSelectedSession(updated);
        else setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error marking session paid:', error);
      alert('Ошибка при отметке оплаты');
    } finally {
      setMarkingPaid(null);
    }
  };

  // Handle mark individual order as paid
  const handleMarkOrderPaid = async (sessionId: string, orderId: string) => {
    setMarkingPaid(orderId);
    try {
      await markOrderPaidInSession(sessionId, orderId);
      fetchTableSessions();
      if (selectedSession?.id === sessionId) {
        const response = await getTableSessions();
        const updated = response.data.find((s: TableSession) => s.id === sessionId);
        if (updated) setSelectedSession(updated);
        else setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error marking order paid:', error);
      alert('Ошибка при отметке оплаты');
    } finally {
      setMarkingPaid(null);
    }
  };

  // Handle close session
  const handleCloseSession = async (sessionId: string) => {
    if (!confirm('Закрыть сессию стола?')) return;
    try {
      await closeTableSession(sessionId);
      fetchTableSessions();
      setSelectedSession(null);
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Ошибка при закрытии сессии');
    }
  };

  // Fetch restaurants for super admin on mount
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Fetch restaurant status on mount and when selected restaurant changes
  useEffect(() => {
    fetchRestaurantStatus();
  }, [fetchRestaurantStatus, selectedRestaurantId]);

  // Cancel item handler
  const handleCancelItem = async (orderId: string, itemId: string) => {
    const reason = prompt('Причина отмены (необязательно):');
    setCancellingItemId(itemId);
    try {
      await cancelOrderItem(orderId, itemId, reason || undefined);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const response = await getOrders();
        const updated = response.data.find((o: Order) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Error cancelling item:', error);
      alert('Ошибка при отмене позиции');
    } finally {
      setCancellingItemId(null);
    }
  };

  // Confirm pending items handler
  const handleConfirmPendingItems = async (orderId: string) => {
    try {
      await confirmPendingItems(orderId);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const response = await getOrders();
        const updated = response.data.find((o: Order) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Error confirming items:', error);
    }
  };

  // Initialize SignalR connection
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getSignalRUrl(), {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('NewOrder', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      setNewOrdersCount((prev) => prev + 1);
      playNotificationSound();
    });

    connection.on('OrderStatusUpdated', (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      setSelectedOrder((prev) =>
        prev?.id === updatedOrder.id ? updatedOrder : prev
      );
    });

    connection.on('CashPaymentRequested', (data: {
      orderId: string;
      tableNumber: number;
      tableName: string;
      amount: number;
      requestedAt: string;
    }) => {
      // Play notification sound
      playNotificationSound();

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Запрос оплаты наличными', {
          body: `${data.tableName}: ${data.amount} TJS`,
          icon: '/favicon.ico',
        });
      }

      // Refresh orders list
      fetchOrders();
    });

    connection
      .start()
      .then(() => {
        console.log('SignalR connected');
        connection.invoke('JoinAdminGroup');
      })
      .catch((err) => console.error('SignalR error:', err));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [playNotificationSound]);

  // Fetch orders on mount and filter change
  useEffect(() => {
    if (viewMode === 'orders') {
      fetchOrders();
    } else {
      fetchTableSessions();
    }
  }, [fetchOrders, fetchTableSessions, viewMode]);

  // Reset new orders count when viewing
  useEffect(() => {
    if (filter === 'all' || filter === OrderStatus.Pending) {
      setNewOrdersCount(0);
    }
  }, [filter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      [OrderStatus.Pending]: OrderStatus.Confirmed,
      [OrderStatus.Confirmed]: OrderStatus.Completed,
      [OrderStatus.Completed]: null,
      [OrderStatus.Cancelled]: null,
    };
    return flow[status];
  };

  const filteredOrders = orders.filter(
    (order) => filter === 'all' || Number(order.status) === Number(filter)
  );

  return (
    <AdminLayout>

      {/* Pause status banner */}
      {!acceptingOrders && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Приём заказов приостановлен</p>
              {pauseMessage && <p className="text-sm text-red-600">{pauseMessage}</p>}
            </div>
          </div>
          <Button onClick={() => setIsPauseModalOpen(true)} size="sm">
            Возобновить
          </Button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Заказы
            {newOrdersCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {newOrdersCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Управление заказами в реальном времени</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Restaurant selector for super admin */}
          {isSuperAdmin && restaurants.length > 0 && (
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
          {/* Pause/Resume button */}
          <button
            onClick={() => setIsPauseModalOpen(true)}
            disabled={isSuperAdmin && !selectedRestaurantId}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              acceptingOrders
                ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
            }`}
          >
            {acceptingOrders ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Приостановить
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Возобновить
              </>
            )}
          </button>
          <button
            onClick={() => {
              initAudio();
              playNotificationSound();
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              soundEnabled
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {soundEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              )}
            </svg>
            {soundEnabled ? 'Тест звука' : 'Включить звук'}
          </button>
          <Button onClick={fetchOrders} variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </Button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setViewMode('orders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          По заказам
        </button>
        <button
          onClick={() => setViewMode('tables')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'tables'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          По столам
        </button>
      </div>

      {/* Filter tabs - only show in orders mode */}
      {viewMode === 'orders' && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Все
          </button>
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => setFilter(Number(status) as OrderStatus)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === Number(status)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Table Sessions Grid - By Tables view */}
      {viewMode === 'tables' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : tableSessions.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Нет активных столов</h3>
              <p className="text-gray-500">Активные сессии столов появятся здесь</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tableSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  {/* Session header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">#{session.tableNumber}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {session.tableName || `Стол #${session.tableNumber}`}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{session.guestCount} {session.guestCount === 1 ? 'гость' : session.guestCount < 5 ? 'гостя' : 'гостей'}</span>
                            <span>•</span>
                            <span>{session.orderCount} {session.orderCount === 1 ? 'заказ' : session.orderCount < 5 ? 'заказа' : 'заказов'}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Начало: {formatDate(session.startedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === TableSessionStatus.Active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.status === TableSessionStatus.Active ? 'Активна' : 'Закрыта'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orders list */}
                  <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                    {session.orders.map((order) => (
                      <div
                        key={order.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          order.isPaid ? 'bg-green-50' : 'bg-orange-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {order.guestPhone ? `+${order.guestPhone.slice(-4).padStart(order.guestPhone.length, '•')}` : 'Гость'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.items.slice(0, 2).map(i => i.productName).join(', ')}
                            {order.items.length > 2 && ` +${order.items.length - 2}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">{formatPrice(order.total)} TJS</span>
                            <p className="text-xs text-gray-500">
                              {formatPrice(order.subtotal)} + {formatPrice(order.serviceFeeShare)}
                            </p>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${order.isPaid ? 'bg-green-500' : 'bg-orange-500'}`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Session footer */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Сумма заказов</p>
                        <p className="text-lg font-semibold text-gray-700">{formatPrice(session.sessionSubtotal)} TJS</p>
                        <p className="text-sm text-gray-500">+ Обслуживание ({session.serviceFeePercent}%): {formatPrice(session.sessionServiceFee)} TJS</p>
                        <p className="text-xl font-bold text-gray-900">Итого: {formatPrice(session.sessionTotal)} TJS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Оплачено / Осталось</p>
                        <p className="text-sm">
                          <span className="text-green-600 font-medium">{formatPrice(session.paidAmount)}</span>
                          {' / '}
                          <span className="text-orange-600 font-medium">{formatPrice(session.unpaidAmount)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {session.unpaidAmount > 0 && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkSessionPaid(session.id);
                          }}
                          disabled={markingPaid === session.id}
                        >
                          Отметить оплаченным
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseSession(session.id);
                        }}
                      >
                        Закрыть стол
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Orders grid - By Orders view */}
      {viewMode === 'orders' && (loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Нет заказов</h3>
          <p className="text-gray-500">Новые заказы появятся здесь автоматически</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${
                order.status === OrderStatus.Pending
                  ? 'border-yellow-400 animate-pulse'
                  : 'border-transparent'
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">#{order.tableNumber}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {order.tableName || `Стол #${order.tableNumber}`}
                    </h3>
                    {order.tableTypeName && (
                      <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">
                        {order.tableTypeName}
                      </span>
                    )}
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    {order.restaurantName && (
                      <p className="text-xs text-blue-500">{order.restaurantName}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                  {order.hasPendingItems && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                      Новые блюда
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.productName} x{item.quantity}
                    </span>
                    <span className="text-gray-900">{formatPrice(item.totalPrice)} ₽</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-sm text-gray-500">
                    +{order.items.length - 3} ещё...
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="font-bold text-lg text-gray-900">
                  {formatPrice(order.total)} ₽
                </span>
                {getNextStatus(order.status) && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(order.id, getNextStatus(order.status)!);
                    }}
                  >
                    {statusLabels[getNextStatus(order.status)!]}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Session details modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">#{selectedSession.tableNumber}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedSession.tableName || `Стол #${selectedSession.tableNumber}`}
                    </h2>
                    <p className="text-gray-500">
                      {selectedSession.guestCount} {selectedSession.guestCount === 1 ? 'гость' : selectedSession.guestCount < 5 ? 'гостя' : 'гостей'} • Начало: {formatDate(selectedSession.startedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Заказы гостей</h3>
              <div className="space-y-4">
                {selectedSession.orders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-4 rounded-lg border-2 ${
                      order.isPaid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {order.guestPhone || 'Гость'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.isPaid ? 'Оплачено' : 'Не оплачено'}
                        </span>
                        {order.isPaid && order.paidAt && (
                          <span className="text-xs text-gray-500">
                            {formatDate(order.paidAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{formatPrice(order.total)} TJS</span>
                          <p className="text-xs text-gray-500">
                            {formatPrice(order.subtotal)} + {formatPrice(order.serviceFeeShare)} обсл.
                          </p>
                        </div>
                        {!order.isPaid && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMarkOrderPaid(selectedSession.id, order.id)}
                            disabled={markingPaid === order.id}
                          >
                            Оплачено
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.productName} x{item.quantity}
                            {item.sizeName && <span className="text-gray-400"> ({item.sizeName})</span>}
                          </span>
                          <span className="text-gray-900">{formatPrice(item.totalPrice)} TJS</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Session totals */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Сумма заказов</span>
                  <span className="font-medium text-gray-900">{formatPrice(selectedSession.sessionSubtotal)} TJS</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Обслуживание ({selectedSession.serviceFeePercent}%)</span>
                  <span className="font-medium text-gray-900">{formatPrice(selectedSession.sessionServiceFee)} TJS</span>
                </div>
                <div className="flex justify-between mb-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">Итого стола</span>
                  <span className="font-bold text-lg text-gray-900">{formatPrice(selectedSession.sessionTotal)} TJS</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Оплачено</span>
                  <span className="font-medium text-green-600">{formatPrice(selectedSession.paidAmount)} TJS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Осталось</span>
                  <span className="font-medium text-orange-600">{formatPrice(selectedSession.unpaidAmount)} TJS</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {selectedSession.unpaidAmount > 0 && (
                  <Button
                    className="flex-1"
                    onClick={() => handleMarkSessionPaid(selectedSession.id)}
                    disabled={markingPaid === selectedSession.id}
                  >
                    Отметить всё оплаченным
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => handleCloseSession(selectedSession.id)}
                >
                  Закрыть стол
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order details modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedOrder.tableName || `Стол #${selectedOrder.tableNumber}`}
                  </h2>
                  {selectedOrder.tableTypeName && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1">
                      {selectedOrder.tableTypeName}
                    </span>
                  )}
                  {selectedOrder.restaurantName && (
                    <p className="text-sm text-blue-500 mt-1">{selectedOrder.restaurantName}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-500 mt-1">{formatDate(selectedOrder.createdAt)}</p>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
                {selectedOrder.hasPendingItems && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                    Есть новые блюда
                  </span>
                )}
              </div>

              {/* Confirm pending items button */}
              {selectedOrder.hasPendingItems && selectedOrder.status !== OrderStatus.Cancelled && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-orange-700">Клиент добавил новые блюда</p>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmPendingItems(selectedOrder.id)}
                  >
                    Подтвердить все
                  </Button>
                </div>
              )}

              <h3 className="font-semibold text-gray-900 mb-3">Позиции заказа</h3>
              <div className="space-y-3 mb-6">
                {selectedOrder.items.map((item) => {
                  const isCancelled = item.status === OrderItemStatus.Cancelled;
                  const isPending = item.status === OrderItemStatus.Pending;

                  return (
                    <div
                      key={item.id}
                      className={`flex justify-between items-start p-2 rounded-lg ${
                        isCancelled ? 'bg-red-50 opacity-60' :
                        isPending ? 'bg-orange-50 border-2 border-orange-200' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {item.productName}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isCancelled ? 'bg-red-100 text-red-700' :
                            isPending ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {OrderItemStatusNames[item.status]}
                          </span>
                        </div>
                        {item.sizeName && (
                          <p className="text-sm text-gray-500">{item.sizeName}</p>
                        )}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-sm text-gray-500">
                            + {item.selectedAddons.join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {formatPrice(item.unitPrice)} TJS x {item.quantity}
                        </p>
                        {item.cancelReason && (
                          <p className="text-xs text-red-500 mt-1">
                            Причина: {item.cancelReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {formatPrice(item.totalPrice)} TJS
                        </span>
                        {!isCancelled && selectedOrder.status !== OrderStatus.Completed && selectedOrder.status !== OrderStatus.Cancelled && (
                          <button
                            onClick={() => handleCancelItem(selectedOrder.id, item.id)}
                            disabled={cancellingItemId === item.id}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Отменить позицию"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedOrder.specialInstructions && (
                <div className="mb-6 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Комментарий:</p>
                  <p className="text-sm text-yellow-700">{selectedOrder.specialInstructions}</p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Подитог</span>
                  <span>{formatPrice(selectedOrder.subtotal)} TJS</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Обслуживание (10%)</span>
                  <span>{formatPrice(selectedOrder.serviceFee)} TJS</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900">
                  <span>Итого</span>
                  <span>{formatPrice(selectedOrder.total)} TJS</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {getNextStatus(selectedOrder.status) && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, getNextStatus(selectedOrder.status)!);
                      setSelectedOrder(null);
                    }}
                  >
                    {statusLabels[getNextStatus(selectedOrder.status)!]}
                  </Button>
                )}
                {selectedOrder.status !== OrderStatus.Cancelled &&
                  selectedOrder.status !== OrderStatus.Completed && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, OrderStatus.Cancelled);
                        setSelectedOrder(null);
                      }}
                    >
                      Отменить заказ
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause orders modal */}
      <Modal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        title={acceptingOrders ? 'Приостановить приём заказов' : 'Возобновить приём заказов'}
        size="sm"
      >
        <div className="space-y-4">
          {acceptingOrders ? (
            <>
              <p className="text-gray-600">
                Клиенты не смогут оформить новые заказы, пока приём приостановлен.
              </p>
              <Input
                id="pauseMessage"
                label="Сообщение для клиентов (необязательно)"
                value={pauseMessage}
                onChange={(e) => setPauseMessage(e.target.value)}
                placeholder="Например: Технический перерыв, вернёмся через 30 минут"
              />
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Текущие заказы продолжат обрабатываться. Приостановлен будет только приём новых заказов.
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-600">
              После возобновления клиенты снова смогут оформлять заказы.
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPauseModalOpen(false)}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleTogglePause}
              isLoading={togglingPause}
              variant={acceptingOrders ? 'danger' : 'primary'}
              className="flex-1"
            >
              {acceptingOrders ? 'Приостановить' : 'Возобновить'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
