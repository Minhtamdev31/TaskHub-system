import { Crown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_PERKS = [
  'Password Vault bảo mật',
  'Nhắc deadline qua email',
  'Báo cáo & phân tích dự án',
];

const UpgradePanel = ({
  title = 'Tính năng Premium',
  message = 'Nâng cấp lên Premium để mở khóa tính năng này.',
  perks = DEFAULT_PERKS,
}) => (
  <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-10 text-center max-w-2xl mx-auto">
    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
      <Crown size={32} />
    </div>
    <h3 className="text-2xl font-black text-slate-900">{title}</h3>
    <p className="text-slate-500 mt-2 mb-6">{message}</p>

    <ul className="inline-flex flex-col gap-2 text-left mb-8">
      {perks.map((perk) => (
        <li key={perk} className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <Check size={13} />
          </span>
          {perk}
        </li>
      ))}
    </ul>

    <div>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
      >
        <Crown size={18} /> Nâng cấp Premium
      </Link>
    </div>
  </div>
);

export default UpgradePanel;
