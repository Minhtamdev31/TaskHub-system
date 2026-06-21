import { useState, useRef, useEffect } from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Select from './Select';

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const pad = (n) => String(n).padStart(2, '0');
// Chuỗi giờ địa phương "YYYY-MM-DDTHH:mm" — cùng định dạng input datetime-local cũ.
const toLocalStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parse = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const fmtDisplay = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Bộ chọn ngày & giờ tùy biến thay cho <input type="datetime-local">.
 * value: chuỗi "YYYY-MM-DDTHH:mm" (hoặc rỗng). onChange(value) trả về cùng định dạng.
 */
const DateTimePicker = ({ value, onChange, placeholder = 'Chọn ngày & giờ', className = '' }) => {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [view, setView] = useState(() => selected || new Date());
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const toggle = () => {
    if (!open) {
      if (selected) setView(selected); // mở ra → nhảy tới tháng của ngày đang chọn
      const rect = ref.current?.getBoundingClientRect();
      // Không đủ chỗ phía dưới → mở ngược lên trên để khỏi tràn khỏi modal/màn hình.
      setDropUp(rect ? window.innerHeight - rect.bottom < 380 : false);
    }
    setOpen((o) => !o);
  };

  const setHM = (h, m) => {
    const base = selected || new Date();
    onChange(toLocalStr(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)));
  };
  const curH = selected ? selected.getHours() : 9;
  const curM = selected ? selected.getMinutes() : 0;

  const pickDay = (day) => {
    const base = selected || new Date();
    onChange(toLocalStr(new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes())));
  };

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWd = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  const today = new Date();

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm text-left transition-colors"
      >
        <CalIcon size={16} className="text-slate-400 shrink-0" />
        <span className={selected ? 'text-slate-700' : 'text-slate-400'}>{selected ? fmtDisplay(selected) : placeholder}</span>
      </button>

      {open && (
        <div className={`absolute left-0 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronLeft size={16} /></button>
            <span className="text-sm font-bold text-slate-700">{MONTHS[month]} {year}</span>
            <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w) => <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => d ? (
              <button
                key={i}
                type="button"
                onClick={() => pickDay(d)}
                className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                  sameDay(d, selected) ? 'bg-indigo-600 text-white font-bold'
                    : sameDay(d, today) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {d.getDate()}
              </button>
            ) : <div key={i} />)}
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 shrink-0">Giờ</span>
            <Select value={String(curH)} onChange={(v) => setHM(Number(v), curM)} options={HOURS} className="w-16" />
            <span className="text-slate-400 font-bold">:</span>
            <Select value={String(curM)} onChange={(v) => setHM(curH, Number(v))} options={MINUTES} className="w-16" />
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 shrink-0">Xong</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
