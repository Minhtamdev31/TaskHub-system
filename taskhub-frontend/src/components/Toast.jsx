import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// Lightweight global toast bus so we can fire toasts from anywhere (components, api.js)
const listeners = new Set();
let counter = 0;

const emit = (type, message) => {
  const id = ++counter;
  listeners.forEach((fn) => fn({ id, type, message }));
};

export const toast = {
  success: (message) => emit('success', message),
  error: (message) => emit('error', message),
  info: (message) => emit('info', message),
};

const config = {
  success: { icon: CheckCircle2, classes: 'border-green-200 bg-green-50 text-green-800', iconColor: 'text-green-600' },
  error: { icon: XCircle, classes: 'border-rose-200 bg-rose-50 text-rose-800', iconColor: 'text-rose-600' },
  info: { icon: Info, classes: 'border-indigo-200 bg-indigo-50 text-indigo-800', iconColor: 'text-indigo-600' },
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const c = config[t.type] || config.info;
        const Icon = c.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-[slideIn_0.2s_ease-out] ${c.classes}`}
          >
            <Icon size={20} className={`shrink-0 mt-0.5 ${c.iconColor}`} />
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
