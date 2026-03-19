import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConnectionStatus from "@/components/ui/ConnectionStatus";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Yalla eats - Админ панель",
  description: "Панель управления QR-меню для ресторанов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ToastProvider>
          <ConnectionStatus />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
