/*
 * JURA CODE TEMPORARILY DISABLED
 * Uncomment when full Jura documentation is available
 */

// Placeholder export to prevent import errors
export default function CreateJuraOrderModal() {
  return null;
}

/*
'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { JuraTariff, JuraAddress } from '@/types';
import {
  getJuraTariffs,
  calculateJuraDelivery,
  createDirectJuraOrder,
  searchJuraAddress,
} from '@/lib/api';

interface CreateJuraOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Default tariff ID (Курьер на авто)
const DEFAULT_TARIFF_ID = 37;

// Format phone number for Jura API (must be in international format with 992 country code)
const formatPhoneForJura = (phone: string): string => {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If starts with 9 and length is 9 digits - add country code
  if (digits.startsWith('9') && digits.length === 9) {
    digits = '992' + digits;
  }

  return digits;
};

export default function CreateJuraOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateJuraOrderModalProps) {
  const [tariffs, setTariffs] = useState<JuraTariff[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(DEFAULT_TARIFF_ID);
  const [fromAddress, setFromAddress] = useState<JuraAddress>({ address: '', lat: 0, lng: 0 });
  const [toAddress, setToAddress] = useState<JuraAddress>({ address: '', lat: 0, lng: 0 });
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [comment, setComment] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for from_address search
  const [fromAddressSearch, setFromAddressSearch] = useState('');
  const [fromAddressSuggestions, setFromAddressSuggestions] = useState<JuraAddress[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);

  // State for to_address search
  const [toAddressSearch, setToAddressSearch] = useState('');
  const [toAddressSuggestions, setToAddressSuggestions] = useState<JuraAddress[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  // Loading states for address search
  const [isSearchingFrom, setIsSearchingFrom] = useState(false);
  const [isSearchingTo, setIsSearchingTo] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTariffs();
      // Clear all values
      setSelectedTariffId(DEFAULT_TARIFF_ID);
      setFromAddress({ address: '', lat: 0, lng: 0 });
      setToAddress({ address: '', lat: 0, lng: 0 });
      setFromAddressSearch('');
      setToAddressSearch('');
      setFromAddressSuggestions([]);
      setToAddressSuggestions([]);
      setPhone('');
      setCustomerName('');
      setComment('');
      setCalculatedPrice(null);
      setError(null);
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

  // ... rest of component code ...

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создать доставку Jura"
      size="lg"
    >
      <div className="p-4">
        <p>JURA TEMPORARILY DISABLED</p>
      </div>
    </Modal>
  );
}
*/
