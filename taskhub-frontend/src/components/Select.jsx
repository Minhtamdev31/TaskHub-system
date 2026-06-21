import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown tùy biến thay cho <select> mặc định (đẹp & nhất quán).
 * options: [{ value, label, dot? }]  — `dot` là class màu chấm tròn (tùy chọn).
 * `placeholder` hiện khi value không khớp option nào.
 */
const Select = ({ value, options, onChange, placeholder = 'Chọn…', className = '', buttonClassName = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border rounded-xl text-sm text-slate-700 transition-colors ${
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {current?.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />}
          <span className={`truncate ${current ? '' : 'text-slate-400'}`}>{current?.label ?? placeholder}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="thin-scroll absolute left-0 z-40 mt-2 w-full min-w-max bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 max-h-72 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setOpen(false); onChange(o.value); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {o.dot && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${o.dot}`} />}
              <span className="flex-1 text-left whitespace-nowrap">{o.label}</span>
              {o.value === value && <Check size={15} className="text-indigo-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
