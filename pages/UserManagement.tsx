
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';
import { AuthService } from '../backend/mockApi';

const UserManagement: React.FC = () => {
  const { state, actions } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
    <div className="space-y-6 md:space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
            Gestão de <span className="text-primary">{isAdmin ? 'Administradores' : 'Equipe'}</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium italic">
            {isAdmin
              ? 'Adicione usuários com acesso total à plataforma corporativa.'
              : 'Gerencie os membros que podem acessar os dados da sua loja.'}
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="w-full md:w-auto px-6 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">group_add</span>
          {isAdmin ? 'Novo Admin' : 'Novo Membro'}
        </button>
      </header>

      <section className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Usuário</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Acesso / E-mail</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Cargo / Função</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {users.map((row) => (
                <tr key={row.email} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black uppercase text-xs">
                        {row.name.substring(0, 2)}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white group-hover:text-primary transition-colors">{row.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{row.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-mono text-slate-400 font-bold">{row.email}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      {row.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingUser(row); setFormData(row); setShowModal(true); }} className="p-2 bg-white/5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if (confirm('Remover usuário?')) actions.deleteUser(row.email) }} className={`p-2 bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all ${row.id === 'ADM-01' ? 'invisible' : ''}`}><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {users.map((row) => (
            <div key={row.email} className="glass-panel p-6 rounded-2xl border-white/5 space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase text-sm">
                    {row.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{row.name}</h4>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{row.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingUser(row); setFormData(row); setShowModal(true); }} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 rounded-xl">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => { if (confirm('Remover usuário?')) actions.deleteUser(row.email) }} className={`w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl ${row.id === 'ADM-01' ? 'invisible' : ''}`}>
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail de Acesso</p>
                <p className="text-sm font-mono text-slate-300 font-bold truncate">{row.email}</p>
              </div>

              <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Função</p>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {row.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

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
