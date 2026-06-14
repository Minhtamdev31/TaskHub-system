import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskService, projectService, commentService, invitationService, userService, authService } from '../services/api';
import { toast } from '../components/Toast';
import { Plus, MoreHorizontal, Clock, X, ArrowLeft, Trash2, Send, UserPlus, MessageSquare, Search, Paperclip, Download, FileText, Users, Crown, Shield } from 'lucide-react';

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const columns = ['Todo', 'InProgress', 'Review', 'Done'];

const priorities = ['Low', 'Medium', 'High', 'Critical'];

const priorityConfig = {
  Low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Medium: { label: 'Medium', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  High: { label: 'High', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Critical: { label: 'Critical', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

const priorityBadge = (p) => priorityConfig[p] || priorityConfig.Medium;

const initials = (name) => (name || 'NA').substring(0, 2).toUpperCase();

const ProjectBoardPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userMap, setUserMap] = useState({}); // userId -> { username, fullName }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'Medium' });

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const displayName = useCallback(
    (userId) => userMap[userId]?.username || userMap[userId]?.fullName || userId || 'Unassigned',
    [userMap]
  );

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
        toast.error('Failed to load board data.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, loadUserNames]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskService.update(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: newStatus } : prev));
    } catch {
      toast.error('Failed to update task status.');
    }
  };

  const handleUpdatePriority = async (taskId, newPriority) => {
    try {
      await taskService.update(taskId, { priority: newPriority });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, priority: newPriority } : prev));
    } catch {
      toast.error('Failed to update priority.');
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
        dueDate: newTask.dueDate || null,
        priority: newTask.priority,
      });
      setTasks((prev) => [...prev, res.data]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '', priority: 'Medium' });
      toast.success('Task created.');
    } catch {
      toast.error('Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskService.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      toast.success('Task deleted.');
    } catch {
      toast.error('Failed to delete task.');
    }
  };

  const handleAssign = async (taskId, targetUserId) => {
    try {
      await taskService.assign(taskId, targetUserId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, userId: targetUserId } : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, userId: targetUserId } : prev));
      toast.success('Task assigned.');
    } catch {
      toast.error('Failed to assign task.');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await invitationService.invite({ projectId: id, invitedEmail: inviteEmail });
      toast.success(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch (err) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : 'Failed to send invitation.';
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (targetUserId, newRole) => {
    try {
      const res = await projectService.changeMemberRole(id, targetUserId, newRole);
      setProject(res.data);
      toast.success('Member role updated.');
    } catch {
      toast.error('Failed to update role.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectService.removeMember(id, targetUserId);
      setProject((prev) => ({ ...prev, members: prev.members.filter((m) => m.userId !== targetUserId) }));
      toast.success('Member removed.');
    } catch {
      toast.error('Failed to remove member.');
    }
  };

  const handleTransferOwner = async (targetUserId) => {
    if (!window.confirm('Transfer project ownership to this member? You will become a Leader.')) return;
    try {
      const res = await projectService.transferOwnership(id, targetUserId);
      setProject(res.data);
      toast.success('Ownership transferred.');
    } catch {
      toast.error('Failed to transfer ownership.');
    }
  };

  if (!project) return <div className="p-8 text-slate-500">Loading board...</div>;

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
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <Link to="/projects" className="text-sm font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Projects
          </Link>
          <nav className="text-sm font-medium text-slate-400 mb-1">Projects / {project.name}</nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Kanban Board</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 mr-2">
            {(project.members || []).map((m, i) => (
              <div key={i} title={displayName(m.userId)} className="w-10 h-10 rounded-full border-4 border-slate-50 bg-white flex items-center justify-center text-xs font-bold shadow-sm">
                {initials(displayName(m.userId))}
              </div>
            ))}
          </div>
          <button
            onClick={() => setManageOpen(true)}
            className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Users size={16} /> Members
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <UserPlus size={16} /> Invite
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Create Task
          </button>
        </div>
      </div>

      {/* Search & Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="All">All priorities</option>
          {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="All">All assignees</option>
          <option value="Unassigned">Unassigned</option>
          {(project.members || []).map((m) => <option key={m.userId} value={m.userId}>{displayName(m.userId)}</option>)}
        </select>
        {filtersActive && (
          <button
            onClick={() => { setSearch(''); setPriorityFilter('All'); setAssigneeFilter('All'); }}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        )}
        <span className="text-xs font-bold text-slate-400 ml-auto">{visibleTasks.length} / {tasks.length} tasks</span>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map((column) => (
          <div key={column} className="flex-shrink-0 w-80 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700">{column}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {visibleTasks.filter((t) => t.status === column).length}
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); if (dragOverColumn !== column) setDragOverColumn(column); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); }}
              onDrop={() => handleDrop(column)}
              className={`flex-1 space-y-4 min-h-[500px] p-2 rounded-3xl border transition-colors ${
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
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
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
                          <Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div title={displayName(task.userId)} className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                      {initials(displayName(task.userId))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 hidden group-hover:flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    {columns.filter((c) => c !== column).map((c) => (
                      <button
                        key={c}
                        onClick={() => handleUpdateStatus(task.id, c)}
                        className="text-[9px] font-bold px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
                      >
                        Move to {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateTask} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6">Create Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">Cancel</button>
              <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Task'}
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
            <h3 className="text-2xl font-bold mb-2">Invite Member</h3>
            <p className="text-sm text-slate-500 mb-6">Send a project invitation to a teammate's email.</p>
            <input type="email" required placeholder="teammate@example.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setInviteOpen(false)} className="text-slate-500 font-medium px-4">Cancel</button>
              <button type="submit" disabled={inviting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invite'}
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
          onClose={() => setManageOpen(false)}
          onChangeRole={handleChangeRole}
          onRemove={handleRemoveMember}
          onTransferOwner={handleTransferOwner}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={project.members || []}
          displayName={displayName}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleUpdateStatus}
          onPriorityChange={handleUpdatePriority}
          onAssign={handleAssign}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

const TaskDetailModal = ({ task, members, displayName, onClose, onStatusChange, onPriorityChange, onAssign, onDelete }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [attachment, setAttachment] = useState(null); // { name, type, dataUrl }

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    commentService.getByTask(task.id)
      .then((res) => { if (!cancelled) setComments(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load comments.'); })
      .finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [task.id]);

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking same file
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Attachment too large (max 3MB).');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachment({ name: file.name, type: file.type || 'application/octet-stream', dataUrl });
    } catch {
      toast.error('Failed to read file.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !attachment) return;
    setPosting(true);
    try {
      const payload = { content: newComment.trim(), taskId: task.id };
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
      toast.error('Failed to add comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <h3 className="text-2xl font-bold text-slate-900 pr-8">{task.title}</h3>
          {task.description && <p className="text-slate-600 mt-3 whitespace-pre-wrap">{task.description}</p>}

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
              <select value={task.priority || 'Medium'} onChange={(e) => onPriorityChange(task.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assignee</label>
              <select value={task.userId || ''} onChange={(e) => onAssign(task.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="" disabled>Select member</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{displayName(m.userId)}</option>)}
              </select>
            </div>
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-4 uppercase tracking-wider">
              <Clock size={14} /> Due {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-5">
          <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <MessageSquare size={16} /> Comments ({comments.length})
          </h4>
          {loadingComments ? (
            <p className="text-sm text-slate-400">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-400">No comments yet. Start the discussion.</p>
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
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.content && <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.content}</p>}
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
            <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-600 p-2.5 hover:bg-rose-50 rounded-xl transition-all shrink-0" title="Delete task">
              <Trash2 size={18} />
            </button>
            <form onSubmit={handleAddComment} className="flex-1 flex gap-2">
              <label className="shrink-0 cursor-pointer text-slate-400 hover:text-indigo-600 p-2.5 hover:bg-indigo-50 rounded-xl transition-all flex items-center" title="Attach file">
                <Paperclip size={18} />
                <input type="file" className="hidden" onChange={handlePickFile} />
              </label>
              <input type="text" placeholder="Write a comment..." className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
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

const ManageMembersModal = ({ project, currentUserId, displayName, onClose, onChangeRole, onRemove, onTransferOwner }) => {
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
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users size={20} /> Members ({sorted.length})</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sorted.map((m) => {
            const memberIsOwner = m.userId === project.ownerId;
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.userId} className="flex items-center gap-3 px-6 py-4">
                <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-xs font-black text-indigo-600 shrink-0">
                  {initials(displayName(m.userId))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {displayName(m.userId)} {isSelf && <span className="text-slate-400 font-medium">(you)</span>}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                    memberIsOwner ? 'text-amber-600' : m.projectRole === 'Leader' ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {memberIsOwner ? <Crown size={11} /> : m.projectRole === 'Leader' ? <Shield size={11} /> : null}
                    {memberIsOwner ? 'Owner' : m.projectRole}
                  </span>
                </div>

                {canManage && !memberIsOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.projectRole}
                      onChange={(e) => onChangeRole(m.userId, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Member">Member</option>
                      <option value="Leader">Leader</option>
                    </select>
                    {isOwner && (
                      <button
                        onClick={() => onTransferOwner(m.userId)}
                        title="Transfer ownership"
                        className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Crown size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(m.userId)}
                      title="Remove member"
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
            Only the owner or a leader can manage members.
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
