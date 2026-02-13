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
        achieved1m: 0
    };

    reportData.forEach(row => {
        const goals = row.goals_status || [];
        // Check specific codes or titles
        const g10k = goals.find((g: any) => g.code === '10K' || g.targetValue === 10000);
        const g100k = goals.find((g: any) => g.code === '100K' || g.targetValue === 100000);
        const g1m = goals.find((g: any) => g.code === '1M' || g.targetValue === 1000000);

        if (g10k?.achieved) summary.achieved10k++;
        if (g100k?.achieved) summary.achieved100k++;
        if (g1m?.achieved) summary.achieved1m++;
    });

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl border-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Clientes</p>
                    <h3 className="text-3xl font-black text-white">{summary.totalClients}</h3>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-primary/20 bg-primary/5">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Atingiram 10k</p>
                    <h3 className="text-3xl font-black text-white">{summary.achieved10k}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">{((summary.achieved10k / summary.totalClients) * 100).toFixed(0)}% da base</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-purple-500/20 bg-purple-500/5">
                    <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest mb-1">Atingiram 100k</p>
                    <h3 className="text-3xl font-black text-white">{summary.achieved100k}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">{((summary.achieved100k / summary.totalClients) * 100).toFixed(0)}% da base</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">Atingiram 1M</p>
                    <h3 className="text-3xl font-black text-white">{summary.achieved1m}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">{((summary.achieved1m / summary.totalClients) * 100).toFixed(0)}% da base</p>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-6">Detalhamento por Loja</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Loja</th>
                                <th className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Receita (R$)</th>
                                <th className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Meta 10k</th>
                                <th className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Meta 100k</th>
                                <th className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Meta 1M</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reportData.map((row) => {
                                const goals = row.goals_status || [];
                                const g10k = goals.find((g: any) => g.code === '10K' || g.targetValue === 10000);
                                const g100k = goals.find((g: any) => g.code === '100K' || g.targetValue === 100000);
                                const g1m = goals.find((g: any) => g.code === '1M' || g.targetValue === 1000000);

                                const renderStatus = (goal: any) => {
                                    if (!goal) return <span className="text-slate-600">-</span>;
                                    if (goal.achieved) {
                                        return <span className="material-symbols-outlined text-primary text-xl" title={`Atingida! (${goal.progressPercent}%)`}>check_circle</span>;
                                    }
                                    return (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-slate-500 font-bold">{goal.progressPercent.toFixed(0)}%</span>
                                            <div className="w-12 h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-slate-600" style={{ width: `${goal.progressPercent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <tr key={row.tenant_id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-bold text-white">{row.tenant_name}</p>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="text-sm font-bold text-slate-300">R$ {row.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center">{renderStatus(g10k)}</td>
                                        <td className="py-4 px-4 text-center">{renderStatus(g100k)}</td>
                                        <td className="py-4 px-4 text-center">{renderStatus(g1m)}</td>
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
