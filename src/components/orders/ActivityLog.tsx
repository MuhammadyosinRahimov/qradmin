'use client';

import { useMemo } from 'react';
import { SessionOrder, OrderItem, OrderStatus } from '@/types';

interface ActivityLogProps {
  order: SessionOrder;
  tableNumber: number;
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'confirmed' | 'item_added' | 'item_cancelled' | 'paid' | 'cancelled' | 'cash_requested';
  title: string;
  description?: string;
  items?: string[];
  isExtra?: boolean;
}

export default function ActivityLog({ order, tableNumber }: ActivityLogProps) {
  const events = useMemo(() => {
    const eventList: ActivityEvent[] = [];

    // Order created event
    eventList.push({
      id: 'created',
      timestamp: order.createdAt,
      type: 'created',
      title: 'Заказ создан',
      description: `Стол #${tableNumber}`,
    });

    // Group items by creation time for initial order
    const initialItems = order.items.filter(
      (item) => item.createdAt === order.createdAt || !item.createdAt
    );
    if (initialItems.length > 0) {
      eventList[0].items = initialItems.map(
        (item) => `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`
      );
    }

    // Extra items added
    const extraItems = order.items.filter(
      (item) => item.createdAt && item.createdAt !== order.createdAt && item.status !== 2
    );
    const groupedByTime: Record<string, OrderItem[]> = {};
    extraItems.forEach((item) => {
      const time = item.createdAt || order.createdAt;
      if (!groupedByTime[time]) {
        groupedByTime[time] = [];
      }
      groupedByTime[time].push(item);
    });

    Object.entries(groupedByTime).forEach(([timestamp, items]) => {
      eventList.push({
        id: `items-${timestamp}`,
        timestamp,
        type: 'item_added',
        title: 'Добавлены позиции',
        items: items.map(
          (item) => `${item.productName}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`
        ),
        isExtra: true,
      });
    });

    // Order confirmed event
    if (order.status === OrderStatus.Confirmed || order.isPaid) {
      // Estimate confirm time as ~2 min after creation if not available
      const confirmTime = new Date(order.createdAt);
      confirmTime.setMinutes(confirmTime.getMinutes() + 2);
      eventList.push({
        id: 'confirmed',
        timestamp: confirmTime.toISOString(),
        type: 'confirmed',
        title: 'Заказ подтверждён',
        description: 'Администратор',
      });
    }

    // Cash payment requested
    if (order.wantsCashPayment && !order.isPaid) {
      eventList.push({
        id: 'cash-requested',
        timestamp: new Date().toISOString(),
        type: 'cash_requested',
        title: 'Запрос оплаты наличными',
        description: 'Ожидает оплаты',
      });
    }

    // Cancelled items
    const cancelledItems = order.items.filter((item) => item.status === 2);
    if (cancelledItems.length > 0) {
      eventList.push({
        id: 'items-cancelled',
        timestamp: new Date().toISOString(),
        type: 'item_cancelled',
        title: 'Позиции отменены',
        items: cancelledItems.map(
          (item) => `${item.productName}${item.cancelReason ? ` (${item.cancelReason})` : ''}`
        ),
      });
    }

    // Order paid
    if (order.isPaid && order.paidAt) {
      eventList.push({
        id: 'paid',
        timestamp: order.paidAt,
        type: 'paid',
        title: 'Заказ оплачен',
        description: order.paymentMethod === 'cash' ? 'Наличными' : 'Онлайн',
      });
    }

    // Order cancelled
    if (order.status === OrderStatus.Cancelled) {
      eventList.push({
        id: 'cancelled',
        timestamp: order.completedAt || new Date().toISOString(),
        type: 'cancelled',
        title: 'Заказ отменён',
      });
    }

    // Sort by timestamp
    return eventList.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [order, tableNumber]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'created':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'confirmed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'item_added':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'item_cancelled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'paid':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'cash_requested':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'created':
        return 'bg-slate-100 text-slate-600';
      case 'confirmed':
        return 'bg-blue-100 text-blue-600';
      case 'item_added':
        return 'bg-amber-100 text-amber-600';
      case 'item_cancelled':
        return 'bg-red-100 text-red-600';
      case 'paid':
        return 'bg-emerald-100 text-emerald-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      case 'cash_requested':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-px h-full bg-slate-200 mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 tabular-nums">
                {formatTime(event.timestamp)}
              </span>
              {event.isExtra && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">
                  EXTRA
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-900 mt-0.5">{event.title}</p>
            {event.description && (
              <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
            )}
            {event.items && event.items.length > 0 && (
              <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                {event.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-slate-400 rounded-full" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
