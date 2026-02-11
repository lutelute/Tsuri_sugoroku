import { useEffect } from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export default function Modal({ children, onClose, title, className = '' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl p-6 max-w-lg w-[90%] max-h-[85vh] overflow-y-auto ${className}`}>
        {title && (
          <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
