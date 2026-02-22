'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { getCategories, createCategory, updateCategory, deleteCategory, toggleCategoryAvailability, setCategorySchedule } from '@/lib/api';
import { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [scheduleCategory, setScheduleCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    sortOrder: 1,
    parentCategoryId: null as string | null,
  });
  const [scheduleData, setScheduleData] = useState({
    availableFrom: '',
    availableTo: '',
  });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: 'restaurant',
      sortOrder: categories.length + 1,
      parentCategoryId: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '',
      sortOrder: category.sortOrder,
      parentCategoryId: category.parentCategoryId || null,
    });
    setIsModalOpen(true);
  };

  // Get parent categories (only root categories can be parents)
  const parentCategories = categories.filter(c => !c.parentCategoryId);

  // Organize categories hierarchically
  const getCategoriesWithChildren = () => {
    const roots = categories.filter(c => !c.parentCategoryId);
    return roots.map(root => ({
      ...root,
      children: categories.filter(c => c.parentCategoryId === root.id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        icon: formData.icon,
        sortOrder: formData.sortOrder,
        parentCategoryId: formData.parentCategoryId || null,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          ...payload,
          isActive: editingCategory.isActive,
        });
      } else {
        await createCategory(payload);
      }
      await fetchCategories();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;

    try {
      await deleteCategory(id);
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleToggleAvailability = async (category: Category) => {
    setTogglingId(category.id);
    try {
      await toggleCategoryAvailability(category.id, !category.isTemporarilyDisabled);
      await fetchCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const openScheduleModal = (category: Category) => {
    setScheduleCategory(category);
    setScheduleData({
      availableFrom: category.availableFrom || '',
      availableTo: category.availableTo || '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleCategory) return;
    setSaving(true);
    try {
      await setCategorySchedule(
        scheduleCategory.id,
        scheduleData.availableFrom || undefined,
        scheduleData.availableTo || undefined
      );
      await fetchCategories();
      setIsScheduleModalOpen(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    return time.substring(0, 5); // HH:mm format
  };

  const iconOptions = [
    'local_pizza', 'lunch_dining', 'salad', 'local_cafe', 'cake',
    'ramen_dining', 'set_meal', 'fastfood', 'icecream', 'local_bar',
    'wine_bar', 'restaurant', 'bakery_dining', 'soup_kitchen', 'egg_alt'
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Категории</h1>
          <p className="text-gray-500 mt-1">Управление категориями меню</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить категорию
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-gray-500 mb-4">Категории не найдены</p>
          <Button onClick={openCreateModal}>Добавить категорию</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {getCategoriesWithChildren().map((category) => (
            <div key={category.id}>
              {/* Parent category */}
              <div className={`bg-white rounded-xl p-6 shadow-sm ${category.isTemporarilyDisabled ? 'opacity-60 border-2 border-red-200' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <span className="material-icons text-2xl">{category.icon || 'restaurant'}</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Toggle availability button */}
                    <button
                      onClick={() => handleToggleAvailability(category)}
                      disabled={togglingId === category.id}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        category.isTemporarilyDisabled
                          ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-green-500 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={category.isTemporarilyDisabled ? 'Включить категорию' : 'Отключить категорию'}
                    >
                      {category.isTemporarilyDisabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    {/* Schedule button */}
                    <button
                      onClick={() => openScheduleModal(category)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Настроить расписание"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <span>Порядок: {category.sortOrder}</span>
                  <span>{category.productCount || 0} продуктов</span>
                  {category.isTemporarilyDisabled && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Временно отключена
                    </span>
                  )}
                  {(category.availableFrom || category.availableTo) && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {formatTime(category.availableFrom) || '00:00'} - {formatTime(category.availableTo) || '23:59'}
                    </span>
                  )}
                  {!category.isCurrentlyAvailable && !category.isTemporarilyDisabled && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      Вне рабочего времени
                    </span>
                  )}
                </div>
              </div>

              {/* Subcategories */}
              {category.children && category.children.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {category.children.map((child) => (
                    <div key={child.id} className="bg-gray-50 rounded-xl p-4 shadow-sm border-l-4 border-blue-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                            <span className="material-icons text-lg">{child.icon || 'restaurant'}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{child.name}</h4>
                            <span className="text-xs text-gray-500">{child.productCount || 0} продуктов</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(child)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(child.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Редактировать категорию' : 'Новая категория'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Пицца"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Иконка
            </label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    formData.icon === icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <Select
            id="parentCategoryId"
            label="Родительская категория (опционально)"
            value={formData.parentCategoryId || ''}
            onChange={(e) => setFormData({ ...formData, parentCategoryId: e.target.value || null })}
            options={[
              { value: '', label: 'Нет (корневая категория)' },
              ...parentCategories
                .filter(c => !editingCategory || c.id !== editingCategory.id)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Input
            id="sortOrder"
            label="Порядок сортировки"
            type="number"
            min={1}
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
            required
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1">
              {editingCategory ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Расписание: ${scheduleCategory?.name || ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Укажите время, когда категория будет доступна. Например, для категории "Завтрак" установите 07:00 - 11:00.
          </p>

          <Input
            id="availableFrom"
            label="Доступна с"
            type="time"
            value={scheduleData.availableFrom}
            onChange={(e) => setScheduleData({ ...scheduleData, availableFrom: e.target.value })}
          />

          <Input
            id="availableTo"
            label="Доступна до"
            type="time"
            value={scheduleData.availableTo}
            onChange={(e) => setScheduleData({ ...scheduleData, availableTo: e.target.value })}
          />

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Если оба поля пустые - категория доступна всегда.
              Если заполнить только одно поле - будет использовано ограничение с одной стороны.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setScheduleData({ availableFrom: '', availableTo: '' });
              }}
              className="flex-1"
            >
              Сбросить
            </Button>
            <Button onClick={handleSaveSchedule} isLoading={saving} className="flex-1">
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
