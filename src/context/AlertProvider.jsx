import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showAlert = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts((prev) => [...prev, { id, message, type }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const closeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const confirm = useCallback(({ title, message, onConfirm, onCancel, confirmText = 'Confirm', type = 'info' }) => {
    setConfirmDialog({ title, message, onConfirm, onCancel, confirmText, type });
  }, []);

  const handleConfirmAction = () => {
    if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  const handleCancelAction = () => {
    if (confirmDialog?.onCancel) confirmDialog.onCancel();
    setConfirmDialog(null);
  };

  return (
    <AlertContext.Provider value={{ showAlert, confirm }}>
      {children}

      {/* Global Toasts Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className={`
                glass-card-saas !rounded-xl p-4 min-w-[300px] flex items-start gap-3 relative overflow-hidden
                ${alert.type === 'success' ? 'border-l-4 border-l-emerald-500' : ''}
                ${alert.type === 'error' ? 'border-l-4 border-l-red-500' : ''}
                ${alert.type === 'warning' ? 'border-l-4 border-l-amber-500' : ''}
                ${alert.type === 'info' ? 'border-l-4 border-l-blue-500' : ''}
              `}>
                <div className="mt-0.5">
                  {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {alert.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {alert.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                </div>
                <button 
                  onClick={() => closeAlert(alert.id)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Global Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCancelAction}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card-saas max-w-md w-full p-8 relative z-10"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-600 text-sm mb-8 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelAction}
                  className="flex-1 px-6 py-3 rounded-2xl text-slate-500 font-bold hover:bg-black/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`
                    flex-1 px-6 py-3 rounded-2xl font-bold text-white transition-all shadow-lg
                    ${confirmDialog.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20'}
                  `}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};
