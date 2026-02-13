import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import DateRangeFilter from '../components/DateRangeFilter';

const AdminStatement: React.FC = () => {
    const { state } = useData();
    const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999))
    });
    const [filterPeriod, setFilterPeriod] = useState('today');

    const handleFilterChange = (start: Date, end: Date, period: string) => {
        setDateRange({ start, end });
        setFilterPeriod(period);
    };

    const statementData = useMemo(() => {
        return state.tenants.map(tenant => {
            // Filter orders for this tenant
            const tenantOrders = state.orders.filter(o => {
                const d = new Date(o.date);
                const validStatus = o.status === 'APROVADO' || (o.status as any) === 'paid' || (o.status as any) === 'approved';
                return o.tenantId === tenant.id && validStatus && d >= dateRange.start && d <= dateRange.end;
            });

            const grossRevenue = tenantOrders.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
            const companyPercentage = Number(tenant.companyPercentage || 0);
            const commission = grossRevenue * (companyPercentage / 100);

            return {
                tenant,
                grossRevenue,
                companyPercentage,
                commission,
                orderCount: tenantOrders.length,
                ids: tenantOrders.map(o => o.id)
            };
        }).sort((a, b) => b.commission - a.commission); // Sort by highest commission
    }, [state.orders, state.tenants, dateRange]);

    const totals = useMemo(() => {
        return statementData.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.grossRevenue,
            commission: acc.commission + curr.commission
        }), { revenue: 0, commission: 0 });
    }, [statementData]);

    return (
        <div className="space-y-10">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white mb-2">Extrato <span className="text-primary italic">Detalhado</span></h2>
                    <p className="text-slate-500 font-medium italic">Relatório de performance e comissões por lojista.</p>
                </div>

                <DateRangeFilter onFilterChange={handleFilterChange} />
            </header>

            {/* Totais Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <span className="material-symbols-outlined text-slate-600">hub</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-tighter">Receita Bruta ({filterPeriod === 'total' ? 'Total' : 'Período'})</p>
                    <h4 className="text-2xl font-black text-primary">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                </div>

                <div className="glass-panel p-6 rounded-2xl stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <span className="material-symbols-outlined text-slate-600">payments</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-tighter">Comissão da Empresa</p>
                    <h4 className="text-2xl font-black text-emerald-400">R$ {totals.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                </div>
            </div>

            {/* Table */}
            <section className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden lg:block glass-panel p-6 rounded-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lojista</th>
                                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Pedidos</th>
                                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Receita Bruta</th>
                                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Percentual (%)</th>
                                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right text-emerald-400">Comissão (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {statementData.map(row => (
                                    <tr key={row.tenant.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                    {(row.tenant.name || 'L').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{row.tenant.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{row.tenant.ownerEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-300 text-right font-medium">{row.orderCount}</td>
                                        <td className="py-4 px-4 text-sm text-white text-right font-bold">R$ {row.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-4 px-4 text-sm text-slate-400 text-right">{row.companyPercentage}%</td>
                                        <td className="py-4 px-4 text-sm text-emerald-400 text-right font-black">R$ {row.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                    {statementData.map(row => (
                        <div key={row.tenant.id} className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase text-sm">
                                    {(row.tenant.name || 'L').substring(0, 2)}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white">{row.tenant.name}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{row.tenant.ownerEmail}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pedidos</p>
                                    <p className="text-sm font-bold text-white tracking-tight">{row.orderCount}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Percentual</p>
                                    <p className="text-sm font-bold text-slate-300 tracking-tight">{row.companyPercentage}%</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Bruta</p>
                                    <p className="text-sm font-bold text-white">R$ {row.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Sua Comissão</p>
                                    <p className="text-lg font-black text-emerald-400 leading-none">R$ {row.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {statementData.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-2xl border-dashed border-neutral-border/30">
                        <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">analytics</span>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum dado encontrado</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AdminStatement;
