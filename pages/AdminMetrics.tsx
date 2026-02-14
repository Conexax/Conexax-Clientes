
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
                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                </div>
            </header>

            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Previsto</p>
                    <h3 className="text-2xl font-black text-white">
                        {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalExpected) : '---'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-2">Baseado no faturamento do período</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500 relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Recebido</p>
                    <h3 className="text-2xl font-black text-emerald-400">
                        {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalPaid) : '---'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-2">Taxas efetivamente pagas</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500 relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pendente / Atrasado</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-2xl font-black text-amber-500">
                            {overview ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalPending + overview.totalOverdue) : '---'}
                        </h3>
                        {overview && overview.totalOverdue > 0 && (
                            <span className="text-xs font-bold text-rose-500 mb-1">
                                ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overview.totalOverdue)} vencido)
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Aguardando pagamento</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500 relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Adimplência</p>
                    <div className="flex items-center gap-4 mt-1">
                        <div>
                            <h3 className="text-2xl font-black text-purple-400">
                                {overview ? `${overview.adimplentes}/${overview.totalTenants}` : '---'}
                            </h3>
                            <p className="text-[10px] text-slate-500">Lojistas em dia</p>
                        </div>
                        {overview && (
                            <div className="h-10 w-10 rounded-full border-4 border-white/5 flex items-center justify-center text-xs font-bold text-white relative">
                                {Math.round((overview.adimplentes / (overview.totalTenants || 1)) * 100)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <input
                            type="text"
                            placeholder="Buscar lojista..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
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
                        <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <tr>
                                <th className="p-4">Lojista</th>
                                <th className="p-4">Faturamento (Período)</th>
                                <th className="p-4">Taxa (%)</th>
                                <th className="p-4">Valor Devido</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando dados...</td></tr>
                            ) : tenants.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum registro encontrado para este período.</td></tr>
                            ) : (
                                tenants.map(t => (
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{t.name}</div>
                                            <div className="text-xs text-slate-500">{t.email}</div>
                                        </td>
                                        <td className="p-4 font-mono text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.revenue_period)}
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-400">
                                            {t.percentage}%
                                        </td>
                                        <td className="p-4 font-mono text-primary font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount_due)}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={t.status} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                to={`/admin/metrics/${t.id}`}
                                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-all inline-flex items-center gap-1"
                                            >
                                                Ver Detalhes <span className="material-symbols-outlined text-xs">arrow_forward</span>
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
