import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';

const TeamManagement: React.FC = () => {
    const { state, actions } = useData();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');

    useEffect(() => {
        actions.fetchTeam();
    }, [state.activeTenant]);

    useEffect(() => {
        setTeam(state.team || []);
    }, [state.team]);

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await actions.addTeamMember({ name, email, password, role });
            toast.success('Membro adicionado com sucesso!');
            setIsModalOpen(false);
            setName('');
            setEmail('');
            setPassword('');
            setRole('user');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao adicionar membro.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMember = async (userId: string) => {
        if (!confirm('Remover o acesso deste colaborador?')) return;
        try {
            await actions.deleteTeamMember(userId);
            toast.success('Membro removido.');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remover membro.');
        }
    };

    return (
        <div className="space-y-10">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Equipe</h2>
                    <p className="text-slate-500 font-bold italic tracking-wide">Gerencie os acessos de seus colaboradores.</p>
                </div>
                <div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-neutral-950 font-black uppercase tracking-widest text-xs rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Novo Colaborador
                    </button>
                </div>
            </header>

            <div className="glass-panel rounded-[32px] overflow-hidden border border-[#1e2a22] shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="p-8">
                    {team.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-4">group_off</span>
                            <p className="font-bold">Nenhum membro na equipe ainda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#050505] text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl rounded-bl-xl">Colaborador</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4 text-center">Permissão</th>
                                        <th className="p-4 text-right rounded-tr-xl rounded-br-xl">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1e2a22] text-sm">
                                    {team.map((member) => (
                                        <tr key={member.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 py-6 font-bold text-white flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">
                                                    {member.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                {member.name}
                                            </td>
                                            <td className="p-4 text-slate-400">{member.email}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest ${member.role === 'manager' ? 'text-primary' : 'text-slate-400'}`}>
                                                    {member.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                                                    title="Remover"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Novo Membro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="glass-panel w-full max-w-md rounded-[32px] p-8 bg-[#0a0a0a] border-[#1e2a22]">
                        <h3 className="text-xl font-black text-white mb-6">Novo Colaborador</h3>
                        <form onSubmit={handleCreateMember} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nome</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Senha Inicial</label>
                                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nível de Acesso</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-primary appearance-none">
                                    <option value="user">Colaborador (User)</option>
                                    <option value="manager">Gerente (Manager)</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-xs hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary text-neutral-950 font-black uppercase text-xs tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
                                    {loading ? 'Salvando...' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
