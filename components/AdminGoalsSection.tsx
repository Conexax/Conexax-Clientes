import React from 'react';
import { GoalProgress } from '../types';

interface AdminGoalsSectionProps {
    reportData: any[]; // Array of rows from get_goals_progress RPC
    isLoading: boolean;
}

const AdminGoalsSection: React.FC<AdminGoalsSectionProps> = ({ reportData, isLoading }) => {
    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando dados de metas...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="p-8 text-center text-slate-500">Nenhum dado encontrado para o período.</div>;
    }

    // Calculate Summary
    // Assuming 3 hardcoded goals for summary cards as requested: 10k, 100k, 1M
    // But strictly we should iterate.
    // RPC returns 'goals_status' as JSONB array in each row.

    const summary = {
        totalClients: reportData.length,
        achieved10k: 0,
        achieved100k: 0,
        achieved1m: 0,
        nearMilestone: 0
    };

    const topPerformers = [...reportData]
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 3);

    reportData.forEach(row => {
        const goals = row.goals_status || [];
        const g10k = goals.find((g: any) => g.code === '10K' || g.targetValue === 10000);
        const g100k = goals.find((g: any) => g.code === '100K' || g.targetValue === 100000);
        const g1m = goals.find((g: any) => g.code === '1M' || g.targetValue === 1000000);

        if (g10k?.achieved) summary.achieved10k++;
        if (g100k?.achieved) summary.achieved100k++;
        if (g1m?.achieved) summary.achieved1m++;

        const isNear = goals.some((g: any) => !g.achieved && g.progressPercent >= 80);
        if (isNear) summary.nearMilestone++;
    });

    return (
        <div className="space-y-8">
            {/* Top Performers / Destaques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {topPerformers.map((client, i) => (
                    <div key={client.tenant_id} className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="material-symbols-outlined text-amber-400 text-3xl opacity-50">
                                {i === 0 ? 'military_tech' : i === 1 ? 'workspace_premium' : 'stars'}
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Top {i + 1} Performance</p>
                        <h4 className="text-xl font-black text-white mb-4 line-clamp-1">{client.tenant_name}</h4>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Faturamento Total</p>
                                <p className="text-2xl font-black text-primary">R$ {client.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-white italic">{client.meta_range}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Status: {client.goals_status.filter((g: any) => g.achieved).length} Metas</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Clientes</p>
                    <h3 className="text-2xl font-black text-white">{summary.totalClients}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Atingiram 10k</p>
                    <h3 className="text-2xl font-black text-white">{summary.achieved10k}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-purple-500/20 bg-purple-500/5">
                    <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest mb-1">Atingiram 100k</p>
                    <h3 className="text-2xl font-black text-white">{summary.achieved100k}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">Atingiram 1M</p>
                    <h3 className="text-2xl font-black text-white">{summary.achieved1m}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-rose-500/20 bg-rose-500/5 animate-pulse">
                    <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Perto da Meta</p>
                    <h3 className="text-2xl font-black text-white">{summary.nearMilestone}</h3>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white">Detalhamento por Loja</h3>
                    <p className="text-xs text-slate-500 mt-1">Status individual de progresso e metas definidas.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Loja</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Meta Definida</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right border-b border-white/5">Receita (R$)</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center border-b border-white/5">10k</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center border-b border-white/5">100k</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center border-b border-white/5">1M</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reportData.map((row) => {
                                const goals = row.goals_status || [];
                                const g10k = goals.find((g: any) => g.code === '10K' || g.targetValue === 10000);
                                const g100k = goals.find((g: any) => g.code === '100K' || g.targetValue === 100000);
                                const g1m = goals.find((g: any) => g.code === '1M' || g.targetValue === 1000000);

                                // Identify if the store is "near" its milestone
                                const isNear = goals.some((g: any) => !g.achieved && g.progressPercent >= 80);

                                const renderStatus = (goal: any) => {
                                    if (!goal) return <span className="text-slate-600">-</span>;
                                    if (goal.achieved) {
                                        return (
                                            <div className="flex flex-col items-center">
                                                <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                                                <span className="text-[8px] font-black text-emerald-500 uppercase">Atingida</span>
                                            </div>
                                        );
                                    }
                                    const nearGoal = goal.progressPercent >= 80;
                                    return (
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[10px] font-bold ${nearGoal ? 'text-rose-400' : 'text-slate-500'}`}>{goal.progressPercent.toFixed(0)}%</span>
                                            <div className="w-12 h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full ${nearGoal ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} style={{ width: `${goal.progressPercent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <tr key={row.tenant_id} className={`hover:bg-white/5 transition-colors ${isNear ? 'bg-rose-500/5' : ''}`}>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white">{row.tenant_name}</p>
                                                {isNear && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded">Quase lá!</span>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black text-slate-400 uppercase">
                                                {row.meta_range || 'Não definida'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-sm font-bold text-slate-200">R$ {row.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">{renderStatus(g10k)}</td>
                                        <td className="py-4 px-6 text-center">{renderStatus(g100k)}</td>
                                        <td className="py-4 px-6 text-center">{renderStatus(g1m)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminGoalsSection;
