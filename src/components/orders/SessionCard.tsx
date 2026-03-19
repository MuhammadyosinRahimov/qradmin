'use client';

import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableSession, SessionOrder, OrderType, OrderStatus } from '@/types';

interface SessionCardProps {
  session: TableSession;
  columnId?: string;
  onClick: () => void;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkSessionPaid?: (sessionId: string) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

const orderTypeConfig = {
  [OrderType.DineIn]: {
    label: 'Зал',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  [OrderType.Delivery]: {
    label: 'Доставка',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  [OrderType.Takeaway]: {
    label: 'Самовывоз',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
};

export default function SessionCard({
  session,
  columnId,
  onClick,
  onConfirmOrder,
  onMarkSessionPaid,
  onCancelOrder,
}: SessionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Filter active orders (non-cancelled)
  const activeOrders = useMemo(() =>
    session.orders.filter(o => o.status !== OrderStatus.Cancelled),
    [session.orders]
  );

  const cancelledOrders = useMemo(() =>
    session.orders.filter(o => o.status === OrderStatus.Cancelled),
    [session.orders]
  );

  // Check if all orders are cancelled
  const allCancelled = activeOrders.length === 0 && cancelledOrders.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: session.id,
    disabled: allCancelled,
    data: {
      session,
      type: 'session',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get order type from first order
  const orderType = activeOrders[0]?.orderType ?? OrderType.DineIn;
  const typeConfig = orderTypeConfig[orderType];

  // Calculate waiting time from oldest order
  const { waitingMinutes, isUrgent, isWarning, isNew } = useMemo(() => {
    if (activeOrders.length === 0) {
      return { waitingMinutes: 0, isUrgent: false, isWarning: false, isNew: false };
    }
    const oldestOrder = activeOrders.reduce((oldest, order) =>
      new Date(order.createdAt) < new Date(oldest.createdAt) ? order : oldest
    );
    const createdAt = new Date(oldestOrder.createdAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    return {
      waitingMinutes: minutes,
      isUrgent: minutes > 10,
      isWarning: minutes >= 5 && minutes <= 10,
      isNew: minutes < 2,
    };
  }, [activeOrders]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  // Check if there are pending items in any order
  const hasPendingItems = useMemo(() =>
    activeOrders.some(order =>
      order.items?.some(item => item.status === 0)
    ),
    [activeOrders]
  );

  // Calculate total prices
  const { confirmedTotal, pendingTotal, totalPrice } = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    activeOrders.forEach(order => {
      order.items?.forEach(item => {
        if (item.status === 1) confirmed += item.totalPrice;
        if (item.status === 0) pending += item.totalPrice;
      });
    });
    return {
      confirmedTotal: confirmed,
      pendingTotal: pending,
      totalPrice: confirmed + pending,
    };
  }, [activeOrders]);

  // Count guests (unique userIds)
  const guestCount = useMemo(() =>
    new Set(activeOrders.map(o => o.userId)).size,
    [activeOrders]
  );

  // Handlers
  const handleConfirmAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConfirmOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      // Confirm all pending orders AND orders with pending items
      const pendingOrders = activeOrders.filter(o =>
        o.status === OrderStatus.Pending ||
        o.items?.some(i => i.status === 0)
      );
      for (const order of pendingOrders) {
        await onConfirmOrder(order.id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMarkSessionPaid || isProcessing) return;
    onMarkSessionPaid(session.id);
  };

  const handleConfirmSingleOrder = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!onConfirmOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirmOrder(orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCancelOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      // Cancel all active orders
      for (const order of activeOrders) {
        if (order.status !== OrderStatus.Cancelled) {
          await onCancelOrder(order.id);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleOrderExpanded = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Determine which quick actions to show
  const showConfirmButton = columnId === 'pending';
  const showPayButton = columnId === 'confirmed';
  const showCancelButton = columnId === 'pending' || columnId === 'confirmed';

  // Border color based on column
  const getBorderColor = () => {
    if (allCancelled) return 'border-l-red-400';
    if (columnId === 'paid') return 'border-l-emerald-500';
    if (columnId === 'confirmed') return 'border-l-blue-500';
    return 'border-l-amber-500';
  };

  // Urgency classes
  const getUrgencyClasses = () => {
    if (allCancelled || columnId === 'paid') return '';
    if (isUrgent) return 'urgency-critical animate-pulse-urgent';
    if (isWarning) return 'urgency-warning animate-pulse-border';
    if (isNew && columnId === 'pending') return 'animate-pulse-border';
    return '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white border border-slate-200 border-l-[3px] ${getBorderColor()}
        rounded card-interactive
        ${allCancelled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${isDragging ? 'shadow-lg scale-[1.02] z-50 ring-2 ring-blue-400' : ''}
        ${getUrgencyClasses()}
      `}
    >
      {/* Header row - table, guests count, timer */}
      <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm tabular-nums">
            #{session.tableNumber}
          </span>
          {session.tableName && (
            <span className="text-xs text-slate-500 truncate max-w-[80px]">{session.tableName}</span>
          )}
          {guestCount > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {guestCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Timer */}
          <span className={`text-xs font-semibold tabular-nums ${
            isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-400'
          }`}>
            {waitingMinutes}м
          </span>
          {/* Time */}
          <span className="text-[10px] text-slate-400 tabular-nums">
            {activeOrders[0] && formatTime(activeOrders[0].createdAt)}
          </span>
        </div>
      </div>

      {/* Type badge row */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-b border-slate-50">
        <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${typeConfig.bg} ${typeConfig.color}`}>
          {typeConfig.label}
        </span>
        {hasPendingItems && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-amber-50 text-amber-700 rounded">
            Новые позиции
          </span>
        )}
        {activeOrders.some(o => o.wantsCashPayment) && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600 rounded">
            Наличные
          </span>
        )}
      </div>

      {/* Cancelled badge */}
      {allCancelled && (
        <div className="px-2.5 py-1.5 bg-red-50 border-b border-red-100">
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
            Все заказы отменены
          </span>
        </div>
      )}

      {/* Orders list */}
      <div className="px-2.5 py-2">
        <div className="space-y-2">
          {activeOrders.map((order, idx) => {
            const isExpanded = expandedOrders.has(order.id);
            const orderItems = order.items || [];
            const pendingItems = orderItems.filter(i => i.status === 0);
            const confirmedItems = orderItems.filter(i => i.status === 1);
            const displayItems = isExpanded ? orderItems.filter(i => i.status !== 2) : orderItems.filter(i => i.status !== 2).slice(0, 2);
            const remainingCount = orderItems.filter(i => i.status !== 2).length - 2;
            const orderTotal = orderItems.filter(i => i.status !== 2).reduce((sum, i) => sum + i.totalPrice, 0);
            const isPending = order.status === OrderStatus.Pending || pendingItems.length > 0;

            return (
              <div key={order.id} className={`rounded border ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 bg-slate-50/30'}`}>
                {/* Order header */}
                <div
                  className="px-2 py-1.5 flex items-center justify-between cursor-pointer"
                  onClick={(e) => toggleOrderExpanded(e, order.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {order.guestPhone ? `**${order.guestPhone.slice(-4)}` : `Гость ${idx + 1}`}
                    </span>
                    {pendingItems.length > 0 && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        +{pendingItems.length} новых
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-700 tabular-nums">
                      {formatPrice(orderTotal)} TJS
                    </span>
                    {columnId === 'pending' && (order.status === OrderStatus.Pending || pendingItems.length > 0) && (
                      <button
                        onClick={(e) => handleConfirmSingleOrder(e, order.id)}
                        disabled={isProcessing}
                        className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        title="Подтвердить"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <svg className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Order items */}
                <div className="px-2 pb-1.5 space-y-0.5">
                  {displayItems.map((item) => {
                    const itemIsPending = item.status === 0;
                    const itemIsConfirmed = item.status === 1;
                    return (
                      <div key={item.id} className="text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className={`flex-shrink-0 w-3 h-3 rounded border flex items-center justify-center ${
                            itemIsConfirmed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {itemIsConfirmed && (
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className={`flex-1 truncate ${itemIsPending ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                            {item.productName}
                          </span>
                          <span className="text-slate-400 tabular-nums">×{item.quantity}</span>
                        </div>
                        {item.note && (
                          <div className="ml-5 mt-0.5 text-[9px] text-amber-600 italic truncate">
                            📝 {item.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!isExpanded && remainingCount > 0 && (
                    <div className="text-[10px] text-slate-400 pl-5">
                      +{remainingCount} ещё...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - total price and actions */}
      <div className="px-2.5 py-2 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatPrice(session.sessionTotal)}
            </span>
            <span className="text-[10px] text-slate-400">TJS</span>
          </div>
          {pendingTotal > 0 && (
            <span className="text-[10px] text-amber-600 font-medium tabular-nums">
              +{formatPrice(pendingTotal)} ожид.
            </span>
          )}
        </div>

        {/* Quick actions */}
        {(showConfirmButton || showPayButton || showCancelButton) && !allCancelled && (
          <div className="flex gap-1.5 mt-2">
            {showConfirmButton && (
              <button
                onClick={handleConfirmAll}
                disabled={isProcessing}
                className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isProcessing ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Подтвердить всё
                  </>
                )}
              </button>
            )}
            {showPayButton && (
              <button
                onClick={handleMarkPaid}
                disabled={isProcessing}
                className="flex-1 px-2 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded hover:bg-emerald-700 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Оплачено
              </button>
            )}
            {showCancelButton && (
              <button
                onClick={handleCancelAll}
                disabled={isProcessing}
                className="px-2 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded hover:bg-red-50 hover:text-red-600 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center"
                title="Отменить все заказы"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
