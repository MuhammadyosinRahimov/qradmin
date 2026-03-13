'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TableSession, SessionOrder, OrderStatus, OrderType } from '@/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  sessions: TableSession[];
  orderTypeFilter: OrderType | 'all';
  onConfirmOrder: (orderId: string) => Promise<void>;
  onMarkOrderPaid: (sessionId: string, orderId: string) => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  onOrderClick: (order: SessionOrder, session: TableSession) => void;
}

// Column configuration
const columns = [
  {
    id: 'pending',
    title: 'Новые',
    status: OrderStatus.Pending,
    isPaid: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headerGradient: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
  },
  {
    id: 'confirmed',
    title: 'Готовятся',
    status: OrderStatus.Confirmed,
    isPaid: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    headerGradient: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  },
  {
    id: 'paid',
    title: 'Оплачено',
    status: null,
    isPaid: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headerGradient: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  },
  {
    id: 'cancelled',
    title: 'Отмена',
    status: OrderStatus.Cancelled,
    isPaid: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    headerGradient: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
  },
];

// Format price helper
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

interface OrderWithContext {
  order: SessionOrder;
  sessionId: string;
  tableNumber: number;
  tableName?: string;
}

export default function KanbanBoard({
  sessions,
  orderTypeFilter,
  onConfirmOrder,
  onMarkOrderPaid,
  onCancelOrder,
  onOrderClick,
}: KanbanBoardProps) {
  const [activeOrder, setActiveOrder] = useState<OrderWithContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group orders by column and calculate sums
  const { ordersByColumn, columnTotals, stats } = useMemo(() => {
    const result: Record<string, OrderWithContext[]> = {
      pending: [],
      confirmed: [],
      paid: [],
      cancelled: [],
    };
    const totals: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      paid: 0,
      cancelled: 0,
    };

    let totalOrders = 0;
    let totalAmount = 0;
    let totalWaitTime = 0;
    let orderCount = 0;
    const now = new Date();

    sessions.forEach((session) => {
      session.orders.forEach((order) => {
        // Apply order type filter
        if (orderTypeFilter !== 'all') {
          const orderType = order.orderType ?? OrderType.DineIn;
          if (orderType !== orderTypeFilter) return;
        }

        const orderWithContext: OrderWithContext = {
          order,
          sessionId: session.id,
          tableNumber: session.tableNumber,
          tableName: session.tableName,
        };

        // Handle cancelled orders
        if (order.status === OrderStatus.Cancelled) {
          result.cancelled.push(orderWithContext);
          totals.cancelled += order.total;
          totalOrders++;
          return; // Don't add to totalAmount
        }

        // Calculate confirmed items price only (status = 1)
        const confirmedItemsPrice = order.items
          ?.filter((i: { status: number }) => i.status === 1)
          .reduce((sum: number, item: { totalPrice: number }) => sum + item.totalPrice, 0) || 0;

        // Check if there are pending items (status = 0)
        const hasPendingItems = order.items?.some(
          (item: { status: number }) => item.status === 0
        ) || false;

        // Determine column based on pending items, then status, then isPaid
        // If there are pending items - order should be in "Новые" or "Готовятся" (not "Оплачено")
        if (hasPendingItems) {
          // Order with new items that need confirmation
          if (order.status === OrderStatus.Confirmed) {
            result.confirmed.push(orderWithContext);
            totals.confirmed += confirmedItemsPrice;
          } else {
            result.pending.push(orderWithContext);
            totals.pending += confirmedItemsPrice;
          }
          // Calculate wait time for orders with pending items
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        } else if (order.isPaid) {
          result.paid.push(orderWithContext);
          totals.paid += confirmedItemsPrice;
        } else if (order.status === OrderStatus.Confirmed) {
          result.confirmed.push(orderWithContext);
          totals.confirmed += confirmedItemsPrice;
          // Calculate wait time for unpaid orders
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        } else if (order.status === OrderStatus.Pending) {
          result.pending.push(orderWithContext);
          totals.pending += confirmedItemsPrice;
          // Calculate wait time for pending orders
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        }

        totalOrders++;
        totalAmount += confirmedItemsPrice;
      });
    });

    // Sort by creation time (newest first for pending, oldest first for others)
    result.pending.sort((a, b) =>
      new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
    );
    result.confirmed.sort((a, b) =>
      new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime()
    );
    result.paid.sort((a, b) =>
      new Date(b.order.paidAt || b.order.createdAt).getTime() -
      new Date(a.order.paidAt || a.order.createdAt).getTime()
    );
    result.cancelled.sort((a, b) =>
      new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
    );

    return {
      ordersByColumn: result,
      columnTotals: totals,
      stats: {
        totalOrders,
        totalAmount,
        avgWaitTime: orderCount > 0 ? Math.round(totalWaitTime / orderCount) : 0,
        pendingCount: result.pending.length,
        confirmedCount: result.confirmed.length,
        paidCount: result.paid.length,
        cancelledCount: result.cancelled.length,
      },
    };
  }, [sessions, orderTypeFilter]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const orderId = active.id as string;

    // Find the order in all columns
    for (const columnOrders of Object.values(ordersByColumn)) {
      const found = columnOrders.find((o) => o.order.id === orderId);
      if (found) {
        setActiveOrder(found);
        break;
      }
    }
  }, [ordersByColumn]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over || isProcessing) return;

    const orderId = active.id as string;
    const targetColumn = over.id as string;

    // Find the order and its current column
    let currentColumn = '';
    let orderContext: OrderWithContext | null = null;

    for (const [columnId, columnOrders] of Object.entries(ordersByColumn)) {
      const found = columnOrders.find((o) => o.order.id === orderId);
      if (found) {
        currentColumn = columnId;
        orderContext = found;
        break;
      }
    }

    if (!orderContext || currentColumn === targetColumn) return;

    // Validate transition
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['paid', 'cancelled'],
      paid: [], // No transitions from paid
      cancelled: [], // No transitions from cancelled
    };

    if (!validTransitions[currentColumn]?.includes(targetColumn)) {
      // Show error toast
      showToast('Недопустимый переход', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      if (targetColumn === 'confirmed' && currentColumn === 'pending') {
        // Pending -> Confirmed: confirm pending items first
        await onConfirmOrder(orderId);
        showToast('Заказ подтверждён', 'success');
      } else if (targetColumn === 'paid' && currentColumn === 'confirmed') {
        // Confirmed -> Paid: mark as paid
        onMarkOrderPaid(orderContext.sessionId, orderId);
      } else if (targetColumn === 'cancelled') {
        // Any -> Cancelled: cancel the order
        await onCancelOrder(orderId);
        showToast('Заказ отменён', 'success');
      }
    } catch (error) {
      console.error('Error processing order transition:', error);
      showToast('Ошибка при обработке', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [ordersByColumn, isProcessing, onConfirmOrder, onMarkOrderPaid, onCancelOrder]);

  const handleOrderClick = useCallback((order: SessionOrder, sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      onOrderClick(order, session);
    }
  }, [sessions, onOrderClick]);

  return (
    <div className="relative">
      {/* Statistics Panel */}
      <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">{stats.totalOrders}</span>
                <p className="text-sm text-gray-500">Заказов</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-green-600">{formatPrice(stats.totalAmount)}</span>
                <p className="text-sm text-gray-500">TJS</p>
              </div>
            </div>
            {stats.avgWaitTime > 0 && (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  stats.avgWaitTime > 10 ? 'bg-red-100' : stats.avgWaitTime > 5 ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    stats.avgWaitTime > 10 ? 'text-red-600' : stats.avgWaitTime > 5 ? 'text-yellow-600' : 'text-blue-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className={`text-2xl font-bold ${
                    stats.avgWaitTime > 10 ? 'text-red-600' : stats.avgWaitTime > 5 ? 'text-yellow-600' : 'text-blue-600'
                  }`}>{stats.avgWaitTime}</span>
                  <p className="text-sm text-gray-500">мин ожидание</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
              {stats.pendingCount} новых
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {stats.confirmedCount} готовятся
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              {stats.paidCount} оплачено
            </span>
            {stats.cancelledCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                {stats.cancelledCount} отменено
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium text-gray-700">Обработка...</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              orders={ordersByColumn[column.id] || []}
              count={ordersByColumn[column.id]?.length || 0}
              totalAmount={columnTotals[column.id] || 0}
              headerGradient={column.headerGradient}
              isCancelledColumn={column.id === 'cancelled'}
              onOrderClick={handleOrderClick}
              onConfirmOrder={onConfirmOrder}
              onMarkOrderPaid={onMarkOrderPaid}
              onCancelOrder={onCancelOrder}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="opacity-90 transform rotate-3">
              <KanbanCard
                order={activeOrder.order}
                sessionId={activeOrder.sessionId}
                tableNumber={activeOrder.tableNumber}
                tableName={activeOrder.tableName}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Toast container */}
      <div id="kanban-toast-container" className="fixed bottom-4 right-4 z-50" />
    </div>
  );
}

// Simple toast notification
function showToast(message: string, type: 'success' | 'error') {
  const container = document.getElementById('kanban-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `
    px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300
    ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
  `;
  toast.textContent = message;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 10);

  // Remove after 2 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
