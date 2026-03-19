'use client';

import { useMemo } from 'react';
import { SessionOrder, TableSession, OrderStatus, OrderType } from '@/types';
import Modal from '../ui/Modal';
import ActivityLog from './ActivityLog';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SessionOrder | null;
  session: TableSession | null;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkOrderPaid?: (sessionId: string, orderId: string) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

const orderTypeLabels = {
  [OrderType.DineIn]: 'В ресторане',
  [OrderType.Delivery]: 'Доставка',
  [OrderType.Takeaway]: 'Самовывоз',
};

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  session,
  onConfirmOrder,
  onMarkOrderPaid,
  onCancelOrder,
}: OrderDetailModalProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate prices and group items
  const { confirmedItems, pendingItems, cancelledItems, subtotal, pendingTotal, serviceFee, total } = useMemo(() => {
    if (!order) return { confirmedItems: [], pendingItems: [], cancelledItems: [], subtotal: 0, pendingTotal: 0, serviceFee: 0, total: 0 };

    const confirmed = order.items.filter(i => i.status === 1);
    const pending = order.items.filter(i => i.status === 0);
    const cancelled = order.items.filter(i => i.status === 2);

    const confirmedTotal = confirmed.reduce((sum, item) => sum + item.totalPrice, 0);
    const pendingSum = pending.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      confirmedItems: confirmed,
      pendingItems: pending,
      cancelledItems: cancelled,
      subtotal: confirmedTotal,
      pendingTotal: pendingSum,
      serviceFee: order.serviceFeeShare,
      total: order.total,
    };
  }, [order]);

  if (!order || !session) return null;

  const isCancelled = order.status === OrderStatus.Cancelled;
  const isPending = order.status === OrderStatus.Pending;
  const isConfirmed = order.status === OrderStatus.Confirmed;
  const isPaid = order.isPaid;
  const orderType = order.orderType ?? OrderType.DineIn;

  const handleConfirm = async () => {
    if (onConfirmOrder) {
      await onConfirmOrder(order.id);
      onClose();
    }
  };

  const handleMarkPaid = () => {
    if (onMarkOrderPaid) {
      onMarkOrderPaid(session.id, order.id);
      onClose();
    }
  };

  const handleCancel = async () => {
    if (onCancelOrder) {
      await onCancelOrder(order.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Заказ - Стол #${session.tableNumber}${session.tableName ? ` (${session.tableName})` : ''}`}
      size="4xl"
    >
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Left column - Items */}
        <div className="flex-1 min-w-0">
          {/* Order info header */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              orderType === OrderType.DineIn ? 'bg-slate-100 text-slate-600' :
              orderType === OrderType.Delivery ? 'bg-violet-100 text-violet-600' :
              'bg-cyan-100 text-cyan-600'
            }`}>
              {orderTypeLabels[orderType]}
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(order.createdAt)} {formatTime(order.createdAt)}
            </span>
            {isCancelled && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded font-medium">
                Отменён
              </span>
            )}
            {isPaid && (
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-600 rounded font-medium">
                Оплачен
              </span>
            )}
          </div>

          {/* Delivery/Takeaway info */}
          {orderType === OrderType.Delivery && order.deliveryAddress && (
            <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded">
              <p className="text-xs font-medium text-violet-700 mb-1">Адрес доставки</p>
              <p className="text-sm text-violet-900">{order.deliveryAddress}</p>
              {order.customerPhone && (
                <p className="text-xs text-violet-600 mt-1">Тел: {order.customerPhone}</p>
              )}
            </div>
          )}

          {orderType === OrderType.Takeaway && order.customerName && (
            <div className="mb-4 p-3 bg-cyan-50 border border-cyan-100 rounded">
              <p className="text-xs font-medium text-cyan-700 mb-1">Самовывоз</p>
              <p className="text-sm text-cyan-900">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-xs text-cyan-600 mt-1">Тел: {order.customerPhone}</p>
              )}
            </div>
          )}

          {/* Items section */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Позиции</h4>

            {/* Confirmed items */}
            {confirmedItems.length > 0 && (
              <div className="space-y-2 mb-3">
                {confirmedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.productName}
                        {item.sizeName && <span className="text-slate-500 font-normal"> ({item.sizeName})</span>}
                      </p>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-xs text-slate-500 truncate">+ {item.selectedAddons.join(', ')}</p>
                      )}
                      {item.note && (
                        <p className="text-xs text-amber-600">* {item.note}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">×{item.quantity}</span>
                    <span className="text-sm font-medium text-slate-900 tabular-nums">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pending items */}
            {pendingItems.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Ожидают подтверждения
                </p>
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-amber-50 border border-amber-100 rounded">
                    <span className="w-5 h-5 rounded border-2 border-amber-400 bg-white flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-900 truncate">
                        {item.productName}
                        {item.sizeName && <span className="text-amber-700 font-normal"> ({item.sizeName})</span>}
                      </p>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-xs text-amber-700 truncate">+ {item.selectedAddons.join(', ')}</p>
                      )}
                      {item.note && (
                        <p className="text-xs text-amber-600 italic">📝 {item.note}</p>
                      )}
                      {item.createdAt && item.createdAt !== order.createdAt && (
                        <p className="text-[10px] text-amber-600">Добавлено в {formatTime(item.createdAt)}</p>
                      )}
                    </div>
                    <span className="text-xs text-amber-700 tabular-nums">×{item.quantity}</span>
                    <span className="text-sm font-medium text-amber-900 tabular-nums">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cancelled items */}
            {cancelledItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-600">Отменённые позиции</p>
                {cancelledItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-red-50 border border-red-100 rounded opacity-60">
                    <span className="w-5 h-5 rounded bg-red-400 text-white flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900 truncate line-through">{item.productName}</p>
                      {item.cancelReason && (
                        <p className="text-xs text-red-600">{item.cancelReason}</p>
                      )}
                    </div>
                    <span className="text-xs text-red-600 tabular-nums line-through">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">История</h4>
            <ActivityLog order={order} tableNumber={session.tableNumber} />
          </div>
        </div>

        {/* Right column - Payment */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Оплата</h4>

            {/* Price breakdown */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Подытог</span>
                <span className="font-medium text-slate-900 tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {pendingTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Ожидается</span>
                  <span className="font-medium text-amber-600 tabular-nums">+{formatPrice(pendingTotal)}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Сервис ({session.serviceFeePercent}%)</span>
                  <span className="font-medium text-slate-900 tabular-nums">{formatPrice(serviceFee)}</span>
                </div>
              )}
              {orderType === OrderType.Delivery && order.deliveryFee && order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Доставка</span>
                  <span className="font-medium text-slate-900 tabular-nums">{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 mb-4">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-slate-900">Итого</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{formatPrice(total)} TJS</span>
              </div>
            </div>

            {/* Payment method indicator */}
            {order.wantsCashPayment && !isPaid && (
              <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-amber-700">Оплата наличными</span>
              </div>
            )}

            {isPaid && (
              <div className="mb-4 p-2 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-emerald-700">
                  Оплачено {order.paymentMethod === 'cash' ? 'наличными' : 'онлайн'}
                </span>
              </div>
            )}

            {/* Actions */}
            {!isCancelled && (
              <div className="space-y-2">
                {isPending && onConfirmOrder && (
                  <button
                    onClick={handleConfirm}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Подтвердить заказ
                  </button>
                )}

                {isConfirmed && !isPaid && onMarkOrderPaid && (
                  <button
                    onClick={handleMarkPaid}
                    className="w-full px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Отметить как оплачено
                  </button>
                )}

                {!isPaid && onCancelOrder && (
                  <button
                    onClick={handleCancel}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Отменить заказ
                  </button>
                )}
              </div>
            )}

            {/* Print button */}
            <button
              onClick={() => window.print()}
              className="w-full mt-3 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Печать
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
