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
      <div className="absolute inset-0 bg-ai-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`panel-ai relative rounded-2xl p-6 max-w-lg w-[90%] max-h-[85vh] overflow-y-auto animate-bounce-in ${className}`}>
        {title && (
          <h2 className="font-mincho text-xl font-bold mb-5 text-center text-kin-300 ink-underline">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
