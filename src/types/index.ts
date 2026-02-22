export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  menuCount: number;
  tableCount: number;
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  restaurantId: string;
  restaurantName: string;
  categories: MenuCategory[];
}

export interface MenuCategory {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  sortOrder: number;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
}

export enum TableType {
  Стандартный = 0,
  VIP = 1,
  Барная = 2,
  Терраса = 3,
  Кабинка = 4,
  Детский = 5,
}

export interface TableTypeOption {
  value: number;
  name: string;
}

export interface Table {
  id: string;
  number: number;
  name?: string;
  type: TableType;
  typeName: string;
  capacity: number;
  qrCode: string;
  isActive: boolean;
  createdAt: string;
  restaurantId: string;
  restaurantName: string;
  menuId?: string;
  menuName?: string;
}

export interface QrCodeResponse {
  tableId: string;
  tableNumber: number;
  tableName?: string;
  qrCodeBase64: string;
  qrCodeUrl: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  admin: Admin;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  rating?: number;
  calories?: number;
  prepTimeMinutes?: number;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
  menuId?: string;
  menuName?: string;
  sizes: ProductSize[];
  addons: ProductAddon[];
}

export interface ProductSize {
  id: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export enum OrderStatus {
  Pending = 0,
  Confirmed = 1,
  Preparing = 2,
  Ready = 3,
  Delivered = 4,
  Completed = 5,
  Cancelled = 6,
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sizeName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedAddons?: string[];
}

export interface Order {
  id: string;
  userId: string;
  tableId: string;
  tableNumber: number;
  createdAt: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  specialInstructions?: string;
  items: OrderItem[];
}
