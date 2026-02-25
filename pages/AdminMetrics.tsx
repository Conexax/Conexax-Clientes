
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AdminMetrics: React.FC = () => {
    const { actions } = useData();
    const [loading, setLoading] = useState(true);

    // Date Filters (Default to current month)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [overview, setOverview] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('conexx_auth_token');
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            // 1. Fetch Overview
            const overviewRes = await fetch(`/api/admin/metrics/overview?startDate=${startDate}&endDate=${endDate}`, { headers });
            const overviewData = await overviewRes.json();
            setOverview(overviewData);

            // 2. Fetch Tenants List
            let url = `/api/admin/metrics/tenants?startDate=${startDate}&endDate=${endDate}&search=${searchTerm}`;
            if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

            const tenantsRes = await fetch(url, { headers });
            const tenantsData = await tenantsRes.json();
            setTenants(tenantsData);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar métricas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, statusFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => fetchData(), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);


    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Métricas de <span className="text-primary italic">Comissão</span></h2>
                    <p className="text-slate-500 font-medium">Acompanhe o faturamento dos lojistas e a receita da Conexx.</p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-white text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-white text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                </div>
            </header>

            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-primary border-t border-r border-b border-[#1e2a22] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative">Total Previsto</p>
                    <h3 className="text-3xl font-black text-white tracking-tight relative">
                        {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalExpected) : '---'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium relative">Baseado no faturamento do período</p>
                </div>

                <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-emerald-500 border-t border-r border-b border-[#1e2a22] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative">Total Recebido</p>
                    <h3 className="text-3xl font-black text-emerald-400 tracking-tight relative">
                        {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalPaid) : '---'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium relative">Taxas efetivamente pagas</p>
                </div>

                <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-amber-500 border-t border-r border-b border-[#1e2a22] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative">Pendente / Atrasado</p>
                    <div className="flex items-end gap-2 relative">
                        <h3 className="text-3xl font-black text-amber-500 tracking-tight">
                            {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalPending + overview.totalOverdue) : '---'}
                        </h3>
                        {overview && overview.totalOverdue > 0 && (
                            <span className="text-[10px] font-bold text-rose-500 mb-1.5 uppercase tracking-widest">
                                ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalOverdue)} vencido)
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium relative">Aguardando pagamento</p>
                </div>

                <div className="glass-panel p-6 rounded-3xl border-l-4 border-l-purple-500 border-t border-r border-b border-[#1e2a22] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-purple-500/20 transition-colors"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative">Adimplência</p>
                    <div className="flex items-center gap-4 mt-1 relative">
                        <div>
                            <h3 className="text-3xl font-black text-purple-400 tracking-tight">
                                {overview ? `${overview.adimplentes}/${overview.totalTenants}` : '---'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">Lojistas em dia</p>
                        </div>
                        {overview && (
                            <div className="h-12 w-12 rounded-full border-4 border-[#1e2a22] bg-[#050505] flex items-center justify-center text-xs font-black text-white relative shadow-inner">
                                {Math.round((overview.adimplentes / (overview.totalTenants || 1)) * 100)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-[#1e2a22] shadow-2xl">
                <div className="p-6 border-b border-[#1e2a22] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#050505]/40">
                    <div className="relative w-full md:w-96">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar lojista..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-white text-sm focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="paid">Recebido</option>
                        <option value="pending">Pendente</option>
                        <option value="overdue">Atrasado</option>
                        <option value="accumulating">Acumulando (Sem fatura)</option>
                        <option value="no_activity">Sem Atividade</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#050505] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-[#1e2a22]">
                            <tr>
                                <th className="p-4">Lojista</th>
                                <th className="p-4">Faturamento (Período)</th>
                                <th className="p-4">Taxa (%)</th>
                                <th className="p-4">Valor Devido</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2a22] text-sm bg-[#000000]/40">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold italic">Carregando dados...</td></tr>
                            ) : tenants.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold italic">Nenhum registro encontrado para este período.</td></tr>
                            ) : (
                                tenants.map(t => (
                                    <tr key={t.id} className="hover:bg-[#050505] transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white group-hover:text-primary transition-colors">{t.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{t.email}</div>
                                        </td>
                                        <td className="p-4 font-mono text-white text-xs font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.revenue_period)}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-black text-slate-400">
                                                {t.percentage}%
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-primary font-black text-base">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount_due)}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={t.status} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                to={`/admin/metrics/${t.id}`}
                                                className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all inline-flex items-center gap-1.5"
                                            >
                                                Ver Tudo <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        received: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        accumulating: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        no_activity: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    };

    const labels: any = {
        paid: 'Pago',
        received: 'Recebido',
        pending: 'Pendente',
        overdue: 'Atrasado',
        accumulating: 'Acumulando',
        no_activity: 'Sem Moviento'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.no_activity}`}>
            {labels[status] || status}
        </span>
    );
};

export default AdminMetrics;
