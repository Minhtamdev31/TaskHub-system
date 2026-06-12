import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskService, projectService } from '../services/api';
import { Plus, MoreHorizontal, Clock, X, ArrowLeft } from 'lucide-react';

const ProjectBoardPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });
  const columns = ['Todo', 'InProgress', 'Review', 'Done'];

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
        }
      } catch (err) {
        console.error('Error fetching board data', err);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskService.update(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch {
      alert('Failed to update task status');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        projectId: id,
        dueDate: newTask.dueDate || null,
      };
      const res = await taskService.create(payload);
      setTasks((prev) => [...prev, res.data]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '' });
    } catch {
      alert('Failed to create task');
    } finally {
      setCreating(false);
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
          <div className="flex -space-x-2 mr-4">
            {(project.members || []).map((m, i) => (
              <div key={i} title={m.userId} className="w-10 h-10 rounded-full border-4 border-slate-50 bg-white flex items-center justify-center text-xs font-bold shadow-sm">
                {m.userId.substring(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
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

            <div className="flex-1 space-y-4 min-h-[500px] p-2 bg-slate-100/50 rounded-3xl border border-slate-200/50">
              {tasks.filter((t) => t.status === column).map((task) => (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group">
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
                    <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                      {task.userId?.substring(0, 2).toUpperCase() || 'NA'}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 hidden group-hover:flex flex-wrap gap-1">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateTask} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6">Create Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectBoardPage;
