
import React, { useState, useMemo } from 'react';
import { Receivable, Payable, Customer, Supplier, PaymentRecord, PayablePaymentRecord, Transaction } from '../types';
import { supabase } from '../supabaseClient';
import Modal from './common/Modal';
import Icon from './common/Icon';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID');

interface DebtManagerProps {
    receivables: Receivable[];
    payables: Payable[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    onRefresh: () => void;
}

const StatCardSimple: React.FC<{ title: string; value: string; colorClass: string; iconName: React.ComponentProps<typeof Icon>['name'] }> = ({ title, value, colorClass, iconName }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between border-l-4 border-transparent" style={{ borderColor: colorClass.replace('text-', 'border-') }}>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-full bg-gray-100 ${colorClass}`}>
            <Icon name={iconName} className="w-6 h-6" />
        </div>
    </div>
);

const ReceivableHistoryModal: React.FC<{
    receivable: Receivable;
    transaction?: Transaction;
    customerName: string;
    onClose: () => void;
}> = ({ receivable, transaction, customerName, onClose }) => {
    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-4 text-center p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Tagihan</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(receivable.totalAmount)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Sudah Dibayar</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(receivable.paidAmount)}</p>
                </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Sisa Tagihan</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(receivable.totalAmount - receivable.paidAmount)}</p>
                </div>
            </div>

            {/* Barang Belanjaan (Transaction Items) */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                    <h4 className="font-bold text-blue-800 text-sm">Detail Belanja (Utang)</h4>
                    {transaction && <span className="text-xs text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">#{transaction.id.slice(-6)}</span>}
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {transaction ? (
                         <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-2 font-semibold">Nama Produk</th>
                                    <th className="text-center px-4 py-2 font-semibold">Qty</th>
                                    <th className="text-right px-4 py-2 font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transaction.items.map((item, idx) => (
                                    <tr key={`${item.id}-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{item.name}</td>
                                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Data transaksi tidak ditemukan (mungkin sudah dihapus).
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History */}
            <div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm">Riwayat Cicilan / Pembayaran</h4>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="text-left px-4 py-2">Tanggal</th>
                                <th className="text-right px-4 py-2">Jumlah Bayar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {receivable.payments.length > 0 ? (
                                receivable.payments.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(p => (
                                    <tr key={p.id} className="bg-white hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-600">{new Date(p.paymentDate).toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="text-center py-4 text-gray-500 text-sm italic">Belum ada pembayaran cicilan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors">
                    Tutup
                </button>
            </div>
        </div>
    );
};

const PayableHistoryModal: React.FC<{
    payable: Payable;
    supplierName: string;
    onClose: () => void;
}> = ({ payable, supplierName, onClose }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Riwayat Utang - {supplierName}</h3>
            <div className="grid grid-cols-3 gap-4 text-center p-3 bg-gray-50 rounded-lg">
                <div>
                    <p className="text-sm text-gray-500">Total Utang</p>
                    <p className="font-bold">{formatCurrency(payable.totalAmount)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Sudah Dibayar</p>
                    <p className="font-bold text-green-600">{formatCurrency(payable.paidAmount)}</p>
                </div>
                 <div>
                    <p className="text-sm text-gray-500">Sisa Utang</p>
                    <p className="font-bold text-red-600">{formatCurrency(payable.totalAmount - payable.paidAmount)}</p>
                </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-sm">
                <span className="font-semibold text-yellow-800">Keterangan:</span> {payable.description}
            </div>

            <div className="max-h-60 overflow-y-auto border-t pt-2">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left py-2">Tanggal Pembayaran</th>
                            <th className="text-right py-2">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payable.payments.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(p => (
                            <tr key={p.id} className="border-b">
                                <td className="py-2">{new Date(p.paymentDate).toLocaleString('id-ID')}</td>
                                <td className="text-right py-2">{formatCurrency(p.amount)}</td>
                            </tr>
                        ))}
                         {payable.payments.length === 0 && (
                            <tr>
                                <td colSpan={2} className="text-center py-4 text-gray-500">Belum ada pembayaran.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Tutup</button>
            </div>
        </div>
    );
};


const PaymentModal: React.FC<{
    title: string;
    totalAmount: number;
    paidAmount: number;
    onClose: () => void;
    onSave: (paymentAmount: number) => void;
}> = ({ title, totalAmount, paidAmount, onClose, onSave }) => {
    const remaining = totalAmount - paidAmount;
    const [payment, setPayment] = useState(remaining);

    const handleSave = () => {
        if (payment > 0 && payment <= remaining) {
            onSave(payment);
        } else {
            alert("Jumlah pembayaran tidak valid.");
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Total Tagihan:</span> <span>{formatCurrency(totalAmount)}</span></div>
                <div className="flex justify-between"><span>Sudah Dibayar:</span> <span>{formatCurrency(paidAmount)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t pt-1 mt-1"><span>Sisa Tagihan:</span> <span>{formatCurrency(remaining)}</span></div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran Sekarang</label>
                <input 
                    type="number" 
                    value={payment} 
                    onChange={e => setPayment(parseFloat(e.target.value))} 
                    max={remaining}
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">Batal</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Simpan Pembayaran</button>
            </div>
        </div>
    );
};

const DebtManager: React.FC<DebtManagerProps> = ({ receivables, payables, customers, suppliers, transactions, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Receivable | Payable | null>(null);
    const [historyModalReceivable, setHistoryModalReceivable] = useState<Receivable | null>(null);
    const [historyModalPayable, setHistoryModalPayable] = useState<Payable | null>(null);
    const [receivableSearchTerm, setReceivableSearchTerm] = useState('');
    const [receivableStartDate, setReceivableStartDate] = useState('');
    const [receivableEndDate, setReceivableEndDate] = useState('');

    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'N/A';
    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';

    const openPaymentModal = (debt: Receivable | Payable) => {
        setSelectedDebt(debt);
        setPaymentModalOpen(true);
    };

    const handleRecordPayment = async (paymentAmount: number) => {
        if (!selectedDebt) return;
        
        try {
            if ('customerId' in selectedDebt) { // It's a receivable
                const newPaymentRecord: PaymentRecord = {
                    id: `PAYREC-${Date.now()}`,
                    receivableId: selectedDebt.id,
                    amount: paymentAmount,
                    paymentDate: new Date().toISOString(),
                };
                
                const newPaidAmount = selectedDebt.paidAmount + paymentAmount;
                const newPayments = [...selectedDebt.payments, newPaymentRecord];

                const { error } = await supabase
                    .from('receivables')
                    .update({ paidAmount: newPaidAmount, payments: newPayments })
                    .eq('id', selectedDebt.id);
                
                if (error) throw error;
                
            } else { // It's a payable
                const newPaymentRecord: PayablePaymentRecord = {
                    id: `PAYPAY-${Date.now()}`,
                    payableId: selectedDebt.id,
                    amount: paymentAmount,
                    paymentDate: new Date().toISOString(),
                };

                const newPaidAmount = selectedDebt.paidAmount + paymentAmount;
                const newPayments = [...selectedDebt.payments, newPaymentRecord];

                const { error } = await supabase
                    .from('payables')
                    .update({ paidAmount: newPaidAmount, payments: newPayments })
                    .eq('id', selectedDebt.id);

                if (error) throw error;
            }

            onRefresh();
            setPaymentModalOpen(false);
            setSelectedDebt(null);

        } catch (error) {
            console.error("Payment error:", error);
            alert("Gagal mencatat pembayaran.");
        }
    };

    const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
    const toDateKey = (dateStr: string) => {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const getReceivableTransactionDateKey = (receivable: Receivable) => {
        const linkedTransaction = transactions.find(t => t.id === receivable.transactionId);
        return toDateKey(linkedTransaction?.createdAt || receivable.createdAt);
    };

    // --- Calculations for Summary Cards ---
    const totalUnpaidReceivables = receivables.reduce((sum, r) => sum + (r.totalAmount - r.paidAmount), 0);
    const totalUnpaidPayables = payables.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);

    const filteredReceivables = useMemo(() => {
        return receivables
            .filter(r => r.totalAmount > r.paidAmount)
            .filter(r => 
                getCustomerName(r.customerId)
                .toLowerCase()
                .includes(receivableSearchTerm.toLowerCase())
            )
            .filter(r => {
                const transactionDateKey = getReceivableTransactionDateKey(r);
                if (!transactionDateKey) return false;
                if (receivableStartDate && transactionDateKey < receivableStartDate) return false;
                if (receivableEndDate && transactionDateKey > receivableEndDate) return false;
                return true;
            });
    }, [receivables, receivableSearchTerm, receivableStartDate, receivableEndDate, customers, transactions]);

    // --- Calculate Total Displayed based on Filter ---
    const displayedReceivableTotal = filteredReceivables.reduce((sum, r) => sum + (r.totalAmount - r.paidAmount), 0);

    const getTransactionForReceivable = (receivable: Receivable | null) => {
        if (!receivable) return undefined;
        return transactions.find(t => t.id === receivable.transactionId);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Manajemen Utang Piutang</h1>

            {/* Summary Cards - Added as requested */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCardSimple 
                    title="Total Piutang Pelanggan (Aset)" 
                    value={formatCurrency(totalUnpaidReceivables)} 
                    colorClass="text-green-600"
                    iconName="arrow-down"
                />
                <StatCardSimple 
                    title="Total Utang Toko (Kewajiban)" 
                    value={formatCurrency(totalUnpaidPayables)} 
                    colorClass="text-red-600"
                    iconName="arrow-up"
                />
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('receivables')} className={`${activeTab === 'receivables' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Piutang (Pelanggan)
                    </button>
                    <button onClick={() => setActiveTab('payables')} className={`${activeTab === 'payables' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Utang (ke Supplier)
                    </button>
                </nav>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
                {activeTab === 'receivables' && (
                    <>
                    <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="w-full md:w-2/3 space-y-3">
                            <div className="relative">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Cari nama pelanggan..."
                                    value={receivableSearchTerm}
                                    onChange={(e) => setReceivableSearchTerm(e.target.value)}
                                    className="pl-10 p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Transaksi Dari</label>
                                    <input
                                        type="date"
                                        value={receivableStartDate}
                                        onChange={(e) => setReceivableStartDate(e.target.value)}
                                        className="p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Transaksi Sampai</label>
                                    <input
                                        type="date"
                                        value={receivableEndDate}
                                        onChange={(e) => setReceivableEndDate(e.target.value)}
                                        className="p-2 border rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Dynamic "Total Tertampil" for quick check */}
                        {(receivableSearchTerm || receivableStartDate || receivableEndDate) && (
                             <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                <span className="text-sm text-blue-800 font-medium">Total Hasil Pencarian: </span>
                                <span className="text-lg font-bold text-blue-700">{formatCurrency(displayedReceivableTotal)}</span>
                             </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Pelanggan</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Sisa</th>
                                    <th className="px-6 py-3">Jatuh Tempo</th>
                                    <th className="px-6 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivables.map(r => (
                                    <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{getCustomerName(r.customerId)}</td>
                                        <td className="px-6 py-4">{formatCurrency(r.totalAmount)}</td>
                                        <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(r.totalAmount - r.paidAmount)}</td>
                                        <td className={`px-6 py-4 ${isOverdue(r.dueDate) ? 'text-red-500 font-semibold' : ''}`}>{formatDate(r.dueDate)}</td>
                                        <td className="px-6 py-4 flex space-x-2">
                                            <button onClick={() => openPaymentModal(r)} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">Bayar</button>
                                            <button onClick={() => setHistoryModalReceivable(r)} className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100">Riwayat</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredReceivables.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-500">
                                            {receivables.filter(r => r.totalAmount > r.paidAmount).length > 0 ? 'Pelanggan tidak ditemukan.' : 'Hore! Tidak ada piutang yang belum lunas.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
                {activeTab === 'payables' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Sisa</th>
                                    <th className="px-6 py-3">Jatuh Tempo</th>
                                    <th className="px-6 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payables.filter(p => p.totalAmount > p.paidAmount).map(p => (
                                    <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{getSupplierName(p.supplierId)}</td>
                                        <td className="px-6 py-4">{formatCurrency(p.totalAmount)}</td>
                                        <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(p.totalAmount - p.paidAmount)}</td>
                                        <td className={`px-6 py-4 ${isOverdue(p.dueDate) ? 'text-red-500 font-semibold' : ''}`}>{formatDate(p.dueDate)}</td>
                                        <td className="px-6 py-4 flex space-x-2">
                                            <button onClick={() => openPaymentModal(p)} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">Bayar</button>
                                            <button onClick={() => setHistoryModalPayable(p)} className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100">Riwayat</button>
                                        </td>
                                    </tr>
                                ))}
                                {payables.filter(p => p.totalAmount > p.paidAmount).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-500">
                                            Tidak ada utang ke supplier.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {selectedDebt && <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Catat Pembayaran">
                <PaymentModal 
                    title={`Pembayaran untuk ${'customerId' in selectedDebt ? getCustomerName(selectedDebt.customerId) : getSupplierName(selectedDebt.supplierId)}`}
                    totalAmount={selectedDebt.totalAmount}
                    paidAmount={selectedDebt.paidAmount}
                    onClose={() => setPaymentModalOpen(false)}
                    onSave={handleRecordPayment}
                />
            </Modal>}

            {historyModalReceivable && (
                <Modal isOpen={!!historyModalReceivable} onClose={() => setHistoryModalReceivable(null)} title={`Riwayat Piutang: ${getCustomerName(historyModalReceivable.customerId)}`} size="lg">
                    <ReceivableHistoryModal 
                        receivable={historyModalReceivable}
                        transaction={getTransactionForReceivable(historyModalReceivable)}
                        customerName={getCustomerName(historyModalReceivable.customerId)}
                        onClose={() => setHistoryModalReceivable(null)}
                    />
                </Modal>
            )}

            {historyModalPayable && (
                <Modal isOpen={!!historyModalPayable} onClose={() => setHistoryModalPayable(null)} title="Riwayat Pembayaran Utang">
                    <PayableHistoryModal 
                        payable={historyModalPayable}
                        supplierName={getSupplierName(historyModalPayable.supplierId)}
                        onClose={() => setHistoryModalPayable(null)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default DebtManager;
