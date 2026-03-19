'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import SessionColumn from './SessionColumn';
import SessionCard from './SessionCard';

interface KanbanBoardProps {
  sessions: TableSession[];
  orderTypeFilter: OrderType | 'all';
  onConfirmOrder: (orderId: string) => Promise<void>;
  onMarkOrderPaid: (sessionId: string, orderId: string) => void;
  onMarkSessionPaid: (sessionId: string) => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  onOrderClick: (order: SessionOrder, session: TableSession) => void;
  onSessionClick: (session: TableSession) => void;
}

// Column configuration
const columns = [
  {
    id: 'pending',
    title: 'Новые',
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
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    headerColor: 'text-red-500',
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

// Determine which column a session belongs to based on its orders
function getSessionColumn(session: TableSession): string {
  const orders = session.orders || [];

  // Filter by active (non-cancelled) orders
  const activeOrders = orders.filter(o => o.status !== OrderStatus.Cancelled);

  // If all orders are cancelled
  if (activeOrders.length === 0 && orders.length > 0) {
    return 'cancelled';
  }

  // If no orders at all
  if (orders.length === 0) {
    return 'pending';
  }

  // Check if all active orders are paid
  const allPaid = activeOrders.length > 0 && activeOrders.every(o => o.isPaid);
  if (allPaid) {
    return 'paid';
  }

  // Check if there are any pending orders or pending items
  const hasPending = activeOrders.some(o =>
    o.status === OrderStatus.Pending ||
    o.items?.some(i => i.status === 0)
  );
  if (hasPending) {
    return 'pending';
  }

  // Otherwise confirmed
  return 'confirmed';
}

export default function KanbanBoard({
  sessions,
  orderTypeFilter,
  onConfirmOrder,
  onMarkOrderPaid,
  onMarkSessionPaid,
  onCancelOrder,
  onOrderClick,
  onSessionClick,
}: KanbanBoardProps) {
  const [activeSession, setActiveSession] = useState<TableSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);
  const prevStatsRef = useRef<{ pendingCount: number; totalSessions: number } | null>(null);
  const [animatingStats, setAnimatingStats] = useState<Set<string>>(new Set());

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

  // Filter sessions by order type and group by column
  const { sessionsByColumn, columnTotals, stats } = useMemo(() => {
    const result: Record<string, TableSession[]> = {
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

    let totalSessions = 0;
    let totalAmount = 0;
    let totalWaitTime = 0;
    let sessionCount = 0;
    const now = new Date();

    sessions.forEach((session) => {
      // Filter orders by type if needed
      let filteredOrders = session.orders;
      if (orderTypeFilter !== 'all') {
        filteredOrders = session.orders.filter(order => {
          const orderType = order.orderType ?? OrderType.DineIn;
          return orderType === orderTypeFilter;
        });
      }

      // Skip session if no orders match the filter
      if (filteredOrders.length === 0) return;

      // Create a filtered session copy
      const filteredSession: TableSession = {
        ...session,
        orders: filteredOrders,
      };

      const column = getSessionColumn(filteredSession);
      result[column].push(filteredSession);

      // Use session.sessionTotal from backend
      totals[column] += session.sessionTotal;
      totalSessions++;
      totalAmount += session.sessionTotal;

      // Calculate wait time for non-paid sessions
      if (column !== 'paid' && column !== 'cancelled') {
        const oldestOrder = filteredOrders.reduce((oldest, order) =>
          new Date(order.createdAt) < new Date(oldest.createdAt) ? order : oldest
        );
        const waitTime = Math.floor((now.getTime() - new Date(oldestOrder.createdAt).getTime()) / 60000);
        totalWaitTime += waitTime;
        sessionCount++;
      }
    });

    // Sort sessions by creation time
    result.pending.sort((a, b) => {
      const aTime = Math.min(...a.orders.map(o => new Date(o.createdAt).getTime()));
      const bTime = Math.min(...b.orders.map(o => new Date(o.createdAt).getTime()));
      return bTime - aTime; // Newest first
    });
    result.confirmed.sort((a, b) => {
      const aTime = Math.min(...a.orders.map(o => new Date(o.createdAt).getTime()));
      const bTime = Math.min(...b.orders.map(o => new Date(o.createdAt).getTime()));
      return aTime - bTime; // Oldest first (should be processed first)
    });
    result.paid.sort((a, b) => {
      const aTime = Math.max(...a.orders.map(o => new Date(o.paidAt || o.createdAt).getTime()));
      const bTime = Math.max(...b.orders.map(o => new Date(o.paidAt || o.createdAt).getTime()));
      return bTime - aTime; // Recently paid first
    });

    return {
      sessionsByColumn: result,
      columnTotals: totals,
      stats: {
        totalSessions,
        totalAmount,
        avgWaitTime: sessionCount > 0 ? Math.round(totalWaitTime / sessionCount) : 0,
        pendingCount: result.pending.length,
        confirmedCount: result.confirmed.length,
        paidCount: result.paid.length,
        cancelledCount: result.cancelled.length,
      },
    };
  }, [sessions, orderTypeFilter]);

  // Animate stats on change
  useEffect(() => {
    if (prevStatsRef.current) {
      const newAnimating = new Set<string>();
      if (prevStatsRef.current.pendingCount !== stats.pendingCount) {
        newAnimating.add('pending');
      }
      if (prevStatsRef.current.totalSessions !== stats.totalSessions) {
        newAnimating.add('total');
      }
      if (newAnimating.size > 0) {
        setAnimatingStats(newAnimating);
        setTimeout(() => setAnimatingStats(new Set()), 300);
      }
    }
    prevStatsRef.current = { pendingCount: stats.pendingCount, totalSessions: stats.totalSessions };
  }, [stats.pendingCount, stats.totalSessions]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const sessionId = active.id as string;

    for (const columnSessions of Object.values(sessionsByColumn)) {
      const found = columnSessions.find((s) => s.id === sessionId);
      if (found) {
        setActiveSession(found);
        break;
      }
    }
  }, [sessionsByColumn]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSession(null);

    if (!over || isProcessing) return;

    const sessionId = active.id as string;
    const targetColumn = over.id as string;

    let currentColumn = '';
    let session: TableSession | null = null;

    for (const [columnId, columnSessions] of Object.entries(sessionsByColumn)) {
      const found = columnSessions.find((s) => s.id === sessionId);
      if (found) {
        currentColumn = columnId;
        session = found;
        break;
      }
    }

    if (!session || currentColumn === targetColumn) return;

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
        // Confirm all pending orders in session
        const pendingOrders = session.orders.filter(o => o.status === OrderStatus.Pending);
        for (const order of pendingOrders) {
          await onConfirmOrder(order.id);
        }
        showToast('Все заказы подтверждены', 'success');
      } else if (targetColumn === 'paid' && currentColumn === 'confirmed') {
        onMarkSessionPaid(session.id);
      } else if (targetColumn === 'cancelled') {
        // Cancel all orders in session
        for (const order of session.orders) {
          if (order.status !== OrderStatus.Cancelled) {
            await onCancelOrder(order.id);
          }
        }
        showToast('Все заказы отменены', 'success');
      }
    } catch (error) {
      console.error('Error processing session transition:', error);
      showToast('Ошибка при обработке', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionsByColumn, isProcessing, onConfirmOrder, onMarkSessionPaid, onCancelOrder, showToast]);

  const handleSessionClick = useCallback((session: TableSession) => {
    onSessionClick(session);
  }, [onSessionClick]);

  return (
    <div className="relative">
      {/* Statistics Panel - Dark slate background */}
      <div className="mb-4 bg-slate-900 rounded border border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            {/* Total Tables */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className={`text-lg font-bold text-white tabular-nums ${animatingStats.has('total') ? 'animate-counter-pulse' : ''}`}>
                {stats.totalSessions}
              </span>
              <span className="text-xs text-slate-500">столов</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-700" />

            {/* Total Amount */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-400 tabular-nums">{formatPrice(stats.totalAmount)}</span>
              <span className="text-xs text-slate-500">TJS</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-700" />

            {/* Wait Time */}
            {stats.avgWaitTime > 0 && (
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${
                  stats.avgWaitTime > 10 ? 'text-red-400' : stats.avgWaitTime > 5 ? 'text-amber-400' : 'text-slate-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-lg font-bold tabular-nums ${
                  stats.avgWaitTime > 10 ? 'text-red-400' : stats.avgWaitTime > 5 ? 'text-amber-400' : 'text-white'
                }`}>{stats.avgWaitTime}</span>
                <span className="text-xs text-slate-500">мин ожид.</span>
              </div>
            )}
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded tabular-nums ${
              stats.pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
            } ${animatingStats.has('pending') ? 'animate-counter-pulse' : ''}`}>
              {stats.pendingCount} новых
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded tabular-nums ${
              stats.confirmedCount > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {stats.confirmedCount} готов.
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded tabular-nums ${
              stats.paidCount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {stats.paidCount} оплач.
            </span>
            {stats.cancelledCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded tabular-nums">
                {stats.cancelledCount} отмен.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center rounded">
          <div className="bg-white border border-slate-200 shadow-sm px-4 py-3 rounded flex items-center gap-3">
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
            <SessionColumn
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              sessions={sessionsByColumn[column.id] || []}
              count={sessionsByColumn[column.id]?.length || 0}
              totalAmount={columnTotals[column.id] || 0}
              headerColor={column.headerColor}
              isCancelledColumn={column.id === 'cancelled'}
              onSessionClick={handleSessionClick}
              onConfirmOrder={onConfirmOrder}
              onMarkSessionPaid={onMarkSessionPaid}
              onCancelOrder={onCancelOrder}
            />
          ))}
        </div>

        <DragOverlay>
          {activeSession ? (
            <div className="opacity-95 shadow-xl">
              <SessionCard
                session={activeSession}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-2 text-sm font-medium border rounded shadow-sm animate-slide-in-right
              ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
