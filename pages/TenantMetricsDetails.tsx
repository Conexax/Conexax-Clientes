
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TenantMetricsDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    // Date Filters (Default to last 6 months)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('conexx_auth_token');
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            const res = await fetch(`/api/admin/metrics/tenants/${id}?startDate=${startDate}&endDate=${endDate}`, { headers });
            if (!res.ok) throw new Error('Failed to fetch details');

            const json = await res.json();
            setData(json);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar detalhes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchData();
    }, [id, startDate, endDate]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando detalhes...</div>;
    if (!data) return <div className="p-8 text-center text-slate-500">Lojista não encontrado.</div>;

    const { tenant, history, chartData } = data;

    // Chart Config
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const, labels: { color: '#fff' } },
            title: { display: false },
        },
        scales: {
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
    };

    const chartDataConfig = {
        labels: chartData.map((d: any) => new Date(d.date).toLocaleDateString('pt-BR')),
        datasets: [
            {
                label: 'Faturamento Diário',
                data: chartData.map((d: any) => d.revenue),
                borderColor: '#22c55e', // Emerald
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                tension: 0.4
            },
            {
                label: 'Comissão Estimada',
                data: chartData.map((d: any) => d.fee_estimated),
                borderColor: '#eab308', // Amber
                backgroundColor: 'rgba(234, 179, 8, 0.5)',
                borderDash: [5, 5],
                tension: 0.4
            }
        ],
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* HEADER */}
            <header className="flex items-center gap-4">
                <Link to="/admin/metrics" className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-3xl font-black text-white">{tenant.name}</h2>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                        {tenant.owner_email}
                        <span className="mx-2">•</span>
                        Meta: <span className="text-primary font-bold">{tenant.meta_range}</span>
                        <span className="mx-2">•</span>
                        Taxa: <span className="text-amber-400 font-bold">{tenant.company_percentage}%</span>
                    </p>
                </div>
            </header>

            {/* CHART SECTION */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Evolução de Faturamento</h3>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-white text-xs" />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-white text-xs" />
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <Line options={chartOptions} data={chartDataConfig} />
                </div>
            </div>

            {/* FEES HISTORY */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Histórico de Cobranças (Taxas)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <tr>
                                <th className="p-4">Semana</th>
                                <th className="p-4">Faturamento</th>
                                <th className="p-4">Taxa (%)</th>
                                <th className="p-4">Valor Cobrado</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {history.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma cobrança gerada neste período.</td></tr>
                            ) : (
                                history.map((h: any) => (
                                    <tr key={h.id} className="hover:bg-white/5">
                                        <td className="p-4 text-slate-300">
                                            {new Date(h.week_start).toLocaleDateString('pt-BR')} - {new Date(h.week_end).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4 font-mono text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.revenue_week)}
                                        </td>
                                        <td className="p-4 text-slate-400 font-bold">{h.percent_applied}%</td>
                                        <td className="p-4 font-mono text-primary font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.amount_due)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest
                             ${h.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    h.status === 'overdue' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {h.status === 'paid' ? 'Pago' : h.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {h.status === 'pending' && (
                                                <button className="text-[10px] font-bold uppercase text-primary hover:text-white transition-colors">
                                                    Cobrar Agora
                                                </button>
                                            )}
                                            {h.status === 'paid' && <span className="text-[10px] text-emerald-500 font-bold">---</span>}
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

export default TenantMetricsDetails;
