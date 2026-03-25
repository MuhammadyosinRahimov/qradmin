'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ImageUpload from '@/components/ui/ImageUpload';
import { getProducts, getProduct, getCategories, getMenus, createProduct, updateProduct, deleteProduct, toggleProduct, uploadProductImage, getImageUrl, addProductSize, updateProductSize, deleteProductSize } from '@/lib/api';
import { Product, Category, Menu, ProductSize } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'availability'>('availability');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    discountPrice: null as number | null,
    weight: null as number | null,
    ingredients: '',
    categoryId: '',
    menuId: '',
    imageUrl: '',
    calories: 0,
    prepTimeMinutes: 15,
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Size management state
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [showAddSize, setShowAddSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePrice, setNewSizePrice] = useState(0);
  const [sizeSaving, setSizeSaving] = useState(false);

  // Sorted products based on current sort settings
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'ru');
          break;
        case 'price':
          cmp = (a.discountPrice || a.basePrice) - (b.discountPrice || b.basePrice);
          break;
        case 'availability':
          // Unavailable items first when ascending
          cmp = (a.isAvailable === b.isAvailable) ? 0 : a.isAvailable ? 1 : -1;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [products, sortBy, sortDirection]);

  useEffect(() => {
    fetchCategories();
    fetchMenus();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedMenu]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMenus = async () => {
    try {
      const response = await getMenus();
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts(
        selectedCategory || undefined,
        selectedMenu || undefined
      );
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setImageFile(null);
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      discountPrice: null,
      weight: null,
      ingredients: '',
      categoryId: categories[0]?.id || '',
      menuId: menus[0]?.id || '',
      imageUrl: '',
      calories: 0,
      prepTimeMinutes: 15,
    });
    // Reset size state
    setProductSizes([]);
    setShowAddSize(false);
    setNewSizeName('');
    setNewSizePrice(0);
    setIsModalOpen(true);
  };

  const openEditModal = async (product: Product) => {
    setEditingProduct(product);
    setImageFile(null);
    setFormData({
      name: product.name,
      description: product.description || '',
      basePrice: product.basePrice,
      discountPrice: product.discountPrice || null,
      weight: product.weight || null,
      ingredients: product.ingredients || '',
      categoryId: product.categoryId,
      menuId: product.menuId || '',
      imageUrl: product.imageUrl || '',
      calories: product.calories || 0,
      prepTimeMinutes: product.prepTimeMinutes || 15,
    });
    // Reset size form state
    setShowAddSize(false);
    setNewSizeName('');
    setNewSizePrice(0);
    // Load product with sizes
    try {
      const response = await getProduct(product.id);
      setProductSizes(response.data.sizes || []);
    } catch (error) {
      console.error('Error loading product sizes:', error);
      setProductSizes([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let productId: string;

      const submitData = {
        ...formData,
        menuId: formData.menuId || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          ...submitData,
          isAvailable: editingProduct.isAvailable,
        });
        productId = editingProduct.id;
      } else {
        const response = await createProduct(submitData);
        productId = response.data.id;
      }

      // Upload image if selected
      if (imageFile) {
        const formDataImg = new FormData();
        formDataImg.append('file', imageFile);
        await uploadProductImage(productId, formDataImg);
      }

      await fetchProducts();
      setIsModalOpen(false);
      setImageFile(null);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот продукт?')) return;

    try {
      await deleteProduct(id);
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleProduct(id);
      await fetchProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  // Size management functions
  const handleAddSize = async () => {
    if (!editingProduct || !newSizeName.trim()) return;
    setSizeSaving(true);
    try {
      const newSize = await addProductSize(editingProduct.id, {
        name: newSizeName.trim(),
        priceModifier: newSizePrice,
        isDefault: productSizes.length === 0,
      });
      setProductSizes([...productSizes, newSize]);
      setNewSizeName('');
      setNewSizePrice(0);
      setShowAddSize(false);
    } catch (error) {
      console.error('Error adding size:', error);
    } finally {
      setSizeSaving(false);
    }
  };

  const handleUpdateSize = async (sizeId: string, field: string, value: string | number | boolean) => {
    const size = productSizes.find((s) => s.id === sizeId);
    if (!size || !editingProduct) return;

    const updated = { ...size, [field]: value };
    try {
      await updateProductSize(editingProduct.id, sizeId, {
        name: updated.name,
        priceModifier: updated.priceModifier,
        isDefault: updated.isDefault,
      });
      setProductSizes(productSizes.map((s) => (s.id === sizeId ? updated : s)));
    } catch (error) {
      console.error('Error updating size:', error);
    }
  };

  const handleDeleteSize = async (sizeId: string) => {
    if (!editingProduct) return;
    if (!confirm('Удалить этот размер?')) return;

    try {
      await deleteProductSize(editingProduct.id, sizeId);
      setProductSizes(productSizes.filter((s) => s.id !== sizeId));
    } catch (error) {
      console.error('Error deleting size:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Продукты</h1>
          <p className="text-[var(--text-secondary)] mt-1">Управление продуктами меню</p>
        </div>
        <Button onClick={openCreateModal} disabled={categories.length === 0}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить продукт
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <Select
          id="category-filter"
          label="Фильтр по категории"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={[
            { value: '', label: 'Все категории' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          className="max-w-xs"
        />
        <Select
          id="menu-filter"
          label="Фильтр по меню"
          value={selectedMenu}
          onChange={(e) => setSelectedMenu(e.target.value)}
          options={[
            { value: '', label: 'Все меню' },
            ...menus.map((m) => ({ value: m.id, label: m.name })),
          ]}
          className="max-w-xs"
        />
        <Select
          id="sort-by"
          label="Сортировка"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'availability')}
          options={[
            { value: 'availability', label: 'По доступности' },
            { value: 'name', label: 'По названию' },
            { value: 'price', label: 'По цене' },
          ]}
          className="max-w-xs"
        />
        <div className="flex items-end">
          <button
            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            className="p-2 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-center theme-transition"
            title={sortDirection === 'asc' ? 'По возрастанию' : 'По убыванию'}
          >
            <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sortDirection === 'asc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-xl overflow-hidden animate-pulse border border-[var(--border-primary)] theme-transition">
              <div className="h-40 bg-[var(--bg-secondary)]"></div>
              <div className="p-4">
                <div className="h-5 w-3/4 bg-[var(--bg-secondary)] rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-[var(--bg-secondary)] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-primary)] theme-transition">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-[var(--text-secondary)] mb-4">Продукты не найдены</p>
          <Button onClick={openCreateModal} disabled={categories.length === 0}>
            Добавить продукт
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-[var(--bg-surface)] rounded-xl overflow-hidden shadow-sm border border-[var(--border-primary)] theme-transition ${!product.isAvailable ? 'opacity-60' : ''}`}
            >
              <div className="h-40 bg-[var(--bg-secondary)] relative">
                {getImageUrl(product.imageUrl) ? (
                  <img
                    src={getImageUrl(product.imageUrl)!}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className="absolute top-2 right-2 px-2 py-1 bg-[var(--primary)] text-white text-sm font-medium rounded-lg">
                  {product.discountPrice ? (
                    <>
                      <span className="line-through opacity-70 mr-1">{product.basePrice}</span>
                      {product.discountPrice} ₽
                    </>
                  ) : (
                    <>{product.basePrice} ₽</>
                  )}
                </span>
                {!product.isAvailable && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-[var(--status-error)] text-white text-xs font-medium rounded-lg">
                    Неактивен
                  </span>
                )}
                {/* Sizes badge */}
                {product.sizesCount && product.sizesCount > 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 bg-[var(--status-info)] text-white text-xs font-medium rounded-lg flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    {product.sizesCount} разм.
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{product.name}</h3>
                    <span className="text-sm text-[var(--text-secondary)]">{product.categoryName}</span>
                    {product.menuName && (
                      <span className="block text-xs text-[var(--primary)]">{product.menuName}</span>
                    )}
                    {/* Show sizes as small badges */}
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.sizes.map((size) => (
                          <span
                            key={size.id}
                            className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded ${
                              size.isDefault
                                ? 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {size.name}
                            {size.priceModifier > 0 && (
                              <span className="ml-0.5 opacity-70">+{size.priceModifier}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(product.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.isAvailable
                          ? 'text-[var(--status-success)] hover:bg-[var(--status-success-bg)]'
                          : 'text-[var(--status-error)] hover:bg-[var(--status-error-bg)]'
                      }`}
                      title={product.isAvailable ? 'Деактивировать' : 'Активировать'}
                    >
                      {product.isAvailable ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-bg)] rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {product.description && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">{product.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                  {product.weight && product.weight > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                      {product.weight} г
                    </span>
                  )}
                  {product.calories && product.calories > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      {product.calories} ккал
                    </span>
                  )}
                  {product.prepTimeMinutes && product.prepTimeMinutes > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {product.prepTimeMinutes} мин
                    </span>
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
        title={editingProduct ? 'Редактировать продукт' : 'Новый продукт'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Маргарита"
            required
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Описание
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание продукта"
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent theme-transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="basePrice"
              label="Цена (₽)"
              type="number"
              min={0}
              step={0.01}
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
              required
            />

            <Input
              id="discountPrice"
              label="Цена со скидкой (₽)"
              type="number"
              min={0}
              step={0.01}
              value={formData.discountPrice ?? ''}
              onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Необязательно"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="weight"
              label="Вес (г)"
              type="number"
              min={0}
              value={formData.weight ?? ''}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Необязательно"
            />

            <Select
              id="categoryId"
              label="Категория"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          </div>

          <div>
            <label htmlFor="ingredients" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Состав
            </label>
            <textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              placeholder="Томатный соус, моцарелла, базилик..."
              rows={2}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent theme-transition"
            />
          </div>

          <Select
            id="menuId"
            label="Меню"
            value={formData.menuId}
            onChange={(e) => setFormData({ ...formData, menuId: e.target.value })}
            options={[
              { value: '', label: 'Не указано' },
              ...menus.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          <ImageUpload
            value={formData.imageUrl}
            onChange={(file) => setImageFile(file)}
            onClear={() => setFormData({ ...formData, imageUrl: '' })}
          />

          {/* Секция размеров - показывать только при редактировании */}
          {editingProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--text-primary)]">Размеры</label>
                <button
                  type="button"
                  onClick={() => setShowAddSize(true)}
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)]"
                >
                  + Добавить размер
                </button>
              </div>

              {/* Список размеров */}
              {productSizes.length > 0 && (
                <div className="space-y-2">
                  {productSizes.map((size) => (
                    <div key={size.id} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg">
                      <input
                        type="text"
                        value={size.name}
                        onChange={(e) => handleUpdateSize(size.id, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        placeholder="Название"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-[var(--text-muted)]">+</span>
                        <input
                          type="number"
                          value={size.priceModifier}
                          onChange={(e) => handleUpdateSize(size.id, 'priceModifier', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                          placeholder="Цена"
                        />
                        <span className="text-sm text-[var(--text-muted)]">₽</span>
                      </div>
                      <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={size.isDefault}
                          onChange={(e) => handleUpdateSize(size.id, 'isDefault', e.target.checked)}
                          className="rounded border-[var(--border-primary)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        По умолч.
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteSize(size.id)}
                        className="p-1 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {productSizes.length === 0 && !showAddSize && (
                <p className="text-sm text-[var(--text-muted)] italic">Размеры не добавлены</p>
              )}

              {/* Форма добавления нового размера */}
              {showAddSize && (
                <div className="flex items-center gap-2 p-2 border-2 border-dashed border-[var(--border-primary)] rounded-lg">
                  <input
                    type="text"
                    value={newSizeName}
                    onChange={(e) => setNewSizeName(e.target.value)}
                    placeholder="Название размера"
                    className="flex-1 px-2 py-1 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[var(--text-muted)]">+</span>
                    <input
                      type="number"
                      value={newSizePrice}
                      onChange={(e) => setNewSizePrice(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--text-muted)]">₽</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSize}
                    disabled={sizeSaving || !newSizeName.trim()}
                    className="px-3 py-1 text-sm bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {sizeSaving ? '...' : 'Добавить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSize(false);
                      setNewSizeName('');
                      setNewSizePrice(0);
                    }}
                    className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--border-primary)]"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="calories"
              label="Калории"
              type="number"
              min={0}
              value={formData.calories}
              onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) })}
            />

            <Input
              id="prepTimeMinutes"
              label="Время приготовления (мин)"
              type="number"
              min={1}
              value={formData.prepTimeMinutes}
              onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1">
              {editingProduct ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
