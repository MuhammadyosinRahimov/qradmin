'use client';

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, uploadRestaurantImage, deleteRestaurantImage, getImageUrl } from '@/lib/api';
import { Restaurant } from '@/types';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    dcMerchantId: '',
    dcSecretKey: '',
    dcArticul: '',
    paymentLink: '',
    serviceFeePercent: '10',
    deliveryEnabled: false,
    deliveryFee: '0',
    takeawayEnabled: false,
  });
  const [saving, setSaving] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await getRestaurants();
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRestaurant(null);
    setFormData({ name: '', description: '', address: '', phone: '', adminEmail: '', adminPassword: '', adminName: '', dcMerchantId: '', dcSecretKey: '', dcArticul: '', paymentLink: '', serviceFeePercent: '10', deliveryEnabled: false, deliveryFee: '0', takeawayEnabled: false });
    setSelectedImage(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      adminEmail: '',
      adminPassword: '',
      adminName: '',
      dcMerchantId: restaurant.dcMerchantId || '',
      dcSecretKey: restaurant.dcSecretKey || '',
      dcArticul: restaurant.dcArticul || '',
      paymentLink: restaurant.paymentLink || '',
      serviceFeePercent: String(restaurant.serviceFeePercent || 10),
      deliveryEnabled: restaurant.deliveryEnabled || false,
      deliveryFee: String(restaurant.deliveryFee || 0),
      takeawayEnabled: restaurant.takeawayEnabled || false,
    });
    setSelectedImage(null);
    setImagePreview(restaurant.logoUrl ? getImageUrl(restaurant.logoUrl) : null);
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Недопустимый формат файла. Разрешены: JPG, PNG, WebP, GIF');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5 МБ');
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !editingRestaurant) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await uploadRestaurantImage(editingRestaurant.id, formData);
      setImagePreview(getImageUrl(response.data.imageUrl));
      setSelectedImage(null);

      // Update restaurant in list
      setRestaurants(prev => prev.map(r =>
        r.id === editingRestaurant.id
          ? { ...r, logoUrl: response.data.imageUrl }
          : r
      ));

      // Update editing restaurant
      setEditingRestaurant({ ...editingRestaurant, logoUrl: response.data.imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!editingRestaurant) return;
    if (!confirm('Удалить изображение ресторана?')) return;

    setUploadingImage(true);
    try {
      await deleteRestaurantImage(editingRestaurant.id);
      setImagePreview(null);
      setSelectedImage(null);

      // Update restaurant in list
      setRestaurants(prev => prev.map(r =>
        r.id === editingRestaurant.id
          ? { ...r, logoUrl: undefined }
          : r
      ));

      // Update editing restaurant
      setEditingRestaurant({ ...editingRestaurant, logoUrl: undefined });
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Ошибка при удалении изображения');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingRestaurant) {
        await updateRestaurant(editingRestaurant.id, {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          logoUrl: editingRestaurant.logoUrl || undefined,
          isActive: editingRestaurant.isActive,
          dcMerchantId: formData.dcMerchantId || undefined,
          dcSecretKey: formData.dcSecretKey || undefined,
          dcArticul: formData.dcArticul || undefined,
          paymentLink: formData.paymentLink || undefined,
          serviceFeePercent: parseFloat(formData.serviceFeePercent) || 10,
          deliveryEnabled: formData.deliveryEnabled,
          deliveryFee: parseFloat(formData.deliveryFee) || 0,
          takeawayEnabled: formData.takeawayEnabled,
        });
      } else {
        await createRestaurant({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          adminEmail: formData.adminEmail || undefined,
          adminPassword: formData.adminPassword || undefined,
          adminName: formData.adminName || undefined,
        });
      }
      await fetchRestaurants();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving restaurant:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот ресторан?')) return;

    try {
      await deleteRestaurant(id);
      await fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Рестораны</h1>
          <p className="text-gray-500 mt-1">Управление ресторанами</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить ресторан
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 mb-4">Рестораны не найдены</p>
          <Button onClick={openCreateModal}>Добавить ресторан</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Restaurant image */}
              <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-500 relative">
                {restaurant.logoUrl ? (
                  <img
                    src={getImageUrl(restaurant.logoUrl) || ''}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                {/* Status badges overlay */}
                <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      restaurant.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {restaurant.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {restaurant.onlinePaymentAvailable && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Онлайн-оплата
                        </span>
                      )}
                      {restaurant.deliveryEnabled && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          Доставка
                        </span>
                      )}
                      {restaurant.takeawayEnabled && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                          Самовывоз
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(restaurant)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(restaurant.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {restaurant.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{restaurant.description}</p>
                )}

                <div className="space-y-1.5 text-sm text-gray-600">
                  {restaurant.address && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{restaurant.address}</span>
                    </div>
                  )}
                  {restaurant.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{restaurant.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{restaurant.menuCount}</p>
                    <p className="text-xs text-gray-500">Меню</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{restaurant.tableCount}</p>
                    <p className="text-xs text-gray-500">Столов</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRestaurant ? 'Редактировать ресторан' : 'Новый ресторан'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload section - only show when editing */}
          {editingRestaurant && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Изображение ресторана
              </label>

              {/* Image preview */}
              <div className="relative">
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleImageDelete}
                        disabled={uploadingImage}
                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-orange-500"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Загрузить изображение</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP до 5 МБ</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Upload button - show when new image selected */}
              {selectedImage && (
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  isLoading={uploadingImage}
                  className="w-full"
                  variant="secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Загрузить изображение
                </Button>
              )}
            </div>
          )}

          <Input
            id="name"
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Название ресторана"
            required
          />
          <Input
            id="description"
            label="Описание"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание ресторана"
          />
          <Input
            id="address"
            label="Адрес"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="ул. Примерная, 123"
          />
          <Input
            id="phone"
            label="Телефон"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+7 999 123-45-67"
          />

          {/* Admin fields - only show when creating */}
          {!editingRestaurant && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Администратор ресторана (необязательно)</h3>
              <Input
                id="adminEmail"
                label="Email администратора"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@restaurant.com"
              />
              <Input
                id="adminPassword"
                label="Пароль"
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                placeholder="Минимум 6 символов"
              />
              <Input
                id="adminName"
                label="Имя администратора"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                placeholder="Имя администратора"
              />
              <p className="text-xs text-gray-500">
                Изображение можно загрузить после создания ресторана
              </p>
            </div>
          )}

          {/* Payment settings - only show when editing */}
          {editingRestaurant && (
            <>
              {/* Delivery/Takeaway settings */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Режимы заказа</h3>

                {/* Delivery toggle */}
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <span className="font-medium text-purple-700">Доставка</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.deliveryEnabled}
                      onChange={(e) => setFormData({ ...formData, deliveryEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {/* Delivery fee - only show if delivery is enabled */}
                {formData.deliveryEnabled && (
                  <Input
                    id="deliveryFee"
                    label="Стоимость доставки (TJS)"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.deliveryFee}
                    onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                    placeholder="0"
                  />
                )}

                {/* Takeaway toggle */}
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="font-medium text-teal-700">Самовывоз</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.takeawayEnabled}
                      onChange={(e) => setFormData({ ...formData, takeawayEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
              </div>

              {/* Service fee settings */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Настройки обслуживания</h3>
                <Input
                  id="serviceFeePercent"
                  label="Процент обслуживания (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.serviceFeePercent}
                  onChange={(e) => setFormData({ ...formData, serviceFeePercent: e.target.value })}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500">
                  Процент обслуживания, который добавляется к сумме заказов. По умолчанию 10%.
                </p>
              </div>

              {/* DC Bank settings */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Настройки DC Bank</h3>
                <Input
                  id="dcMerchantId"
                  label="Merchant ID"
                  value={formData.dcMerchantId}
                  onChange={(e) => setFormData({ ...formData, dcMerchantId: e.target.value })}
                  placeholder="Код мерчанта DC"
                />
                <Input
                  id="dcSecretKey"
                  label="Secret Key"
                  type="password"
                  value={formData.dcSecretKey}
                  onChange={(e) => setFormData({ ...formData, dcSecretKey: e.target.value })}
                  placeholder="Секретный ключ DC"
                />
                <Input
                  id="dcArticul"
                  label="Артикул (необязательно)"
                  value={formData.dcArticul}
                  onChange={(e) => setFormData({ ...formData, dcArticul: e.target.value })}
                  placeholder="30"
                />
              </div>

              {/* Payment Link settings */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Ссылка для оплаты (ExpressPay, DC, Alif и др.)</h3>
                <Input
                  id="paymentLink"
                  label="Платёжная ссылка"
                  value={formData.paymentLink}
                  onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                  placeholder="http://pay.expresspay.tj/?A=9762000087892609&s={amount}&c=&f1=133"
                />
                <p className="text-xs text-gray-500">
                  Используйте <code className="bg-gray-100 px-1 rounded">{'{amount}'}</code> для автоподстановки суммы заказа
                </p>
              </div>

              {editingRestaurant.onlinePaymentAvailable && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mt-4">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700">Онлайн-оплата активна</span>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1">
              {editingRestaurant ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
