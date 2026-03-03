
import React from 'react';
import { Transaction, Receivable, Payable, Expense, Product } from '../types';
import Icon from './common/Icon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  receivables: Receivable[];
  payables: Payable[];
  expenses: Expense[];
  products: Product[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const StatCard: React.FC<{ title: string; value: string; iconName: React.ComponentProps<typeof Icon>['name']; color: string; subtitle?: string }> = ({ title, value, iconName, color, subtitle }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon name={iconName} className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ transactions, receivables, payables, expenses, products }) => {
    // Helper to get Local Date String (YYYY-MM-DD) correctly based on Browser Timezone
    const getLocalDate = (dateInput: string | Date) => {
        const d = new Date(dateInput);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        return localDate.toISOString().slice(0, 10);
    };

    const todayLocal = getLocalDate(new Date());
    
    // Filter transactions for TODAY only (Local Time)
    const todayTransactions = transactions.filter(t => getLocalDate(t.createdAt) === todayLocal);

    const totalRevenueToday = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalHppToday = todayTransactions.reduce((sum, t) => sum + t.totalHPP, 0);
    const grossProfitToday = totalRevenueToday - totalHppToday;

    // --- PERUBAHAN: Filter Piutang & Utang HANYA HARI INI ---
    const receivablesToday = receivables.filter(r => getLocalDate(r.createdAt) === todayLocal);
    const payablesToday = payables.filter(p => getLocalDate(p.createdAt) === todayLocal);

    // Hitung sisa yang belum dibayar dari transaksi HARI INI
    const totalReceivablesToday = receivablesToday.reduce((sum, r) => sum + (r.totalAmount - r.paidAmount), 0);
    const totalPayablesToday = payablesToday.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);
    
    // Calculate actual cash inflow for today (Local Time)
    const cashSalesToday = todayTransactions
        .filter(t => t.paymentMethod !== 'Pay Later')
        .reduce((sum, t) => sum + t.total, 0);
    
    const debtPaymentsToday = receivables
        .flatMap(r => r.payments)
        .filter(p => getLocalDate(p.paymentDate) === todayLocal)
        .reduce((sum, p) => sum + p.amount, 0);

    const totalCashInflowToday = cashSalesToday + debtPaymentsToday;

    const lowStockProducts = products.filter(p => p.trackStock && p.stock <= 10);

    // Data for sales chart (last 7 days)
    const salesData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStringLocal = getLocalDate(d);
        
        const dailySales = transactions
            .filter(t => getLocalDate(t.createdAt) === dateStringLocal)
            .reduce((sum, t) => sum + t.total, 0);
            
        return { name: d.toLocaleDateString('id-ID', { weekday: 'short' }), Omzet: dailySales };
    }).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
            title="Omzet Hari Ini" 
            value={formatCurrency(totalRevenueToday)} 
            iconName="dollar" 
            color="bg-green-500" 
            subtitle="Reset setiap hari 00:00"
        />
        <StatCard 
            title="Kas Masuk Hari Ini" 
            value={formatCurrency(totalCashInflowToday)} 
            iconName="check" 
            color="bg-indigo-500"
            subtitle="Tunai + Cicilan diterima hari ini"
        />
        <StatCard 
            title="Laba Kotor Hari Ini" 
            value={formatCurrency(grossProfitToday)} 
            iconName="trending-up" 
            color="bg-blue-500" 
        />
        <StatCard 
            title="Piutang Baru (Hari Ini)" 
            value={formatCurrency(totalReceivablesToday)} 
            iconName="arrow-down" 
            color="bg-yellow-500"
            subtitle="Utang pelanggan yang dibuat hari ini"
        />
        <StatCard 
            title="Utang Baru (Hari Ini)" 
            value={formatCurrency(totalPayablesToday)} 
            iconName="arrow-up" 
            color="bg-red-500" 
            subtitle="Utang toko ke supplier hari ini"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Omzet 7 Hari Terakhir</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value as number)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="Omzet" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Notifikasi Stok Menipis</h2>
            {lowStockProducts.length > 0 ? (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {lowStockProducts.map(p => (
                        <li key={p.id} className="flex justify-between items-center p-2 rounded bg-red-50 text-red-700">
                            <span>{p.name}</span>
                            <span className="font-bold">{p.stock}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-center py-10">Semua stok aman.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
