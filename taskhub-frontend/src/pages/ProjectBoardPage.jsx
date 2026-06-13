import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskService, projectService, commentService, invitationService, userService } from '../services/api';
import { toast } from '../components/Toast';
import { Plus, MoreHorizontal, Clock, X, ArrowLeft, Trash2, Send, UserPlus, MessageSquare } from 'lucide-react';

const columns = ['Todo', 'InProgress', 'Review', 'Done'];

const initials = (name) => (name || 'NA').substring(0, 2).toUpperCase();

const ProjectBoardPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userMap, setUserMap] = useState({}); // userId -> { username, fullName }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

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
        const [pRes, tRes] = await Promise.all([
          projectService.getById(id),
          taskService.getByProject(id),
        ]);
        if (!cancelled) {
          setProject(pRes.data);
          setTasks(tRes.data);
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
      });
      setTasks((prev) => [...prev, res.data]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '' });
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

  if (!project) return <div className="p-8 text-slate-500">Loading board...</div>;

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

      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map((column) => (
          <div key={column} className="flex-shrink-0 w-80 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700">{column}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {tasks.filter((t) => t.status === column).length}
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
              {tasks.filter((t) => t.status === column).map((task) => (
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
                  <h4 className="font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {task.title}
                  </h4>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={project.members || []}
          displayName={displayName}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleUpdateStatus}
          onAssign={handleAssign}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

const TaskDetailModal = ({ task, members, displayName, onClose, onStatusChange, onAssign, onDelete }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    commentService.getByTask(task.id)
      .then((res) => { if (!cancelled) setComments(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load comments.'); })
      .finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [task.id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await commentService.create({ content: newComment.trim(), taskId: task.id });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
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

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
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
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center gap-3">
          <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-600 p-2.5 hover:bg-rose-50 rounded-xl transition-all shrink-0" title="Delete task">
            <Trash2 size={18} />
          </button>
          <form onSubmit={handleAddComment} className="flex-1 flex gap-2">
            <input type="text" placeholder="Write a comment..." className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            <button type="submit" disabled={posting || !newComment.trim()} className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectBoardPage;
