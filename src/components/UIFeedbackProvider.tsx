import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  onClose?: () => void;
}

interface UIFeedbackContextProps {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
  showAlert: (options: AlertOptions) => void;
}

const UIFeedbackContext = createContext<UIFeedbackContextProps | undefined>(undefined);

export function useUIFeedback() {
  const context = useContext(UIFeedbackContext);
  if (!context) {
    throw new Error('useUIFeedback must be used within a UIFeedbackProvider');
  }
  return context;
}

export const UIFeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmOptions | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const showConfirm = (options: ConfirmOptions) => {
    setConfirmConfig(options);
  };

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  // Auto-expire toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <UIFeedbackContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}
      
      {/* --- FLOATING TOASTS CONTAINER --- */}
      <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[400px]" dir="rtl">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-xl border animate-fade-in transition-all gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-250 border-emerald-200 dark:border-emerald-900/40'
                : toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-250 border-rose-200 dark:border-rose-900/40'
                : toast.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-250 border-amber-200 dark:border-amber-900/40'
                : 'bg-sky-50 dark:bg-sky-950/90 text-sky-800 dark:text-sky-250 border-sky-200 dark:border-sky-900/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-sky-500 shrink-0" />}
              <span className="text-xs font-black tracking-tight">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        ))}
      </div>

      {/* --- CUSTOM CONFIRM MODAL --- */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-up">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <AlertTriangle className="text-amber-500 w-5 h-5" />
              {confirmConfig.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-5">
              {confirmConfig.message}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="flex-1 py-2.5 bg-sky-600 text-white font-extrabold rounded-xl text-xs hover:bg-sky-500 active:scale-95 transition cursor-pointer"
              >
                {confirmConfig.confirmText || 'استمرار'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer text-xs"
              >
                {confirmConfig.cancelText || 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM ALERT MODAL --- */}
      {alertConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-up">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <Info className="text-sky-500 w-5 h-5" />
              {alertConfig.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-5">
              {alertConfig.message}
            </p>
            <button
              type="button"
              onClick={() => {
                if (alertConfig.onClose) alertConfig.onClose();
                setAlertConfig(null);
              }}
              className="w-full py-2.5 bg-sky-600 text-white font-extrabold rounded-xl text-xs hover:bg-sky-500 active:scale-95 transition cursor-pointer"
            >
              {alertConfig.buttonText || 'موافق'}
            </button>
          </div>
        </div>
      )}
    </UIFeedbackContext.Provider>
  );
};
