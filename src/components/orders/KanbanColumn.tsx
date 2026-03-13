'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SessionOrder } from '@/types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  orders: Array<{
    order: SessionOrder;
    sessionId: string;
    tableNumber: number;
    tableName?: string;
  }>;
  count: number;
  totalAmount: number;
  headerGradient: string;
  isCancelledColumn?: boolean;
  onOrderClick: (order: SessionOrder, sessionId: string) => void;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkOrderPaid?: (sessionId: string, orderId: string) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

export default function KanbanColumn({
  id,
  title,
  icon,
  orders,
  count,
  totalAmount,
  headerGradient,
  isCancelledColumn = false,
  onOrderClick,
  onConfirmOrder,
  onMarkOrderPaid,
  onCancelOrder,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full min-w-[320px] max-w-[400px] flex-1">
      {/* Column header with gradient */}
      <div className={`${headerGradient} rounded-t-xl p-4 shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="opacity-90">{icon}</span>
            <h3 className="font-bold text-lg">{title}</h3>
            <span className="px-2.5 py-1 bg-white/25 rounded-full text-sm font-bold backdrop-blur-sm">
              {count}
            </span>
          </div>
        </div>
        {/* Column total */}
        <div className="mt-2 flex items-center justify-between text-sm opacity-90">
          <span>Сумма:</span>
          <span className="font-bold text-base">{formatPrice(totalAmount)} TJS</span>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-3 space-y-3 overflow-y-auto
          rounded-b-xl border-2 border-t-0
          transition-all duration-300 ease-in-out
          ${isOver && isCancelledColumn
            ? 'border-red-400 bg-red-50 shadow-inner scale-[1.02]'
            : isOver
              ? 'border-blue-400 bg-blue-50 shadow-inner scale-[1.02]'
              : isCancelledColumn
                ? 'border-red-200 bg-red-50/50'
                : 'border-gray-200 bg-gray-50/80'
          }
        `}
        style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}
      >
        <SortableContext
          items={orders.map((o) => o.order.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.length === 0 ? (
            <div className={`
              flex flex-col items-center justify-center h-32
              text-gray-400 transition-all duration-300
              ${isOver ? 'scale-105' : ''}
            `}>
              <svg className={`w-14 h-14 mb-2 transition-colors ${isOver && isCancelledColumn ? 'text-red-400' : isOver ? 'text-blue-400' : 'opacity-40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className={`text-sm font-medium ${isOver && isCancelledColumn ? 'text-red-500' : isOver ? 'text-blue-500' : ''}`}>
                {isOver ? 'Отпустите здесь' : isCancelledColumn ? 'Нет отменённых' : 'Нет заказов'}
              </p>
            </div>
          ) : (
            orders.map((item) => (
              <KanbanCard
                key={item.order.id}
                order={item.order}
                sessionId={item.sessionId}
                tableNumber={item.tableNumber}
                tableName={item.tableName}
                columnId={id}
                onClick={() => onOrderClick(item.order, item.sessionId)}
                onConfirmOrder={onConfirmOrder}
                onMarkOrderPaid={onMarkOrderPaid}
                onCancelOrder={onCancelOrder}
              />
            ))
          )}
        </SortableContext>

        {/* Drop indicator */}
        {isOver && orders.length > 0 && (
          <div className={`h-20 border-2 border-dashed rounded-xl flex items-center justify-center animate-pulse ${
            isCancelledColumn
              ? 'border-red-400 bg-red-100/60'
              : 'border-blue-400 bg-blue-100/60'
          }`}>
            <div className={`flex items-center gap-2 ${isCancelledColumn ? 'text-red-600' : 'text-blue-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm font-semibold">{isCancelledColumn ? 'Отменить заказ' : 'Отпустите здесь'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
