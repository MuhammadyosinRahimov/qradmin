'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { getOrders, updateOrderStatus, getSignalRUrl, cancelOrderItem, confirmPendingItems, getRestaurantStatus, toggleRestaurantOrders, getRestaurants, getTableSessions, markSessionPaid, closeTableSession, markOrderPaidInSession, dismissWaiter } from '@/lib/api';
// JURA TEMPORARILY DISABLED
// import { getJuraOrderStatus, cancelJuraOrder } from '@/lib/api';
import { Order, OrderStatus, OrderItemStatus, OrderItemStatusNames, Restaurant, TableSession, TableSessionStatus, OrderType, OrderTypeNames, SessionOrder } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import KanbanBoard from '@/components/orders/KanbanBoard';
import { useToast } from '@/components/ui/ToastProvider';
// JURA TEMPORARILY DISABLED
// import JuraDeliveryModal from '@/components/orders/JuraDeliveryModal';
// import CreateJuraOrderModal from '@/components/orders/CreateJuraOrderModal';

// Normalize order status (handle both string and number values from API)
const normalizeOrderStatus = (status: OrderStatus | string | number): OrderStatus => {
  if (typeof status === 'number') return status as OrderStatus;
  const statusMap: Record<string, OrderStatus> = {
    'Pending': OrderStatus.Pending,
    'Confirmed': OrderStatus.Confirmed,
    'Cancelled': OrderStatus.Cancelled,
    '0': OrderStatus.Pending,
    '1': OrderStatus.Confirmed,
    '3': OrderStatus.Cancelled,
  };
  return statusMap[String(status)] ?? OrderStatus.Pending;
};

// Normalize order item status (handle both string and number values from API)
const normalizeItemStatus = (status: OrderItemStatus | string | number): OrderItemStatus => {
  if (typeof status === 'number') return status as OrderItemStatus;
  const statusMap: Record<string, OrderItemStatus> = {
    'Pending': OrderItemStatus.Pending,
    'Active': OrderItemStatus.Active,
    'Cancelled': OrderItemStatus.Cancelled,
    '0': OrderItemStatus.Pending,
    '1': OrderItemStatus.Active,
    '2': OrderItemStatus.Cancelled,
  };
  return statusMap[String(status)] ?? OrderItemStatus.Pending;
};

// JURA TEMPORARILY DISABLED - using Partial<Record> since DeliveryJura is disabled
const statusLabels: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Pending]: 'Новый',
  [OrderStatus.Confirmed]: 'Подтверждён',
  [OrderStatus.Cancelled]: 'Отменён',
  // [OrderStatus.DeliveryJura]: 'Доставка Jura',
};

const statusColors: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800',
  [OrderStatus.Cancelled]: 'bg-red-100 text-red-800',
  // [OrderStatus.DeliveryJura]: 'bg-violet-100 text-violet-800',
};

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all' | 'paid'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const { getRestaurantId, admin } = useAuthStore();
  const toast = useToast();

  // Pause orders state
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [pauseMessage, setPauseMessage] = useState('');
  const [togglingPause, setTogglingPause] = useState(false);

  // Restaurant selection for super admin
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const isSuperAdmin = admin?.role === 'Admin';

  // View mode: 'orders', 'tables', or 'kanban'
  const [viewMode, setViewMode] = useState<'orders' | 'tables' | 'kanban'>('kanban');
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Kanban selected order
  const [selectedKanbanOrder, setSelectedKanbanOrder] = useState<{ order: SessionOrder; session: TableSession } | null>(null);

  // Cancellation notification modal
  const [cancelNotification, setCancelNotification] = useState<{
    itemName: string;
    sizeName: string | null;
    quantity: number;
    totalPrice: number;
    reason: string | null;
    tableNumber: number;
  } | null>(null);

  // Cash payment notification modal
  const [cashPaymentNotification, setCashPaymentNotification] = useState<{
    tableNumber: number;
    tableName: string;
    amount: number;
    guestPhone?: string;
  } | null>(null);

  // Waiter call notification modal
  const [waiterCallNotification, setWaiterCallNotification] = useState<{
    tableNumber: number;
    tableName: string;
    guestPhone?: string;
  } | null>(null);

  // JURA TEMPORARILY DISABLED
  // // Jura delivery modal state
  // const [isJuraSelectModalOpen, setIsJuraSelectModalOpen] = useState(false);
  // const [isJuraDeliveryModalOpen, setIsJuraDeliveryModalOpen] = useState(false);
  // const [selectedJuraOrder, setSelectedJuraOrder] = useState<SessionOrder | null>(null);
  // const [isCreateJuraModalOpen, setIsCreateJuraModalOpen] = useState(false);
  // const [refreshingJuraStatus, setRefreshingJuraStatus] = useState(false);

  // // Get eligible orders for Jura delivery (Delivery type, Confirmed, no juraOrderId)
  // const eligibleJuraOrders = tableSessions.flatMap(session =>
  //   session.orders
  //     .filter(order =>
  //       order.orderType === OrderType.Delivery &&
  //       order.status === OrderStatus.Confirmed &&
  //       !order.juraOrderId
  //     )
  //     .map(order => ({ order, session }))
  // );

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

  // Helper: determine session status from order filter
  const getSessionStatusFromFilter = useCallback((orderFilter: OrderStatus | 'all' | 'paid'): string => {
    // For cancelled or paid orders, we need to look at all sessions (including closed)
    if (orderFilter === OrderStatus.Cancelled || orderFilter === 'paid') {
      return 'all';
    }
    // For "all" filter, also get all sessions to show full history
    if (orderFilter === 'all') {
      return 'all';
    }
    // For pending/confirmed, only active sessions
    return 'active';
  }, []);

  // Fetch table sessions
  const fetchTableSessions = useCallback(async (sessionStatus?: string) => {
    try {
      const restaurantId = getCurrentRestaurantId();
      // Use provided status or determine from current filter
      const status = sessionStatus ?? getSessionStatusFromFilter(filter);
      console.log('[Orders] Fetching sessions:', { restaurantId, status, isSuperAdmin, selectedRestaurantId });
      const response = await getTableSessions(restaurantId || undefined, status);
      console.log('[Orders] Sessions received:', response.data.length, 'sessions');
      setTableSessions(response.data);
    } catch (error) {
      console.error('Error fetching table sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentRestaurantId, filter, getSessionStatusFromFilter, isSuperAdmin, selectedRestaurantId]);

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

  // NOTE: Jura status polling is handled by KanbanBoard component using batch endpoint
  // This avoids duplicate requests and is more efficient

  // Cancel item handler
  const handleCancelItem = async (orderId: string, itemId: string) => {
    const reason = prompt('Причина отмены (необязательно):');
    setCancellingItemId(itemId);
    try {
      await cancelOrderItem(orderId, itemId, reason || undefined);
      fetchTableSessions();
      // Update selectedOrder modal if open
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
      fetchTableSessions();
      // Update selectedOrder modal if open
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

    connection.on('NewOrder', (orderData) => {
      // Refresh sessions to show new order
      console.log('[SignalR] NewOrder received:', orderData);
      const orderRestaurantId = orderData?.restaurantId;
      const adminRestaurantId = getCurrentRestaurantId();
      console.log('[SignalR] Order restaurant ID:', orderRestaurantId);
      console.log('[SignalR] Admin restaurant ID:', adminRestaurantId);

      if (orderRestaurantId && adminRestaurantId && orderRestaurantId !== adminRestaurantId) {
        console.warn('[SignalR] Restaurant ID mismatch! Order from different restaurant.');
      }

      fetchTableSessions();
      setNewOrdersCount((prev) => prev + 1);
      playNotificationSound();
    });

    connection.on('OrderStatusUpdated', (updatedOrder: Order) => {
      // Refresh sessions to reflect status change
      fetchTableSessions();
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
      guestPhone?: string;
    }) => {
      // Play notification sound
      playNotificationSound();

      // Open cash payment notification modal
      setCashPaymentNotification({
        tableNumber: data.tableNumber,
        tableName: data.tableName,
        amount: data.amount,
        guestPhone: data.guestPhone,
      });

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Запрос оплаты наличными', {
          body: `${data.tableName}: ${data.amount} TJS`,
          icon: '/favicon.ico',
        });
      }

      // Refresh table sessions
      fetchTableSessions();
    });

    // Listen for order item cancellations from customers
    connection.on('OrderItemCancelled', (data: {
      Order: Order;
      CancelledItem: {
        ItemId: string;
        ItemName: string;
        SizeName: string | null;
        Quantity: number;
        TotalPrice: number;
        Reason: string | null;
      };
      TableNumber: number;
    }) => {
      console.log('[SignalR] OrderItemCancelled received:', data);

      // Play notification sound
      playNotificationSound();

      // Open cancellation notification modal
      setCancelNotification({
        itemName: data.CancelledItem.ItemName,
        sizeName: data.CancelledItem.SizeName,
        quantity: data.CancelledItem.Quantity,
        totalPrice: data.CancelledItem.TotalPrice,
        reason: data.CancelledItem.Reason,
        tableNumber: data.TableNumber,
      });

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const itemInfo = data.CancelledItem.SizeName
          ? `${data.CancelledItem.ItemName} (${data.CancelledItem.SizeName})`
          : data.CancelledItem.ItemName;
        new Notification(`Отмена позиции - Стол №${data.TableNumber}`, {
          body: `${itemInfo} x${data.CancelledItem.Quantity}${data.CancelledItem.Reason ? ` - "${data.CancelledItem.Reason}"` : ''}`,
          icon: '/favicon.ico',
        });
      }

      // Refresh table sessions to show updated order
      fetchTableSessions();
    });

    // Listen for extra items added to existing orders
    connection.on('OrderItemsAdded', (data: {
      Order: Order;
      IsExtraOrder: boolean;
      NewItems: Array<{ ProductName: string; Quantity: number; TotalPrice: number }>;
      TableNumber: number;
    }) => {
      console.log('[SignalR] OrderItemsAdded received:', data);

      // Play notification sound for extra orders (items added after initial order)
      if (data.IsExtraOrder) {
        playNotificationSound();

        // Show browser notification for extra orders
        if ('Notification' in window && Notification.permission === 'granted') {
          const itemsList = data.NewItems.map(i => `${i.ProductName} x${i.Quantity}`).join(', ');
          new Notification(`Доп. заказ - Стол №${data.TableNumber}`, {
            body: itemsList,
            icon: '/favicon.ico',
          });
        }
      }

      // Refresh table sessions to show updated order
      fetchTableSessions();
    });

    // Universal event - always refresh on any order change
    connection.on('OrdersChanged', (data: {
      Action: string;
      OrderId: string;
      TableNumber: number;
      RestaurantId: string;
    }) => {
      console.log('[SignalR] OrdersChanged received:', data);
      // Always refresh data on any order change
      fetchTableSessions();
    });

    // Listen for waiter call requests
    connection.on('WaiterCalled', (data: {
      orderId: string;
      tableNumber: number;
      tableName: string;
      calledAt: string;
      guestPhone?: string;
    }) => {
      console.log('[SignalR] WaiterCalled received:', data);

      // Play notification sound
      playNotificationSound();

      // Open waiter call notification modal
      setWaiterCallNotification({
        tableNumber: data.tableNumber,
        tableName: data.tableName,
        guestPhone: data.guestPhone,
      });

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Вызов официанта', {
          body: `${data.tableName || `Стол №${data.tableNumber}`}`,
          icon: '/favicon.ico',
        });
      }

      // Refresh table sessions
      fetchTableSessions();
    });

    connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected successfully, state:', connection.state);
        connection.invoke('JoinAdminGroup')
          .then(() => {
            console.log('[SignalR] Joined Admins group successfully');
          })
          .catch((err) => console.error('[SignalR] Failed to join Admins group:', err));
      })
      .catch((err) => console.error('[SignalR] Connection error:', err));

    // Log connection state changes
    connection.onclose((err) => {
      console.log('[SignalR] Connection closed', err);
    });

    connection.onreconnecting((err) => {
      console.log('[SignalR] Reconnecting...', err);
    });

    connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected, re-joining Admins group');
      connection.invoke('JoinAdminGroup').catch(console.error);
    });

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [playNotificationSound, fetchTableSessions]);

  // Fetch data on mount and filter/view change
  // Both views now use table sessions for grouped display
  useEffect(() => {
    const sessionStatus = getSessionStatusFromFilter(filter);
    fetchTableSessions(sessionStatus);
  }, [fetchTableSessions, getSessionStatusFromFilter, viewMode, filter]);

  // Reset new orders count when viewing
  useEffect(() => {
    if (filter === 'all' || filter === OrderStatus.Pending) {
      setNewOrdersCount(0);
    }
  }, [filter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      fetchTableSessions();
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
    // JURA TEMPORARILY DISABLED - using Partial<Record> since DeliveryJura is disabled
    const flow: Partial<Record<OrderStatus, OrderStatus | null>> = {
      [OrderStatus.Pending]: OrderStatus.Confirmed,
      [OrderStatus.Confirmed]: null,
      [OrderStatus.Cancelled]: null,
      // [OrderStatus.DeliveryJura]: null,
    };
    return flow[status] ?? null;
  };

  // JURA TEMPORARILY DISABLED
  // // Jura status color mapping
  // const getJuraStatusColor = (statusId?: number) => {
  //   switch (statusId) {
  //     case 1: return 'bg-slate-100 text-slate-700';      // Поступило
  //     case 2: return 'bg-blue-100 text-blue-700';        // Водитель назначен
  //     case 4: return 'bg-orange-100 text-orange-700';    // Водитель на месте
  //     case 7: return 'bg-violet-100 text-violet-700';    // Исполняется
  //     case 9: return 'bg-emerald-100 text-emerald-700';  // Выполнен
  //     case 10: return 'bg-red-100 text-red-700';         // Отменен
  //     default: return 'bg-slate-100 text-slate-700';
  //   }
  // };

  // // Refresh Jura order status
  // const handleRefreshJuraStatus = async (orderId: string) => {
  //   setRefreshingJuraStatus(true);
  //   try {
  //     await getJuraOrderStatus(orderId);
  //     await fetchTableSessions();
  //     toast.success('Статус обновлён');
  //   } catch (error) {
  //     toast.error('Ошибка при обновлении статуса');
  //   } finally {
  //     setRefreshingJuraStatus(false);
  //   }
  // };

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
          {/* JURA TEMPORARILY DISABLED
          <button
            onClick={() => setIsCreateJuraModalOpen(true)}
            className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
             Jura
          </button>
          {eligibleJuraOrders.length > 0 && (
            <button
              onClick={() => setIsJuraSelectModalOpen(true)}
              className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 bg-violet-100 text-violet-700 border border-violet-300 hover:bg-violet-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Привязать к заказу
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-600 text-white rounded-full">
                {eligibleJuraOrders.length}
              </span>
            </button>
          )}
          */}
          <Button onClick={() => fetchTableSessions()} variant="secondary">
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
        <button
          onClick={() => setViewMode('kanban')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'kanban'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </button>
      </div>

      {/* Order type filter tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setOrderTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            orderTypeFilter === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          Все типы
        </button>
        <button
          onClick={() => setOrderTypeFilter(OrderType.DineIn)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            orderTypeFilter === OrderType.DineIn
              ? 'bg-orange-500 text-white'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          В ресторане
        </button>
        <button
          onClick={() => setOrderTypeFilter(OrderType.Delivery)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            orderTypeFilter === OrderType.Delivery
              ? 'bg-orange-500 text-white'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
          Доставка
        </button>
        <button
          onClick={() => setOrderTypeFilter(OrderType.Takeaway)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            orderTypeFilter === OrderType.Takeaway
              ? 'bg-orange-500 text-white'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Самовывоз
        </button>
      </div>

      {/* Status filter tabs - hidden in Kanban mode since columns already group by status */}
      {viewMode !== 'kanban' && (
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
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            Оплачено
          </button>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          sessions={tableSessions}
          orderTypeFilter={orderTypeFilter}
          onConfirmOrder={async (orderId) => {
            await confirmPendingItems(orderId);
            await updateOrderStatus(orderId, OrderStatus.Confirmed);
            fetchTableSessions();
          }}
          onMarkOrderPaid={(sessionId, orderId) => {
            handleMarkOrderPaid(sessionId, orderId);
          }}
          onMarkSessionPaid={(sessionId) => {
            handleMarkSessionPaid(sessionId);
          }}
          onCancelOrder={async (orderId) => {
            await updateOrderStatus(orderId, OrderStatus.Cancelled);
            fetchTableSessions();
          }}
          onDismissWaiter={async (orderId) => {
            await dismissWaiter(orderId);
            fetchTableSessions();
          }}
          onOrderClick={(order, session) => {
            setSelectedKanbanOrder({ order, session });
          }}
          onSessionClick={(session) => {
            setSelectedSession(session);
          }}
          onRefreshNeeded={() => {
            fetchTableSessions();
          }}
        />
      )}

      {/* Kanban Order Detail Modal */}
      {selectedKanbanOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedKanbanOrder.session.tableName || `Стол #${selectedKanbanOrder.session.tableNumber}`}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedKanbanOrder.order.customerName || selectedKanbanOrder.order.guestPhone || 'Гость'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedKanbanOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Status badges */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                {/* JURA TEMPORARILY DISABLED - removed Jura status conditional */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[normalizeOrderStatus(selectedKanbanOrder.order.status)]}`}>
                  {statusLabels[normalizeOrderStatus(selectedKanbanOrder.order.status)]}
                </span>
                {selectedKanbanOrder.order.isPaid && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    Оплачено
                  </span>
                )}
                {selectedKanbanOrder.order.hasPendingItems && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 animate-pulse">
                    Новые блюда
                  </span>
                )}
                {selectedKanbanOrder.order.wantsCashPayment && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                    Наличными
                  </span>
                )}
              </div>

              {/* Delivery/Takeaway info */}
              {selectedKanbanOrder.order.orderType === OrderType.Delivery && selectedKanbanOrder.order.deliveryAddress && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-purple-700">Адрес доставки</p>
                      <p className="text-purple-600">{selectedKanbanOrder.order.deliveryAddress}</p>
                      {selectedKanbanOrder.order.customerPhone && (
                        <p className="text-purple-500 text-sm mt-1">{selectedKanbanOrder.order.customerPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* JURA TEMPORARILY DISABLED - Jura Delivery Status section removed */}

              {/* Order items */}
              <h3 className="font-semibold text-gray-900 mb-3">Позиции заказа</h3>
              <div className="space-y-2 mb-6">
                {selectedKanbanOrder.order.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-start p-2 rounded-lg ${
                      normalizeItemStatus(item.status) === OrderItemStatus.Cancelled ? 'bg-red-50 opacity-60' :
                      normalizeItemStatus(item.status) === OrderItemStatus.Pending ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${normalizeItemStatus(item.status) === OrderItemStatus.Cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.productName}
                        {normalizeItemStatus(item.status) === OrderItemStatus.Pending && (
                          <span className="ml-2 text-xs text-orange-500">(новое)</span>
                        )}
                      </p>
                      {item.sizeName && <p className="text-sm text-gray-500">{item.sizeName}</p>}
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    </div>
                    <span className={`font-medium ${normalizeItemStatus(item.status) === OrderItemStatus.Cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {formatPrice(item.totalPrice)} TJS
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals - JURA TEMPORARILY DISABLED - always show totals */}
              {true && (
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Подитог</span>
                    <span>{formatPrice(selectedKanbanOrder.order.subtotal)} TJS</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Обслуживание</span>
                    <span>{formatPrice(selectedKanbanOrder.order.serviceFeeShare)} TJS</span>
                  </div>
                  {selectedKanbanOrder.order.deliveryFee && selectedKanbanOrder.order.deliveryFee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Доставка</span>
                      <span>{formatPrice(selectedKanbanOrder.order.deliveryFee)} TJS</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-gray-900">
                    <span>Итого</span>
                    <span>{formatPrice(selectedKanbanOrder.order.total)} TJS</span>
                  </div>
                </div>
              )}

              {/* Actions - JURA TEMPORARILY DISABLED - removed Jura conditional */}
              <div className="mt-6 flex gap-3 flex-wrap">
                {selectedKanbanOrder.order.hasPendingItems && normalizeOrderStatus(selectedKanbanOrder.order.status) !== OrderStatus.Cancelled && (
                  <Button
                    onClick={async () => {
                      await confirmPendingItems(selectedKanbanOrder.order.id);
                      fetchTableSessions();
                      setSelectedKanbanOrder(null);
                    }}
                  >
                    Подтвердить блюда
                  </Button>
                )}
                {normalizeOrderStatus(selectedKanbanOrder.order.status) === OrderStatus.Pending && (
                  <Button
                    onClick={async () => {
                      await confirmPendingItems(selectedKanbanOrder.order.id);
                      await updateOrderStatus(selectedKanbanOrder.order.id, OrderStatus.Confirmed);
                      fetchTableSessions();
                      setSelectedKanbanOrder(null);
                    }}
                  >
                    Подтвердить заказ
                  </Button>
                )}
                {!selectedKanbanOrder.order.isPaid && normalizeOrderStatus(selectedKanbanOrder.order.status) !== OrderStatus.Cancelled && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleMarkOrderPaid(selectedKanbanOrder.session.id, selectedKanbanOrder.order.id);
                      setSelectedKanbanOrder(null);
                    }}
                  >
                    Отметить оплаченным
                  </Button>
                )}
                {normalizeOrderStatus(selectedKanbanOrder.order.status) !== OrderStatus.Cancelled && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleStatusChange(selectedKanbanOrder.order.id, OrderStatus.Cancelled);
                      setSelectedKanbanOrder(null);
                    }}
                  >
                    Отменить
                  </Button>
                )}
              </div>
            </div>
          </div>
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
                            {order.wantsCashPayment && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                Наличными
                              </span>
                            )}
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

      {/* Orders grid - By Orders view (grouped by table session) */}
      {viewMode === 'orders' && (loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (() => {
        // Filter sessions based on order status and type filters
        const filteredSessions = tableSessions.filter(session => {
          // Status filter
          if (filter !== 'all') {
            if (filter === 'paid') {
              // For 'paid' filter, check if any order is paid
              const hasPaidOrders = session.orders.some(order => order.isPaid);
              if (!hasPaidOrders) return false;
            } else {
              const hasMatchingStatus = session.orders.some(order => Number(order.status) === Number(filter));
              if (!hasMatchingStatus) return false;
            }
          }
          // Order type filter
          if (orderTypeFilter !== 'all') {
            const hasMatchingType = session.orders.some(order => Number(order.orderType || 0) === Number(orderTypeFilter));
            if (!hasMatchingType) return false;
          }
          return true;
        });

        return filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Нет заказов</h3>
            <p className="text-gray-500">Новые заказы появятся здесь автоматически</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              // Filter orders within session if filter is applied
              let sessionOrders = filter === 'all'
                ? session.orders
                : filter === 'paid'
                  ? session.orders.filter(order => order.isPaid)
                  : session.orders.filter(order => Number(order.status) === Number(filter));

              // Also filter by order type
              if (orderTypeFilter !== 'all') {
                sessionOrders = sessionOrders.filter(order => Number(order.orderType || 0) === Number(orderTypeFilter));
              }

              const hasPendingOrders = sessionOrders.some(o => normalizeOrderStatus(o.status) === OrderStatus.Pending);
              const hasNewItems = sessionOrders.some(o => o.hasPendingItems);

              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                    hasPendingOrders
                      ? 'border-yellow-400'
                      : hasNewItems
                        ? 'border-orange-300'
                        : 'border-transparent'
                  }`}
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
                            <span className="ml-2 text-gray-500 font-normal text-sm">
                              ({session.orderCount} {session.orderCount === 1 ? 'заказ' : session.orderCount < 5 ? 'заказа' : 'заказов'})
                            </span>
                          </h3>
                          <p className="text-sm text-gray-500">
                            Начало: {formatDate(session.startedAt)}
                          </p>
                          {session.closedAt && (
                            <p className="text-xs text-gray-400">
                              Закрыто: {formatDate(session.closedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === TableSessionStatus.Active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.status === TableSessionStatus.Active ? 'Активна' : 'Закрыта'}
                        </span>
                        {hasNewItems && (
                          <p className="mt-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                              Новые блюда
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Orders in this session */}
                  <div className="p-4 space-y-4">
                    {sessionOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`p-4 rounded-lg border-2 ${
                          normalizeOrderStatus(order.status) === OrderStatus.Pending
                            ? 'bg-yellow-50 border-yellow-200'
                            : order.hasPendingItems
                              ? 'bg-orange-50 border-orange-200'
                              : order.isPaid
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {order.customerName || (order.guestPhone ? `Гость ${order.guestPhone.slice(-4).padStart(order.guestPhone.length, '•')}` : 'Гость')}
                            </span>
                            {/* Order type badge */}
                            {order.orderType === OrderType.Delivery && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                Доставка
                              </span>
                            )}
                            {order.orderType === OrderType.Takeaway && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Самовывоз
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[normalizeOrderStatus(order.status)]}`}>
                              {statusLabels[normalizeOrderStatus(order.status)]}
                            </span>
                            {order.isPaid && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Оплачено
                              </span>
                            )}
                            {order.wantsCashPayment && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Наличными
                              </span>
                            )}
                            {order.hasPendingItems && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                                Новые блюда
                              </span>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>

                        {/* Delivery/Takeaway info */}
                        {order.orderType === OrderType.Delivery && order.deliveryAddress && (
                          <div className="mb-2 p-2 bg-purple-50 rounded-lg text-sm">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-purple-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="text-purple-700">{order.deliveryAddress}</span>
                            </div>
                            {order.customerPhone && (
                              <div className="flex items-center gap-2 mt-1 ml-6">
                                <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-purple-600 text-xs">{order.customerPhone}</span>
                              </div>
                            )}
                            {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                              <div className="text-xs text-purple-600 mt-1 ml-6">
                                Доставка: {formatPrice(order.deliveryFee)} TJS
                              </div>
                            )}
                          </div>
                        )}

                        {order.orderType === OrderType.Takeaway && (
                          <div className="mb-2 p-2 bg-teal-50 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-teal-700">{order.customerName || 'Гость'}</span>
                              {order.customerPhone && (
                                <span className="text-teal-600 text-xs">({order.customerPhone})</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="mb-3 text-xs text-gray-500 space-x-3">
                          {order.paidAt && (
                            <span>Оплачено: {formatDate(order.paidAt)}</span>
                          )}
                          {order.completedAt && (
                            <span>Завершено: {formatDate(order.completedAt)}</span>
                          )}
                        </div>

                        {/* Order items */}
                        <div className="space-y-1 mb-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className={`${normalizeItemStatus(item.status) === OrderItemStatus.Cancelled ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                {item.productName} x{item.quantity}
                                {item.sizeName && <span className="text-gray-400"> ({item.sizeName})</span>}
                                {normalizeItemStatus(item.status) === OrderItemStatus.Pending && (
                                  <span className="ml-1 text-xs text-orange-500">(новое)</span>
                                )}
                              </span>
                              <span className={`${normalizeItemStatus(item.status) === OrderItemStatus.Cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {formatPrice(item.totalPrice)} TJS
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order totals and actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div>
                            <span className="text-sm text-gray-500">
                              {formatPrice(order.subtotal)} + {formatPrice(order.serviceFeeShare)} обсл. =
                            </span>
                            <span className="ml-2 font-bold text-gray-900">{formatPrice(order.total)} TJS</span>
                          </div>
                          <div className="flex gap-2">
                            {order.hasPendingItems && normalizeOrderStatus(order.status) !== OrderStatus.Cancelled && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleConfirmPendingItems(order.id)}
                              >
                                Подтвердить блюда
                              </Button>
                            )}
                            {getNextStatus(normalizeOrderStatus(order.status)) && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(order.id, getNextStatus(normalizeOrderStatus(order.status))!)}
                              >
                                {statusLabels[getNextStatus(normalizeOrderStatus(order.status))!]}
                              </Button>
                            )}
                            {!order.isPaid && normalizeOrderStatus(order.status) !== OrderStatus.Cancelled && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleMarkOrderPaid(session.id, order.id)}
                                disabled={markingPaid === order.id}
                              >
                                Оплачено
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Session footer with totals */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Сумма заказов</p>
                        <p className="font-medium text-gray-700">{formatPrice(session.sessionSubtotal)} TJS</p>
                        <p className="text-sm text-gray-500">+ Обслуживание ({session.serviceFeePercent}%): {formatPrice(session.sessionServiceFee)} TJS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">ИТОГО: {formatPrice(session.sessionTotal)} TJS</p>
                        <p className="text-sm">
                          <span className="text-green-600">Оплачено: {formatPrice(session.paidAmount)}</span>
                          {session.unpaidAmount > 0 && (
                            <span className="text-orange-600 ml-2">Осталось: {formatPrice(session.unpaidAmount)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {session.unpaidAmount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkSessionPaid(session.id)}
                          disabled={markingPaid === session.id}
                        >
                          Отметить всё оплаченным
                        </Button>
                      )}
                      {session.status === TableSessionStatus.Active && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCloseSession(session.id)}
                        >
                          Закрыть стол
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })())}

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
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedSession.tableName || `Стол #${selectedSession.tableNumber}`}
                      </h2>
                      {/* JURA TEMPORARILY DISABLED - Jura badge removed */}
                    </div>
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
                {selectedSession.orders.map((order) => {
                  // JURA TEMPORARILY DISABLED - always false
                  const isJuraOrder = false; // !!order.juraOrderId;
                  return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-lg border-2 ${
                      isJuraOrder
                        ? 'bg-violet-50 border-violet-200'
                        : order.isPaid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {order.guestPhone || 'Гость'}
                        </span>
                        {/* Hide payment status badge for Jura orders */}
                        {!isJuraOrder && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {order.isPaid ? 'Оплачено' : 'Не оплачено'}
                          </span>
                        )}
                        {/* Hide cash payment badge for Jura orders */}
                        {!isJuraOrder && order.wantsCashPayment && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Наличными
                          </span>
                        )}
                        {!isJuraOrder && order.isPaid && order.paidAt && (
                          <span className="text-xs text-gray-500">
                            {formatDate(order.paidAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Hide price for Jura orders */}
                        {!isJuraOrder && (
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{formatPrice(order.total)} TJS</span>
                            <p className="text-xs text-gray-500">
                              {formatPrice(order.subtotal)} + {formatPrice(order.serviceFeeShare)} обсл.
                            </p>
                          </div>
                        )}
                        {/* Hide pay button for Jura orders */}
                        {!isJuraOrder && !order.isPaid && (
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

                    {/* JURA TEMPORARILY DISABLED - Jura Delivery Info section removed */}
                  </div>
                  );
                })}
              </div>

              {/* Session totals - JURA TEMPORARILY DISABLED - always show */}
              {true && (
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
              )}

              {/* Actions - JURA TEMPORARILY DISABLED - always show payment button */}
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[normalizeOrderStatus(selectedOrder.status)]}`}>
                  {statusLabels[normalizeOrderStatus(selectedOrder.status)]}
                </span>
                {selectedOrder.hasPendingItems && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                    Есть новые блюда
                  </span>
                )}
              </div>

              {/* Confirm pending items button */}
              {selectedOrder.hasPendingItems && normalizeOrderStatus(selectedOrder.status) !== OrderStatus.Cancelled && (
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
                  const isCancelled = normalizeItemStatus(item.status) === OrderItemStatus.Cancelled;
                  const isPending = normalizeItemStatus(item.status) === OrderItemStatus.Pending;

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
                        {!isCancelled && normalizeOrderStatus(selectedOrder.status) !== OrderStatus.Cancelled && (
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
                {getNextStatus(normalizeOrderStatus(selectedOrder.status)) && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, getNextStatus(normalizeOrderStatus(selectedOrder.status))!);
                      setSelectedOrder(null);
                    }}
                  >
                    {statusLabels[getNextStatus(normalizeOrderStatus(selectedOrder.status))!]}
                  </Button>
                )}
                {normalizeOrderStatus(selectedOrder.status) !== OrderStatus.Cancelled && (
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

      {/* Cancellation notification modal */}
      {cancelNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Red header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Отмена позиции!</h2>
                  <p className="text-red-100 text-sm">Стол №{cancelNotification.tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 text-lg">
                      {cancelNotification.itemName}
                      {cancelNotification.sizeName && (
                        <span className="text-red-700 font-normal"> ({cancelNotification.sizeName})</span>
                      )}
                    </p>
                    <p className="text-red-700 mt-1">
                      Количество: <span className="font-semibold">{cancelNotification.quantity} шт.</span>
                    </p>
                    <p className="text-red-700">
                      Сумма: <span className="font-semibold">{new Intl.NumberFormat('ru-RU').format(cancelNotification.totalPrice)} TJS</span>
                    </p>
                  </div>
                </div>
              </div>

              {cancelNotification.reason && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-amber-700 font-medium mb-1">Причина отмены:</p>
                  <p className="text-amber-900 italic">"{cancelNotification.reason}"</p>
                </div>
              )}

              <Button
                onClick={() => setCancelNotification(null)}
                className="w-full"
                variant="danger"
              >
                Понятно
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash payment notification modal */}
      {cashPaymentNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Green header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Оплата наличными!</h2>
                  <p className="text-emerald-100 text-sm">Стол №{cashPaymentNotification.tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900 text-lg">
                      {cashPaymentNotification.tableName}
                    </p>
                    <p className="text-emerald-700 mt-1 text-2xl font-bold">
                      {new Intl.NumberFormat('ru-RU').format(cashPaymentNotification.amount)} TJS
                    </p>
                    {cashPaymentNotification.guestPhone && (
                      <p className="text-emerald-600 mt-2 text-sm">
                        Телефон: {cashPaymentNotification.guestPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 text-center font-medium">
                  Гость ожидает официанта для оплаты наличными
                </p>
              </div>

              <Button
                onClick={() => setCashPaymentNotification(null)}
                className="w-full"
                variant="primary"
              >
                Понятно
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Waiter call notification modal */}
      {waiterCallNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Orange header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Вызов официанта!</h2>
                  <p className="text-orange-100 text-sm">Стол №{waiterCallNotification.tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 text-lg">
                      {waiterCallNotification.tableName}
                    </p>
                    {waiterCallNotification.guestPhone && (
                      <p className="text-orange-600 mt-2 text-sm">
                        Телефон: {waiterCallNotification.guestPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 text-center font-medium">
                  Гость ожидает официанта
                </p>
              </div>

              <Button
                onClick={() => setWaiterCallNotification(null)}
                className="w-full"
                variant="primary"
              >
                Понятно
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* JURA TEMPORARILY DISABLED - All Jura modals commented out */}
      {/*
      <Modal
        isOpen={isJuraSelectModalOpen}
        onClose={() => setIsJuraSelectModalOpen(false)}
        title="Выберите заказ для доставки Jura"
        size="lg"
      >
        <div className="p-4">
          {eligibleJuraOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Нет заказов для доставки</p>
              <p className="text-slate-400 text-sm mt-1">
                Заказы типа "Доставка" со статусом "Подтверждён" появятся здесь
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleJuraOrders.map(({ order, session }) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedJuraOrder(order);
                    setIsJuraSelectModalOpen(false);
                    setIsJuraDeliveryModalOpen(true);
                  }}
                  className="w-full p-4 bg-white border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">
                          Стол #{session.tableNumber}
                        </span>
                        {session.tableName && (
                          <span className="text-slate-500 text-sm">
                            ({session.tableName})
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">
                          Доставка
                        </span>
                      </div>
                      {order.deliveryAddress && (
                        <p className="text-sm text-slate-600 mb-1">
                          {order.deliveryAddress}
                        </p>
                      )}
                      {order.customerPhone && (
                        <p className="text-xs text-slate-500">
                          Тел: {order.customerPhone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {new Intl.NumberFormat('ru-RU').format(order.total)} TJS
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {selectedJuraOrder && (
        <JuraDeliveryModal
          isOpen={isJuraDeliveryModalOpen}
          onClose={() => {
            setIsJuraDeliveryModalOpen(false);
            setSelectedJuraOrder(null);
          }}
          order={selectedJuraOrder}
          onSuccess={() => {
            setIsJuraDeliveryModalOpen(false);
            setSelectedJuraOrder(null);
            fetchTableSessions();
            toast.success('Доставка Jura успешно создана');
          }}
        />
      )}

      <CreateJuraOrderModal
        isOpen={isCreateJuraModalOpen}
        onClose={() => setIsCreateJuraModalOpen(false)}
        onSuccess={() => {
          setIsCreateJuraModalOpen(false);
          fetchTableSessions();
          toast.success('Доставка Jura успешно создана');
        }}
      />
      */}
    </AdminLayout>
  );
}
