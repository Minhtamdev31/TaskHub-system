import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { taskService, projectService, commentService, invitationService, userService, authService, budgetService } from '../services/api';
import { BudgetPanel, BudgetUpgradeNotice, TaskBudgetSection } from '../components/ProjectBudget';
import { toast } from '../components/Toast';
import { confirm } from '../components/ConfirmDialog';
import UserProfileModal from '../components/UserProfileModal';
import UpgradePanel from '../components/UpgradePanel';
import { HubConnectionBuilder } from '@microsoft/signalr';

// Backend (SignalR hub) luôn chạy trên Render. Kết nối thẳng, không qua proxy /api của Vercel.
const HUB_URL = 'https://taskhub-system.onrender.com/hubs/project';
import { Plus, MoreHorizontal, Clock, X, ArrowLeft, Trash2, Send, UserPlus, MessageSquare, Search, Paperclip, Download, FileText, Users, Crown, Shield, Sparkles, Move, ChevronDown, Check } from 'lucide-react';
import Avatar from '../components/Avatar';
import Select from '../components/Select';
import DateTimePicker from '../components/DateTimePicker';
import { MarkdownLite } from '../utils/markdownLite';
import { BoardSkeleton } from '../components/Skeleton';

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const columns = ['Todo', 'InProgress', 'Review', 'Done'];

// Nhãn hiển thị tiếng Việt; key vẫn giữ tiếng Anh để khớp dữ liệu BE.
const statusLabels = { Todo: 'Cần làm', InProgress: 'Đang làm', Review: 'Xem xét', Done: 'Hoàn thành' };
const statusLabel = (s) => statusLabels[s] || s;
const TASK_STATUS_DOT = { Todo: 'bg-slate-400', InProgress: 'bg-blue-500', Review: 'bg-amber-500', Done: 'bg-emerald-500' };

const roleLabels = { Owner: 'Chủ sở hữu', Leader: 'Trưởng nhóm', Member: 'Thành viên' };

// Trạng thái của cả dự án (khác với trạng thái từng task ở trên). Mỗi trạng thái 1 chấm màu.
const PROJECT_STATUSES = [
  { value: 'Planning', label: 'Lên kế hoạch', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600' },
  { value: 'InProgress', label: 'Đang thực hiện', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700' },
  { value: 'OnHold', label: 'Tạm dừng', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700' },
  { value: 'Completed', label: 'Hoàn thành', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
  { value: 'Archived', label: 'Đã lưu trữ', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-500' },
];
// "Active" cũ (mặc định trước đây) được gộp vào "Đang thực hiện" khi hiển thị.
const projectStatusMeta = (s) =>
  PROJECT_STATUSES.find((x) => x.value === s) ||
  (s === 'Active' ? PROJECT_STATUSES[1] : PROJECT_STATUSES[0]);

// Dropdown trạng thái dự án tùy biến (đẹp hơn <select> mặc định): chấm màu + dấu tick.
const ProjectStatusControl = ({ status, canEdit, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = projectStatusMeta(status);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!canEdit) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${meta.pill}`}>
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} /> {meta.label}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Đổi trạng thái dự án"
        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${meta.pill} hover:brightness-95 transition`}
      >
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        {meta.label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30">
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => { setOpen(false); onChange(s.value); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="flex-1 text-left font-medium">{s.label}</span>
              {s.value === status && <Check size={15} className="text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const priorities = ['Low', 'Medium', 'High', 'Critical'];

const priorityConfig = {
  Low: { label: 'Thấp', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Medium: { label: 'Trung bình', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  High: { label: 'Cao', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Critical: { label: 'Khẩn cấp', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

const priorityBadge = (p) => priorityConfig[p] || priorityConfig.Medium;

const initials = (name) => (name || 'NA').substring(0, 2).toUpperCase();

// Chuyển ISO/UTC sang chuỗi giờ địa phương "YYYY-MM-DDTHH:mm" cho input datetime-local.
const toDateTimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Render markdown rút gọn cho tóm tắt AI: in đậm **...** và giữ xuống dòng (container đã pre-wrap).

// Escape ký tự đặc biệt để dùng tên thành viên trong regex.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Hiển thị nội dung bình luận, tô nổi bật các @mention khớp tên thành viên thật.
const CommentText = ({ content, members, displayName }) => {
  if (!content) return null;
  const names = (members || [])
    .map((m) => displayName(m.userId))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length); // khớp tên dài trước
  if (names.length === 0) return <>{content}</>;

  const re = new RegExp(`@(${names.map(escapeRegExp).join('|')})`, 'g');
  const parts = [];
  let last = 0;
  let match;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) parts.push(content.slice(last, match.index));
    parts.push(
      <span key={match.index} className="text-indigo-600 font-semibold bg-indigo-50 rounded px-1">
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <>{parts}</>;
};

const ProjectBoardPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userMap, setUserMap] = useState({}); // userId -> { username, fullName }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'Medium', status: 'Todo' });
  const [colMenu, setColMenu] = useState(null); // tên cột đang mở menu "..."

  // Mở modal tạo task, đặt sẵn cột (trạng thái) khởi tạo.
  const openCreate = (status = 'Todo') => {
    setNewTask({ title: '', description: '', dueDate: '', priority: 'Medium', status });
    setColMenu(null);
    setIsModalOpen(true);
  };

  // Đóng menu cột khi bấm ra ngoài.
  useEffect(() => {
    if (!colMenu) return undefined;
    const onClick = () => setColMenu(null);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [colMenu]);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);

  // Ngân sách dự án (Premium). budgetUpgrade = chủ dự án chưa có Premium.
  const [budget, setBudget] = useState(null);
  const [budgetUpgrade, setBudgetUpgrade] = useState(false);

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiRequiresUpgrade, setAiRequiresUpgrade] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false); // dropdown "Công cụ"
  const toolsRef = useRef(null);
  const [tipHidden, setTipHidden] = useState(() => localStorage.getItem('th_board_tip') === '1');
  const hideTip = () => { setTipHidden(true); localStorage.setItem('th_board_tip', '1'); };

  // Đóng dropdown Công cụ khi bấm ra ngoài.
  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onClick = (e) => { if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [toolsOpen]);

  const [profileUserId, setProfileUserId] = useState(null);

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectService.delete(id);
      toast.success('Đã xóa dự án.');
      window.location.href = '/projects';
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || 'Không xóa được dự án.');
      toast.error(msg);
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleChangeProjectStatus = async (newStatus) => {
    if (!project || newStatus === project.status) return;
    const prev = project.status;
    setProject((p) => ({ ...p, status: newStatus })); // cập nhật lạc quan
    try {
      await projectService.update(project.id, { status: newStatus });
      toast.success('Đã cập nhật trạng thái dự án.');
    } catch {
      setProject((p) => ({ ...p, status: prev })); // lỗi → khôi phục
      toast.error('Không cập nhật được trạng thái dự án.');
    }
  };

  const handleAiSummary = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiError('');
    setAiSummary('');
    setAiRequiresUpgrade(false);
    try {
      const res = await projectService.aiSummary(id);
      setAiSummary(res.data?.summary || '');
    } catch (err) {
      if (err.response?.data?.requiresUpgrade) {
        // Tính năng Premium → hiện panel mời nâng cấp (giống Kho mật khẩu) thay vì lỗi mộc.
        setAiRequiresUpgrade(true);
      } else {
        const msg = typeof err.response?.data === 'string'
          ? err.response.data
          : (err.response?.data?.message || 'Không tạo được tóm tắt. Vui lòng thử lại.');
        setAiError(msg);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const displayName = useCallback(
    (userId) => userMap[userId]?.username || userMap[userId]?.fullName || userId || 'Unassigned',
    [userMap]
  );

  const avatarOf = useCallback((userId) => userMap[userId]?.avatarUrl, [userMap]);

  const loadUserNames = useCallback(async (members, taskList) => {
    const ids = new Set();
    (members || []).forEach((m) => ids.add(m.userId));
    (taskList || []).forEach((t) => t.userId && ids.add(t.userId));
    if (ids.size === 0) return;
    try {
      const res = await userService.lookup([...ids]);
      const map = {};
      res.data.forEach((u) => { map[u.id] = u; });
      setUserMap(map);
    } catch {
      /* non-critical */
    }
  }, []);

  // Tải ngân sách. 403 kèm requiresUpgrade = chủ dự án chưa Premium → hiện gợi ý nâng cấp
  // thay vì báo lỗi; các lỗi khác thì ẩn hẳn khối ngân sách.
  const fetchBudget = useCallback(async () => {
    try {
      const res = await budgetService.get(id);
      return { data: res.data, upgrade: false };
    } catch (err) {
      return { data: null, upgrade: !!err.response?.data?.requiresUpgrade };
    }
  }, [id]);

  const refreshBudget = useCallback(async () => {
    const { data, upgrade } = await fetchBudget();
    setBudget(data);
    setBudgetUpgrade(upgrade);
  }, [fetchBudget]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, tRes, meRes] = await Promise.all([
          projectService.getById(id),
          taskService.getByProject(id),
          authService.getCurrentUser().catch(() => null),
        ]);
        if (!cancelled) {
          setProject(pRes.data);
          setTasks(tRes.data);
          if (meRes?.data?.id) setCurrentUserId(meRes.data.id);
          loadUserNames(pRes.data.members, tRes.data);
        }
      } catch {
        toast.error('Không tải được dữ liệu bảng.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, loadUserNames]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, upgrade } = await fetchBudget();
      if (cancelled) return;
      setBudget(data);
      setBudgetUpgrade(upgrade);
    })();
    return () => { cancelled = true; };
  }, [fetchBudget]);

  const handleSetBudget = async (value) => {
    try {
      await budgetService.setBudget(id, value);
      toast.success('Đã cập nhật ngân sách dự án.');
      await refreshBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không cập nhật được ngân sách.');
      throw err;
    }
  };

  const handleAddBudget = async (amount) => {
    try {
      await budgetService.addBudget(id, amount);
      toast.success('Đã thêm tiền vào ngân sách dự án.');
      await refreshBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thêm được tiền.');
      throw err;
    }
  };

  const handleCreateBudgetRequest = async (payload) => {
    try {
      await budgetService.createRequest(id, payload);
      toast.success('Đã gửi yêu cầu chi tiền tới trưởng dự án.');
      await refreshBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không gửi được yêu cầu.');
      throw err;
    }
  };

  const handleApproveBudget = async (r) => {
    try {
      await budgetService.approve(id, r.id);
      toast.success('Đã duyệt yêu cầu chi tiền.');
      await refreshBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không duyệt được yêu cầu.');
      throw err;
    }
  };

  const handleRejectBudget = async (r, reason) => {
    try {
      await budgetService.reject(id, r.id, reason);
      toast.success('Đã từ chối yêu cầu.');
      await refreshBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không từ chối được yêu cầu.');
      throw err;
    }
  };

  const taskTitleById = useCallback(
    (taskId) => tasks.find((t) => String(t.id) === String(taskId))?.title || 'Công việc đã xóa',
    [tasks],
  );

  // Mở sẵn task khi vào từ thông báo (URL có ?task={id}); mở xong xoá param để khỏi mở lại.
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (!taskParam || tasks.length === 0) return;
    const found = tasks.find((t) => t.id === taskParam);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTask(found);
      const sp = new URLSearchParams(searchParams);
      sp.delete('task');
      setSearchParams(sp, { replace: true });
    }
  }, [searchParams, tasks, setSearchParams]);

  // Tải lại danh sách task (dùng cho cập nhật real-time).
  const reloadTasks = useCallback(async () => {
    try {
      const tRes = await taskService.getByProject(id);
      setTasks(tRes.data);
    } catch { /* bỏ qua */ }
  }, [id]);

  // Tăng mỗi khi có sự kiện real-time → để TaskDetailModal tải lại bình luận.
  const [realtimeTick, setRealtimeTick] = useState(0);

  // Kết nối SignalR: nhận sự kiện comment/task thay đổi của dự án theo thời gian thực.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('token') })
      .withAutomaticReconnect()
      .build();

    connection.on('projectChanged', () => {
      reloadTasks();
      setRealtimeTick((t) => t + 1);
    });

    connection.start()
      .then(() => connection.invoke('JoinProject', id))
      .catch(() => { /* im lặng nếu hub chưa sẵn sàng (vd server đang khởi động) */ });

    connection.onreconnected(() => {
      connection.invoke('JoinProject', id).catch(() => {});
    });

    return () => { connection.stop(); };
  }, [id, reloadTasks]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskService.update(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: newStatus } : prev));
    } catch {
      toast.error('Không cập nhật được trạng thái.');
    }
  };

  const handleUpdatePriority = async (taskId, newPriority) => {
    try {
      await taskService.update(taskId, { priority: newPriority });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, priority: newPriority } : prev));
    } catch {
      toast.error('Không cập nhật được độ ưu tiên.');
    }
  };

  // localValue là chuỗi từ input datetime-local (giờ địa phương); rỗng = xóa hạn chót.
  const handleUpdateDueDate = async (taskId, localValue) => {
    try {
      const newDue = localValue ? new Date(localValue).toISOString() : null;
      await taskService.update(taskId, newDue ? { dueDate: newDue } : { clearDueDate: true });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dueDate: newDue } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, dueDate: newDue } : prev));
      toast.success(newDue ? 'Đã cập nhật hạn chót.' : 'Đã xóa hạn chót.');
    } catch {
      toast.error('Không cập nhật được hạn chót.');
    }
  };

  // --- Drag & drop ---
  const handleDragStart = (taskId) => setDraggedTaskId(taskId);
  const handleDragEnd = () => { setDraggedTaskId(null); setDragOverColumn(null); };

  const handleDrop = (column) => {
    setDragOverColumn(null);
    const taskId = draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== column) {
      handleUpdateStatus(taskId, column);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await taskService.create({
        title: newTask.title,
        description: newTask.description,
        projectId: id,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        priority: newTask.priority,
        status: newTask.status || 'Todo',
      });
      setTasks((prev) => [...prev, res.data]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '', priority: 'Medium', status: 'Todo' });
      toast.success('Đã tạo công việc.');
    } catch {
      toast.error('Tạo công việc thất bại.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!(await confirm({ title: 'Xóa công việc?', message: 'Công việc này sẽ bị xóa.', confirmText: 'Xóa', danger: true }))) return;
    try {
      await taskService.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      toast.success('Đã xóa công việc.');
    } catch {
      toast.error('Xóa công việc thất bại.');
    }
  };

  const handleAssign = async (taskId, targetUserId) => {
    try {
      await taskService.assign(taskId, targetUserId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, userId: targetUserId } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, userId: targetUserId } : prev));
      toast.success('Đã giao việc.');
    } catch {
      toast.error('Giao việc thất bại.');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await invitationService.invite({ projectId: id, invitedEmail: inviteEmail });
      toast.success(`Đã gửi lời mời tới ${inviteEmail}.`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch (err) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : 'Gửi lời mời thất bại.';
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (targetUserId, newRole) => {
    try {
      const res = await projectService.changeMemberRole(id, targetUserId, newRole);
      setProject(res.data);
      toast.success('Đã cập nhật vai trò.');
    } catch {
      toast.error('Cập nhật vai trò thất bại.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!(await confirm({ title: 'Xóa thành viên?', message: 'Thành viên này sẽ bị xóa khỏi dự án.', confirmText: 'Xóa', danger: true }))) return;
    try {
      await projectService.removeMember(id, targetUserId);
      setProject((prev) => ({ ...prev, members: prev.members.filter((m) => m.userId !== targetUserId) }));
      toast.success('Đã xóa thành viên.');
    } catch {
      toast.error('Xóa thành viên thất bại.');
    }
  };

  const handleTransferOwner = async (targetUserId) => {
    if (!(await confirm({ title: 'Chuyển quyền sở hữu?', message: 'Bạn sẽ chuyển quyền sở hữu dự án cho thành viên này và trở thành Trưởng nhóm.', confirmText: 'Chuyển quyền' }))) return;
    try {
      const res = await projectService.transferOwnership(id, targetUserId);
      setProject(res.data);
      toast.success('Đã chuyển quyền sở hữu.');
    } catch {
      toast.error('Chuyển quyền sở hữu thất bại.');
    }
  };

  if (!project) return <BoardSkeleton />;

  const q = search.trim().toLowerCase();
  const visibleTasks = tasks.filter((t) => {
    if (q && !(`${t.title} ${t.description || ''}`.toLowerCase().includes(q))) return false;
    if (priorityFilter !== 'All' && (t.priority || 'Medium') !== priorityFilter) return false;
    if (assigneeFilter !== 'All') {
      if (assigneeFilter === 'Unassigned' ? !!t.userId : t.userId !== assigneeFilter) return false;
    }
    return true;
  });
  const filtersActive = q || priorityFilter !== 'All' || assigneeFilter !== 'All';

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <Link to="/projects" className="text-sm font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Quay lại Dự án
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight break-words">{project.name}</h2>
            <ProjectStatusControl
              status={project.status}
              canEdit={project.ownerId === currentUserId ||
                (project.members || []).some((m) => m.userId === currentUserId && m.projectRole === 'Leader')}
              onChange={handleChangeProjectStatus}
            />
          </div>
          <p className="text-sm text-slate-400 mt-1">Bảng công việc</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Tìm kiếm + lọc — cùng hàng với công cụ */}
          <div className="relative w-44 lg:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'All', label: 'Tất cả độ ưu tiên' },
              ...priorities.map((p) => ({ value: p, label: priorityConfig[p].label, dot: priorityConfig[p].dot })),
            ]}
          />
          <Select
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={[
              { value: 'All', label: 'Tất cả người nhận' },
              { value: 'Unassigned', label: 'Chưa giao' },
              ...(project.members || []).map((m) => ({ value: m.userId, label: displayName(m.userId) })),
            ]}
          />
          {filtersActive && (
            <button onClick={() => { setSearch(''); setPriorityFilter('All'); setAssigneeFilter('All'); }} title="Xóa lọc" className="text-slate-400 hover:text-indigo-600 p-1">
              <X size={16} />
            </button>
          )}
          <span className="text-xs font-bold text-slate-400">{visibleTasks.length}/{tasks.length}</span>

          <div className="flex -space-x-2 ml-1">
            {(project.members || []).map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProfileUserId(m.userId)}
                title={`Xem hồ sơ: ${displayName(m.userId)}`}
                className="w-10 h-10 rounded-full border-4 border-slate-50 bg-white text-xs font-bold shadow-sm hover:ring-2 hover:ring-blue-400 hover:z-10 transition-all overflow-hidden"
              >
                <Avatar src={avatarOf(m.userId)} name={displayName(m.userId)} className="w-full h-full rounded-full text-indigo-600" />
              </button>
            ))}
          </div>
          {/* AI để riêng bên ngoài, nổi bật */}
          <button
            onClick={handleAiSummary}
            className="bg-brand-gradient text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Sparkles size={16} /> Tóm tắt AI
          </button>

          {/* Các chức năng còn lại gom vào dropdown "Công cụ" */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen((o) => !o)}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <MoreHorizontal size={18} /> Công cụ
              <ChevronDown size={15} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>
            {toolsOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30">
                <button onClick={() => { setToolsOpen(false); openCreate('Todo'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Plus size={16} className="text-indigo-600" /> Tạo công việc
                </button>
                <button onClick={() => { setToolsOpen(false); setManageOpen(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Users size={16} className="text-slate-500" /> Thành viên
                </button>
                <button onClick={() => { setToolsOpen(false); setInviteOpen(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <UserPlus size={16} className="text-slate-500" /> Mời thành viên
                </button>
                {project.ownerId === currentUserId && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button onClick={() => { setToolsOpen(false); setDeleteOpen(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                      <Trash2 size={16} /> Xóa dự án
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!tipHidden && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
          <Move size={14} className="text-slate-400 shrink-0" />
          <span className="flex-1 truncate">
            Mẹo: <b className="font-semibold text-slate-600">kéo thẻ</b> sang cột khác để đổi trạng thái, hoặc <b className="font-semibold text-slate-600">bấm vào thẻ</b> rồi đổi ở mục “Trạng thái”.
          </span>
          <button onClick={hideTip} title="Ẩn mẹo" className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 pb-6">
        {columns.map((column) => (
          <div key={column} className="min-w-0 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700">{statusLabel(column)}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {visibleTasks.filter((t) => t.status === column).length}
                </span>
              </div>
              <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setColMenu((c) => (c === column ? null : column))}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Tùy chọn cột"
                >
                  <MoreHorizontal size={18} />
                </button>
                {colMenu === column && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30">
                    <button
                      onClick={() => openCreate(column)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Plus size={16} className="text-indigo-600" /> Tạo công việc vào cột này
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); if (dragOverColumn !== column) setDragOverColumn(column); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); }}
              onDrop={() => handleDrop(column)}
              className={`flex-1 space-y-4 min-h-[300px] max-h-[calc(100vh-13rem)] overflow-y-auto p-2 rounded-3xl border transition-colors ${
                dragOverColumn === column
                  ? 'bg-indigo-50 border-indigo-300 border-dashed'
                  : 'bg-slate-100/50 border-slate-200/50'
              }`}
            >
              {visibleTasks.filter((t) => t.status === column).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedTask(task)}
                  className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group ${
                    draggedTaskId === task.id ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors break-words min-w-0">
                      {task.title}
                    </h4>
                    <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge(task.priority).badge}`}>
                      {priorityBadge(task.priority).label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                          <Clock size={12} /> {new Date(task.dueDate).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {task.userId === currentUserId ? (
                      <div className="flex items-center gap-1.5" title="Việc giao cho bạn">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">Bạn</span>
                        <Avatar src={avatarOf(task.userId)} name={displayName(task.userId)} className="w-7 h-7 rounded-lg text-[10px] font-black text-indigo-600 bg-indigo-50 ring-2 ring-indigo-400 overflow-hidden" />
                      </div>
                    ) : (
                      <Avatar src={avatarOf(task.userId)} name={displayName(task.userId)} className="w-7 h-7 rounded-lg text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 overflow-hidden" />
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ngân sách & yêu cầu chi tiền (Premium) */}
      <div className="pb-6">
        {budgetUpgrade ? (
          <BudgetUpgradeNotice />
        ) : budget ? (
          <BudgetPanel
            data={budget}
            displayName={displayName}
            taskTitle={taskTitleById}
            onSetBudget={handleSetBudget}
            onAddBudget={handleAddBudget}
            onApprove={handleApproveBudget}
            onReject={handleRejectBudget}
          />
        ) : null}
      </div>

      {/* Delete Project Confirm Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-7 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 size={20} />
              </span>
              <h3 className="text-lg font-black text-slate-900">Xóa dự án?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Bạn sắp xóa dự án <span className="font-bold text-slate-900">{project.name}</span>.
              Toàn bộ công việc và bình luận trong dự án sẽ bị xóa vĩnh viễn và <span className="font-bold">không thể hoàn tác</span>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {aiOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] animate-pop">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
                  <Sparkles size={16} />
                </span>
                Tóm tắt dự án bằng AI
              </h3>
              <button onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 text-sm">AI đang đọc các task & bình luận để tóm tắt...</p>
                </div>
              )}

              {!aiLoading && aiRequiresUpgrade && (
                <UpgradePanel
                  title="Phân tích AI là tính năng Premium"
                  message="Để AI tự đọc toàn bộ task & bình luận và tóm tắt tiến độ dự án, hãy nâng cấp Premium."
                  perks={['Tóm tắt & phân tích dự án bằng AI', 'Password Vault bảo mật', 'Nhắc deadline qua email']}
                />
              )}

              {!aiLoading && !aiRequiresUpgrade && aiError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
                  {aiError}
                </div>
              )}

              {!aiLoading && !aiError && !aiRequiresUpgrade && aiSummary && (
                <MarkdownLite text={aiSummary} />
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              {!aiLoading && (
                <button
                  onClick={handleAiSummary}
                  className="border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Tạo lại
                </button>
              )}
              <button
                onClick={() => setAiOpen(false)}
                className="bg-brand-gradient text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateTask} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 flex-wrap">
              Tạo công việc
              {newTask.status && newTask.status !== 'Todo' && (
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">vào cột "{statusLabel(newTask.status)}"</span>
              )}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
                <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Độ ưu tiên</label>
                  <Select
                    value={newTask.priority}
                    onChange={(v) => setNewTask({ ...newTask, priority: v })}
                    buttonClassName="px-4 py-2.5"
                    options={priorities.map((p) => ({ value: p, label: priorityConfig[p].label, dot: priorityConfig[p].dot }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót</label>
                  <DateTimePicker value={newTask.dueDate} onChange={(v) => setNewTask({ ...newTask, dueDate: v })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">Hủy</button>
              <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'Đang tạo...' : 'Tạo công việc'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleInvite} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button type="button" onClick={() => setInviteOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-2">Mời thành viên</h3>
            <p className="text-sm text-slate-500 mb-6">Gửi lời mời dự án tới email của đồng đội.</p>
            <input type="email" required placeholder="dongdoi@example.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setInviteOpen(false)} className="text-slate-500 font-medium px-4">Hủy</button>
              <button type="submit" disabled={inviting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                {inviting ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Members Modal */}
      {manageOpen && (
        <ManageMembersModal
          project={project}
          currentUserId={currentUserId}
          displayName={displayName}
          avatarOf={avatarOf}
          onClose={() => setManageOpen(false)}
          onChangeRole={handleChangeRole}
          onRemove={handleRemoveMember}
          onTransferOwner={handleTransferOwner}
          onViewProfile={setProfileUserId}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          realtimeTick={realtimeTick}
          members={project.members || []}
          displayName={displayName}
          currentUserId={currentUserId}
          budget={budget}
          onCreateBudgetRequest={handleCreateBudgetRequest}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleUpdateStatus}
          onPriorityChange={handleUpdatePriority}
          onDueDateChange={handleUpdateDueDate}
          onAssign={handleAssign}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

const TaskDetailModal = ({ task, realtimeTick, members, displayName, currentUserId, budget, onCreateBudgetRequest, onClose, onStatusChange, onPriorityChange, onDueDateChange, onAssign, onDelete }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [attachment, setAttachment] = useState(null); // { name, type, dataUrl }

  // Phân tích AI cho task (Premium, có cache phía server)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiUpgrade, setAiUpgrade] = useState(false);

  const handleAnalyze = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiError('');
    setAiUpgrade(false);
    try {
      const res = await taskService.aiAnalyze(task.id);
      setAiText(res.data?.analysis || '');
    } catch (err) {
      if (err.response?.data?.requiresUpgrade) setAiUpgrade(true);
      else setAiError(err.response?.data?.message || 'Không phân tích được. Thử lại sau.');
    } finally {
      setAiLoading(false);
    }
  };

  // @-mention: gợi ý thành viên khi gõ @ trong comment
  const commentInputRef = useRef(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionResults = mentionOpen
    ? members
        .map((m) => ({ userId: m.userId, name: displayName(m.userId) }))
        .filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    const caret = e.target.selectionStart ?? value.length;
    const textBefore = value.slice(0, caret);
    const m = /(^|\s)@([^\s@]*)$/.exec(textBefore);
    if (m) {
      setMentionQuery(m[2]);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  };

  const selectMention = (member) => {
    if (!member) return;
    const el = commentInputRef.current;
    const caret = el ? el.selectionStart : newComment.length;
    const textBefore = newComment.slice(0, caret);
    const at = textBefore.lastIndexOf('@');
    if (at === -1) return;
    const inserted = `@${member.name} `;
    const before = newComment.slice(0, at);
    const after = newComment.slice(caret);
    setNewComment(before + inserted + after);
    setMentionOpen(false);
    const pos = (before + inserted).length;
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  };

  const handleCommentKeyDown = (e) => {
    if (!mentionOpen || mentionResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectMention(mentionResults[Math.min(mentionIndex, mentionResults.length - 1)]);
    } else if (e.key === 'Escape') {
      setMentionOpen(false);
    }
  };

  // Tải bình luận lần đầu khi mở công việc (có hiện trạng thái "đang tải").
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      try {
        const res = await commentService.getByTask(task.id);
        if (!cancelled) setComments(res.data);
      } catch {
        if (!cancelled) toast.error('Không tải được bình luận.');
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [task.id]);

  // Làm mới bình luận âm thầm khi có sự kiện real-time (vd người khác vừa bình luận).
  useEffect(() => {
    if (realtimeTick === 0) return;
    let cancelled = false;
    commentService.getByTask(task.id)
      .then((res) => { if (!cancelled) setComments(res.data); })
      .catch(() => { /* bỏ qua lỗi làm mới nền */ });
    return () => { cancelled = true; };
  }, [realtimeTick, task.id]);

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking same file
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Tệp đính kèm quá lớn (tối đa 3MB).');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachment({ name: file.name, type: file.type || 'application/octet-stream', dataUrl });
    } catch {
      toast.error('Không đọc được tệp.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !attachment) return;
    setPosting(true);
    try {
      // Suy ra danh sách thành viên được @mention từ nội dung để backend tạo thông báo.
      // Khớp tên dài trước rồi loại khỏi chuỗi tạm, tránh tên ngắn là tiền tố của tên dài
      // bị nhận nhầm (vd "@Minh Tam" không được tính là nhắc tới thành viên tên "Minh").
      let scratch = newComment;
      const mentionedUserIds = [...members]
        .sort((a, b) => displayName(b.userId).length - displayName(a.userId).length)
        .filter((m) => {
          const tag = `@${displayName(m.userId)}`;
          if (!scratch.includes(tag)) return false;
          scratch = scratch.split(tag).join(' ');
          return true;
        })
        .map((m) => m.userId);
      const payload = { content: newComment.trim(), taskId: task.id, mentionedUserIds };
      if (attachment) {
        payload.attachmentName = attachment.name;
        payload.attachmentType = attachment.type;
        payload.attachmentData = attachment.dataUrl;
      }
      const res = await commentService.create(payload);
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
      setAttachment(null);
    } catch {
      toast.error('Không gửi được bình luận.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <h3 className="text-2xl font-bold text-slate-900 pr-8 break-words">{task.title}</h3>
          {task.description && <p className="text-slate-600 mt-3 whitespace-pre-wrap break-words">{task.description}</p>}

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái</label>
              <Select
                value={task.status}
                onChange={(v) => onStatusChange(task.id, v)}
                options={columns.map((c) => ({ value: c, label: statusLabel(c), dot: TASK_STATUS_DOT[c] }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Độ ưu tiên</label>
              <Select
                value={task.priority || 'Medium'}
                onChange={(v) => onPriorityChange(task.id, v)}
                options={priorities.map((p) => ({ value: p, label: priorityConfig[p].label, dot: priorityConfig[p].dot }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Người nhận</label>
              <Select
                value={task.userId || ''}
                onChange={(v) => onAssign(task.id, v)}
                placeholder="Chọn thành viên"
                options={members.map((m) => ({ value: m.userId, label: displayName(m.userId) }))}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hạn chót</label>
            <div className="flex items-center gap-2">
              <DateTimePicker
                value={toDateTimeLocal(task.dueDate)}
                onChange={(v) => onDueDateChange(task.id, v)}
                className="w-60"
              />
              {task.dueDate && (
                <button
                  type="button"
                  onClick={() => onDueDateChange(task.id, '')}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  Xóa hạn
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-5">
          {/* Yêu cầu chi tiền từ ngân sách dự án (Premium) */}
          <TaskBudgetSection
            task={task}
            currentUserId={currentUserId}
            data={budget}
            onCreateRequest={onCreateBudgetRequest}
          />

          {/* Phân tích AI */}
          <div className="mb-6">
            {!aiOpen ? (
              <button
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 bg-brand-gradient text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
              >
                <Sparkles size={16} /> Phân tích bằng AI
              </button>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 animate-pop">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2"><Sparkles size={16} className="text-indigo-600" /> Phân tích AI</h4>
                  <div className="flex items-center gap-2">
                    {!aiLoading && !aiUpgrade && (
                      <button onClick={handleAnalyze} className="text-xs font-bold text-slate-500 hover:text-indigo-600">Phân tích lại</button>
                    )}
                    <button onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                  </div>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                    <span className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                    AI đang phân tích công việc…
                  </div>
                )}
                {!aiLoading && aiUpgrade && (
                  <UpgradePanel
                    title="Phân tích task bằng AI là tính năng Premium"
                    message="Nâng cấp Premium để AI tóm tắt nội dung và gợi ý việc cần làm cho từng task."
                    perks={['Phân tích & tóm tắt task bằng AI', 'Tóm tắt công việc trên Dashboard', 'Password Vault bảo mật']}
                  />
                )}
                {!aiLoading && !aiUpgrade && aiError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm">{aiError}</div>
                )}
                {!aiLoading && !aiUpgrade && !aiError && aiText && (
                  <MarkdownLite text={aiText} />
                )}
              </div>
            )}
          </div>

          <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <MessageSquare size={16} /> Bình luận ({comments.length})
          </h4>
          {loadingComments ? (
            <p className="text-sm text-slate-400">Đang tải bình luận...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có bình luận. Bắt đầu trao đổi.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 shrink-0 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600">
                    {initials(displayName(c.userId))}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{displayName(c.userId)}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    {c.content && (
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                        <CommentText content={c.content} members={members} displayName={displayName} />
                      </p>
                    )}
                    {c.attachmentData && <CommentAttachment attachment={c} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          {attachment && (
            <div className="flex items-center gap-2 mb-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {attachment.type.startsWith('image/')
                ? <img src={attachment.dataUrl} alt="" className="w-8 h-8 rounded object-cover" />
                : <FileText size={18} className="text-slate-400" />}
              <span className="flex-1 truncate text-slate-700">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-rose-600"><X size={16} /></button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-600 p-2.5 hover:bg-rose-50 rounded-xl transition-all shrink-0" title="Xóa công việc">
              <Trash2 size={18} />
            </button>
            <form onSubmit={handleAddComment} className="flex-1 flex gap-2">
              <label className="shrink-0 cursor-pointer text-slate-400 hover:text-indigo-600 p-2.5 hover:bg-indigo-50 rounded-xl transition-all flex items-center" title="Đính kèm tệp">
                <Paperclip size={18} />
                <input type="file" className="hidden" onChange={handlePickFile} />
              </label>
              <div className="relative flex-1">
                {mentionOpen && mentionResults.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-10">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Gắn thẻ thành viên
                    </div>
                    {mentionResults.map((m, i) => (
                      <button
                        key={m.userId}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                        onMouseEnter={() => setMentionIndex(i)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === mentionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      >
                        <span className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
                          {initials(m.name)}
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Viết bình luận... (gõ @ để gắn thẻ)"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={handleCommentKeyDown}
                />
              </div>
              <button type="submit" disabled={posting || (!newComment.trim() && !attachment)} className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManageMembersModal = ({ project, currentUserId, displayName, avatarOf, onClose, onChangeRole, onRemove, onTransferOwner, onViewProfile }) => {
  const myRole = project.ownerId === currentUserId
    ? 'Owner'
    : project.members?.find((m) => m.userId === currentUserId)?.projectRole || 'Member';
  const canManage = myRole === 'Owner' || myRole === 'Leader';
  const isOwner = myRole === 'Owner';

  // Sort: owner first, then leaders, then members.
  const sorted = [...(project.members || [])].sort((a, b) => {
    const rank = (m) => (m.userId === project.ownerId ? 0 : m.projectRole === 'Leader' ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users size={20} /> Thành viên ({sorted.length})</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sorted.map((m) => {
            const memberIsOwner = m.userId === project.ownerId;
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.userId} className="flex items-center gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(m.userId)}
                  title="Xem hồ sơ"
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <Avatar src={avatarOf?.(m.userId)} name={displayName(m.userId)} className="w-9 h-9 rounded-full text-xs font-black text-indigo-600 bg-indigo-50 shrink-0 overflow-hidden" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {displayName(m.userId)} {isSelf && <span className="text-slate-400 font-medium">(bạn)</span>}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                      memberIsOwner ? 'text-amber-600' : m.projectRole === 'Leader' ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                      {memberIsOwner ? <Crown size={11} /> : m.projectRole === 'Leader' ? <Shield size={11} /> : null}
                      {memberIsOwner ? roleLabels.Owner : (roleLabels[m.projectRole] || m.projectRole)}
                    </span>
                  </div>
                </button>

                {canManage && !memberIsOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.projectRole}
                      onChange={(e) => onChangeRole(m.userId, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Member">Thành viên</option>
                      <option value="Leader">Trưởng nhóm</option>
                    </select>
                    {isOwner && (
                      <button
                        onClick={() => onTransferOwner(m.userId)}
                        title="Chuyển quyền sở hữu"
                        className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Crown size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(m.userId)}
                      title="Xóa thành viên"
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!canManage && (
          <div className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100">
            Chỉ chủ sở hữu hoặc trưởng nhóm mới quản lý được thành viên.
          </div>
        )}
      </div>
    </div>
  );
};

const CommentAttachment = ({ attachment }) => {
  const { attachmentData, attachmentName, attachmentType } = attachment;
  const isImage = (attachmentType || '').startsWith('image/');

  if (isImage) {
    return (
      <a href={attachmentData} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
        <img src={attachmentData} alt={attachmentName} className="max-h-48 rounded-lg border border-slate-200" />
      </a>
    );
  }

  return (
    <a
      href={attachmentData}
      download={attachmentName}
      className="mt-2 inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
    >
      <Download size={15} /> {attachmentName}
    </a>
  );
};

export default ProjectBoardPage;
