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
}

const orderTypeConfig = {
  [OrderType.DineIn]: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    label: 'В ресторане',
    borderColor: 'border-l-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700',
    bgGlow: 'hover:shadow-orange-100',
  },
  [OrderType.Delivery]: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    label: 'Доставка',
    borderColor: 'border-l-purple-500',
    badgeBg: 'bg-purple-100 text-purple-700',
    bgGlow: 'hover:shadow-purple-100',
  },
  [OrderType.Takeaway]: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    label: 'Самовывоз',
    borderColor: 'border-l-teal-500',
    badgeBg: 'bg-teal-100 text-teal-700',
    bgGlow: 'hover:shadow-teal-100',
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
}: KanbanCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
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
  const isUrgent = waitingMinutes > 10;
  const isWarning = waitingMinutes >= 5 && waitingMinutes <= 10;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  // Get display items (first 3)
  const displayItems = order.items.filter(i => i.status !== 2).slice(0, 3);
  const remainingCount = order.items.filter(i => i.status !== 2).length - 3;

  // Handle quick confirm
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

  // Handle quick mark as paid
  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMarkOrderPaid || isProcessing) return;

    onMarkOrderPaid(sessionId, order.id);
  };

  // Determine which quick actions to show
  const showConfirmButton = columnId === 'pending' && order.status === OrderStatus.Pending;
  const showPayButton = columnId === 'confirmed' && !order.isPaid && order.status === OrderStatus.Confirmed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm border-l-4 ${typeConfig.borderColor}
        cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-lg ${typeConfig.bgGlow}
        ${isDragging ? 'opacity-60 shadow-2xl scale-105 z-50 rotate-2' : ''}
        ${isUrgent ? 'ring-2 ring-red-400 animate-pulse' : ''}
        ${isWarning ? 'ring-2 ring-yellow-400' : ''}
      `}
    >
      {/* Urgency indicator bar */}
      {(isUrgent || isWarning) && (
        <div className={`h-1.5 rounded-t-lg ${isUrgent ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'}`} />
      )}

      <div className="p-3">
        {/* Header with larger order number */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg text-gray-800">
                #{tableNumber}
              </span>
            </div>
            <div>
              {tableName && (
                <span className="text-sm font-medium text-gray-700">{tableName}</span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(order.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-sm font-bold ${
              isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {waitingMinutes} мин
            </span>
            {order.hasPendingItems && (
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" title="Новые блюда" />
            )}
          </div>
        </div>

        {/* Order type badge */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeConfig.badgeBg}`}>
            {typeConfig.icon}
            {typeConfig.label}
          </span>
          {order.wantsCashPayment && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Наличные
            </span>
          )}
        </div>

        {/* Customer info for delivery/takeaway */}
        {orderType === OrderType.Delivery && order.deliveryAddress && (
          <div className="mb-2 p-2 bg-purple-50 rounded-lg text-xs border border-purple-100">
            <div className="flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="text-purple-700 line-clamp-2 font-medium">{order.deliveryAddress}</span>
            </div>
          </div>
        )}

        {orderType === OrderType.Takeaway && order.customerName && (
          <div className="mb-2 p-2 bg-teal-50 rounded-lg text-xs border border-teal-100">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-teal-700 font-medium">{order.customerName}</span>
              {order.customerPhone && (
                <span className="text-teal-600">({order.customerPhone})</span>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="space-y-1 mb-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span className="text-gray-600 truncate flex-1 mr-2">
                {item.productName}
                {item.status === 0 && <span className="text-orange-500 ml-1 font-medium">(новое)</span>}
              </span>
              <span className="text-gray-500 flex-shrink-0 font-medium">x{item.quantity}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-xs text-gray-400 font-medium">
              +{remainingCount} ещё...
            </div>
          )}
        </div>

        {/* Footer with price */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(order.total)} TJS
          </span>
        </div>

        {/* Quick action buttons */}
        {(showConfirmButton || showPayButton) && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
            {showConfirmButton && (
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm hover:shadow"
              >
                {isProcessing ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Оплачено
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
