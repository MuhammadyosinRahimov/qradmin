'use client';

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { getTables, getRestaurants, getMenus, getTableQr, generateTableQr, bulkGenerateQr } from '@/lib/api';
import { Table, Restaurant, Menu, QrCodeResponse } from '@/types';

export default function QrCodesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [generating, setGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCodeResponse[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTables();
  }, [selectedRestaurant]);

  const fetchInitialData = async () => {
    try {
      const [restaurantsRes, menusRes] = await Promise.all([
        getRestaurants(),
        getMenus(),
      ]);
      setRestaurants(restaurantsRes.data);
      setMenus(menusRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await getTables(selectedRestaurant || undefined);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableMenus = () => {
    if (!selectedRestaurant) return menus;
    return menus.filter(m => m.restaurantId === selectedRestaurant);
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAllTables = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map((t) => t.id));
    }
  };

  const handleGenerateQr = async () => {
    if (selectedTables.length === 0 || !selectedMenu) {
      alert('Выберите столы и меню');
      return;
    }

    setGenerating(true);
    try {
      const response = await bulkGenerateQr(selectedTables, selectedMenu, baseUrl);
      setQrCodes(response.data);
      setIsPreviewOpen(true);
      await fetchTables(); // Refresh tables to update QR codes
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка генерации QR-кодов');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-коды</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .qr-card {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-card img { max-width: 150px; margin-bottom: 10px; }
            .table-number { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .table-name { color: #6b7280; font-size: 14px; }
            @media print {
              .grid { grid-template-columns: repeat(3, 1fr); }
              .qr-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${qrCodes.map(qr => `
              <div class="qr-card">
                <img src="data:image/png;base64,${qr.qrCodeBase64}" alt="QR Code" />
                <div class="table-number">Стол #${qr.tableNumber}</div>
                ${qr.tableName ? `<div class="table-name">${qr.tableName}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadQr = (qr: QrCodeResponse) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qr.qrCodeBase64}`;
    link.download = `qr-table-${qr.tableNumber}.png`;
    link.click();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Генерация QR-кодов</h1>
        <p className="text-gray-500 mt-1">Создание QR-кодов для столов с выбором меню</p>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Настройки генерации</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="restaurant-filter"
            label="Ресторан"
            value={selectedRestaurant}
            onChange={(e) => {
              setSelectedRestaurant(e.target.value);
              setSelectedMenu('');
              setSelectedTables([]);
            }}
            options={[
              { value: '', label: 'Все рестораны' },
              ...restaurants.map((r) => ({ value: r.id, label: r.name })),
            ]}
          />

          <Select
            id="menu"
            label="Меню для QR-кода"
            value={selectedMenu}
            onChange={(e) => setSelectedMenu(e.target.value)}
            options={[
              { value: '', label: 'Выберите меню' },
              ...getAvailableMenus().map((m) => ({ value: m.id, label: `${m.name} (${m.restaurantName})` })),
            ]}
          />

          <Input
            id="baseUrl"
            label="Базовый URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3000"
          />
        </div>
      </div>

      {/* Tables selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Выберите столы ({selectedTables.length} из {tables.length})
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllTables}>
              {selectedTables.length === tables.length ? 'Снять выбор' : 'Выбрать все'}
            </Button>
            <Button
              onClick={handleGenerateQr}
              disabled={selectedTables.length === 0 || !selectedMenu}
              isLoading={generating}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Сгенерировать QR-коды
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-xl">
                <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
                <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Столы не найдены. Сначала создайте столы.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => toggleTableSelection(table.id)}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  selectedTables.includes(table.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-2xl font-bold ${
                  selectedTables.includes(table.id) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  #{table.number}
                </div>
                <div className="text-sm text-gray-500 truncate">{table.name || table.typeName}</div>
                {table.menuName && (
                  <div className="mt-1 text-xs text-green-600">
                    {table.menuName}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="QR-коды готовы"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handlePrint}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Печать всех
            </Button>
          </div>

          <div ref={printRef} className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
            {qrCodes.map((qr) => (
              <div
                key={qr.tableId}
                className="border-2 border-gray-200 rounded-xl p-4 text-center"
              >
                <img
                  src={`data:image/png;base64,${qr.qrCodeBase64}`}
                  alt={`QR Code for table ${qr.tableNumber}`}
                  className="mx-auto mb-3"
                  style={{ maxWidth: '150px' }}
                />
                <div className="text-xl font-bold text-gray-900">Стол #{qr.tableNumber}</div>
                {qr.tableName && (
                  <div className="text-sm text-gray-500">{qr.tableName}</div>
                )}
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadQr(qr)}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Скачать
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
