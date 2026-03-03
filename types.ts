
// FIX: Removed a self-referential import of `Page` that was causing a declaration conflict.
export enum Page {
  Dashboard = 'DASHBOARD',
  POS = 'POS',
  Products = 'PRODUCTS',
  Categories = 'CATEGORIES', // New page for categories
  Debts = 'DEBTS',
  Reports = 'REPORTS',
  Expenses = 'EXPENSES',
  Management = 'MANAGEMENT', // For customers and suppliers
  Journal = 'JOURNAL', // New page for Financial Journal
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  hpp: number; // Harga Pokok Penjualan (Cost of Goods Sold)
  stock: number;
  imageUrl?: string;
  isDivisible?: boolean; // Can this product be sold in fractional quantities?
  trackStock: boolean; // Should the application track stock for this item?
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SavedOrder {
  id: string;
  name: string;
  cart: CartItem[];
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
}

export type PaymentMethod = 'Cash' | 'QRIS' | 'Card' | 'Transfer' | 'Pay Later';

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number; // Total sebelum diskon
  discount: number; // Nominal diskon
  total: number; // Total akhir yang harus dibayar
  totalHPP: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  createdAt: string; // ISO Date string
}

export interface PaymentRecord {
    id: string;
    receivableId: string;
    amount: number;
    paymentDate: string; // ISO Date string
}

export interface Receivable {
  id: string;
  customerId: string;
  transactionId: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string; // ISO Date string
  createdAt: string; // ISO Date string
  payments: PaymentRecord[];
}

export interface PayablePaymentRecord {
  id: string;
  payableId: string;
  amount: number;
  paymentDate: string; // ISO Date string
}

export interface Payable {
  id: string;
  supplierId: string;
  description: string; // e.g., "Stock purchase for SKU-123"
  totalAmount: number;
  paidAmount: number;
  dueDate: string; // ISO Date string
  createdAt: string; // ISO Date string
  payments: PayablePaymentRecord[];
}

export interface Expense {
  id:string;
  category: 'Salary' | 'Rent' | 'Utilities' | 'Marketing' | 'Transport' | 'Other';
  description: string;
  amount: number;
  date: string; // ISO Date string
}

export interface ManualJournalEntry {
  id: string;
  date: string; // ISO Date string
  description: string;
  amount: number;
  type: 'Masuk' | 'Keluar'; // Cash In or Cash Out
  category: 'Modal Awal' | 'Prive' | 'Pendapatan Lain' | 'Pengeluaran Lain';
}