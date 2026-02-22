'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import { getOrders, updateOrderStatus, getSignalRUrl } from '@/lib/api';
import { Order, OrderStatus } from '@/types';

const statusLabels: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Новый',
  [OrderStatus.Confirmed]: 'Подтверждён',
  [OrderStatus.Preparing]: 'Готовится',
  [OrderStatus.Ready]: 'Готов',
  [OrderStatus.Delivered]: 'Доставлен',
  [OrderStatus.Completed]: 'Завершён',
  [OrderStatus.Cancelled]: 'Отменён',
};

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800',
  [OrderStatus.Preparing]: 'bg-orange-100 text-orange-800',
  [OrderStatus.Ready]: 'bg-green-100 text-green-800',
  [OrderStatus.Delivered]: 'bg-purple-100 text-purple-800',
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

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Create a simple beep sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      // Play second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await getOrders(filter === 'all' ? undefined : filter);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
    fetchOrders();
  }, [fetchOrders]);

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
      [OrderStatus.Confirmed]: OrderStatus.Preparing,
      [OrderStatus.Preparing]: OrderStatus.Ready,
      [OrderStatus.Ready]: OrderStatus.Delivered,
      [OrderStatus.Delivered]: OrderStatus.Completed,
      [OrderStatus.Completed]: null,
      [OrderStatus.Cancelled]: null,
    };
    return flow[status];
  };

  const filteredOrders = orders.filter(
    (order) => filter === 'all' || order.status === filter
  );

  return (
    <AdminLayout>

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
        <Button onClick={fetchOrders} variant="secondary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Обновить
        </Button>
      </div>

      {/* Filter tabs */}
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

      {/* Orders grid */}
      {loading ? (
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
                    <h3 className="font-semibold text-gray-900">Стол #{order.tableNumber}</h3>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
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
      )}

      {/* Order details modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Заказ - Стол #{selectedOrder.tableNumber}
                </h2>
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
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Позиции заказа</h3>
              <div className="space-y-3 mb-6">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      {item.sizeName && (
                        <p className="text-sm text-gray-500">{item.sizeName}</p>
                      )}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-sm text-gray-500">
                          + {item.selectedAddons.join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {formatPrice(item.unitPrice)} ₽ × {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatPrice(item.totalPrice)} ₽
                    </span>
                  </div>
                ))}
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
                  <span>{formatPrice(selectedOrder.subtotal)} ₽</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Налог (10%)</span>
                  <span>{formatPrice(selectedOrder.tax)} ₽</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900">
                  <span>Итого</span>
                  <span>{formatPrice(selectedOrder.total)} ₽</span>
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
                      Отменить
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
