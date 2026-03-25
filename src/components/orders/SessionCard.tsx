'use client';

import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableSession, OrderType, OrderStatus } from '@/types';

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

interface SessionCardProps {
  session: TableSession;
  columnId?: string;
  onClick: () => void;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkSessionPaid?: (sessionId: string) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onDismissWaiter?: (orderId: string) => Promise<void>;
  isWaiterCalledColumn?: boolean;
}

const orderTypeConfig = {
  [OrderType.DineIn]: {
    label: 'Зал',
    color: 'text-[var(--text-secondary)]',
    bg: 'bg-[var(--bg-muted)]',
  },
  [OrderType.Delivery]: {
    label: 'Доставка',
    color: 'text-violet-400',
    bg: 'bg-violet-500/20',
  },
  [OrderType.Takeaway]: {
    label: 'Самовывоз',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
  },
};

export default function SessionCard({
  session,
  columnId,
  onClick,
  onConfirmOrder,
  onMarkSessionPaid,
  onCancelOrder,
  onDismissWaiter,
  isWaiterCalledColumn = false,
}: SessionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Filter active orders (non-cancelled)
  const activeOrders = useMemo(() =>
    session.orders.filter(o => normalizeOrderStatus(o.status) !== OrderStatus.Cancelled),
    [session.orders]
  );

  const cancelledOrders = useMemo(() =>
    session.orders.filter(o => normalizeOrderStatus(o.status) === OrderStatus.Cancelled),
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
  const { pendingTotal } = useMemo(() => {
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
      const pendingOrders = activeOrders.filter(o =>
        normalizeOrderStatus(o.status) === OrderStatus.Pending ||
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
      for (const order of activeOrders) {
        if (normalizeOrderStatus(order.status) !== OrderStatus.Cancelled) {
          await onCancelOrder(order.id);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissWaiter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDismissWaiter || isProcessing) return;
    setIsProcessing(true);
    try {
      for (const order of activeOrders) {
        if (order.waiterCalled) {
          await onDismissWaiter(order.id);
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
    if (allCancelled) return 'border-l-[var(--status-error)]';
    if (columnId === 'paid') return 'border-l-[var(--status-success)]';
    if (columnId === 'waiterCalled') return 'border-l-[var(--status-waiter)]';
    if (columnId === 'confirmed') return 'border-l-[var(--status-info)]';
    return 'border-l-[var(--status-pending)]';
  };

  // Urgency classes
  const getUrgencyClasses = () => {
    if (allCancelled || columnId === 'paid') return '';
    if (isUrgent) return 'animate-pulse-urgent';
    if (isWarning) return 'animate-pulse-border';
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
        bg-[var(--bg-surface)] border border-[var(--border-primary)] border-l-[3px] ${getBorderColor()}
        rounded-lg card-interactive theme-transition
        ${allCancelled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${isDragging ? 'shadow-lg scale-[1.02] z-50 ring-2 ring-[var(--primary)]' : ''}
        ${getUrgencyClasses()}
      `}
    >
      {/* Header row - table, guests count, timer */}
      <div className="px-2.5 py-2 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)] text-sm tabular-nums">
            #{session.tableNumber}
          </span>
          {session.tableName && (
            <span className="text-xs text-[var(--text-secondary)] truncate max-w-[80px]">{session.tableName}</span>
          )}
          {guestCount > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--status-info)] bg-[var(--status-info-bg)] px-1.5 py-0.5 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {guestCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tabular-nums ${
            isUrgent ? 'text-[var(--status-error)]' : isWarning ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)]'
          }`}>
            {waitingMinutes}м
          </span>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
            {activeOrders[0] && formatTime(activeOrders[0].createdAt)}
          </span>
        </div>
      </div>

      {/* Type badge row */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-b border-[var(--border-primary)]/50">
        <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${typeConfig.bg} ${typeConfig.color}`}>
          {typeConfig.label}
        </span>
        {hasPendingItems && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-[var(--status-pending-bg)] text-[var(--status-pending)] rounded">
            Новые позиции
          </span>
        )}
        {activeOrders.some(o => o.waiterCalled) && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-[var(--status-waiter-bg)] text-[var(--status-waiter)] rounded animate-pulse">
            Вызов официанта
          </span>
        )}
        {activeOrders.some(o => o.wantsCashPayment) && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-[var(--bg-muted)] text-[var(--text-secondary)] rounded">
            Наличные
          </span>
        )}
      </div>

      {/* Cancelled badge */}
      {allCancelled && (
        <div className="px-2.5 py-1.5 bg-[var(--status-error-bg)] border-b border-[var(--status-error)]/20">
          <span className="text-[10px] font-semibold text-[var(--status-error)] uppercase tracking-wide">
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
            const cancelledItems = orderItems.filter(i => i.status === 2);
            const displayItems = isExpanded ? orderItems : orderItems.slice(0, 3);
            const remainingCount = orderItems.length - 3;
            const orderTotal = orderItems.filter(i => i.status !== 2).reduce((sum, i) => sum + i.totalPrice, 0);

            const isRecentItem = (item: { createdAt?: string }) => {
              if (!item.createdAt) return false;
              const secondsAgo = (Date.now() - new Date(item.createdAt).getTime()) / 1000;
              return secondsAgo < 30;
            };
            const isPending = normalizeOrderStatus(order.status) === OrderStatus.Pending || pendingItems.length > 0;

            return (
              <div key={order.id} className={`rounded-lg border ${isPending ? 'border-[var(--status-pending)]/30 bg-[var(--status-pending-bg)]' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'}`}>
                {/* Order header */}
                <div
                  className="px-2 py-1.5 flex items-center justify-between cursor-pointer"
                  onClick={(e) => toggleOrderExpanded(e, order.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {order.guestPhone ? `**${order.guestPhone.slice(-4)}` : `Гость ${idx + 1}`}
                    </span>
                    {pendingItems.length > 0 && (
                      <span className="text-[10px] px-1 py-0.5 bg-[var(--status-pending-bg)] text-[var(--status-pending)] rounded">
                        +{pendingItems.length} новых
                      </span>
                    )}
                    {cancelledItems.length > 0 && (
                      <span className="text-[10px] px-1 py-0.5 bg-[var(--status-error-bg)] text-[var(--status-error)] rounded">
                        {cancelledItems.length} отмен.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[var(--text-primary)] tabular-nums">
                      {formatPrice(orderTotal)} TJS
                    </span>
                    {columnId === 'pending' && (normalizeOrderStatus(order.status) === OrderStatus.Pending || pendingItems.length > 0) && (
                      <button
                        onClick={(e) => handleConfirmSingleOrder(e, order.id)}
                        disabled={isProcessing}
                        className="p-1 bg-[var(--status-info)] text-white rounded hover:brightness-110 disabled:opacity-50"
                        title="Подтвердить"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Order items */}
                <div className="px-2 pb-1.5 space-y-0.5">
                  {displayItems.map((item) => {
                    const itemIsPending = item.status === 0;
                    const itemIsConfirmed = item.status === 1;
                    const itemIsCancelled = item.status === 2;
                    const itemIsNew = isRecentItem(item);
                    return (
                      <div key={item.id} className={`text-[10px] ${itemIsNew ? 'animate-new-item rounded px-1 -mx-1' : ''} ${itemIsCancelled ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`flex-shrink-0 w-3 h-3 rounded border flex items-center justify-center ${
                            itemIsCancelled
                              ? 'bg-[var(--status-error)] border-[var(--status-error)] text-white'
                              : itemIsConfirmed
                                ? 'bg-[var(--status-success)] border-[var(--status-success)] text-white'
                                : 'border-[var(--border-secondary)] bg-[var(--bg-surface)]'
                          }`}>
                            {itemIsCancelled ? (
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : itemIsConfirmed && (
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className={`flex-1 truncate ${
                            itemIsCancelled
                              ? 'line-through text-[var(--status-error)]'
                              : itemIsPending
                                ? 'text-[var(--status-pending)] font-medium'
                                : 'text-[var(--text-secondary)]'
                          }`}>
                            {item.productName}
                          </span>
                          {itemIsNew && !itemIsCancelled && (
                            <span className="text-[8px] px-1 py-0.5 bg-[var(--status-success)] text-white rounded animate-pulse font-bold">
                              NEW
                            </span>
                          )}
                          <span className={`tabular-nums ${itemIsCancelled ? 'text-[var(--status-error)]' : 'text-[var(--text-muted)]'}`}>x{item.quantity}</span>
                        </div>
                        {item.note && (
                          <div className={`ml-5 mt-0.5 text-[9px] italic truncate ${itemIsCancelled ? 'text-[var(--status-error)]' : 'text-[var(--status-pending)]'}`}>
                            {item.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!isExpanded && remainingCount > 0 && (
                    <div className="text-[10px] text-[var(--text-muted)] pl-5">
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
      <div className="px-2.5 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {formatPrice(session.sessionTotal)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">TJS</span>
          </div>
          {pendingTotal > 0 && (
            <span className="text-[10px] text-[var(--status-pending)] font-medium tabular-nums">
              +{formatPrice(pendingTotal)} ожид.
            </span>
          )}
        </div>

        {/* Quick actions */}
        {(showConfirmButton || showPayButton || showCancelButton || isWaiterCalledColumn) && !allCancelled && (
          <div className="flex gap-1.5 mt-2">
            {isWaiterCalledColumn && (
              <button
                onClick={handleDismissWaiter}
                disabled={isProcessing}
                className="flex-1 px-2 py-1.5 bg-[var(--status-waiter)] text-white text-[11px] font-medium rounded hover:brightness-110 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isProcessing ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Официант закончил
                  </>
                )}
              </button>
            )}
            {showConfirmButton && (
              <button
                onClick={handleConfirmAll}
                disabled={isProcessing}
                className="flex-1 px-2 py-1.5 bg-[var(--status-info)] text-white text-[11px] font-medium rounded hover:brightness-110 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1"
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
                className="flex-1 px-2 py-1.5 bg-[var(--status-success)] text-white text-[11px] font-medium rounded hover:brightness-110 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-1"
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
                className="px-2 py-1.5 bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-medium rounded hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error)] transition-all duration-150 disabled:opacity-50 flex items-center justify-center"
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
