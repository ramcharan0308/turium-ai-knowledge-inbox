import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev.slice(-3), newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const duration = toast.duration ?? 4500;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />,
      bg: 'bg-[#202D23] border-[#2A4B35] text-[#F1F0EA]',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />,
      bg: 'bg-[#2D1D20] border-[#54222B] text-[#F1F0EA]',
    },
    info: {
      icon: <Info className="w-4 h-4 text-[#A8C8B5] shrink-0" />,
      bg: 'bg-[#202D24] border-[#3E4D42] text-[#F1F0EA]',
    },
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 text-sm ${typeConfig.bg}`}
      role="status"
    >
      {typeConfig.icon}
      <div className="flex-1 min-w-0">
        {toast.title && <div className="font-semibold text-xs text-[#F1F0EA] mb-0.5">{toast.title}</div>}
        <div className="text-xs text-[#B8C0B6] leading-relaxed break-words">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 text-[#849082] hover:text-[#F1F0EA] rounded-md transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
