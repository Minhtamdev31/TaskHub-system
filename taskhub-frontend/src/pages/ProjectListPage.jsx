import { useEffect, useMemo, useState } from 'react';
import { projectService, userService } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Folder, Users, ArrowRight, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '../components/Toast';

const PAGE_SIZE = 6;

const initials = (name) => (name || 'NA').substring(0, 2).toUpperCase();

// Bảng màu nhấn — mỗi dự án/avatar nhận 1 màu ổn định theo tên (hash) để giao diện đa sắc mà nhất quán.
const ACCENTS = [
  { soft: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500', hoverBorder: 'hover:border-indigo-200', solid: 'group-hover:bg-indigo-600' },
  { soft: 'bg-rose-50 text-rose-600', bar: 'bg-rose-500', hoverBorder: 'hover:border-rose-200', solid: 'group-hover:bg-rose-600' },
  { soft: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', hoverBorder: 'hover:border-emerald-200', solid: 'group-hover:bg-emerald-600' },
  { soft: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500', hoverBorder: 'hover:border-amber-200', solid: 'group-hover:bg-amber-600' },
  { soft: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500', hoverBorder: 'hover:border-sky-200', solid: 'group-hover:bg-sky-600' },
  { soft: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', hoverBorder: 'hover:border-violet-200', solid: 'group-hover:bg-violet-600' },
];
const accentFor = (key) => {
  let h = 0;
  for (const ch of key || 'x') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

const STATUS_PILL = {
  Active: { label: 'Đang hoạt động', cls: 'bg-emerald-50 text-emerald-700' },
  Archived: { label: 'Đã lưu trữ', cls: 'bg-slate-100 text-slate-500' },
  Completed: { label: 'Hoàn thành', cls: 'bg-blue-50 text-blue-700' },
};
const statusPill = (s) => STATUS_PILL[s] || { label: s || 'Hoạt động', cls: 'bg-slate-100 text-slate-500' };

const ProjectListPage = () => {
  const [projects, setProjects] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
    setCreating(true);
    try {
      await projectService.create(newProject);
      setIsModalOpen(false);
      setNewProject({ name: '', description: '' });
      setLoading(true);
      const res = await projectService.getAll();
      setProjects(res.data);
      setLoading(false);
      toast.success('Đã tạo dự án.');
    } catch (err) {
      console.error('Failed to create project', err);
      toast.error('Tạo dự án thất bại. Vui lòng thử lại.');
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
          onClick={() => setIsModalOpen(true)}
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
            onClick={() => setIsModalOpen(true)}
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
            const pill = statusPill(project.status);
            return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={`bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${accent.hoverBorder} transition-all duration-200 group flex flex-col`}
            >
              <div className={`h-1.5 ${accent.bar}`} />
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${accent.soft} flex items-center justify-center ${accent.solid} group-hover:text-white transition-colors`}>
                    <Folder size={24} />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${pill.cls}`}>{pill.label}</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 break-words group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed flex-1">
                  {project.description || 'Chưa có mô tả cho dự án này.'}
                </p>

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">
                  <Users size={14} />
                  <span>{project.members?.length || 0} Thành viên</span>
                </div>

                <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {project.members?.slice(0, 3).map((m, i) => {
                      const name = userMap[m.userId]?.username || userMap[m.userId]?.fullName || m.userId;
                      const a = accentFor(name);
                      return (
                        <div key={i} title={name} className={`w-8 h-8 rounded-full border-2 border-white ${a.soft} flex items-center justify-center text-[10px] font-bold`}>
                          {initials(name)}
                        </div>
                      );
                    })}
                    {project.members?.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        +{project.members.length - 3}
                      </div>
                    )}
                    {(!project.members || project.members.length === 0) && (
                      <span className="text-xs text-slate-400 normal-case font-medium">Chưa có thành viên</span>
                    )}
                  </div>
                  <span className="text-indigo-600 font-bold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Mở bảng <ArrowRight size={16} />
                  </span>
                </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateProject} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6">Dự án mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Tạo dự án'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;
