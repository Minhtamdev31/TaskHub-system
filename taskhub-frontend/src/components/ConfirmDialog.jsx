import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Global confirm bus: gọi confirm(...) từ bất kỳ đâu, trả về Promise<boolean>.
// Thay thế window.confirm mặc định của trình duyệt bằng modal hợp giao diện.
const listeners = new Set();
let resolver = null;

export const confirm = (opts) => {
  const options = typeof opts === 'string' ? { message: opts } : (opts || {});
  return new Promise((resolve) => {
    resolver = resolve;
    listeners.forEach((fn) => fn(options));
  });
};

export const ConfirmContainer = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    const handler = (options) => setState(options);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  if (!state) return null;

  const close = (result) => {
    setState(null);
    if (resolver) {
      resolver(result);
      resolver = null;
    }
  };

  const {
    title = 'Xác nhận',
    message = '',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    danger = false,
  } = state;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onClick={() => close(false)}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-7 shadow-2xl animate-[slideIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
            <AlertTriangle size={20} />
          </span>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => close(false)}
            className="border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-colors ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
