import { useEffect, useMemo, useState } from 'react';
import { projectService, userService } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Folder, Users, ArrowRight, X, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from '../components/Toast';
import Avatar from '../components/Avatar';

const PAGE_SIZE = 6;

// Bảng màu pastel — mỗi dự án nhận 1 tông màu ổn định theo tên (hash): cả nền thẻ, viền, icon,
// badge, avatar đều cùng tông để giao diện mềm mại, đa sắc mà cố kết.
const ACCENTS = [
  { card: 'bg-teal-50/70 border-teal-200', icon: 'bg-teal-100 text-teal-600', pill: 'bg-teal-100 text-teal-700', divider: 'border-teal-200/70', avatar: 'bg-white text-teal-600 border-teal-200', link: 'text-teal-700', hover: 'hover:border-teal-300' },
  { card: 'bg-fuchsia-50/70 border-fuchsia-200', icon: 'bg-fuchsia-100 text-fuchsia-600', pill: 'bg-fuchsia-100 text-fuchsia-700', divider: 'border-fuchsia-200/70', avatar: 'bg-white text-fuchsia-600 border-fuchsia-200', link: 'text-fuchsia-700', hover: 'hover:border-fuchsia-300' },
  { card: 'bg-orange-50/70 border-orange-200', icon: 'bg-orange-100 text-orange-600', pill: 'bg-orange-100 text-orange-700', divider: 'border-orange-200/70', avatar: 'bg-white text-orange-600 border-orange-200', link: 'text-orange-700', hover: 'hover:border-orange-300' },
  { card: 'bg-cyan-50/70 border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', pill: 'bg-cyan-100 text-cyan-700', divider: 'border-cyan-200/70', avatar: 'bg-white text-cyan-600 border-cyan-200', link: 'text-cyan-700', hover: 'hover:border-cyan-300' },
  { card: 'bg-lime-50/70 border-lime-200', icon: 'bg-lime-100 text-lime-600', pill: 'bg-lime-100 text-lime-700', divider: 'border-lime-200/70', avatar: 'bg-white text-lime-600 border-lime-200', link: 'text-lime-700', hover: 'hover:border-lime-300' },
  { card: 'bg-purple-50/70 border-purple-200', icon: 'bg-purple-100 text-purple-600', pill: 'bg-purple-100 text-purple-700', divider: 'border-purple-200/70', avatar: 'bg-white text-purple-600 border-purple-200', link: 'text-purple-700', hover: 'hover:border-purple-300' },
];
const accentFor = (key) => {
  let h = 0;
  for (const ch of key || 'x') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

// Nhãn trạng thái dự án sang tiếng Việt (màu badge lấy theo tông của thẻ).
const STATUS_LABEL = {
  Planning: 'Lên kế hoạch', InProgress: 'Đang thực hiện', Active: 'Đang thực hiện',
  OnHold: 'Tạm dừng', Completed: 'Hoàn thành', Archived: 'Đã lưu trữ',
};
const statusLabel = (s) => STATUS_LABEL[s] || s || 'Lên kế hoạch';

const ProjectListPage = () => {
  const [projects, setProjects] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const openModal = () => { setNewProject({ name: '', description: '' }); setFormError(''); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setFormError(''); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      `${p.name} ${p.description || ''}`.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await projectService.getAll();
        if (cancelled) return;
        setProjects(res.data);

        // Lấy tên hiển thị của các thành viên để hiện đúng chữ cái đầu (thay vì 2 ký tự đầu của ObjectId).
        const ids = new Set();
        (res.data || []).forEach((p) => (p.members || []).forEach((m) => ids.add(m.userId)));
        if (ids.size > 0) {
          try {
            const usersRes = await userService.lookup([...ids]);
            if (cancelled) return;
            const map = {};
            usersRes.data.forEach((u) => { map[u.id] = u; });
            setUserMap(map);
          } catch { /* không nghiêm trọng */ }
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const name = newProject.name.trim();
    if (name.length < 2) {
      setFormError('Tên dự án cần ít nhất 2 ký tự.');
      return;
    }
    setFormError('');
    setCreating(true);
    try {
      await projectService.create({ ...newProject, name });
      setIsModalOpen(false);
      setNewProject({ name: '', description: '' });
      setLoading(true);
      const res = await projectService.getAll();
      setProjects(res.data);
      setLoading(false);
      toast.success('Đã tạo dự án.');
    } catch (err) {
      console.error('Failed to create project', err);
      // Hiện thông báo lỗi cụ thể ngay trong form (ưu tiên message từ server).
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || 'Tạo dự án thất bại. Vui lòng thử lại.');
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Đang tải dự án...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dự án</h2>
            {projects.length > 0 && (
              <span className="mt-1 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{projects.length}</span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Quản lý và theo dõi tất cả không gian làm việc của bạn.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Dự án mới
        </button>
      </div>

      {projects.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm dự án..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <Folder size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-600">Chưa có dự án</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">Tạo dự án đầu tiên để bắt đầu.</p>
          <button
            onClick={openModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm"
          >
            Tạo dự án
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <Search size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600 font-medium">Không có dự án khớp "{search}"</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageItems.map((project) => {
            const accent = accentFor(project.id || project.name);
            return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={`${accent.card} border rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 ${accent.hover} transition-all duration-200 group flex flex-col`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${accent.icon} flex items-center justify-center shadow-sm`}>
                  <Folder size={24} />
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${accent.pill}`}>{statusLabel(project.status)}</span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 break-words">
                {project.name}
              </h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed flex-1">
                {project.description || 'Chưa có mô tả cho dự án này.'}
              </p>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">
                <Users size={14} />
                <span>{project.members?.length || 0} Thành viên</span>
              </div>

              <div className={`mt-auto pt-5 border-t ${accent.divider} flex items-center justify-between`}>
                <div className="flex -space-x-2">
                  {project.members?.slice(0, 3).map((m, i) => {
                    const u = userMap[m.userId];
                    const name = u?.username || u?.fullName || m.userId;
                    return (
                      <Avatar
                        key={i}
                        src={u?.avatarUrl}
                        name={name}
                        className={`w-8 h-8 rounded-full border-2 ${accent.avatar} text-[10px] font-bold shadow-sm`}
                      />
                    );
                  })}
                  {project.members?.length > 3 && (
                    <div className={`w-8 h-8 rounded-full border-2 ${accent.avatar} flex items-center justify-center text-[10px] font-bold`}>
                      +{project.members.length - 3}
                    </div>
                  )}
                  {(!project.members || project.members.length === 0) && (
                    <span className="text-xs text-slate-400 normal-case font-medium">Chưa có thành viên</span>
                  )}
                </div>
                <span className={`${accent.link} font-bold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform`}>
                  Mở bảng <ArrowRight size={16} />
                </span>
              </div>
            </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                  p === currentPage ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <form
            onSubmit={handleCreateProject}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            {/* Header có dải gradient + icon */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-6 relative">
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/15 rounded-lg p-1 transition-colors"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                  <Folder size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Dự án mới</h3>
                  <p className="text-indigo-100 text-xs mt-0.5">Tạo không gian làm việc cho nhóm của bạn.</p>
                </div>
              </div>
            </div>

            <div className="p-7">
              {formError && (
                <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3.5 py-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Tên dự án <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 ${
                      formError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                    value={newProject.name}
                    onChange={(e) => { setNewProject({ ...newProject, name: e.target.value }); if (formError) setFormError(''); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 resize-none"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                  <div className="text-right text-[11px] text-slate-400 mt-1">{newProject.description.length}/300</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="text-slate-500 font-semibold text-sm px-4 hover:text-slate-700">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                >
                  {creating ? 'Đang tạo…' : (<><Plus size={16} strokeWidth={3} /> Tạo dự án</>)}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;
