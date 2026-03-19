'use client';

import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      // Show "reconnecting" briefly then hide
      setTimeout(() => {
        setIsReconnecting(false);
        setShowBanner(false);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner if initially offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a4 4 0 010-5.656m-3.536 3.536a9 9 0 010-12.728" />
          </svg>
          <span className="font-medium">Нет подключения к интернету</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      {isOnline && isReconnecting && (
        <div className="bg-green-500 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Подключение восстановлено</span>
        </div>
      )}
    </div>
  );
}
