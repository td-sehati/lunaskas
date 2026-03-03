
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, Customer, PaymentMethod, Transaction, SavedOrder } from '../types';
import Icon from './common/Icon';
import Modal from './common/Modal';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const PriceEntryModal: React.FC<{
    item: CartItem;
    onClose: () => void;
    onSetPrice: (itemId: string, targetPrice: number) => void;
}> = ({ item, onClose, onSetPrice }) => {
    const [priceString, setPriceString] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Get only the digits from the input to store a clean numeric string
        const numericString = e.target.value.replace(/[^0-9]/g, '');
        setPriceString(numericString);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetPrice = parseInt(priceString, 10);
        
        if (!isNaN(targetPrice) && targetPrice > 0) {
            onSetPrice(item.id, targetPrice);
        } else {
            alert("Harap masukkan jumlah harga yang valid.");
        }
    };
    
    // Format the numeric string for display purposes (e.g., "6200" becomes "6.200")
    const displayValue = priceString === '' ? '' : new Intl.NumberFormat('id-ID').format(Number(priceString));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">Jual <span className="text-blue-600">{item.name}</span> Seharga</h3>
            <div>
                <label htmlFor="price-entry" className="block text-sm font-medium text-gray-700">Masukkan Jumlah Uang Pembeli (Rp)</label>
                <input
                    id="price-entry"
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="e.g. 6200"
                    autoFocus
                    required
                />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 w-full md:w-auto">Batal</button>
                <button type="submit" className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto">Terapkan</button>
            </div>
        </form>
    );
};

interface POSProps {
  products: Product[];
  customers: Customer[];
  onProcessSale: (transaction: Transaction, receivableInfo?: { customerId: string; dueDate: string; downPayment: number }) => void;
  savedOrders: SavedOrder[];
  onSaveOrder: (order: SavedOrder) => void;
  onDeleteSavedOrder: (orderId: string) => void;
  onAddProduct: (product: Product) => Promise<void>;
}

const POS: React.FC<POSProps> = ({ products, customers, onProcessSale, savedOrders, onSaveOrder, onDeleteSavedOrder, onAddProduct }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [priceEntryModal, setPriceEntryModal] = useState<{item: CartItem | null}>({ item: null });
  const [isSaveOrderModalOpen, setSaveOrderModalOpen] = useState(false);
  const [isLoadOrderModalOpen, setLoadOrderModalOpen] = useState(false);
  const [saveOrderName, setSaveOrderName] = useState('');
  
  // States for inline product creation
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductTrackStock, setNewProductTrackStock] = useState(false);

  // Mobile View State
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  
  // Pagination / Display Limit State
  const INITIAL_LIMIT = 7;
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);

  // Discount State
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  // Pre-selection Quantity State
  const [inputQty, setInputQty] = useState<number>(1);
  
  // Refs for shortcuts and navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Navigation State
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isMobileViewport = () => window.matchMedia('(max-width: 1023px)').matches;


  // State for checkout modal
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');

  const filteredProducts = useMemo(() =>
    products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
      (!p.trackStock || p.stock > 0)
    ),
    [products, searchTerm]
  );

  const displayedProducts = useMemo(() => {
      return filteredProducts.slice(0, visibleLimit);
  }, [filteredProducts, visibleLimit]);

  const filteredCustomers = useMemo(() => 
    customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.phone.includes(customerSearchTerm)),
    [customers, customerSearchTerm]
  );

  // Reset selection and limit when search changes
  useEffect(() => {
    setSelectedIndex(0);
    // If user is searching, maybe they want to see the specific result, so we keep limit low initially to keep it clean, 
    // or we could expand it. Let's keep it consistent: limit applies.
    setVisibleLimit(INITIAL_LIMIT);
  }, [searchTerm]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
        itemRefs.current[selectedIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
  }, [selectedIndex]);

  // Auto-focus customer input when checkout opens
  useEffect(() => {
      if (isCheckoutOpen) {
          setTimeout(() => {
              customerInputRef.current?.focus();
          }, 100);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
      }
  }, [isCheckoutOpen]);

  const addToCart = (product: Product) => {
    const quantityToAdd = inputQty > 0 ? inputQty : 1;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        const newTotalQty = existingItem.quantity + quantityToAdd;
        if (!product.trackStock || newTotalQty <= product.stock) {
           return prevCart.map(item => item.id === product.id ? { ...item, quantity: newTotalQty } : item);
        } else {
             alert(`Stok tidak cukup. Maksimal stok tersedia: ${product.stock}`);
             return prevCart;
        }
      }
      
      if (product.trackStock && quantityToAdd > product.stock) {
          alert(`Stok tidak cukup. Maksimal stok tersedia: ${product.stock}`);
          return prevCart;
      }

      return [...prevCart, { ...product, quantity: quantityToAdd }];
    });
    
    // Reset input Qty back to 1 after adding
    setInputQty(1);
    
    // On Mobile, give feedback or stay on catalog. 
    // Usually better to stay on catalog to add more items.
  };

  // open product modal with optional name prefill
  const openNewProductModal = (prefillName = '') => {
      setNewProductName(prefillName);
      setNewProductPrice('');
      setNewProductSku('');
      setNewProductTrackStock(false);
      setNewProductModalOpen(true);
  };

  const handleConfirmAddProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProductName.trim()) {
          alert('Nama produk tidak boleh kosong.');
          return;
      }
      const price = parseFloat(newProductPrice);
      if (isNaN(price) || price <= 0) {
          alert('Harga produk harus lebih dari 0.');
          return;
      }

      const newProd: Product = {
          id: `prod-${Date.now()}`,
          name: newProductName.trim(),
          sku: newProductSku.trim(),
          category: '',
          price,
          hpp: price,
          stock: newProductTrackStock ? 0 : 0,
          trackStock: newProductTrackStock,
      };

      if (onAddProduct) {
          await onAddProduct(newProd);
      } else {
          console.warn('onAddProduct callback not provided');
      }
      addToCart(newProd);
      setNewProductModalOpen(false);
      setSearchTerm('');
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else if (!product.trackStock || newQuantity <= product.stock) {
      setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    } else {
      // If desired quantity exceeds stock, set it to max available stock
      setCart(cart.map(item => item.id === productId ? { ...item, quantity: product.stock } : item));
      alert(`Stok tidak cukup. Kuantitas maksimal untuk ${product.name} adalah ${product.stock}.`);
    }
  };

  const handleSetPrice = (itemId: string, targetPrice: number) => {
    const product = products.find(p => p.id === itemId);
    if (!product || !product.isDivisible) return;
    
    const newQuantity = targetPrice / product.price;
    updateQuantity(itemId, newQuantity);
    setPriceEntryModal({ item: null });
  };
  
  // Calculations
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const cartTotalHPP = useMemo(() => cart.reduce((sum, item) => sum + item.hpp * item.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Discount Calculation
  const discountAmount = useMemo(() => {
      if (discountMode === 'percent') {
          const percent = Math.min(Math.max(discountValue, 0), 100); // Clamp 0-100
          return subtotal * (percent / 100);
      } else {
          return Math.min(Math.max(discountValue, 0), subtotal); // Clamp 0-subtotal
      }
  }, [discountMode, discountValue, subtotal]);

  const finalTotal = subtotal - discountAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutOpen(true);
  };
  
  const handleSelectCustomer = (customer: Customer) => {
      setSelectedCustomerId(customer.id);
      setCustomerSearchTerm(customer.name);
      setShowCustomerDropdown(false);
  };

  const handleCustomerInputData = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomerSearchTerm(e.target.value);
      setSelectedCustomerId(''); // Reset ID if typing manually (unless re-selected)
      setShowCustomerDropdown(true);
  };

  const handleInitiateSaveOrder = () => {
    if (cart.length === 0) return;
    setSaveOrderName(`Pesanan ${savedOrders.length + 1}`);
    setSaveOrderModalOpen(true);
  };

  const handleConfirmSaveOrder = () => {
    if (!saveOrderName.trim()) {
        alert("Nama pesanan tidak boleh kosong.");
        return;
    }
    const newSavedOrder: SavedOrder = {
        id: `order-${Date.now()}`,
        name: saveOrderName,
        cart: cart,
        createdAt: new Date().toISOString(),
    };
    onSaveOrder(newSavedOrder);
    setCart([]);
    setDiscountValue(0); // Reset discount
    setSaveOrderModalOpen(false);
    setSaveOrderName('');
    setMobileTab('catalog'); // Return to catalog on mobile
  };

  const handleLoadOrder = (orderId: string) => {
    if (cart.length > 0) {
        if (!window.confirm("Keranjang saat ini tidak kosong. Apakah Anda yakin ingin menggantinya dengan pesanan yang disimpan?")) {
            return;
        }
    }
    const orderToLoad = savedOrders.find(o => o.id === orderId);
    if (orderToLoad) {
        setCart(orderToLoad.cart);
        setDiscountValue(0); // Saved orders currently don't store discount info, reset it
        onDeleteSavedOrder(orderId);
        setLoadOrderModalOpen(false);
        if (isMobileViewport()) {
            setMobileTab('cart'); // Switch to cart view on mobile to see loaded items
        }
    }
  };

  const handleDeleteOrder = (orderId: string) => {
     if (window.confirm("Apakah Anda yakin ingin menghapus pesanan yang disimpan ini?")) {
        onDeleteSavedOrder(orderId);
     }
  };

  const handleFinalizeSale = () => {
    // 1. Validate Customer for Pay Later
    if (paymentMethod === 'Pay Later' && !selectedCustomerId) {
      alert('Pilih pelanggan untuk transaksi Piutang.');
      return;
    }

    // 2. Validate Cash Amount
    let finalCashReceived = parseFloat(cashReceived) || 0;
    
    // If Cash method and input is empty/0, assume exact amount (Uang Pas)
    if (paymentMethod === 'Cash') {
        if (finalCashReceived === 0) {
            finalCashReceived = finalTotal;
        } else if (finalCashReceived < finalTotal) {
            alert('Uang tunai yang diterima kurang dari total tagihan.');
            return;
        }
    }

    // 3. Validate Down Payment for Pay Later
    const dpAmount = parseFloat(downPayment) || 0;
    if (paymentMethod === 'Pay Later' && dpAmount > finalTotal) {
        alert('Uang Muka tidak boleh melebihi total tagihan.');
        return;
    }

    const transaction: Transaction = {
      id: `TXN-${Date.now()}`,
      items: cart,
      subtotal: subtotal,
      discount: discountAmount,
      total: finalTotal,
      totalHPP: cartTotalHPP,
      paymentMethod,
      // Save customer ID if selected, regardless of payment method
      customerId: selectedCustomerId || undefined, 
      createdAt: new Date().toISOString(),
    };

    const receivableInfo = paymentMethod === 'Pay Later'
      ? { customerId: selectedCustomerId, dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), downPayment: dpAmount }
      : undefined;

    onProcessSale(transaction, receivableInfo);
    
    // Reset State
    setCart([]);
    setDiscountValue(0);
    setCheckoutOpen(false);
    setPaymentMethod('Cash');
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setDueDate('');
    setDownPayment('');
    setCashReceived('');
    setMobileTab('catalog');
  };

  // --- Keyboard Navigation Logic ---

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Move focus to the results container
        if (filteredProducts.length > 0) {
            resultsContainerRef.current?.focus();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredProducts.length > 0) {
            // Add the top result if exists
            const productToAdd = filteredProducts[selectedIndex >= 0 ? selectedIndex : 0];
            addToCart(productToAdd);
            setSearchTerm(''); // Clear search to be ready for next scan/type
            searchInputRef.current?.focus();
        } else if (searchTerm.trim() !== '') {
            // no product found, prompt to create one
            openNewProductModal(searchTerm);
        }
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (filteredProducts.length === 0) return;

    let nextIndex = selectedIndex;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            nextIndex = Math.min(selectedIndex + 1, filteredProducts.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            nextIndex = Math.max(selectedIndex - 1, 0);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
                addToCart(filteredProducts[selectedIndex]);
                setSearchTerm('');
                searchInputRef.current?.focus();
            }
            return;
        case 'Escape':
            e.preventDefault();
            searchInputRef.current?.focus();
            return;
        default:
            return;
    }

    setSelectedIndex(nextIndex);
  };

  // Global Keyboard Shortcuts (F keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isCheckoutOpen || isSaveOrderModalOpen || isLoadOrderModalOpen || priceEntryModal.item) return;

        if (e.key === 'F2') {
            e.preventDefault();
            searchInputRef.current?.focus();
        } else if (e.key === 'F4') {
            e.preventDefault();
            handleCheckout();
        } else if (e.key === 'F8') {
            e.preventDefault();
            handleInitiateSaveOrder();
        } else if (e.key === 'F9') {
            e.preventDefault();
            setLoadOrderModalOpen(true);
            if (isMobileViewport()) {
                setMobileTab('cart');
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen, isSaveOrderModalOpen, isLoadOrderModalOpen, priceEntryModal]);


  const cashReceivedAmount = parseFloat(cashReceived) || 0;
  const changeDue = cashReceivedAmount >= finalTotal ? cashReceivedAmount - finalTotal : 0;

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-4rem)] gap-4 lg:gap-6 relative">
      
      {/* --- Product Selection Section --- */}
      {/* Mobile: Hidden if active tab is cart. Desktop: Always visible */}
      <div className={`
        flex-1 bg-white rounded-lg shadow-md flex flex-col h-full lg:h-auto overflow-hidden
        ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Sticky Header for Search */}
        <div className="sticky top-0 bg-white z-10 p-4 border-b shadow-sm">
            <div className="flex items-end gap-2">
                <div className="relative flex-grow">
                    <label className="text-xs text-gray-500 font-semibold ml-1 block mb-1">Cari Produk (F2)</label>
                    <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            ref={searchInputRef}
                            type="text"
                            placeholder="Nama atau SKU..."
                            className="pl-10 p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            autoComplete="off"
                        />
                    </div>
                </div>
                
                <div className="w-20">
                    <label className="text-xs text-gray-500 font-semibold ml-1 block mb-1">Qty</label>
                    <input 
                        type="number" 
                        min="1"
                        value={inputQty}
                        onChange={(e) => setInputQty(parseFloat(e.target.value) || 1)}
                        className="p-3 border rounded-lg w-full text-center focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold shadow-sm"
                    />
                </div>
            </div>
            
             <div className="flex justify-between items-center mt-2">
                 <p className="text-xs text-gray-400 hidden sm:block">Tekan Enter untuk memilih produk teratas</p>
                 <button onClick={() => { setLoadOrderModalOpen(true); if (isMobileViewport()) { setMobileTab('cart'); } }} className="relative px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 ml-auto flex items-center gap-1" title="Shortcut: F9">
                    <Icon name="book" className="w-3 h-3" />
                    Pesanan Tersimpan
                    {savedOrders.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{savedOrders.length}</span>}
                 </button>
             </div>
        </div>

        {/* Scrollable Product List */}
        <div 
            className="flex-1 overflow-y-auto pr-2 outline-none pb-24 lg:pb-3" 
            ref={resultsContainerRef}
            tabIndex={0}
            onKeyDown={handleListKeyDown}
        >
            <div className="space-y-2 p-3">
              {displayedProducts.map((p, index) => (
                <div 
                    key={p.id} 
                    ref={(el) => { itemRefs.current[index] = el; }}
                    onClick={() => { addToCart(p); setSearchTerm(''); searchInputRef.current?.focus(); }} 
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-150 active:scale-[0.98] touch-manipulation
                        ${index === selectedIndex ? 'ring-2 ring-blue-400 border-blue-500 bg-blue-50 shadow-md' : 'hover:bg-gray-50 shadow-sm'}
                    `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 border overflow-hidden flex-shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">{p.sku}</span>
                        {p.trackStock && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${p.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Stok: {p.stock}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <p className="font-bold text-blue-700">{formatCurrency(p.price)}</p>
                      {cart.find(c => c.id === p.id) && (
                          <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full mt-1">
                              {cart.find(c => c.id === p.id)?.quantity} di keranjang
                          </span>
                      )}
                  </div>
                </div>
              ))}
              
              {/* Load More Button if there are more products */}
              {filteredProducts.length > visibleLimit && (
                  <button 
                    onClick={() => setVisibleLimit(prev => prev + 10)}
                    className="w-full py-3 mt-4 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-200"
                  >
                      Tampilkan Semua Produk ({filteredProducts.length - visibleLimit} lagi)
                  </button>
              )}
            </div>
          
          {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Icon name="search" className="w-10 h-10 mb-2 opacity-20" />
                  <p>Tidak ada produk ditemukan.</p>
                  {searchTerm.trim() !== '' && (
                    <button
                      onClick={() => openNewProductModal(searchTerm)}
                      className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      Tambah produk "{searchTerm}" 
                    </button>
                  )}
              </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Summary (Only visible if cart has items) */}
        {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">{totalItems} Item</p>
                        <p className="font-bold text-lg text-blue-800">{formatCurrency(subtotal)}</p>
                    </div>
                    <button 
                        onClick={() => setMobileTab('cart')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 animate-pulse"
                    >
                        Lihat Keranjang
                        <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* --- Cart & Checkout Section --- */}
      {/* Mobile: Fullscreen if active tab is cart. Desktop: Always visible as sidebar */}
      <div className={`
        lg:w-2/5 bg-white rounded-lg shadow-md flex flex-col h-full min-h-0 overflow-hidden relative
        ${mobileTab === 'cart' ? 'fixed inset-0 z-50 w-full lg:static lg:inset-auto lg:z-auto lg:w-2/5' : 'hidden lg:flex'}
      `}>
        {/* overlay panel for saved orders (desktop) */}
        {isLoadOrderModalOpen && (
            <div className="absolute inset-0 bg-white z-20 flex flex-col">
                {/* Header for saved orders panel */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 lg:bg-white">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileTab('catalog')} className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full">
                            <Icon name="chevron-left" className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-800">Pesanan Tersimpan</h2>
                    </div>
                    <button onClick={() => setLoadOrderModalOpen(false)} className="text-red-500 text-sm font-medium hover:underline">
                        Tutup
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {savedOrders.length === 0 ? (
                        <p className="text-gray-500 text-center py-5">Tidak ada pesanan yang disimpan.</p>
                    ) : (
                        savedOrders.map(order => {
                            const total = order.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
                            return (
                                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <p className="font-semibold">{order.name}</p>
                                        <p className="text-sm text-gray-500">{order.cart.length} item - Total: {formatCurrency(total)}</p>
                                    </div>
                                    <div className="space-x-2">
                                        <button onClick={() => handleLoadOrder(order.id)} className="px-3 py-1 text-sm bg-blue-50 text-white rounded hover:bg-blue-600">Buka</button>
                                        <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-500 hover:bg-gray-100 rounded-full">
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}

        <div className={`h-full min-h-0 flex flex-col ${isLoadOrderModalOpen ? 'opacity-50 pointer-events-none' : ''}`}>
          {!isLoadOrderModalOpen && (
            <>
              {/* Cart Header */}
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 lg:bg-white">
                <div className="flex items-center gap-2">
                   {/* Mobile Back Button */}
                   <button onClick={() => setMobileTab('catalog')} className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full">
                       <Icon name="chevron-left" className="w-6 h-6" />
                   </button>
                   <h2 className="text-xl font-bold text-gray-800">Keranjang</h2>
                </div>
                <button onClick={() => {if(confirm("Kosongkan keranjang?")) setCart([])}} className="text-red-500 text-sm font-medium hover:underline" disabled={cart.length === 0}>
                   Hapus Semua
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                      <div className="p-6 bg-gray-50 rounded-full">
                          <Icon name="pos" className="w-12 h-12 opacity-30" />
                      </div>
                      <p>Keranjang masih kosong</p>
                      <button onClick={() => setMobileTab('catalog')} className="lg:hidden text-blue-600 font-medium">
                          + Tambah Produk
                      </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex flex-col border-b last:border-0 pb-3 mb-3">
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-base">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                   @{formatCurrency(item.price)}
                                   {item.isDivisible && <span className="ml-1 text-blue-500">(Bisa Ecer)</span>}
                              </p>
                          </div>
                          <p className="font-bold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                               <button 
                                  onClick={() => updateQuantity(item.id, item.quantity - (item.isDivisible ? 0.1 : 1))} 
                                  className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:bg-gray-50 active:bg-gray-200"
                              >
                                  -
                               </button>
                               <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                  className="w-14 text-center bg-transparent font-bold focus:outline-none"
                                  step={item.isDivisible ? "0.001" : "1"}
                                  min="0"
                               />
                               <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + (item.isDivisible ? 0.1 : 1))} 
                                  className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-blue-600 hover:bg-gray-50 active:bg-gray-200"
                               >
                                  +
                               </button>
                           </div>

                           <div className="flex gap-2">
                               {item.isDivisible && (
                                  <button onClick={() => setPriceEntryModal({ item })} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                                    Set Harga
                                  </button>
                               )}
                               <button onClick={() => updateQuantity(item.id, 0)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded">
                                  <Icon name="trash" className="w-5 h-5" />
                               </button>
                           </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              <div className="border-t p-4 bg-gray-50 space-y-3">
                 {/* Discount Input */}
                 <div className="flex items-center justify-between bg-white p-2 border rounded-lg shadow-sm">
                     <span className="text-sm font-medium text-gray-600">Diskon</span>
                     <div className="flex items-center gap-2">
                         <input 
                              type="number" 
                              min="0"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                              className="w-20 p-1 text-right border rounded text-sm focus:ring-blue-500 outline-none"
                              placeholder="0"
                         />
                         <div className="flex rounded-md shadow-sm" role="group">
                              <button 
                                  type="button" 
                                  onClick={() => setDiscountMode('percent')}
                                  className={`px-2 py-1 text-xs font-medium rounded-l-lg border ${discountMode === 'percent' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                              >
                                  %
                              </button>
                              <button 
                                  type="button" 
                                  onClick={() => setDiscountMode('amount')}
                                  className={`px-2 py-1 text-xs font-medium rounded-r-lg border ${discountMode === 'amount' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                              >
                                  Rp
                              </button>
                         </div>
                     </div>
                 </div>

                 {/* Totals */}
                 <div className="space-y-1 pt-2">
                    {discountAmount > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-gray-500">
                              <span>Subtotal</span>
                              <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-red-500">
                              <span>Diskon</span>
                              <span>- {formatCurrency(discountAmount)}</span>
                          </div>
                        </>
                    )}
                    <div className="flex justify-between font-bold text-2xl text-blue-800 items-end">
                      <span>Total</span>
                      <span>{formatCurrency(finalTotal)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                    <button 
                      onClick={handleInitiateSaveOrder} 
                      disabled={cart.length === 0} 
                      className="col-span-1 bg-yellow-500 text-white p-3 rounded-xl font-bold hover:bg-yellow-600 disabled:bg-gray-300 flex items-center justify-center" 
                      title="Simpan (F8)"
                    >
                      <span className="text-xs md:text-sm">Simpan (F8)</span>
                    </button>
                    <button 
                      onClick={handleCheckout} 
                      disabled={cart.length === 0} 
                      className="col-span-2 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 text-lg shadow-lg" 
                      title="Bayar (F4)"
                    >
                      Bayar (F4)
                    </button>
                </div>
              </div>
            </>
          )}
      <Modal isOpen={isCheckoutOpen} onClose={() => setCheckoutOpen(false)} title="Pembayaran">
        <div className="space-y-4">
          <div className="text-right border-b pb-4 bg-gray-50 -mx-4 px-4 pt-2 mb-4">
            <p className="text-gray-500 text-sm">Total Tagihan</p>
            <div className="flex flex-col items-end">
                 {discountAmount > 0 && <span className="text-sm text-gray-400 line-through decoration-red-400">{formatCurrency(subtotal)}</span>}
                 <p className="text-4xl font-bold text-blue-800">{formatCurrency(finalTotal)}</p>
            </div>
          </div>

          {/* Customer Selection - Searchable Combobox */}
          <div className="relative">
              <label className="font-semibold text-sm text-gray-700 block mb-1">Pelanggan {paymentMethod !== 'Pay Later' && <span className="font-normal text-gray-500">(Opsional)</span>}</label>
              <input
                  ref={customerInputRef}
                  type="text"
                  className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  placeholder={paymentMethod === 'Pay Later' ? 'Cari Pelanggan (Wajib)' : 'Cari Pelanggan / Umum'}
                  value={customerSearchTerm}
                  onChange={handleCustomerInputData}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={e => {
                      if (e.key === 'Enter') {
                          e.preventDefault(); // Prevent form submission
                          if (showCustomerDropdown && filteredCustomers.length > 0) {
                              handleSelectCustomer(filteredCustomers[0]);
                          } else {
                              setShowCustomerDropdown(false);
                          }
                      }
                  }}
              />
              {showCustomerDropdown && customerSearchTerm && filteredCustomers.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-xl mt-1 max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                          <li 
                            key={c.id} 
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-none"
                            onClick={() => handleSelectCustomer(c)}
                          >
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-gray-500">{c.phone}</div>
                          </li>
                      ))}
                  </ul>
              )}
          </div>

          <div>
            <label className="font-semibold text-sm text-gray-700 block mb-1">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
                {['Cash', 'QRIS', 'Card', 'Transfer', 'Pay Later'].map(m => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m as PaymentMethod)}
                        className={`p-2 rounded-lg text-sm font-medium border ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>
          </div>

          {paymentMethod === 'Cash' && (
            <div className="space-y-3 pt-2">
                <div>
                    <label className="font-semibold text-sm text-gray-700 block mb-1">Uang Tunai Diterima</label>
                    <input
                        type="number"
                        className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        placeholder={`Pas: ${formatCurrency(finalTotal)}`}
                        min="0"
                        onKeyDown={e => e.key === 'Enter' && handleFinalizeSale()}
                    />
                    
                    {/* Quick Cash Buttons */}
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                         <button onClick={() => setCashReceived(finalTotal.toString())} className="whitespace-nowrap px-3 py-1 bg-gray-100 rounded-full text-xs font-medium border hover:bg-gray-200">Uang Pas</button>
                         <button onClick={() => setCashReceived((Math.ceil(finalTotal / 5000) * 5000).toString())} className="whitespace-nowrap px-3 py-1 bg-gray-100 rounded-full text-xs font-medium border hover:bg-gray-200">Next 5k</button>
                         <button onClick={() => setCashReceived((Math.ceil(finalTotal / 10000) * 10000).toString())} className="whitespace-nowrap px-3 py-1 bg-gray-100 rounded-full text-xs font-medium border hover:bg-gray-200">Next 10k</button>
                         <button onClick={() => setCashReceived((Math.ceil(finalTotal / 50000) * 50000).toString())} className="whitespace-nowrap px-3 py-1 bg-gray-100 rounded-full text-xs font-medium border hover:bg-gray-200">Next 50k</button>
                    </div>
                </div>
                {cashReceivedAmount >= finalTotal && (
                    <div className="text-right p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-gray-500 text-sm">Kembalian</p>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(changeDue)}</p>
                    </div>
                )}
            </div>
          )}

          {paymentMethod === 'Pay Later' && (
            <div className="p-4 bg-yellow-50 rounded-lg space-y-3 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 text-sm">Detail Piutang</h4>
               <div>
                <label className="font-semibold text-xs text-gray-600">Uang Muka (DP)</label>
                <input
                    type="number"
                    className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-yellow-500 outline-none"
                    value={downPayment}
                    onChange={e => setDownPayment(e.target.value)}
                    placeholder="0"
                    min="0"
                    max={finalTotal}
                />
              </div>
               <div>
                <label className="font-semibold text-xs text-gray-600">Jatuh Tempo</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-yellow-500 outline-none"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-6 mt-auto">
            <button onClick={() => setCheckoutOpen(false)} className="flex-1 px-4 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 font-medium text-gray-700">Batal</button>
            <button onClick={handleFinalizeSale} className="flex-[2] px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-md text-lg">
              Selesaikan
            </button>
          </div>
        </div>
      </Modal>

      {priceEntryModal.item && (
          <Modal isOpen={!!priceEntryModal.item} onClose={() => setPriceEntryModal({item: null})} title="Jual Berdasarkan Harga">
              <PriceEntryModal 
                item={priceEntryModal.item}
                onClose={() => setPriceEntryModal({item: null})}
                onSetPrice={handleSetPrice}
              />
          </Modal>
      )}

      {/* --- Modal untuk menambahkan produk baru langsung dari POS --- */}
      <Modal isOpen={newProductModalOpen} onClose={() => setNewProductModalOpen(false)} title="Tambah Produk Baru">
          <form onSubmit={handleConfirmAddProduct} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
                  <input
                      type="text"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border rounded-md"
                      required
                      autoFocus
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Harga Jual</label>
                  <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProductPrice}
                      onChange={e => setNewProductPrice(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border rounded-md"
                      required
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">SKU (opsional)</label>
                  <input
                      type="text"
                      value={newProductSku}
                      onChange={e => setNewProductSku(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border rounded-md"
                  />
              </div>
              <div className="flex items-center space-x-2">
                  <input
                      id="trackStock"
                      type="checkbox"
                      checked={newProductTrackStock}
                      onChange={e => setNewProductTrackStock(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="trackStock" className="text-sm text-gray-700">Lacak stok produk</label>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                  <button type="button" onClick={() => setNewProductModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Tambah</button>
              </div>
          </form>
      </Modal>

        <Modal isOpen={isSaveOrderModalOpen} onClose={() => setSaveOrderModalOpen(false)} title="Simpan Pesanan">
            <div className="space-y-4">
                <label htmlFor="orderName" className="block text-sm font-medium text-gray-700">Beri nama untuk pesanan ini:</label>
                <input
                    id="orderName"
                    type="text"
                    value={saveOrderName}
                    onChange={(e) => setSaveOrderName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Ibu Baju Merah"
                    autoFocus
                />
                <div className="flex justify-end space-x-2 pt-2">
                    <button onClick={() => setSaveOrderModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                    <button onClick={handleConfirmSaveOrder} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
                </div>
            </div>
        </Modal>

        <div className="lg:hidden">
          <Modal isOpen={isLoadOrderModalOpen} onClose={() => setLoadOrderModalOpen(false)} title="Buka Pesanan Tersimpan" size="lg">
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {savedOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-5">Tidak ada pesanan yang disimpan.</p>
                ) : (
                    savedOrders.map(order => {
                        const total = order.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
                        return (
                            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div>
                                    <p className="font-semibold">{order.name}</p>
                                    <p className="text-sm text-gray-500">{order.cart.length} item - Total: {formatCurrency(total)}</p>
                                </div>
                                <div className="space-x-2">
                                    <button onClick={() => handleLoadOrder(order.id)} className="px-3 py-1 text-sm bg-blue-50 text-white rounded hover:bg-blue-600">Buka</button>
                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-500 hover:bg-gray-100 rounded-full">
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
          </Modal>
        </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
