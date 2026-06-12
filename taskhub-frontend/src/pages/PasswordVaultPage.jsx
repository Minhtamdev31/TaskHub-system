import { useEffect, useState } from 'react';
import { passwordVaultService } from '../services/api';
import { Eye, EyeOff, Plus, Trash2, ShieldCheck, KeyRound } from 'lucide-react';

const PasswordVaultPage = () => {
  const [credentials, setCredentials] = useState([]);
  const [visibleIds, setVisibleIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCred, setNewCred] = useState({ title: '', username: '', password: '', url: '' });

  const fetchVault = () => {
    passwordVaultService.getAll().then(res => setCredentials(res.data));
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const handleAddCredential = async (e) => {
    e.preventDefault();
    try {
      await passwordVaultService.create(newCred);
      setIsModalOpen(false);
      setNewCred({ title: '', username: '', password: '', url: '' });
      fetchVault();
    } catch {
      alert("Failed to save credential.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this credential?")) return;
    await passwordVaultService.delete(id);
    fetchVault();
  };

  const toggleVisibility = (id) => {
    const newSet = new Set(visibleIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleIds(newSet);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
            <ShieldCheck className="text-indigo-600" size={40} /> Password Vault
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Manage your project credentials within a secure zero-knowledge environment.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Add Credential
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Service / Title</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Username</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Password</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="font-bold text-slate-900">{cred.title}</div>
                  <div className="text-xs text-slate-400 font-medium">{cred.url || 'No URL'}</div>
                </td>
                <td className="px-8 py-6 text-slate-600 font-mono text-sm">{cred.username}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      {visibleIds.has(cred.id) ? cred.password : '••••••••••••'}
                    </span>
                    <button 
                      onClick={() => toggleVisibility(cred.id)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                    >
                      {visibleIds.has(cred.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => handleDelete(cred.id)}
                    className="text-slate-300 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {credentials.length === 0 && (
          <div className="text-center py-20 text-slate-400 border-t border-slate-100">
             <KeyRound size={48} className="mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">No credentials found</p>
             <p className="text-sm">Start by adding sensitive project keys or passwords.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddCredential} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Add Credential</h3>
            <div className="space-y-4">
              <input 
                type="text" placeholder="Service Name (e.g. AWS, GitHub)" 
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.title} onChange={e => setNewCred({...newCred, title: e.target.value})} required
              />
              <input 
                type="text" placeholder="Username/Email" 
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.username} onChange={e => setNewCred({...newCred, username: e.target.value})} required
              />
              <input 
                type="password" placeholder="Password" 
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.password} onChange={e => setNewCred({...newCred, password: e.target.value})} required
              />
              <input 
                type="text" placeholder="URL (Optional)" 
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.url} onChange={e => setNewCred({...newCred, url: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PasswordVaultPage;