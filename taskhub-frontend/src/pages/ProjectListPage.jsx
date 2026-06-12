import React, { useEffect, useState } from 'react';
import { projectService } from '../services/api';
import { Plus, Users, Clock } from 'lucide-react';

const ProjectListPage = () => {
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const fetchData = async () => {
    try {
      const [projRes, invRes] = await Promise.all([
        projectService.getAll(),
        projectService.getInvitations()
      ]);
      setProjects(projRes.data);
      setInvitations(invRes.data);
    } catch (err) {
      console.error("Error fetching project data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectService.create(newProject);
      setIsModalOpen(false);
      setNewProject({ name: '', description: '' });
      fetchData();
    } catch (err) {
      alert("Failed to create project");
    }
  };

  const handleInvitationResponse = async (id, accept) => {
    try {
      await projectService.respondToInvitation(id, accept);
      fetchData();
    } catch (err) {
      alert("Error responding to invitation");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Projects</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      {/* Invitations Section */}
      {invitations.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <Users size={20} /> Pending Invitations
          </h3>
          <div className="grid gap-4">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">{inv.inviterName}</span> invited you to <span className="italic">"{inv.projectName}"</span>
                </div>
                <div className="space-x-2">
                  <button 
                    onClick={() => handleInvitationResponse(inv.id, true)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >Accept</button>
                  <button 
                    onClick={() => handleInvitationResponse(inv.id, false)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm"
                  >Ignore</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800">{project.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {project.status}
              </span>
            </div>
            <p className="text-slate-600 text-sm line-clamp-2 mb-4">{project.description}</p>
            <div className="flex items-center text-slate-400 text-xs gap-4">
              <span className="flex items-center gap-1"><Users size={14} /> {project.members?.length || 0} members</span>
              <span className="flex items-center gap-1"><Clock size={14} /> Created {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Modal Placeholder */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateProject} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold mb-4">Create New Project</h3>
            <input 
              type="text" 
              placeholder="Project Name" 
              className="w-full p-2 border rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" 
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              required
            />
            <textarea 
              placeholder="Description" 
              className="w-full p-2 border rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" 
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;