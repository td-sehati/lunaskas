
import React from 'react';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 backdrop-blur-sm">
      {/* Mobile: w-full h-full (or close to it) with rounded-t-xl. Desktop: centered rounded-lg */}
      <div className={`
          relative w-full h-[95vh] md:h-auto md:max-h-[90vh] bg-white 
          rounded-t-2xl md:rounded-lg shadow-xl transform transition-all duration-300 flex flex-col
          ${sizeClasses[size]} mx-auto md:mx-4
      `}>
        <div className="flex items-center justify-between p-4 border-b rounded-t-2xl md:rounded-t-lg shrink-0">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-full p-2 inline-flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <Icon name="x" className="w-6 h-6" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
