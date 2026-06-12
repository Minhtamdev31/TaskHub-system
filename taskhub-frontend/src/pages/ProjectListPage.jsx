import { useEffect, useState } from 'react';
import { projectService } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Folder, Users, Calendar, ArrowRight, X } from 'lucide-react';

const ProjectListPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await projectService.getAll();
        if (!cancelled) setProjects(res.data);
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
    } catch (err) {
      console.error('Failed to create project', err);
      alert('Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading projects...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Projects</h2>
          <p className="text-slate-500 mt-1">Manage and track all your active workspaces.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <Folder size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-600">No projects yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">Create your first project to get started.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Folder size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                  {project.description || 'No description provided for this project.'}
                </p>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>{project.members?.length || 0} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{project.status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.members?.slice(0, 3).map((m, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {m.userId.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {project.members?.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-indigo-600 font-bold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Open Board <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
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
            <h3 className="text-2xl font-bold mb-6">New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;
