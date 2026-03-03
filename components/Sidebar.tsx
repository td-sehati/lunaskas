
import React, { useEffect, useState } from 'react';
import { Page } from '../types';
import Icon from './common/Icon';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  openShortcutModal?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

const NavItem: React.FC<{
  page: Page;
  iconName: React.ComponentProps<typeof Icon>['name'];
  label: string;
  shortcutKey: number;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isCollapsed: boolean;
  onClick?: () => void;
}> = ({ page, iconName, label, shortcutKey, currentPage, setCurrentPage, isCollapsed, onClick }) => {
  const isActive = currentPage === page;
  
  const handleClick = () => {
      setCurrentPage(page);
      if (onClick) onClick();
  }

  return (
    <li>
      <button
        onClick={handleClick}
        title={isCollapsed ? label : undefined}
        className={`flex items-center p-2 text-base font-normal rounded-lg w-full text-left transition-colors duration-200 ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-200'
        } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className="flex items-center">
            <Icon name={iconName} className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500'} flex-shrink-0`} />
            {!isCollapsed && <span className="ml-3 whitespace-nowrap transition-opacity duration-300">{label}</span>}
        </div>
        {/* Shortcut Hint */}
        {!isCollapsed && <span className={`text-xs ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>Alt+{shortcutKey}</span>}
      </button>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, openShortcutModal, isMobileOpen, onCloseMobile, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Navigation Shortcuts (Alt + 1-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.altKey) {
            switch(e.key) {
                case '1': setCurrentPage(Page.Dashboard); break;
                case '2': setCurrentPage(Page.POS); break;
                case '3': setCurrentPage(Page.Products); break;
                case '4': setCurrentPage(Page.Categories); break;
                case '5': setCurrentPage(Page.Debts); break;
                case '6': setCurrentPage(Page.Reports); break;
                case '7': setCurrentPage(Page.Expenses); break;
                case '8': setCurrentPage(Page.Journal); break;
                case '9': setCurrentPage(Page.Management); break;
                default: return;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentPage]);

  // Auto-collapse on small desktops if needed, but primarily user controlled
  
  return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden transition-opacity"
                onClick={onCloseMobile}
            ></div>
        )}

        <aside 
            className={`
                fixed md:relative z-40 h-full bg-white shadow-md flex flex-col transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'w-20' : 'w-64'}
            `} 
            aria-label="Sidebar"
        >
        <div className={`px-3 py-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && <span className="text-2xl font-semibold whitespace-nowrap text-blue-700">Toko Ibu Ucil</span>}
            
            {/* Close button for mobile */}
            <button onClick={onCloseMobile} className="md:hidden text-gray-500 hover:bg-gray-100 p-1 rounded">
                <Icon name="x" className="w-6 h-6" />
            </button>
        </div>

        <div className="px-3 py-2 flex-1 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-2">
            <NavItem page={Page.Dashboard} iconName="dashboard" label="Dashboard" shortcutKey={1} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.POS} iconName="pos" label="Kasir (POS)" shortcutKey={2} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Products} iconName="products" label="Produk & Stok" shortcutKey={3} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Categories} iconName="tag" label="Kategori Produk" shortcutKey={4} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Debts} iconName="debt" label="Utang Piutang" shortcutKey={5} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Reports} iconName="reports" label="Laporan L/R" shortcutKey={6} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Expenses} iconName="expenses" label="Catat Biaya" shortcutKey={7} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Journal} iconName="book" label="Jurnal Keuangan" shortcutKey={8} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            <NavItem page={Page.Management} iconName="crm" label="Manajemen" shortcutKey={9} currentPage={currentPage} setCurrentPage={setCurrentPage} isCollapsed={isCollapsed} onClick={onCloseMobile} />
            </ul>
        </div>
        
        {/* Shortcut Help, Collapse & Logout */}
        <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
            
             <button 
                onClick={onLogout}
                className={`flex items-center justify-center w-full px-2 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ${isCollapsed ? '' : 'px-4'}`}
                title="Keluar Aplikasi (Logout)"
            >
                <Icon name="logout" className="w-5 h-5" />
                {!isCollapsed && <span className="ml-2 font-medium">Keluar</span>}
            </button>

            <button 
                onClick={openShortcutModal}
                className={`flex items-center justify-center w-full px-2 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors ${isCollapsed ? '' : 'px-4'}`}
                title="Keyboard Shortcuts"
            >
                <span className="font-bold">?</span> 
                {!isCollapsed && <span className="ml-2">Shortcuts</span>}
            </button>

            {/* Desktop Collapse Toggle */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex items-center justify-center w-full px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <Icon name={isCollapsed ? "chevron-right" : "chevron-left"} className="w-5 h-5" />
            </button>
        </div>
        </aside>
    </>
  );
};

export default Sidebar;
