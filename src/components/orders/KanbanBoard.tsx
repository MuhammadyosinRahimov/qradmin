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

// Column configuration - professional enterprise style
const columns = [
  {
    id: 'pending',
    title: 'Новые',
    status: OrderStatus.Pending,
    isPaid: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headerColor: 'text-amber-600',
  },
  {
    id: 'confirmed',
    title: 'Готовятся',
    status: OrderStatus.Confirmed,
    isPaid: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    headerColor: 'text-blue-600',
  },
  {
    id: 'paid',
    title: 'Оплачено',
    status: null,
    isPaid: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headerColor: 'text-emerald-600',
  },
  {
    id: 'cancelled',
    title: 'Отмена',
    status: OrderStatus.Cancelled,
    isPaid: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    headerColor: 'text-red-500',
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
          return;
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
        if (hasPendingItems) {
          if (order.status === OrderStatus.Confirmed) {
            result.confirmed.push(orderWithContext);
            totals.confirmed += confirmedItemsPrice;
          } else {
            result.pending.push(orderWithContext);
            totals.pending += confirmedItemsPrice;
          }
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        } else if (order.isPaid) {
          result.paid.push(orderWithContext);
          totals.paid += confirmedItemsPrice;
        } else if (order.status === OrderStatus.Confirmed) {
          result.confirmed.push(orderWithContext);
          totals.confirmed += confirmedItemsPrice;
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        } else if (order.status === OrderStatus.Pending) {
          result.pending.push(orderWithContext);
          totals.pending += confirmedItemsPrice;
          const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
          totalWaitTime += waitTime;
          orderCount++;
        }

        totalOrders++;
        totalAmount += confirmedItemsPrice;
      });
    });

    // Sort by creation time
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

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['paid', 'cancelled'],
      paid: [],
      cancelled: [],
    };

    if (!validTransitions[currentColumn]?.includes(targetColumn)) {
      showToast('Недопустимый переход', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      if (targetColumn === 'confirmed' && currentColumn === 'pending') {
        await onConfirmOrder(orderId);
        showToast('Заказ подтверждён', 'success');
      } else if (targetColumn === 'paid' && currentColumn === 'confirmed') {
        onMarkOrderPaid(orderContext.sessionId, orderId);
      } else if (targetColumn === 'cancelled') {
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
      {/* Statistics Panel - Professional Enterprise Style */}
      <div className="mb-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-6">
            {/* Total Orders */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-lg font-semibold text-slate-900 tabular-nums">{stats.totalOrders}</span>
              <span className="text-xs text-slate-500">заказов</span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200" />

            {/* Total Amount */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-emerald-600 tabular-nums">{formatPrice(stats.totalAmount)}</span>
              <span className="text-xs text-slate-500">TJS</span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200" />

            {/* Wait Time */}
            {stats.avgWaitTime > 0 && (
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${
                  stats.avgWaitTime > 10 ? 'text-red-500' : stats.avgWaitTime > 5 ? 'text-amber-500' : 'text-slate-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-lg font-semibold tabular-nums ${
                  stats.avgWaitTime > 10 ? 'text-red-600' : stats.avgWaitTime > 5 ? 'text-amber-600' : 'text-slate-900'
                }`}>{stats.avgWaitTime}</span>
                <span className="text-xs text-slate-500">мин ожид.</span>
              </div>
            )}
          </div>

          {/* Status badges - compact */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
              {stats.pendingCount} новых
            </span>
            <span className="px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {stats.confirmedCount} готов.
            </span>
            <span className="px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
              {stats.paidCount} оплач.
            </span>
            {stats.cancelledCount > 0 && (
              <span className="px-2 py-1 text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 tabular-nums">
                {stats.cancelledCount} отмен.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
          <div className="bg-white border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-700">Обработка...</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              orders={ordersByColumn[column.id] || []}
              count={ordersByColumn[column.id]?.length || 0}
              totalAmount={columnTotals[column.id] || 0}
              headerColor={column.headerColor}
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
            <div className="opacity-95 shadow-xl">
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
    px-4 py-2 text-sm font-medium border shadow-sm transition-all duration-300
    ${type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
