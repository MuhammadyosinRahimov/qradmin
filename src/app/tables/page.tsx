'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { getTables, getTableTypes, getRestaurants, getMenus, createTable, updateTable, deleteTable, toggleTable } from '@/lib/api';
import { Table, TableTypeOption, Restaurant, Menu } from '@/types';

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableTypes, setTableTypes] = useState<TableTypeOption[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    number: 1,
    name: '',
    type: 0,
    capacity: 4,
    restaurantId: '',
    menuId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTables();
  }, [selectedRestaurant]);

  const fetchInitialData = async () => {
    try {
      const [typesRes, restaurantsRes, menusRes] = await Promise.all([
        getTableTypes(),
        getRestaurants(),
        getMenus(),
      ]);
      setTableTypes(typesRes.data);
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

  const openCreateModal = () => {
    setEditingTable(null);
    const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    setFormData({
      number: nextNumber,
      name: `Стол ${nextNumber}`,
      type: 0,
      capacity: 4,
      restaurantId: restaurants[0]?.id || '',
      menuId: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (table: Table) => {
    setEditingTable(table);
    setFormData({
      number: table.number,
      name: table.name || '',
      type: table.type,
      capacity: table.capacity,
      restaurantId: table.restaurantId,
      menuId: table.menuId || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingTable) {
        await updateTable(editingTable.id, {
          number: formData.number,
          name: formData.name,
          type: formData.type,
          capacity: formData.capacity,
          menuId: formData.menuId || null,
          isActive: editingTable.isActive,
        });
      } else {
        await createTable({
          number: formData.number,
          name: formData.name,
          type: formData.type,
          capacity: formData.capacity,
          restaurantId: formData.restaurantId,
          menuId: formData.menuId || null,
        });
      }
      await fetchTables();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот стол?')) return;

    try {
      await deleteTable(id);
      await fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleTable(id);
      await fetchTables();
    } catch (error) {
      console.error('Error toggling table:', error);
    }
  };

  const getAvailableMenus = () => {
    if (editingTable) {
      return menus.filter(m => m.restaurantId === editingTable.restaurantId);
    }
    return menus.filter(m => m.restaurantId === formData.restaurantId);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Столы</h1>
          <p className="text-gray-500 mt-1">Управление столами ресторанов</p>
        </div>
        <Button onClick={openCreateModal} disabled={restaurants.length === 0}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить стол
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="animate-pulse p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <p className="text-gray-500 mb-4">Столы не найдены</p>
          <Button onClick={openCreateModal} disabled={restaurants.length === 0}>
            Добавить стол
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Номер</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Вместимость</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Меню</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-lg font-semibold text-gray-900">#{table.number}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{table.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {table.typeName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{table.capacity} чел.</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{table.menuName || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(table.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        table.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {table.isActive ? 'Активен' : 'Неактивен'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(table)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(table.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTable ? 'Редактировать стол' : 'Новый стол'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="number"
              label="Номер стола"
              type="number"
              min={1}
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) })}
              required
            />
            <Input
              id="capacity"
              label="Вместимость"
              type="number"
              min={1}
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              required
            />
          </div>

          <Input
            id="name"
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Стол у окна"
          />

          <Select
            id="type"
            label="Тип стола"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) })}
            options={tableTypes.map((t) => ({ value: t.value, label: t.name }))}
          />

          {!editingTable && (
            <Select
              id="restaurantId"
              label="Ресторан"
              value={formData.restaurantId}
              onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value, menuId: '' })}
              options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
              required
            />
          )}

          <Select
            id="menuId"
            label="Меню (для QR-кода)"
            value={formData.menuId}
            onChange={(e) => setFormData({ ...formData, menuId: e.target.value })}
            options={[
              { value: '', label: 'Не выбрано' },
              ...getAvailableMenus().map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1">
              {editingTable ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
