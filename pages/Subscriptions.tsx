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
    const customers = state.asaasCustomers || [];

    const getCustomerName = (id: string) => {
        const cust = customers.find(c => c.id === id);
        return cust ? cust.name : id;
    };

    const getCustomerEmail = (id: string) => {
        const cust = customers.find(c => c.id === id);
        return cust ? cust.email : '';
    };

    const filteredSubs = subscriptions.filter(sub => {
        const matchesStatus = filterStatus === 'ALL' || sub.status === filterStatus;
        const tenantName = sub.localTenant?.name?.toLowerCase() || '';
        const userName = sub.localUser?.name?.toLowerCase() || '';
        const matchesSearch = tenantName.includes(searchTerm.toLowerCase()) ||
            userName.includes(searchTerm.toLowerCase()) ||
            sub.id.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Painel de <span className="text-primary italic">Assinaturas</span></h2>
                    <p className="text-slate-500 font-medium">Gerencie clientes, cobranças e status de pagamentos via Asaas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => actions.forceSyncAsaasData()}
                        className="btn-secondary"
                        disabled={isSyncing}
                    >
                        <span className={`material-symbols-outlined ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                        {isSyncing ? 'Sincronizando...' : 'Atualizar'}
                    </button>
                    <button className="btn-primary">
                        <span className="material-symbols-outlined">add</span>
                        Nova Assinatura
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 glass-panel p-5 rounded-3xl border border-[#1e2a22] bg-[#050505]/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none min-w-[200px]"
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
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden rounded-3xl border border-[#1e2a22] shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#050505] border-b border-[#1e2a22]">
                            <tr>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente / Lojista</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plano/Ciclo</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Próx. Vencimento</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Assinatura</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2a22] text-sm bg-[#000000]/40">
                            {filteredSubs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold italic">
                                        Nenhuma assinatura encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubs.map(sub => (
                                    <tr key={sub.id} className="hover:bg-[#050505] transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white group-hover:text-primary transition-colors">{sub.localTenant?.name || sub.localUser?.name || '---'}</div>
                                            <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500">{sub.localUser?.email || '---'}</div>
                                            <div className="text-[10px] text-slate-600 font-mono mt-1">ID: {sub.customer.split('_')[1] || sub.customer}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-300 font-bold text-sm tracking-tight">{sub.description || 'Plano Conexx'}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">{sub.cycle}</div>
                                        </td>
                                        <td className="p-4 font-mono text-emerald-400 font-black text-base tracking-tight">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value)}
                                        </td>
                                        <td className="p-4 text-slate-300 font-bold text-xs">
                                            {new Date(sub.nextDueDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border 
                                                    ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        sub.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                    {sub.status === 'ACTIVE' ? 'Ativa' :
                                                        sub.status === 'OVERDUE' ? 'Atrasada' :
                                                            sub.status === 'PENDING' ? 'Pendente' : sub.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link to={`/assinaturas/${sub.customer}`} className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all inline-flex items-center gap-1.5 float-right">
                                                <span>Ver Tudo</span>
                                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
