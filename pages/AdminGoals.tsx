
import React from 'react';
import { useData } from '../context/DataContext';
import GoalProgressBar from '../components/GoalProgressBar';

const AdminGoals: React.FC = () => {
    const { state } = useData();

    // Sort tenants by revenue (descending) by default, excluding traffic-only
    const sortedTenants = [...state.tenants]
        .filter(t => t.businessType !== 'traffic-management')
        .sort((a, b) => (b.cachedGrossRevenue || 0) - (a.cachedGrossRevenue || 0));

    // Calculate tiers
    const topTenant = sortedTenants.length > 0 ? sortedTenants[0] : null;
    let tier1 = 0; // 0 to 10k
    let tier2 = 0; // 10k to 100k
    let tier3 = 0; // 100k to 1M
    let tier4 = 0; // > 1M

    sortedTenants.forEach(t => {
        const rev = t.cachedGrossRevenue || 0;
        if (rev <= 10000) tier1++;
        else if (rev <= 100000) tier2++;
        else if (rev <= 1000000) tier3++;
        else tier4++;
    });

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-black text-white">Monitoramento de Metas</h2>
                <p className="text-slate-500 text-sm font-medium">Acompanhe o progresso de faturamento de todos os lojistas.</p>
            </header>

            {/* Resumo de Faturamento (Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-panel rounded-[24px] p-6 border border-primary/20 flex flex-col justify-between hover:border-primary/40 transition-all relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="flex items-center gap-2 text-[12px] font-black text-primary uppercase tracking-widest"><span className="material-symbols-outlined text-[16px]">workspace_premium</span> Top 1 Lojista</h4>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[16px] font-black text-white truncate" title={topTenant?.name || ''}>{topTenant?.name || '---'}</p>
                        <p className="text-xl font-black text-emerald-400 mt-1">
                            {topTenant ? `R$ ${(topTenant.cachedGrossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                        </p>
                    </div>
                </div>

                <div className="glass-panel rounded-[24px] p-6 border border-white/5 flex flex-col justify-between hover:border-slate-500/30 transition-all relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Até R$ 10k</h4>
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-black text-white">{tier1}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lojistas</p>
                    </div>
                </div>

                <div className="glass-panel rounded-[24px] p-6 border border-white/5 flex flex-col justify-between hover:border-slate-500/30 transition-all relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">R$ 10k - 100k</h4>
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-black text-white">{tier2}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lojistas</p>
                    </div>
                </div>

                <div className="glass-panel rounded-[24px] p-6 border border-white/5 flex flex-col justify-between hover:border-slate-500/30 transition-all relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">R$ 100k - 1M</h4>
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-black text-white">{tier3}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lojistas</p>
                    </div>
                </div>

                <div className="glass-panel rounded-[24px] p-6 border border-amber-500/20 flex flex-col justify-between hover:border-amber-500/40 transition-all relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h4 className="flex items-center gap-2 text-[12px] font-black text-amber-500 uppercase tracking-widest"><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Acima R$ 1M</h4>
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-black text-white drop-shadow-lg">{tier4}</p>
                        <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-1">Lojistas</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-xs font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4">Lojista</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4 text-right">Faturamento (Cache)</th>
                                <th className="p-4 text-center">Progresso da Meta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {sortedTenants.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div>
                                            <p className="font-bold text-white">{tenant.name}</p>
                                            <p className="text-xs text-slate-500">{tenant.ownerName} ({tenant.ownerEmail})</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300">
                                            {state.plans.find(p => p.id === tenant.planId)?.name || 'Sem Plano'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-emerald-400 font-bold">
                                        R$ {(tenant.cachedGrossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 flex justify-center">
                                        <div className="scale-75 origin-center">
                                            <GoalProgressBar currentRevenue={tenant.cachedGrossRevenue || 0} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedTenants.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                        Nenhum lojista encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminGoals;
