/*
 * JURA CODE TEMPORARILY DISABLED
 * Uncomment when full Jura documentation is available
 */

// Placeholder export to prevent import errors
export default function JuraDeliveryModal() {
  return null;
}

/*
'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { SessionOrder, JuraTariff, JuraAddress } from '@/types';
import {
  getJuraTariffs,
  calculateJuraDelivery,
  createJuraDelivery,
  searchJuraAddress,
} from '@/lib/api';

interface JuraDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SessionOrder;
  onSuccess: () => void;
}

export default function JuraDeliveryModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: JuraDeliveryModalProps) {
  const [tariffs, setTariffs] = useState<JuraTariff[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [fromAddress, setFromAddress] = useState<JuraAddress>({
    address: '',
    lng: 0,
    lat: 0,
  });
  const [toAddress, setToAddress] = useState<JuraAddress>({
    address: order.deliveryAddress || '',
    lng: 0,
    lat: 0,
  });
  const [phone, setPhone] = useState(order.customerPhone || '');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromAddressSearch, setFromAddressSearch] = useState('');
  const [toAddressSearch, setToAddressSearch] = useState('');
  const [fromAddressSuggestions, setFromAddressSuggestions] = useState<JuraAddress[]>([]);
  const [toAddressSuggestions, setToAddressSuggestions] = useState<JuraAddress[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  // Load tariffs on mount
  useEffect(() => {
    if (isOpen) {
      loadTariffs();
    }
  }, [isOpen]);

  const loadTariffs = async () => {
    try {
      const response = await getJuraTariffs();
      setTariffs(response.data);
      if (response.data.length > 0) {
        setSelectedTariffId(response.data[0].id);
      }
    } catch (err) {
      console.error('Error loading tariffs:', err);
      setError('Не удалось загрузить тарифы');
    }
  };

  // Search addresses with debounce
  const searchFromAddress = useCallback(async (text: string) => {
    if (text.length < 3) {
      setFromAddressSuggestions([]);
      return;
    }
    try {
      const response = await searchJuraAddress(text);
      setFromAddressSuggestions(response.data);
      setShowFromSuggestions(true);
    } catch (err) {
      console.error('Error searching address:', err);
    }
  }, []);

  const searchToAddress = useCallback(async (text: string) => {
    if (text.length < 3) {
      setToAddressSuggestions([]);
      return;
    }
    try {
      const response = await searchJuraAddress(text);
      setToAddressSuggestions(response.data);
      setShowToSuggestions(true);
    } catch (err) {
      console.error('Error searching address:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAddressSearch) {
        searchFromAddress(fromAddressSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fromAddressSearch, searchFromAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (toAddressSearch) {
        searchToAddress(toAddressSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [toAddressSearch, searchToAddress]);

  const selectFromAddress = (addr: JuraAddress) => {
    setFromAddress(addr);
    setFromAddressSearch(addr.address);
    setShowFromSuggestions(false);
    setCalculatedPrice(null);
  };

  const selectToAddress = (addr: JuraAddress) => {
    setToAddress(addr);
    setToAddressSearch(addr.address);
    setShowToSuggestions(false);
    setCalculatedPrice(null);
  };

  const handleCalculate = async () => {
    if (!selectedTariffId || !fromAddress.address || !toAddress.address) {
      setError('Заполните все поля');
      return;
    }

    if (fromAddress.lat === 0 || toAddress.lat === 0) {
      setError('Выберите адреса из списка');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculateJuraDelivery({
        tariffId: selectedTariffId,
        fromAddress,
        toAddress,
      });
      setCalculatedPrice(response.data.price);
    } catch (err: any) {
      console.error('Error calculating:', err);
      setError(err.response?.data?.message || 'Ошибка при расчёте');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTariffId || !fromAddress.address || !toAddress.address || !phone) {
      setError('Заполните все поля');
      return;
    }

    if (fromAddress.lat === 0 || toAddress.lat === 0) {
      setError('Выберите адреса из списка');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createJuraDelivery({
        orderId: order.id,
        tariffId: selectedTariffId,
        phone,
        fromAddress,
        toAddress,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating delivery:', err);
      setError(err.response?.data?.message || 'Ошибка при создании доставки');
    } finally {
      setIsCreating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создать доставку Jura"
      size="lg"
    >
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Тариф
          </label>
          <div className="flex gap-2">
            {tariffs.map((tariff) => (
              <button
                key={tariff.id}
                onClick={() => {
                  setSelectedTariffId(tariff.id);
                  setCalculatedPrice(null);
                }}
                className={`flex-1 px-4 py-2 rounded border text-sm font-medium transition-colors ${
                  selectedTariffId === tariff.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-violet-400'
                }`}
              >
                {tariff.name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Адрес отправления (ресторан)
          </label>
          <input
            type="text"
            value={fromAddressSearch}
            onChange={(e) => {
              setFromAddressSearch(e.target.value);
              setFromAddress({ ...fromAddress, address: e.target.value, lat: 0, lng: 0 });
              setCalculatedPrice(null);
            }}
            onFocus={() => fromAddressSuggestions.length > 0 && setShowFromSuggestions(true)}
            placeholder="Введите адрес ресторана..."
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          {showFromSuggestions && fromAddressSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
              {fromAddressSuggestions.map((addr, idx) => (
                <button
                  key={idx}
                  onClick={() => selectFromAddress(addr)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  {addr.address}
                </button>
              ))}
            </div>
          )}
          {fromAddress.lat !== 0 && (
            <p className="mt-1 text-xs text-green-600">
              Координаты: {fromAddress.lat.toFixed(6)}, {fromAddress.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Адрес доставки (клиент)
          </label>
          <input
            type="text"
            value={toAddressSearch || order.deliveryAddress || ''}
            onChange={(e) => {
              setToAddressSearch(e.target.value);
              setToAddress({ ...toAddress, address: e.target.value, lat: 0, lng: 0 });
              setCalculatedPrice(null);
            }}
            onFocus={() => toAddressSuggestions.length > 0 && setShowToSuggestions(true)}
            placeholder="Введите адрес доставки..."
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          {showToSuggestions && toAddressSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
              {toAddressSuggestions.map((addr, idx) => (
                <button
                  key={idx}
                  onClick={() => selectToAddress(addr)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  {addr.address}
                </button>
              ))}
            </div>
          )}
          {toAddress.lat !== 0 && (
            <p className="mt-1 text-xs text-green-600">
              Координаты: {toAddress.lat.toFixed(6)}, {toAddress.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Телефон клиента
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+992 ..."
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCalculate}
            disabled={isCalculating || !fromAddress.lat || !toAddress.lat}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCalculating && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Рассчитать стоимость
          </button>

          {calculatedPrice !== null && (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {formatPrice(calculatedPrice)}
              </span>
              <span className="text-sm text-slate-500">TJS</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Сумма заказа</h4>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Заказ</span>
            <span className="font-medium">{formatPrice(order.total)} TJS</span>
          </div>
          {calculatedPrice !== null && (
            <>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Доставка Jura</span>
                <span className="font-medium">{formatPrice(calculatedPrice)} TJS</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200">
                <span className="font-medium text-slate-700">Итого</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(order.total + calculatedPrice)} TJS
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !fromAddress.lat || !toAddress.lat || !phone}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Создать доставку
          </button>
        </div>
      </div>
    </Modal>
  );
}
*/
