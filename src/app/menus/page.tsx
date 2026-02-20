'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { getMenus, getRestaurants, getCategories, createMenu, updateMenu, deleteMenu } from '@/lib/api';
import { Menu, Restaurant, Category } from '@/types';

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    restaurantId: '',
    categoryIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [selectedRestaurant]);

  const fetchData = async () => {
    try {
      const [restaurantsRes, categoriesRes] = await Promise.all([
        getRestaurants(),
        getCategories(),
      ]);
      setRestaurants(restaurantsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const response = await getMenus(selectedRestaurant || undefined);
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingMenu(null);
    setFormData({
      name: '',
      description: '',
      restaurantId: restaurants[0]?.id || '',
      categoryIds: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description || '',
      restaurantId: menu.restaurantId,
      categoryIds: menu.categories.map((c) => c.categoryId),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingMenu) {
        await updateMenu(editingMenu.id, {
          name: formData.name,
          description: formData.description,
          isActive: true,
          categoryIds: formData.categoryIds,
        });
      } else {
        await createMenu({
          name: formData.name,
          description: formData.description,
          restaurantId: formData.restaurantId,
          categoryIds: formData.categoryIds,
        });
      }
      await fetchMenus();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving menu:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это меню?')) return;

    try {
      await deleteMenu(id);
      await fetchMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Меню</h1>
          <p className="text-gray-500 mt-1">Управление меню ресторанов</p>
        </div>
        <Button onClick={openCreateModal} disabled={restaurants.length === 0}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Создать меню
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select
          id="restaurant-filter"
          label="Фильтр по ресторану"
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
          options={[
            { value: '', label: 'Все рестораны' },
            ...restaurants.map((r) => ({ value: r.id, label: r.name })),
          ]}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : menus.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mb-4">Меню не найдено</p>
          <Button onClick={openCreateModal} disabled={restaurants.length === 0}>
            Создать меню
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{menu.name}</h3>
                  <p className="text-sm text-gray-500">{menu.restaurantName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(menu)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(menu.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {menu.description && (
                <p className="text-sm text-gray-500 mb-4">{menu.description}</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Категории:</p>
                <div className="flex flex-wrap gap-2">
                  {menu.categories.length > 0 ? (
                    menu.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
                      >
                        {cat.categoryName}
                        <span className="ml-1 text-blue-500">({cat.productCount})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Нет категорий</span>
                  )}
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
        title={editingMenu ? 'Редактировать меню' : 'Новое меню'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Название меню"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Основное меню"
            required
          />
          <Input
            id="description"
            label="Описание"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание меню"
          />

          {!editingMenu && (
            <Select
              id="restaurantId"
              label="Ресторан"
              value={formData.restaurantId}
              onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
              options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категории меню
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    formData.categoryIds.includes(category.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1">
              {editingMenu ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
