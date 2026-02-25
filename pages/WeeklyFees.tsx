
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const WeeklyFees: React.FC<{ tenantId?: string; readOnly?: boolean }> = ({ tenantId, readOnly }) => {
    const { state, actions, isLoading } = useData();
    const [methodModal, setMethodModal] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const targetId = tenantId || state.activeTenant?.id;
        if (targetId) {
            actions.fetchWeeklyFees(targetId);
        }
    }, [state.activeTenant?.id, tenantId]);

    const handleGenerate = async (id: string, method: string) => {
        setProcessingId(id);
        try {
            const res = await actions.generateWeeklyCharge(id, method);
            if (res.paymentUrl) {
                window.open(res.paymentUrl, '_blank');
                actions.fetchWeeklyFees(state.activeTenant!.id);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setProcessingId(null);
            setMethodModal(null);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Deseja cancelar esta cobrança?")) return;
        setProcessingId(id);
        try {
            await actions.cancelWeeklyFee(id);
            actions.fetchWeeklyFees(state.activeTenant!.id);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'created': return 'text-primary bg-primary/10 border-primary/20';
            case 'overdue': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'canceled': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
            default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Pago';
            case 'created': return 'Aguardando';
            case 'overdue': return 'Vencido';
            case 'canceled': return 'Cancelado';
            default: return 'Pendente';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Taxas Semanais</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Histórico de cobranças baseadas no faturamento</p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block glass-panel overflow-hidden rounded-[32px] border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Período</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Faturamento</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Taxa (%)</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Valor Devido</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {state.weeklyFees?.map((fee) => (
                            <tr key={fee.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white tracking-tight">
                                            {new Date(fee.weekStart).toLocaleDateString()} a {new Date(fee.weekEnd).toLocaleDateString()}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Semana Corrente</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right font-mono text-sm text-slate-300">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.revenueWeek)}
                                </td>
                                <td className="px-6 py-5 text-right font-bold text-slate-500 text-xs">
                                    {fee.percentApplied}%
                                </td>
                                <td className="px-6 py-5 text-right font-black text-white text-sm">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.amountDue)}
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex justify-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(fee.status)}`}>
                                            {getStatusLabel(fee.status)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        {fee.status === 'pending' && !readOnly && (
                                            <button
                                                onClick={() => setMethodModal(fee.id)}
                                                disabled={processingId === fee.id}
                                                className="px-4 py-2 bg-primary text-neutral-950 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                                            >
                                                Pagar Agora
                                            </button>
                                        )}
                                        {fee.status === 'created' && !readOnly && (
                                            <>
                                                <a
                                                    href={fee.asaasInvoiceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
                                                >
                                                    Abrir Fatura <span className="material-symbols-outlined text-xs">open_in_new</span>
                                                </a>
                                                <button
                                                    onClick={() => handleCancel(fee.id)}
                                                    disabled={processingId === fee.id}
                                                    className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </>
                                        )}
                                        {fee.status === 'paid' && (
                                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Compensado em {fee.paymentDate && new Date(fee.paymentDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!state.weeklyFees || state.weeklyFees.length === 0) && (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center">
                                    <span className="material-symbols-outlined text-slate-700 text-5xl mb-4">history</span>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum histórico de taxas encontrado</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {state.weeklyFees?.map((fee) => (
                    <div key={fee.id} className="glass-panel p-5 rounded-3xl border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-2 inline-block ${getStatusColor(fee.status)}`}>
                                    {getStatusLabel(fee.status)}
                                </span>
                                <div className="text-sm font-bold text-white tracking-tight">
                                    {new Date(fee.weekStart).toLocaleDateString()} a {new Date(fee.weekEnd).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Semana Corrente</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Faturamento</p>
                                <p className="text-base text-slate-300 font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.revenueWeek)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Valor Devido</p>
                                <p className="text-xl text-white font-black">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.amountDue)}
                                </p>
                                <p className="text-[10px] text-slate-600 font-bold mt-1">Taxa: {fee.percentApplied}%</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {fee.status === 'pending' && !readOnly && (
                                <button
                                    onClick={() => setMethodModal(fee.id)}
                                    disabled={processingId === fee.id}
                                    className="w-full py-3 bg-primary text-neutral-950 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    Pagar Agora
                                </button>
                            )}
                            {fee.status === 'created' && !readOnly && (
                                <div className="flex gap-2">
                                    <a
                                        href={fee.asaasInvoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-3 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        Abrir Fatura <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    </a>
                                    <button
                                        onClick={() => handleCancel(fee.id)}
                                        disabled={processingId === fee.id}
                                        className="w-12 flex items-center justify-center bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            )}
                            {fee.status === 'paid' && (
                                <div className="text-center py-2 bg-green-500/5 rounded-xl border border-green-500/10">
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                                        Compensado em {fee.paymentDate && new Date(fee.paymentDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {(!state.weeklyFees || state.weeklyFees.length === 0) && (
                    <div className="glass-panel p-10 rounded-3xl border-white/5 text-center">
                        <span className="material-symbols-outlined text-slate-700 text-5xl mb-4">history</span>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum histórico de taxas encontrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Escolha de Método */}
            {methodModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-sm rounded-[32px] p-8 border-primary/20 bg-neutral-900 shadow-2xl">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 text-center">Escolher Método</h3>
                        <div className="space-y-3">
                            {[
                                { id: 'PIX', name: 'PIX (Imediato)', icon: 'account_balance_wallet' },
                                { id: 'BOLETO', name: 'Boleto (1-2 dias)', icon: 'barcode' },
                                { id: 'CREDIT_CARD', name: 'Cartão de Crédito', icon: 'credit_card' },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handleGenerate(methodModal, m.id)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-primary hover:text-neutral-950 hover:border-primary transition-all group"
                                >
                                    <span className="material-symbols-outlined text-xl">{m.icon}</span>
                                    <span className="font-black uppercase text-[10px] tracking-widest">{m.name}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setMethodModal(null)}
                            className="w-full mt-6 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyFees;
