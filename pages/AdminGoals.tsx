
import React from 'react';
import { useData } from '../context/DataContext';
import GoalProgressBar from '../components/GoalProgressBar';

const AdminGoals: React.FC = () => {
    const { state } = useData();

    // Sort tenants by revenue (descending) by default
    const sortedTenants = [...state.tenants].sort((a, b) => (b.cachedGrossRevenue || 0) - (a.cachedGrossRevenue || 0));

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-black text-white">Monitoramento de Metas</h2>
                <p className="text-slate-500 text-sm font-medium">Acompanhe o progresso de faturamento de todos os lojistas.</p>
            </header>

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
