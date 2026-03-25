'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TableSession } from '@/types';
import SessionCard from './SessionCard';

interface SessionColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  sessions: TableSession[];
  count: number;
  totalAmount: number;
  headerColor: string;
  isCancelledColumn?: boolean;
  isWaiterCalledColumn?: boolean;
  onSessionClick: (session: TableSession) => void;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onMarkSessionPaid?: (sessionId: string) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onDismissWaiter?: (orderId: string) => Promise<void>;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

export default function SessionColumn({
  id,
  title,
  icon,
  sessions,
  count,
  totalAmount,
  headerColor,
  isCancelledColumn = false,
  isWaiterCalledColumn = false,
  onSessionClick,
  onConfirmOrder,
  onMarkSessionPaid,
  onCancelOrder,
  onDismissWaiter,
}: SessionColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  // Get badge colors based on column id
  const getBadgeClasses = () => {
    switch (id) {
      case 'pending':
        return 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]';
      case 'waiterCalled':
        return 'bg-[var(--status-waiter-bg)] text-[var(--status-waiter)]';
      case 'confirmed':
        return 'bg-[var(--status-info-bg)] text-[var(--status-info)]';
      case 'paid':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success)]';
      default:
        return 'bg-[var(--status-error-bg)] text-[var(--status-error)]';
    }
  };

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[340px] flex-1">
      {/* Column header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-primary)] border-b-0 rounded-t-lg px-3 py-2 theme-transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={headerColor}>{icon}</span>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h3>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded ${getBadgeClasses()}`}>
              {count}
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] tabular-nums font-medium">
            {formatPrice(totalAmount)} <span className="text-[var(--text-muted)]">TJS</span>
          </div>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-2 space-y-2 overflow-y-auto
          border border-[var(--border-primary)] rounded-b-lg
          transition-colors duration-150 theme-transition
          ${isOver && isCancelledColumn
            ? 'bg-[var(--status-error-bg)] border-[var(--status-error)]/50'
            : isOver
              ? 'bg-[var(--primary-bg)] border-[var(--primary)]/50'
              : 'bg-[var(--bg-secondary)]'
          }
        `}
        style={{ minHeight: '280px', maxHeight: 'calc(100vh - 300px)' }}
      >
        <SortableContext
          items={sessions.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sessions.length === 0 ? (
            <div className={`
              flex flex-col items-center justify-center h-24
              border border-dashed rounded-lg
              transition-colors duration-150
              ${isOver
                ? isCancelledColumn
                  ? 'border-[var(--status-error)] bg-[var(--status-error-bg)] text-[var(--status-error)]'
                  : 'border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--primary)]'
                : 'border-[var(--border-primary)] text-[var(--text-muted)]'
              }
            `}>
              <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xs font-medium">
                {isOver ? 'Отпустите здесь' : 'Нет столов'}
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                columnId={id}
                onClick={() => onSessionClick(session)}
                onConfirmOrder={onConfirmOrder}
                onMarkSessionPaid={onMarkSessionPaid}
                onCancelOrder={onCancelOrder}
                onDismissWaiter={onDismissWaiter}
                isWaiterCalledColumn={isWaiterCalledColumn}
              />
            ))
          )}
        </SortableContext>

        {/* Drop indicator when hovering with items */}
        {isOver && sessions.length > 0 && (
          <div className={`h-10 border border-dashed rounded-lg flex items-center justify-center ${
            isCancelledColumn
              ? 'border-[var(--status-error)] bg-[var(--status-error-bg)]'
              : 'border-[var(--primary)] bg-[var(--primary-bg)]'
          }`}>
            <span className={`text-xs font-medium ${isCancelledColumn ? 'text-[var(--status-error)]' : 'text-[var(--primary)]'}`}>
              {isCancelledColumn ? 'Отменить' : 'Переместить сюда'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
