
import React, { useState, useRef, useMemo } from 'react';
import { Product, Supplier, Payable, Category } from '../types';
import { supabase } from '../supabaseClient';
import Modal from './common/Modal';
import Icon from './common/Icon';

interface ProductManagerProps {
  products: Product[];
  suppliers: Supplier[];
  setPayables: React.Dispatch<React.SetStateAction<Payable[]>>; // Still used for optimistic update in stock in? No, should rely on fetch.
  categories: Category[];
  onRefresh: () => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const ProductForm: React.FC<{
  product: Product | null;
  onSave: (product: Product) => void;
  onClose: () => void;
  categories: Category[];
  isSubmitting: boolean;
}> = ({ product, onSave, onClose, categories, isSubmitting }) => {
  // Helper to generate random SKU
  const generateAutoSKU = () => `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

  const [formData, setFormData] = useState<Product>(
    product || { 
        id: '', 
        name: '', 
        sku: generateAutoSKU(), // Automatically set SKU for new products
        category: '', 
        price: 0, 
        hpp: 0, 
        stock: 0, 
        imageUrl: `https://picsum.photos/id/${Math.floor(Math.random()*200 + 100)}/200/200`, 
        isDivisible: false, 
        trackStock: true 
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'price' || name === 'hpp' || name === 'stock' ? parseFloat(value) : value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: formData.id || `prod-${Date.now()}` });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU (Otomatis)</label>
          <div className="flex gap-2">
            <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
            <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sku: generateAutoSKU() }))}
                className="mt-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-md border border-gray-300 hover:bg-gray-200 text-xs font-bold"
                title="Acak SKU Baru"
            >
                AUTO
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Kategori</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
            required
           >
            <option value="">Pilih Kategori</option>
            {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Harga Jual (Rp)</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Harga Beli / HPP (Rp)</label>
          <input type="number" name="hpp" value={formData.hpp} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
        </div>
      </div>
       
      <div className="flex items-center space-x-4">
        <input type="checkbox" id="trackStock" name="trackStock" checked={!!formData.trackStock} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        <label htmlFor="trackStock" className="block text-sm text-gray-900">Lacak Stok Produk ini</label>
      </div>

       {formData.trackStock && (
        <div>
            <label className="block text-sm font-medium text-gray-700">Stok Awal</label>
            <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
        </div>
       )}

      <div className="flex items-center">
        <input type="checkbox" id="isDivisible" name="isDivisible" checked={!!formData.isDivisible} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        <label htmlFor="isDivisible" className="ml-2 block text-sm text-gray-900">Produk ini bisa dijual eceran/pecahan (cth: per kg, per liter)</label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  );
};

const StockInForm: React.FC<{
    product: Product;
    suppliers: Supplier[];
    onStockIn: (productId: string, quantity: number, totalCost: number, payment: 'Lunas' | 'Utang', supplierId?: string, dueDate?: string) => void;
    onClose: () => void;
}> = ({ product, suppliers, onStockIn, onClose }) => {
    const [quantity, setQuantity] = useState(1);
    const [payment, setPayment] = useState<'Lunas' | 'Utang'>('Lunas');
    const [supplierId, setSupplierId] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (payment === 'Utang' && !supplierId) {
            alert('Pilih supplier untuk transaksi utang.');
            return;
        }
        onStockIn(product.id, quantity, product.hpp * quantity, payment, supplierId, dueDate);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p>Stok Saat Ini: <span className="font-bold">{product.stock}</span></p>
            <div>
                <label className="block text-sm font-medium text-gray-700">Jumlah Masuk</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <p>Total Biaya: <span className="font-bold">{formatCurrency(quantity * product.hpp)}</span></p>
            <div>
                <label className="block text-sm font-medium text-gray-700">Pembayaran</label>
                <select value={payment} onChange={e => setPayment(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border rounded-md">
                    <option value="Lunas">Lunas</option>
                    <option value="Utang">Utang ke Supplier</option>
                </select>
            </div>
            {payment === 'Utang' && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required>
                            <option value="">Pilih Supplier</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Jatuh Tempo</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Simpan</button>
            </div>
        </form>
    );
};


const ProductManager: React.FC<ProductManagerProps> = ({ products, suppliers, setPayables, categories, onRefresh }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isStockInModalOpen, setStockInModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // New State for Delete Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleSaveProduct = async (product: Product) => {
    setIsSubmitting(true);
    try {
        // Upsert to Supabase
        const { error } = await supabase.from('products').upsert(product);
        if (error) throw error;
        
        onRefresh();
        setModalOpen(false);
        setSelectedProduct(null);
    } catch (error) {
        console.error("Error saving product:", error);
        alert("Gagal menyimpan produk.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleOpenDeleteModal = (product: Product) => {
      setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
      if (!productToDelete) return;
      
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (error) {
          console.error("Delete error:", error);
          alert("Gagal menghapus produk. Mungkin produk ini sudah terhubung dengan transaksi lain.");
      } else {
          onRefresh();
          setProductToDelete(null);
      }
  };

  const handleOpenStockIn = (product: Product) => {
    setSelectedProduct(product);
    setStockInModalOpen(true);
  };

  const handleStockIn = async (productId: string, quantity: number, totalCost: number, payment: 'Lunas' | 'Utang', supplierId?: string, dueDate?: string) => {
    try {
        // 1. Update Stock
        const product = products.find(p => p.id === productId);
        if (product) {
            const newStock = product.stock + quantity;
            await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        }

        // 2. Create Payable if needed
        if (payment === 'Utang' && supplierId) {
            const newPayable: Payable = {
                id: `PAY-${Date.now()}`,
                supplierId,
                description: `Pembelian stok: ${product?.name || 'produk'}`,
                totalAmount: totalCost,
                paidAmount: 0,
                dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
                payments: [],
            };
            await supabase.from('payables').insert([newPayable]);
        }
        
        onRefresh();
        setStockInModalOpen(false);
        setSelectedProduct(null);
    } catch (error) {
        console.error("Error stock in:", error);
        alert("Gagal update stok.");
    }
  };

  const handleClearAll = async () => {
      const { error } = await supabase.from('products').delete().neq('id', '0'); // Delete all
      if (error) alert("Gagal menghapus data.");
      else {
          onRefresh();
          setClearConfirmOpen(false);
      }
  };

  // Helper: Robust CSV Line Parser (Handles quotes and commas correctly)
  const parseCSVLine = (text: string) => {
    const result: string[] = [];
    let curr = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuote && text[i + 1] === '"') {
                curr += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(curr);
            curr = '';
        } else {
            curr += char;
        }
    }
    result.push(curr);
    return result;
  };

  // CSV Functions
  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'sku', 'category', 'price', 'hpp', 'stock', 'isDivisible', 'trackStock'];
    const row1 = ['Kopi Hitam', 'KOPI-001', 'Minuman', '15000', '5000', '100', 'FALSE', 'TRUE'];
    const row2 = ['Mentimun (per kg)', 'VEG-001', 'Sayuran', '10000', '8000', '50', 'TRUE', 'TRUE'];
    const row3 = ['Jasa Bungkus', 'SRV-001', 'Lainnya', '2000', '0', '0', 'FALSE', 'FALSE'];

    const csvContent = [headers.join(','), row1.join(','), row2.join(','), row3.join(',')].join('\n');
    downloadCSV(csvContent, 'template_produk_lunaskas.csv');
  };

  const handleExportProducts = () => {
    const headers = ['id', 'name', 'sku', 'category', 'price', 'hpp', 'stock', 'imageUrl', 'isDivisible', 'trackStock'];
    const rows = products.map(p => {
        const escape = (field: any) => {
            const str = String(field !== undefined ? field : '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        return [
            escape(p.id),
            escape(p.name),
            escape(p.sku),
            escape(p.category),
            p.price,
            p.hpp,
            p.stock,
            escape(p.imageUrl),
            p.isDivisible ? 'TRUE' : 'FALSE',
            p.trackStock ? 'TRUE' : 'FALSE'
        ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `produk_lunaskas_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) {
            alert("File CSV kosong atau format salah.");
            return;
        }

        const headers = parseCSVLine(lines[0]).map(h => h.trim());
        const newProducts: Product[] = [];
        let successCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 5) continue; 

            const getVal = (headerName: string) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? values[index]?.trim() : '';
            };

            const name = getVal('name');
            if (!name) continue;

            const product: Product = {
                id: getVal('id') || `prod-imp-${Date.now()}-${i}`,
                name: name,
                sku: getVal('sku') || '',
                category: getVal('category') || 'Uncategorized',
                price: parseFloat(getVal('price')) || 0,
                hpp: parseFloat(getVal('hpp')) || 0,
                stock: parseFloat(getVal('stock')) || 0,
                imageUrl: getVal('imageUrl') || `https://picsum.photos/id/${Math.floor(Math.random()*200 + 100)}/200/200`,
                isDivisible: getVal('isDivisible').toUpperCase() === 'TRUE',
                trackStock: getVal('trackStock').toUpperCase() !== 'FALSE', 
            };
            newProducts.push(product);
            successCount++;
        }

        if (successCount > 0) {
            const { error } = await supabase.from('products').insert(newProducts);
            if (error) alert("Gagal import batch.");
            else {
                alert(`Berhasil mengimpor ${successCount} produk.`);
                onRefresh();
            }
        } else {
            alert("Gagal mengimpor produk. Pastikan format sesuai template.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Manajemen Produk & Stok</h1>
        <div className="flex flex-wrap items-center gap-2">
             <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border text-sm" title="Unduh contoh format CSV">
                    <Icon name="file-text" className="w-4 h-4" /> Template
                </button>
                <button onClick={handleExportProducts} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border text-sm">
                    <Icon name="download" className="w-4 h-4" /> Export
                </button>
                <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Icon name="upload" className="w-4 h-4" /> Import
                </button>
            </div>
            <div className="h-8 w-px bg-gray-300 mx-1 hidden md:block"></div>
            <button
                onClick={() => setClearConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm"
                disabled={products.length === 0}
            >
                <Icon name="trash" className="w-4 h-4" /> Kosongkan
            </button>
            <button onClick={() => { setSelectedProduct(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Icon name="plus" className="w-4 h-4" /> Tambah
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="mb-4">
            <div className="relative w-full md:w-1/3">
                 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                 <input
                    type="text"
                    placeholder="Cari Produk (Nama atau SKU)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Produk</th>
                <th scope="col" className="px-6 py-3">SKU</th>
                <th scope="col" className="px-6 py-3">Kategori</th>
                <th scope="col" className="px-6 py-3">Harga Jual</th>
                <th scope="col" className="px-6 py-3">HPP</th>
                <th scope="col" className="px-6 py-3">Stok</th>
                <th scope="col" className="px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{p.name}</th>
                  <td className="px-6 py-4">{p.sku}</td>
                  <td className="px-6 py-4">{p.category}</td>
                  <td className="px-6 py-4">{formatCurrency(p.price)}</td>
                  <td className="px-6 py-4">{formatCurrency(p.hpp)}</td>
                  <td className="px-6 py-4 font-bold text-center">{p.trackStock ? p.stock : '∞'}</td>
                  <td className="px-6 py-4 flex items-center space-x-2">
                    {p.trackStock && (
                      <button onClick={() => handleOpenStockIn(p)} className="p-1 text-green-600 hover:text-green-800" title="Stok Masuk">
                          <Icon name="plus" className="w-5 h-5"/>
                      </button>
                    )}
                    <button onClick={() => handleEdit(p)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit">
                        <Icon name="edit" className="w-5 h-5"/>
                    </button>
                    <button onClick={() => handleOpenDeleteModal(p)} className="p-1 text-red-600 hover:text-red-800" title="Hapus">
                        <Icon name="trash" className="w-5 h-5"/>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                          {products.length === 0 
                            ? "Belum ada produk. Silakan tambah manual atau Import CSV." 
                            : "Produk tidak ditemukan."}
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={selectedProduct ? 'Edit Produk' : 'Tambah Produk Baru'}>
        <ProductForm product={selectedProduct} onSave={handleSaveProduct} onClose={() => setModalOpen(false)} categories={categories} isSubmitting={isSubmitting} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Konfirmasi Hapus" size="sm">
          <div className="space-y-4">
              <p>Apakah Anda yakin ingin menghapus produk <strong>"{productToDelete?.name}"</strong>?</p>
              <div className="flex justify-end space-x-2 pt-4">
                  <button onClick={() => setProductToDelete(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                  <button onClick={confirmDeleteProduct} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Ya, Hapus</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isClearConfirmOpen} onClose={() => setClearConfirmOpen(false)} title="Konfirmasi Kosongkan Data">
        <div className="space-y-4">
            <p>Apakah Anda yakin ingin menghapus semua data produk? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setClearConfirmOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                <button type="button" onClick={handleClearAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Ya, Kosongkan</button>
            </div>
        </div>
      </Modal>

      {selectedProduct && <Modal isOpen={isStockInModalOpen} onClose={() => setStockInModalOpen(false)} title="Stok Masuk">
        <StockInForm product={selectedProduct} suppliers={suppliers} onStockIn={handleStockIn} onClose={() => setStockInModalOpen(false)} />
      </Modal>}
    </div>
  );
};

export default ProductManager;
