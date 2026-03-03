import React, { useMemo, useState } from 'react';
import { Transaction, Expense, Product, Customer, Receivable, Payable, ManualJournalEntry } from '../types';
import Modal from './common/Modal';
import Icon from './common/Icon';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

interface ReportManagerProps {
  transactions: Transaction[];
  expenses: Expense[];
  products: Product[];
  customers: Customer[];
  receivables: Receivable[];
  payables: Payable[];
  manualEntries: ManualJournalEntry[];
  onVoidTransaction: (transactionId: string, action: 'void' | 'edit') => void;
}

const ReportCard: React.FC<{ title: string; value: string; colorClass: string }> = ({ title, value, colorClass }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const ReportManager: React.FC<ReportManagerProps> = ({ transactions, expenses, products, customers, receivables, payables, manualEntries, onVoidTransaction }) => {
    const HISTORY_ROWS_PER_PAGE = 10;
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);
    const [productFilter, setProductFilter] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [historyPage, setHistoryPage] = useState(1);

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const getCustomerName = (customerId?: string) => {
        if (!customerId) return 'Walk-in Customer';
        return customers.find(c => c.id === customerId)?.name || 'Pelanggan Dihapus';
    };

    // --- Profit & Loss Calculation (Laba Rugi) ---
    const reportData = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate >= start && tDate <= end;
        });

        const filteredExpenses = expenses.filter(e => {
            const eDate = new Date(e.date);
            return eDate >= start && eDate <= end;
        });

        const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        const totalHPP = filteredTransactions.reduce((sum, t) => sum + t.totalHPP, 0);
        const grossProfit = totalRevenue - totalHPP;
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;

        return { totalRevenue, totalHPP, grossProfit, totalExpenses, netProfit };
    }, [startDate, endDate, transactions, expenses]);

    // --- Cash Flow Calculation (Arus Kas) ---
    const cashFlowData = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Helper to check if a date is before the selected period
        const isBefore = (dateStr: string) => new Date(dateStr) < start;
        // Helper to check if a date is within the selected period
        const isDuring = (dateStr: string) => {
            const d = new Date(dateStr);
            return d >= start && d <= end;
        };

        let balanceBefore = 0;
        let cashIn = 0;
        let cashOut = 0;

        // 1. Transactions (Only Cash Sales count immediately)
        // Note: Pay Later transactions don't count as cash here, only their down payments (via receivables)
        transactions.forEach(t => {
            if (t.paymentMethod !== 'Pay Later') {
                if (isBefore(t.createdAt)) balanceBefore += t.total;
                else if (isDuring(t.createdAt)) cashIn += t.total;
            }
        });

        // 2. Receivable Payments (Including Down Payments & Installments)
        receivables.forEach(r => {
            r.payments.forEach(p => {
                if (isBefore(p.paymentDate)) balanceBefore += p.amount;
                else if (isDuring(p.paymentDate)) cashIn += p.amount;
            });
        });

        // 3. Payable Payments (Supplier Payments)
        payables.forEach(p => {
            p.payments.forEach(pay => {
                if (isBefore(pay.paymentDate)) balanceBefore -= pay.amount;
                else if (isDuring(pay.paymentDate)) cashOut += pay.amount;
            });
        });

        // 4. Expenses
        expenses.forEach(e => {
            if (isBefore(e.date)) balanceBefore -= e.amount;
            else if (isDuring(e.date)) cashOut += e.amount;
        });

        // 5. Manual Journal Entries (Capital Injection, Owner Withdrawal, etc)
        manualEntries.forEach(m => {
            if (isBefore(m.date)) {
                if (m.type === 'Masuk') balanceBefore += m.amount;
                else balanceBefore -= m.amount;
            } else if (isDuring(m.date)) {
                if (m.type === 'Masuk') cashIn += m.amount;
                else cashOut += m.amount;
            }
        });

        return {
            beginningBalance: balanceBefore,
            cashIn,
            cashOut,
            endingBalance: balanceBefore + cashIn - cashOut
        };

    }, [startDate, endDate, transactions, receivables, payables, expenses, manualEntries]);
    
    const filteredHistory = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return transactions.filter(t => {
            const tDate = new Date(t.createdAt);
            const dateMatch = tDate >= start && tDate <= end;
            const customerMatch = !customerFilter || t.customerId === customerFilter;
            const productMatch = !productFilter || t.items.some(item => item.id === productFilter);
            return dateMatch && customerMatch && productMatch;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort newest first
    }, [startDate, endDate, customerFilter, productFilter, transactions]);

    const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_ROWS_PER_PAGE));
    const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
    const paginatedHistory = useMemo(() => {
        const startIndex = (safeHistoryPage - 1) * HISTORY_ROWS_PER_PAGE;
        return filteredHistory.slice(startIndex, startIndex + HISTORY_ROWS_PER_PAGE);
    }, [filteredHistory, safeHistoryPage]);

    const handleAction = (action: 'void' | 'edit') => {
        if (!selectedTransaction) return;

        const message = action === 'void' 
            ? "Apakah Anda yakin ingin MERETUR (Membatalkan) transaksi ini? \n\nStok produk akan dikembalikan, dan transaksi akan dihapus dari laporan."
            : "Apakah Anda yakin ingin MENGEDIT transaksi ini? \n\nTransaksi saat ini akan dibatalkan, dan item akan dipindahkan kembali ke keranjang Kasir (Pesanan Tersimpan) untuk Anda ubah.";

        if (window.confirm(message)) {
             onVoidTransaction(selectedTransaction.id, action);
             setSelectedTransaction(null);
        }
    }

    // Calculate implied discount based on items total vs saved total
    const calculateImpliedDiscount = (t: Transaction) => {
        const realTotal = t.total;
        const itemsTotal = t.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return itemsTotal - realTotal;
    };

    const selectedTxnDiscount = selectedTransaction ? calculateImpliedDiscount(selectedTransaction) : 0;
    const selectedTxnSubtotal = selectedTransaction ? selectedTransaction.total + selectedTxnDiscount : 0;

    return (
        <div className="space-y-8 pb-10">
            <h1 className="text-3xl font-bold">Laporan</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4 flex-wrap">
                <div>
                    <label className="text-sm font-medium text-gray-700">Dari Tanggal</label>
                    <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setHistoryPage(1); }} className="mt-1 block w-full sm:w-auto p-2 border rounded-md" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Sampai Tanggal</label>
                    <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setHistoryPage(1); }} className="mt-1 block w-full sm:w-auto p-2 border rounded-md" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Filter Produk</label>
                    <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setHistoryPage(1); }} className="mt-1 block w-full sm:w-auto p-2 border rounded-md">
                        <option value="">Semua Produk</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Filter Pelanggan</label>
                    <select value={customerFilter} onChange={e => { setCustomerFilter(e.target.value); setHistoryPage(1); }} className="mt-1 block w-full sm:w-auto p-2 border rounded-md">
                        <option value="">Semua Pelanggan</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Section: Laba Rugi */}
            <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <span className="bg-blue-600 w-1 h-6 rounded-full"></span>
                    Laporan Laba / Rugi (Profit & Loss)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ReportCard title="Total Penjualan (Omzet)" value={formatCurrency(reportData.totalRevenue)} colorClass="text-blue-600" />
                    <ReportCard title="Laba Kotor (Omzet - HPP)" value={formatCurrency(reportData.grossProfit)} colorClass="text-green-600" />
                    <ReportCard title="Laba Bersih (Dikurangi Biaya)" value={formatCurrency(reportData.netProfit)} colorClass={reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'} />
                </div>
            </section>

            {/* Section: Arus Kas */}
            <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <span className="bg-green-600 w-1 h-6 rounded-full"></span>
                    Laporan Arus Kas (Cash Flow)
                </h2>
                
                {/* Info Box explaining the difference */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 flex items-start gap-3">
                    <Icon name="book" className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Mengapa Laba Rugi & Saldo Kas Berbeda?</p>
                        <ul className="list-disc list-inside space-y-1 opacity-90">
                            <li><strong>Laba Rugi</strong> hanya menghitung Pendapatan Jualan dikurangi Biaya. Modal Awal tidak dianggap "Pendapatan".</li>
                            <li><strong>Saldo Kas</strong> menghitung semua uang fisik yang Anda pegang, termasuk Modal Awal, Pinjaman, dan Bayar Utang.</li>
                            <li>Jika Laba Anda minus (Rugi) tapi Saldo Kas positif, itu artinya Anda hidup dari Modal Awal.</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        <div className="p-6 text-center md:text-left">
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Saldo Awal</p>
                            <p className="text-gray-400 text-xs mb-1">(Sebelum {new Date(startDate).toLocaleDateString('id-ID')})</p>
                            <p className="text-2xl font-bold text-gray-700">{formatCurrency(cashFlowData.beginningBalance)}</p>
                        </div>
                         <div className="p-6 text-center md:text-left bg-green-50">
                            <p className="text-green-800 text-sm font-medium uppercase tracking-wider">Arus Kas Masuk</p>
                            <p className="text-green-600 text-xs mb-1">(Jualan Tunai + Modal + Piutang Dibayar)</p>
                            <p className="text-2xl font-bold text-green-700">+ {formatCurrency(cashFlowData.cashIn)}</p>
                        </div>
                        <div className="p-6 text-center md:text-left bg-red-50">
                            <p className="text-red-800 text-sm font-medium uppercase tracking-wider">Arus Kas Keluar</p>
                            <p className="text-red-600 text-xs mb-1">(Biaya + Belanja Stok + Bayar Utang)</p>
                            <p className="text-2xl font-bold text-red-700">- {formatCurrency(cashFlowData.cashOut)}</p>
                        </div>
                        <div className="p-6 text-center md:text-left bg-gray-50">
                            <p className="text-gray-800 text-sm font-medium uppercase tracking-wider">Saldo Akhir</p>
                            <p className="text-gray-500 text-xs mb-1">(Uang di Tangan Saat Ini)</p>
                            <p className={`text-3xl font-bold ${cashFlowData.endingBalance >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                {formatCurrency(cashFlowData.endingBalance)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Section: Riwayat Transaksi */}
            <section className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-xl font-semibold mb-4">Riwayat Transaksi Penjualan</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">ID Transaksi</th>
                                <th className="px-6 py-3">Tanggal</th>
                                <th className="px-6 py-3">Pelanggan</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map(t => (
                                <tr key={t.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                                    <td className="px-6 py-4">{new Date(t.createdAt).toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4">{getCustomerName(t.customerId)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(t.total)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setSelectedTransaction(t)} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 font-medium">
                                            Detail / Retur
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-6 text-gray-500">Tidak ada transaksi pada periode ini.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
                 {filteredHistory.length > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-gray-600">
                            Halaman {safeHistoryPage} dari {totalHistoryPages} - {filteredHistory.length} transaksi
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                                disabled={safeHistoryPage === 1}
                                className="px-3 py-1.5 rounded-md border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Sebelumnya
                            </button>
                            <button
                                onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                                disabled={safeHistoryPage === totalHistoryPages}
                                className="px-3 py-1.5 rounded-md border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                 )}
            </section>

            {selectedTransaction && (
                <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="Detail Transaksi" size="lg">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
                           <div>
                                <p className="text-gray-500">ID Transaksi</p>
                                <p className="font-mono text-xs font-bold">{selectedTransaction.id}</p>
                           </div>
                            <div>
                                <p className="text-gray-500">Tanggal</p>
                                <p className="font-semibold">{new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Pelanggan</p>
                                <p className="font-semibold">{getCustomerName(selectedTransaction.customerId)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Metode Pembayaran</p>
                                <p className="font-semibold">{selectedTransaction.paymentMethod}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Rincian Item</h4>
                            <div className="max-h-40 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Produk</th>
                                            <th className="text-center py-2">Qty</th>
                                            <th className="text-right py-2">Harga Satuan</th>
                                            <th className="text-right py-2">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransaction.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="py-2">{item.name}</td>
                                                <td className="text-center py-2">{item.quantity}</td>
                                                <td className="text-right py-2">{formatCurrency(item.price)}</td>
                                                <td className="text-right py-2">{formatCurrency(item.price * item.quantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="space-y-1 border-t mt-2 pt-2">
                                {selectedTxnDiscount > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(selectedTxnSubtotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span>Diskon</span>
                                            <span>- {formatCurrency(selectedTxnDiscount)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between font-bold text-lg text-blue-800">
                                    <span>Total Bayar</span>
                                    <span>{formatCurrency(selectedTransaction.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                                <p className="text-sm text-yellow-800 font-semibold mb-2">Opsi Koreksi:</p>
                                <div className="flex gap-3">
                                    <button onClick={() => handleAction('edit')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-yellow-400 text-yellow-700 rounded shadow-sm hover:bg-yellow-100 text-sm font-medium transition-colors">
                                        <Icon name="edit" className="w-4 h-4" />
                                        Edit Kembali
                                    </button>
                                    <button onClick={() => handleAction('void')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded shadow-sm hover:bg-red-700 text-sm font-medium transition-colors">
                                        <Icon name="trash" className="w-4 h-4" />
                                        Retur / Batalkan
                                    </button>
                                </div>
                                <p className="text-xs text-yellow-700 mt-2">
                                    * <strong>Edit Kembali</strong>: Membatalkan transaksi ini dan memindahkan item ke Kasir untuk diedit ulang. <br/>
                                    * <strong>Retur</strong>: Menghapus transaksi dan mengembalikan stok.
                                </p>
                            </div>
                        </div>

                         <div className="flex justify-end">
                            <button onClick={() => setSelectedTransaction(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Tutup</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReportManager;
