export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  acceptingOrders: boolean;
  pauseMessage?: string;
  createdAt: string;
  menuCount: number;
  tableCount: number;
  // DC Payment fields
  dcMerchantId?: string;
  dcSecretKey?: string;
  dcArticul?: string;
  // Alif Bank fields
  alifKey?: string;
  alifPassword?: string;
  alifGate?: string;
  onlinePaymentAvailable: boolean;
  // Payment link
  paymentLink?: string;
  // Service fee
  serviceFeePercent: number;
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
  availableFrom?: string | null;
  availableTo?: string | null;
  isTemporarilyDisabled: boolean;
  isCurrentlyAvailable: boolean;
}

export enum TableType {
  Стандартный = 0,
  VIP = 1,
  Барная = 2,
  Терраса = 3,
  Кабинка = 4,
  Детский = 5,
}

export const TableTypeNames: Record<number, string> = {
  0: 'Стандартный',
  1: 'VIP',
  2: 'Барная стойка',
  3: 'Терраса',
  4: 'Кабинка',
  5: 'Детский',
};

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
  role: 'Admin' | 'RestaurantAdmin';
  restaurantId?: string;
  restaurantName?: string;
}

export interface AuthResponse {
  token: string;
  adminId: string;
  name: string;
  email: string;
  role: 'Admin' | 'RestaurantAdmin';
  restaurantId?: string;
  restaurantName?: string;
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
  Completed = 2,
  Cancelled = 3,
}

export const OrderStatusNames: Record<number, string> = {
  0: 'Ожидает',
  1: 'Подтверждён',
  2: 'Завершён',
  3: 'Отменён',
};

export enum OrderItemStatus {
  Pending = 0,
  Active = 1,
  Cancelled = 2,
}

export const OrderItemStatusNames: Record<number, string> = {
  0: 'Новый',
  1: 'Активен',
  2: 'Отменён',
};

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sizeName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedAddons?: string[];
  status: OrderItemStatus;
  createdAt?: string;
  cancelReason?: string;
}

export interface Order {
  id: string;
  userId: string;
  tableId: string;
  tableNumber: number;
  tableName?: string;
  tableTypeName?: string;
  restaurantId?: string;
  restaurantName?: string;
  createdAt: string;
  status: OrderStatus;
  subtotal: number;
  serviceFee: number; // renamed from tax
  total: number;
  specialInstructions?: string;
  items: OrderItem[];
  hasPendingItems: boolean;
  isPaid?: boolean;
  tableSessionId?: string;
}

// Table Session types
export enum TableSessionStatus {
  Active = 0,
  Closed = 1,
}

export const TableSessionStatusNames: Record<number, string> = {
  0: 'Активна',
  1: 'Закрыта',
};

export interface SessionOrder {
  id: string;
  userId: string;
  guestPhone?: string;
  createdAt: string;
  status: OrderStatus;
  subtotal: number;           // Сумма без service fee
  serviceFeeShare: number;    // Доля service fee
  total: number;              // Subtotal + ServiceFeeShare
  isPaid: boolean;
  paidAt?: string;            // Время оплаты
  items: OrderItem[];
}

export interface TableSession {
  id: string;
  tableId: string;
  tableNumber: number;
  tableName?: string;
  restaurantId: string;
  restaurantName?: string;
  startedAt: string;
  closedAt?: string;
  status: TableSessionStatus;
  sessionSubtotal: number;    // Сумма всех заказов (без service fee)
  sessionServiceFee: number;  // Service fee на весь стол
  sessionTotal: number;       // SessionSubtotal + SessionServiceFee
  serviceFeePercent: number;  // Процент service fee
  paidAmount: number;
  unpaidAmount: number;
  orderCount: number;
  guestCount: number;
  orders: SessionOrder[];
}
