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
            <div className="flex flex-col md:flex-row gap-4 glass-panel p-4 rounded-xl">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50"
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
            <div className="glass-panel overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente / Lojista</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano/Ciclo</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Próx. Vencimento</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Assinatura</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm cursor-pointer">
                            {filteredSubs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Nenhuma assinatura encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubs.map(sub => (
                                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{sub.localTenant?.name || sub.localUser?.name || '---'}</div>
                                            <div className="text-xs text-slate-500">{sub.localUser?.email || '---'}</div>
                                            <div className="text-[10px] text-slate-600 font-mono mt-1">{sub.customer}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-300 font-bold">{sub.description || 'Plano Conexx'}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-tighter">{sub.cycle}</div>
                                        </td>
                                        <td className="p-4 font-mono text-emerald-400 font-bold">
                                            R$ {sub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-slate-300 font-medium">
                                            {new Date(sub.nextDueDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest 
                                                    ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        sub.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                                                            'bg-slate-500/10 text-slate-400'}`}>
                                                    {sub.status === 'ACTIVE' ? 'Ativa' :
                                                        sub.status === 'OVERDUE' ? 'Atrasada' :
                                                            sub.status === 'PENDING' ? 'Pendente' : sub.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link to={`/assinaturas/${sub.customer}`} className="flex items-center justify-end gap-1 text-primary hover:text-white transition-all group">
                                                <span className="text-[10px] font-black uppercase underline decoration-primary/30 group-hover:decoration-primary">Ver Tudo</span>
                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
