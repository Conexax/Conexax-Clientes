import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';

const Subscriptions: React.FC = () => {
    const { state, actions, isSyncing } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        actions.syncAsaasData();
    }, []);

    const subscriptions = state.asaasSubscriptions || [];

    const filteredSubs = subscriptions.filter(sub => {
        const matchesStatus = filterStatus === 'ALL' || sub.status === filterStatus;
        const tenantName = sub.localTenant?.name?.toLowerCase() || '';
        const userName = sub.localUser?.name?.toLowerCase() || '';
        const matchesSearch = tenantName.includes(searchTerm.toLowerCase()) ||
            userName.includes(searchTerm.toLowerCase()) ||
            sub.id.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'OVERDUE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'PENDING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'EXPIRED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'CANCELED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Ativa';
            case 'OVERDUE': return 'Atrasada';
            case 'PENDING': return 'Pendente';
            case 'EXPIRED': return 'Expirada';
            case 'CANCELED': return 'Cancelada';
            default: return status;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in p-4 lg:p-6 pb-20 lg:pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">Painel de <span className="text-primary italic">Assinaturas</span></h2>
                    <p className="text-slate-500 font-medium text-sm lg:text-base">Controle financeiro e status de pagamentos via Asaas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => actions.forceSyncAsaasData()}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                        disabled={isSyncing}
                    >
                        <span className={`material-symbols-outlined text-xl ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                        <span>{isSyncing ? 'Sincronizando...' : 'Atualizar'}</span>
                    </button>
                    <Link
                        to="/assinaturas/nova"
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-neutral-950 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>Nova Assinatura</span>
                    </Link>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 glass-panel p-5 lg:p-6 rounded-[32px] border border-white/5 bg-[#050505]/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente, loja ou ID..."
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors h-12"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative md:min-w-[220px]">
                    <select
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors h-12 cursor-pointer appearance-none"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="ACTIVE">Ativas</option>
                        <option value="OVERDUE">Atrasadas</option>
                        <option value="PENDING">Pendentes</option>
                        <option value="EXPIRED">Expiradas</option>
                        <option value="CANCELED">Canceladas</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block glass-panel overflow-hidden rounded-[32px] border border-white/5 shadow-2xl relative bg-[#050505]/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente / Lojista</th>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plano/Ciclo</th>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Próximo Vencimento</th>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredSubs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-500 font-bold italic">
                                        Nenhuma assinatura encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubs.map(sub => (
                                    <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-5">
                                            <div className="font-bold text-white group-hover:text-primary transition-colors text-base">{sub.localTenant?.name || sub.localUser?.name || '---'}</div>
                                            <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mt-1">{sub.localUser?.email || '---'}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="text-slate-300 font-bold text-sm tracking-tight">{sub.description || 'Plano Conexx'}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 bg-primary/10 px-2 py-0.5 rounded w-fit">{sub.cycle}</div>
                                        </td>
                                        <td className="p-5 font-mono text-emerald-400 font-black text-base tracking-tight">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value)}
                                        </td>
                                        <td className="p-5 text-slate-300 font-bold text-xs italic">
                                            {new Date(sub.nextDueDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(sub.status)}`}>
                                                {getStatusLabel(sub.status)}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <Link to={`/assinaturas/${sub.customer}`} className="px-5 h-10 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-neutral-950 hover:border-primary transition-all inline-flex items-center gap-2">
                                                <span>Gerenciar</span>
                                                <span className="material-symbols-outlined text-[16px]">manage_history</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View: Card-based layout */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
                {filteredSubs.length === 0 ? (
                    <div className="glass-panel p-10 rounded-3xl border border-white/5 text-center text-slate-500 font-bold italic">
                        Nenhuma assinatura encontrada.
                    </div>
                ) : (
                    filteredSubs.map(sub => (
                        <div key={sub.id} className="glass-panel p-6 rounded-[32px] border border-white/5 bg-[#050505]/60 shadow-xl relative overflow-hidden active:scale-[0.98] transition-transform">
                            {sub.status === 'ACTIVE' && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>}

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h4 className="text-lg font-black text-white leading-tight tracking-tight">{sub.localTenant?.name || sub.localUser?.name || '---'}</h4>
                                    <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mt-1">{sub.localUser?.email || '---'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(sub.status)}`}>
                                    {getStatusLabel(sub.status)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5 border-y border-white/5 py-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Valor</p>
                                    <p className="text-lg font-black text-emerald-400 font-mono">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Ciclo</p>
                                    <p className="text-xs font-bold text-white uppercase italic">{sub.cycle}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Próx. Vencimento</p>
                                    <p className="text-xs font-bold text-slate-300 italic">{new Date(sub.nextDueDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <Link to={`/assinaturas/${sub.customer}`} className="h-10 px-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-neutral-950 transition-all">
                                    <span>Ver Tudo</span>
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Subscriptions;
