
import React, { useState, useEffect, useCallback } from 'react';
import { Page, Product, Customer, Supplier, Transaction, Receivable, Payable, Expense, PaymentRecord, Category, SavedOrder, ManualJournalEntry } from './types';
import { supabase } from './supabaseClient';
import { initialProducts, initialCustomers, initialSuppliers, initialCategories } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductManager from './components/ProductManager';
import DebtManager from './components/DebtManager';
import ReportManager from './components/ReportManager';
import ExpenseManager from './components/ExpenseManager';
import CrmManager from './components/CrmManager';
import CategoryManager from './components/CategoryManager';
import JournalManager from './components/JournalManager';
import Login from './components/Login';
import Modal from './components/common/Modal';
import Icon from './components/common/Icon';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const [isShortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State for all application data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [manualJournalEntries, setManualJournalEntries] = useState<ManualJournalEntry[]>([]);

  // Check authentication status on load
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
        setIsAuthenticated(true);
        fetchAllData();
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data: prodData } = await supabase.from('products').select('*');
        if (prodData && prodData.length > 0) setProducts(prodData);
        else setProducts(initialProducts); // Fallback to sample data if DB is empty

        const { data: custData } = await supabase.from('customers').select('*');
        if (custData && custData.length > 0) setCustomers(custData);
        else setCustomers(initialCustomers); // Fallback to sample data

        const { data: supData } = await supabase.from('suppliers').select('*');
        if (supData && supData.length > 0) setSuppliers(supData);
        else setSuppliers(initialSuppliers); // Fallback to sample data

        const { data: catData } = await supabase.from('categories').select('*');
        if (catData && catData.length > 0) setCategories(catData);
        else setCategories(initialCategories); // Fallback to sample data

        // Fetch transactions sorted by newest
        const { data: txnData } = await supabase.from('transactions').select('*').order('createdAt', { ascending: false });
        if (txnData) setTransactions(txnData);

        const { data: recData } = await supabase.from('receivables').select('*');
        if (recData) setReceivables(recData);

        const { data: payData } = await supabase.from('payables').select('*');
        if (payData) setPayables(payData);

        const { data: expData } = await supabase.from('expenses').select('*');
        if (expData) setExpenses(expData);
        
        const { data: savedData } = await supabase.from('saved_orders').select('*');
        if (savedData) setSavedOrders(savedData);

        const { data: jourData } = await supabase.from('manual_journal_entries').select('*');
        if (jourData) setManualJournalEntries(jourData);

    } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback on error as well to keep app usable
        setProducts(initialProducts);
        setCustomers(initialCustomers);
        setSuppliers(initialSuppliers);
        setCategories(initialCategories);
        alert("Gagal terhubung ke database. Aplikasi berjalan menggunakan data offline/sampel.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Global Shortcut Listener for Help
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        setShortcutModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const handleLogin = () => {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      fetchAllData();
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('isAuthenticated');
      setCurrentPage(Page.Dashboard);
  };

  const handleProcessSale = async (transaction: Transaction, receivableInfo?: { customerId: string; dueDate: string; downPayment: number }) => {
    try {
        setIsLoading(true);

        // 1. Insert Transaction
        // FIX: We exclude 'subtotal' and 'discount' from the payload sent to Supabase
        // because the database schema likely doesn't have these columns yet.
        // The 'total' field already contains the final discounted price, so financial reports remain correct.
        const dbPayload = {
            id: transaction.id,
            items: transaction.items,
            total: transaction.total,
            totalHPP: transaction.totalHPP,
            paymentMethod: transaction.paymentMethod,
            customerId: transaction.customerId,
            createdAt: transaction.createdAt
        };

        const { error: txnError } = await supabase.from('transactions').insert([dbPayload]);
        if (txnError) throw txnError;

        // 2. Update Stock (Client-side loop for now, ideally use RPC/Backend function)
        for (const item of transaction.items) {
             const product = products.find(p => p.id === item.id);
             if (product && product.trackStock) {
                 const newStock = product.stock - item.quantity;
                 await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
             }
        }

        // 3. Create Receivable if needed
        if (receivableInfo) {
             const newReceivable: Receivable = {
                id: `REC-${Date.now()}`,
                customerId: receivableInfo.customerId,
                transactionId: transaction.id,
                totalAmount: transaction.total,
                paidAmount: receivableInfo.downPayment,
                dueDate: receivableInfo.dueDate,
                createdAt: new Date().toISOString(),
                payments: [],
            };

            if (receivableInfo.downPayment > 0) {
                const downPaymentRecord: PaymentRecord = {
                    id: `PAYREC-${Date.now()}`,
                    receivableId: newReceivable.id,
                    amount: receivableInfo.downPayment,
                    paymentDate: new Date().toISOString(),
                };
                newReceivable.payments.push(downPaymentRecord);
            }
            
            const { error: recError } = await supabase.from('receivables').insert([newReceivable]);
            if (recError) throw recError;
        }

        // Refresh data
        await fetchAllData();

    } catch (error: any) {
        console.error("Transaction failed:", error);
        alert(`Gagal memproses transaksi: ${error.message || "Terjadi kesalahan database."}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveOrder = async (order: SavedOrder) => {
      const { error } = await supabase.from('saved_orders').insert([order]);
      if (!error) fetchAllData();
      else alert("Gagal menyimpan pesanan.");
  };

  // allow POS to add products on the fly during a transaction
  const handleAddProduct = async (product: Product) => {
      try {
          setIsLoading(true);
          const { error } = await supabase.from('products').insert([product]);
          if (error) throw error;
          await fetchAllData();
      } catch (err: any) {
          console.error("Failed to add product:", err);
          alert(`Gagal menambahkan produk: ${err.message || err}`);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteSavedOrder = async (orderId: string) => {
      const { error } = await supabase.from('saved_orders').delete().eq('id', orderId);
      if (!error) fetchAllData();
      else alert("Gagal menghapus pesanan.");
  };

  const handleVoidTransaction = async (transactionId: string, action: 'void' | 'edit') => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    setIsLoading(true);
    try {
        // 1. Restore Stock
        for (const item of transaction.items) {
            const product = products.find(p => p.id === item.id);
            if (product && product.trackStock) {
                const newStock = product.stock + item.quantity;
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
            }
        }

        // 2. Delete Receivable (if exists)
        if (transaction.paymentMethod === 'Pay Later') {
            await supabase.from('receivables').delete().eq('transactionId', transactionId);
        }

        // 3. If Edit, move to Saved Orders
        if (action === 'edit') {
            const savedOrder: SavedOrder = {
                id: `revisi-${Date.now()}`,
                name: `Revisi Transaksi #${transaction.id.slice(-4)}`,
                cart: transaction.items,
                createdAt: new Date().toISOString()
            };
            await supabase.from('saved_orders').insert([savedOrder]);
        }

        // 4. Delete Transaction
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) throw error;

        // Refresh & Redirect
        await fetchAllData();
        
        if (action === 'edit') {
            alert("Transaksi dibatalkan. Item telah dipindahkan ke menu Kasir -> Tombol 'Pesanan Tersimpan'.");
            setCurrentPage(Page.POS);
        } else {
            alert("Transaksi berhasil diretur. Stok produk telah dikembalikan.");
        }

    } catch (error) {
        console.error("Void failed:", error);
        alert("Gagal membatalkan transaksi.");
    } finally {
        setIsLoading(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.Dashboard:
        return <Dashboard transactions={transactions} receivables={receivables} payables={payables} expenses={expenses} products={products} />;
      case Page.POS:
        return <POS 
                  products={products} 
                  customers={customers} 
                  onProcessSale={handleProcessSale}
                  savedOrders={savedOrders}
                  onSaveOrder={handleSaveOrder}
                  onDeleteSavedOrder={handleDeleteSavedOrder}
                  onAddProduct={handleAddProduct}
                />;
      case Page.Products:
        return <ProductManager products={products} suppliers={suppliers} setPayables={setPayables} categories={categories} onRefresh={fetchAllData} />;
      case Page.Categories:
        return <CategoryManager categories={categories} onRefresh={fetchAllData} />;
      case Page.Debts:
        return <DebtManager 
                  receivables={receivables} 
                  payables={payables} 
                  customers={customers} 
                  suppliers={suppliers}
                  transactions={transactions}
                  onRefresh={fetchAllData}
                />;
      case Page.Reports:
        return <ReportManager 
                  transactions={transactions} 
                  expenses={expenses} 
                  products={products} 
                  customers={customers} 
                  // Added new props for Cash Flow calculation
                  receivables={receivables}
                  payables={payables}
                  manualEntries={manualJournalEntries}
                  onVoidTransaction={handleVoidTransaction}
                />;
      case Page.Expenses:
        return <ExpenseManager expenses={expenses} onRefresh={fetchAllData} />;
      case Page.Journal:
        return <JournalManager 
                  transactions={transactions}
                  expenses={expenses}
                  receivables={receivables}
                  payables={payables}
                  manualEntries={manualJournalEntries}
                  onRefresh={fetchAllData}
               />;
      case Page.Management:
        return <CrmManager customers={customers} suppliers={suppliers} onRefresh={fetchAllData} />;
      default:
        return <Dashboard transactions={transactions} receivables={receivables} payables={payables} expenses={expenses} products={products} />;
    }
  };

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {isLoading && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="font-semibold">Memuat Data Database...</span>
              </div>
          </div>
      )}
      
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        openShortcutModal={() => setShortcutModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between shrink-0 z-20 relative">
             <div className="flex items-center">
                 <button 
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-3"
                 >
                    <Icon name="menu" className="w-6 h-6" />
                 </button>
                 <h1 className="text-xl font-bold text-blue-700">LunasKas</h1>
             </div>
             <div className="text-xs text-gray-500">{currentPage}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
             {renderPage()}
        </div>
      </main>

      <Modal isOpen={isShortcutModalOpen} onClose={() => setShortcutModalOpen(false)} title="Keyboard Shortcuts (Jalan Pintas)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-blue-600 mb-2 border-b pb-1">Navigasi Menu</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Dashboard</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 1</kbd></li>
              <li className="flex justify-between"><span>Kasir (POS)</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 2</kbd></li>
              <li className="flex justify-between"><span>Produk & Stok</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 3</kbd></li>
              <li className="flex justify-between"><span>Kategori</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 4</kbd></li>
              <li className="flex justify-between"><span>Utang Piutang</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 5</kbd></li>
              <li className="flex justify-between"><span>Laporan</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 6</kbd></li>
              <li className="flex justify-between"><span>Catat Biaya</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 7</kbd></li>
              <li className="flex justify-between"><span>Jurnal Keuangan</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 8</kbd></li>
              <li className="flex justify-between"><span>Manajemen</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Alt + 9</kbd></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-green-600 mb-2 border-b pb-1">Halaman Kasir (POS)</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Cari Produk</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">F2</kbd></li>
              <li className="flex justify-between"><span>Bayar / Checkout</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">F4</kbd></li>
              <li className="flex justify-between"><span>Simpan Pesanan</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">F8</kbd></li>
              <li className="flex justify-between"><span>Buka Pesanan</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">F9</kbd></li>
            </ul>

            <h4 className="font-bold text-gray-600 mt-4 mb-2 border-b pb-1">Umum</h4>
            <ul className="space-y-2 text-sm">
               <li className="flex justify-between"><span>Buka Bantuan Ini</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">F1</kbd> atau <kbd className="bg-gray-200 px-2 py-0.5 rounded">?</kbd></li>
               <li className="flex justify-between"><span>Tutup Modal</span> <kbd className="bg-gray-200 px-2 py-0.5 rounded">Esc</kbd></li>
            </ul>
          </div>
        </div>
        <div className="mt-6 text-center">
            <button onClick={() => setShortcutModalOpen(false)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Saya Mengerti</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
