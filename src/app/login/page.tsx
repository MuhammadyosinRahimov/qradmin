'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setMounted(true);
    // Set dark theme for login page
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [mounted, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-surface)]">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234ce08a' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 flex flex-col justify-center px-16 text-[var(--text-primary)]">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-muted)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Yalla eats</h1>
              <p className="text-[var(--primary)] text-sm font-medium">Система управления</p>
            </div>
          </div>

          {/* Hero text */}
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Управляйте вашим<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)]">рестораном легко</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-md leading-relaxed">
            Современная платформа для управления меню, заказами и QR-кодами вашего ресторана
          </p>

          {/* Features */}
          <div className="mt-12 space-y-4">
            {[
              'Управление меню в реальном времени',
              'Мгновенные уведомления о заказах',
              'Генерация QR-кодов для столов',
              'Аналитика и отчеты'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-[var(--text-primary)]">
                <div className="w-6 h-6 rounded-full bg-[var(--primary-bg)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[var(--primary-hover)]/10 rounded-full blur-3xl" />
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-muted)] mb-4 shadow-lg shadow-[var(--primary)]/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">QR Меню</h1>
            <p className="text-[var(--text-muted)] mt-1">Панель администратора</p>
          </div>

          {/* Login card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-primary)] shadow-2xl p-8 lg:p-10 theme-transition">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Добро пожаловать</h2>
              <p className="text-[var(--text-muted)] mt-2">Войдите в свой аккаунт</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                required
              />

              <Input
                id="password"
                type="password"
                label="Пароль"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                required
              />

              {error && (
                <div className="p-4 bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 rounded-xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--status-error)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--status-error)]">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Войти в систему
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-[var(--text-muted)] mt-8">
            QR Menu Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
}
