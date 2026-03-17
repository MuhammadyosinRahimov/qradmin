'use client';

import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SessionOrder, OrderType, OrderStatus } from '@/types';

interface KanbanCardProps {
  order: SessionOrder;
  sessionId: string;
  tableNumber: number;
  tableName?: string;
  columnId?: string;
  onClick: () => void;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkOrderPaid?: (sessionId: string, orderId: string) => void;
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

export default function KanbanCard({
  order,
  sessionId,
  tableNumber,
  tableName,
  columnId,
  onClick,
  onConfirmOrder,
  onMarkOrderPaid,
  onCancelOrder,
}: KanbanCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const isCancelled = order.status === OrderStatus.Cancelled;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    disabled: isCancelled,
    data: {
      order,
      sessionId,
      tableNumber,
      tableName,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const orderType = order.orderType ?? OrderType.DineIn;
  const typeConfig = orderTypeConfig[orderType];

  // Calculate waiting time and urgency
  const { waitingMinutes, isUrgent, isWarning, isNew } = useMemo(() => {
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    return {
      waitingMinutes: minutes,
      isUrgent: minutes > 10,
      isWarning: minutes >= 5 && minutes <= 10,
      isNew: minutes < 2,
    };
  }, [order.createdAt]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  // Get items by status
  const { activeItems, pendingItems, confirmedItems, displayItems, remainingCount } = useMemo(() => {
    const active = order.items.filter(i => i.status !== 2);
    const pending = order.items.filter(i => i.status === 0);
    const confirmed = order.items.filter(i => i.status === 1);
    const display = active.slice(0, 3);
    const remaining = active.length - 3;
    return {
      activeItems: active,
      pendingItems: pending,
      confirmedItems: confirmed,
      displayItems: display,
      remainingCount: remaining > 0 ? remaining : 0,
    };
  }, [order.items]);

  // Calculate prices
  const { confirmedItemsPrice, pendingItemsPrice, totalPrice, hasPendingPrice } = useMemo(() => {
    const confirmed = order.items
      .filter(i => i.status === 1)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const pending = order.items
      .filter(i => i.status === 0)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    return {
      confirmedItemsPrice: confirmed,
      pendingItemsPrice: pending,
      totalPrice: confirmed + pending,
      hasPendingPrice: pending > 0,
    };
  }, [order.items]);

  // Extra order indicator
  const hasExtraItems = pendingItems.length > 0 && confirmedItems.length > 0;

  // Handlers
  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConfirmOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirmOrder(order.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMarkOrderPaid || isProcessing) return;
    onMarkOrderPaid(sessionId, order.id);
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCancelOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onCancelOrder(order.id);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine which quick actions to show
  const showConfirmButton = columnId === 'pending' && order.status === OrderStatus.Pending;
  const showPayButton = columnId === 'confirmed' && !order.isPaid && order.status === OrderStatus.Confirmed;
  const showCancelButton = !isCancelled && (columnId === 'pending' || columnId === 'confirmed');

  // Border color based on status
  const getBorderColor = () => {
    if (isCancelled) return 'border-l-red-400';
    if (columnId === 'paid') return 'border-l-emerald-500';
    if (columnId === 'confirmed') return 'border-l-blue-500';
    return 'border-l-amber-500';
  };

  // Urgency classes
  const getUrgencyClasses = () => {
    if (isCancelled || columnId === 'paid') return '';
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
        ${isCancelled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${isDragging ? 'shadow-lg scale-[1.02] z-50 ring-2 ring-blue-400' : ''}
        ${getUrgencyClasses()}
      `}
    >
      {/* Header row - table, timer, time */}
      <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm tabular-nums">
            #{tableNumber}
          </span>
          {tableName && (
            <span className="text-xs text-slate-500 truncate max-w-[80px]">{tableName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Extra order indicator */}
          {hasExtraItems && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
              +{pendingItems.length}
            </span>
          )}
          {/* Timer */}
          <span className={`text-xs font-semibold tabular-nums ${
            isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-400'
          }`}>
            {waitingMinutes}м
          </span>
          {/* Time */}
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatTime(order.createdAt)}
          </span>
        </div>
      </div>

      {/* Type badge and indicators row */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-b border-slate-50">
        <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${typeConfig.bg} ${typeConfig.color}`}>
          {typeConfig.label}
        </span>
        {hasExtraItems && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-amber-50 text-amber-700 rounded">
            Доп. заказ
          </span>
        )}
        {order.wantsCashPayment && (
          <span className="text-[10px] px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600 rounded">
            Наличные
          </span>
        )}
      </div>

      {/* Cancelled badge */}
      {isCancelled && (
        <div className="px-2.5 py-1.5 bg-red-50 border-b border-red-100">
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
            Отменён
          </span>
        </div>
      )}

      {/* Delivery/Takeaway info */}
      {orderType === OrderType.Delivery && order.deliveryAddress && (
        <div className="px-2.5 py-1.5 bg-violet-50/50 border-b border-violet-100 text-[10px] text-violet-700 truncate">
          <span className="font-medium">Адрес:</span> {order.deliveryAddress}
        </div>
      )}

      {orderType === OrderType.Takeaway && order.customerName && (
        <div className="px-2.5 py-1.5 bg-cyan-50/50 border-b border-cyan-100 text-[10px] text-cyan-700">
          <span className="font-medium">{order.customerName}</span>
          {order.customerPhone && <span className="text-cyan-500 ml-1">({order.customerPhone})</span>}
        </div>
      )}

      {/* Items list with checkboxes */}
      <div className="px-2.5 py-2">
        <div className="space-y-1">
          {displayItems.map((item) => {
            const isPending = item.status === 0;
            const isConfirmed = item.status === 1;
            return (
              <div key={item.id} className="flex items-center gap-2 text-[11px]">
                {/* Checkbox indicator */}
                <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  isConfirmed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 bg-white'
                }`}>
                  {isConfirmed && (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {/* Item name */}
                <span className={`flex-1 truncate ${isPending ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                  {item.productName}
                  {item.note && <span className="text-slate-400 ml-0.5" title={item.note}>*</span>}
                </span>
                {/* Quantity */}
                <span className="text-slate-400 tabular-nums flex-shrink-0">×{item.quantity}</span>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="text-[10px] text-slate-400 pl-5">
              +{remainingCount} ещё...
            </div>
          )}
        </div>
      </div>

      {/* Footer - price and actions */}
      <div className="px-2.5 py-2 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatPrice(totalPrice)}
            </span>
            <span className="text-[10px] text-slate-400">TJS</span>
          </div>
          {hasPendingPrice && (
            <span className="text-[10px] text-amber-600 font-medium tabular-nums">
              +{formatPrice(pendingItemsPrice)} ожид.
            </span>
          )}
        </div>

        {/* Quick actions */}
        {(showConfirmButton || showPayButton || showCancelButton) && (
          <div className="flex gap-1.5 mt-2">
            {showConfirmButton && (
              <button
                onClick={handleConfirm}
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
                    Подтвердить
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
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-2 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded hover:bg-red-50 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                title="Отменить"
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
