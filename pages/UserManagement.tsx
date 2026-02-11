
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';
import { AuthService } from '../backend/mockApi';

const UserManagement: React.FC = () => {
  const { state, actions } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    password: '',
    role: isAdmin ? UserRole.CONEXX_ADMIN : UserRole.CLIENT_USER
  });

  const users = isAdmin
    ? state.users
    : state.users.filter(u => u.tenantId === state.activeTenant?.id);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: isAdmin ? UserRole.CONEXX_ADMIN : UserRole.CLIENT_USER,
      tenantId: isAdmin ? 'CONEXX' : state.activeTenant?.id
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await actions.saveUser(formData);
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save user", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white mb-2">
            Gestão de <span className="text-primary">{isAdmin ? 'Administradores' : 'Equipe'}</span>
          </h2>
          <p className="text-slate-500 font-medium italic">
            {isAdmin
              ? 'Adicione usuários com acesso total à plataforma corporativa.'
              : 'Gerencie os membros que podem acessar os dados da sua loja.'}
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-6 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">group_add</span>
          {isAdmin ? 'Novo Admin' : 'Novo Membro'}
        </button>
      </header>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Nome</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">E-mail / Login</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Nível</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-panel-dark border border-white/5 flex items-center justify-center text-primary font-black uppercase text-xs">
                        {u.name.substring(0, 1)}
                      </div>
                      <span className="text-sm font-bold text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-mono text-slate-400 font-bold">{u.email}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.role === UserRole.CONEXX_ADMIN ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button
                      onClick={() => { if (confirm('Remover este usuário?')) actions.deleteUser(u.id) }}
                      className={`p-2 bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all ${u.id === 'ADM-01' ? 'invisible' : ''}`}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl border-primary/20 p-8">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-2xl font-black text-white italic">
                {isAdmin ? 'Cadastrar Admin Global' : 'Adicionar Equipe'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</label>
                <input
                  type="text" required
                  className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</label>
                <input
                  type="email" required
                  className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary font-mono"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Senha Provisória</label>
                <input
                  type="password" required
                  className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {!isAdmin && (
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <p className="text-[10px] text-slate-400 leading-relaxed italic">
                    Este usuário terá acesso aos dados de vendas e carrinhos desta loja, mas não poderá alterar configurações de integração.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : 'Concluir Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
