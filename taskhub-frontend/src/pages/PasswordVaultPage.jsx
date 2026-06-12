import React, { useEffect, useState } from 'react';
import { passwordVaultService } from '../services/api';
import { Eye, EyeOff, Plus, Trash2, ShieldCheck } from 'lucide-react';

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
    } catch (err) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={32} /> Password Vault
          </h2>
          <p className="text-slate-500 mt-1">Manage your sensitive project credentials securely.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Add Credential
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Service/Title</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Username</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Password</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{cred.title}</div>
                  <div className="text-xs text-slate-400">{cred.url}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{cred.username}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {visibleIds.has(cred.id) ? cred.password : '••••••••••••'}
                    </span>
                    <button 
                      onClick={() => toggleVisibility(cred.id)}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {visibleIds.has(cred.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(cred.id)}
                    className="text-slate-400 hover:text-red-600 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {credentials.length === 0 && (
          <div className="p-12 text-center text-slate-400">No credentials found. Start by adding one.</div>
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