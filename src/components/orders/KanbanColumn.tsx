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
  headerColor: string;
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
  headerColor,
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
    <div className="flex flex-col h-full min-w-[260px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className="bg-white border border-slate-200 border-b-0 rounded-t px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={headerColor}>{icon}</span>
            <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded ${
              id === 'pending' ? 'bg-amber-100 text-amber-700' :
              id === 'confirmed' ? 'bg-blue-100 text-blue-700' :
              id === 'paid' ? 'bg-emerald-100 text-emerald-700' :
              'bg-red-100 text-red-600'
            }`}>
              {count}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums font-medium">
            {formatPrice(totalAmount)} <span className="text-slate-400">TJS</span>
          </div>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-2 space-y-2 overflow-y-auto
          border border-slate-200 rounded-b
          transition-colors duration-150
          ${isOver && isCancelledColumn
            ? 'bg-red-50 border-red-300'
            : isOver
              ? 'bg-blue-50 border-blue-300'
              : 'bg-slate-50'
          }
        `}
        style={{ minHeight: '280px', maxHeight: 'calc(100vh - 300px)' }}
      >
        <SortableContext
          items={orders.map((o) => o.order.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.length === 0 ? (
            <div className={`
              flex flex-col items-center justify-center h-24
              border border-dashed rounded
              transition-colors duration-150
              ${isOver
                ? isCancelledColumn
                  ? 'border-red-400 bg-red-50/50 text-red-500'
                  : 'border-blue-400 bg-blue-50/50 text-blue-500'
                : 'border-slate-300 text-slate-400'
              }
            `}>
              <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xs font-medium">
                {isOver ? 'Отпустите здесь' : 'Нет заказов'}
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

        {/* Drop indicator when hovering with items */}
        {isOver && orders.length > 0 && (
          <div className={`h-10 border border-dashed rounded flex items-center justify-center ${
            isCancelledColumn
              ? 'border-red-400 bg-red-50'
              : 'border-blue-400 bg-blue-50'
          }`}>
            <span className={`text-xs font-medium ${isCancelledColumn ? 'text-red-600' : 'text-blue-600'}`}>
              {isCancelledColumn ? 'Отменить заказ' : 'Переместить сюда'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
