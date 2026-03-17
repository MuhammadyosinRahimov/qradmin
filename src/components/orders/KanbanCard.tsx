'use client';

import { useState } from 'react';
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
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  [OrderType.Delivery]: {
    label: 'Доставка',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  [OrderType.Takeaway]: {
    label: 'Самовывоз',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
};

const statusColors = {
  pending: 'border-l-amber-500',
  confirmed: 'border-l-blue-500',
  paid: 'border-l-emerald-500',
  cancelled: 'border-l-red-400',
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

  // Calculate waiting time
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const waitingMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

  // Urgency levels
  const isUrgent = waitingMinutes > 15;
  const isWarning = waitingMinutes >= 8 && waitingMinutes <= 15;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  // Get all non-cancelled items
  const activeItems = order.items.filter(i => i.status !== 2);
  const displayItems = activeItems.slice(0, 4);
  const remainingCount = activeItems.length - 4;

  // Calculate prices
  const confirmedItemsPrice = order.items
    .filter(i => i.status === 1)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const pendingItemsPrice = order.items
    .filter(i => i.status === 0)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const hasPendingPrice = pendingItemsPrice > 0;
  const totalPrice = confirmedItemsPrice + pendingItemsPrice;

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

  const borderColor = isCancelled
    ? statusColors.cancelled
    : columnId === 'paid'
      ? statusColors.paid
      : columnId === 'confirmed'
        ? statusColors.confirmed
        : statusColors.pending;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white border border-slate-200 border-l-[3px] ${borderColor}
        ${isCancelled ? 'opacity-60' : 'hover:border-slate-300 hover:shadow-sm'}
        ${isCancelled ? 'cursor-not-allowed' : 'cursor-pointer'}
        transition-all duration-150
        ${isDragging ? 'shadow-lg scale-[1.02] z-50 ring-2 ring-blue-400' : ''}
        ${!isCancelled && isUrgent ? 'bg-red-50/50' : ''}
        ${!isCancelled && isWarning ? 'bg-amber-50/30' : ''}
      `}
    >
      {/* Header row - compact */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">
            #{tableNumber}
          </span>
          {tableName && (
            <span className="text-xs text-slate-500">{tableName}</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 font-medium ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border} border`}>
            {typeConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {order.hasPendingItems && (
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" title="Новые блюда" />
          )}
          <span className={`text-xs font-medium tabular-nums ${
            isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-400'
          }`}>
            {waitingMinutes}м
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatTime(order.createdAt)}
          </span>
        </div>
      </div>

      {/* Cancelled badge */}
      {isCancelled && (
        <div className="px-3 py-1 bg-red-50 border-b border-red-100">
          <span className="text-[10px] font-medium text-red-600 uppercase tracking-wide">
            Отменён
          </span>
        </div>
      )}

      {/* Delivery/Takeaway info - compact */}
      {orderType === OrderType.Delivery && order.deliveryAddress && (
        <div className="px-3 py-1.5 bg-violet-50/50 border-b border-violet-100 text-[11px] text-violet-700 truncate">
          <span className="font-medium">Адрес:</span> {order.deliveryAddress}
        </div>
      )}

      {orderType === OrderType.Takeaway && order.customerName && (
        <div className="px-3 py-1.5 bg-cyan-50/50 border-b border-cyan-100 text-[11px] text-cyan-700">
          <span className="font-medium">{order.customerName}</span>
          {order.customerPhone && <span className="text-cyan-500 ml-1">({order.customerPhone})</span>}
        </div>
      )}

      {/* Items list - high density */}
      <div className="px-3 py-2">
        <div className="space-y-0.5">
          {displayItems.map((item) => (
            <div key={item.id} className="flex justify-between text-[11px] leading-tight">
              <span className={`truncate flex-1 mr-2 ${item.status === 0 ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                {item.productName}
                {item.note && <span className="text-slate-400 ml-1" title={item.note}>*</span>}
              </span>
              <span className="text-slate-500 tabular-nums">×{item.quantity}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-[10px] text-slate-400">
              +{remainingCount} ещё
            </div>
          )}
        </div>
      </div>

      {/* Footer - price and actions */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatPrice(totalPrice)}
            </span>
            <span className="text-[10px] text-slate-400">TJS</span>
            {hasPendingPrice && (
              <span className="text-[10px] text-amber-600 font-medium">
                (+{formatPrice(pendingItemsPrice)} ожид.)
              </span>
            )}
          </div>
          {order.wantsCashPayment && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-medium">
              Наличные
            </span>
          )}
        </div>

        {/* Quick actions - minimal */}
        {(showConfirmButton || showPayButton || showCancelButton) && (
          <div className="flex gap-1.5 mt-2">
            {showConfirmButton && (
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
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
                className="flex-1 px-2 py-1.5 bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
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
                className="px-2 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-medium hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
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
