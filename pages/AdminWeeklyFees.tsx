
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Tenant, WeeklyFee } from '../types';

const AdminWeeklyFees: React.FC = () => {
    const { state, actions, isLoading } = useData();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [fees, setFees] = useState<WeeklyFee[]>([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal & Calculation State
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [previewFees, setPreviewFees] = useState<any[]>([]);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Set default dates (Current Week) when component mounts or modal opens
    useEffect(() => {
        if (showCalcModal) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
            // Preview will be triggered by useEffect below on date change
        }
    }, [showCalcModal]);

    // Fetch Preview when dates change
    useEffect(() => {
        if (showCalcModal && startDate && endDate) {
            const fetchPreview = async () => {
                try {
                    // Ensure action exists to prevent crash
                    if (actions.previewWeeklyFees) {
                        const data = await actions.previewWeeklyFees(startDate, endDate);
                        setPreviewFees(data || []);
                    } else {
                        console.warn("previewWeeklyFees action not available");
                    }
                } catch (e) {
                    console.error("Preview error", e);
                }
            };
            fetchPreview();
        }
    }, [showCalcModal, startDate, endDate]);

    // When a tenant is selected, fetch their fees
    useEffect(() => {
        if (selectedTenant) {
            setLoadingFees(true);
            actions.fetchWeeklyFees(selectedTenant.id).then(() => {
                setLoadingFees(false);
            });
        } else {
            setFees([]);
        }
    }, [selectedTenant]);

    // Update local fees from global state when it changes
    useEffect(() => {
        if (selectedTenant && state.weeklyFees) {
            setFees(state.weeklyFees);
        }
    }, [state.weeklyFees, selectedTenant]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenCalcModal = () => {
        setShowCalcModal(true);
    };

    const handleConfirmCalculation = async () => {
        try {
            const res = await actions.calculateWeeklyFees(startDate, endDate);
            showToast(`Cálculo processado! ${res.created || 0} taxas geradas com sucesso.`, 'success');
            setShowCalcModal(false);

            // Refresh current view if selected
            if (selectedTenant) actions.fetchWeeklyFees(selectedTenant.id);
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleSendCharge = async (fee: WeeklyFee) => {
        // if (!confirm(...)) -> Replace with custom UI or just proceed with Toast undo? 
        // User asked "usas pop dentro do sistema". confirming is good but let's just do it with loading state.

        setProcessingId(fee.id);
        try {
            // Admin generates as Boleto by default
            await actions.generateWeeklyCharge(fee.id, 'BOLETO');
            actions.fetchWeeklyFees(selectedTenant!.id);
            showToast("Cobrança enviada via Asaas!", 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
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
            case 'created': return 'Enviado';
            case 'overdue': return 'Vencido';
            case 'canceled': return 'Cancelado';
            default: return 'Pendente';
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

            {/* Left Column: Tenant List */}
            <div className="w-1/2 flex flex-col gap-6">
                <header className="flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-white">Taxas Semanais</h2>
                        <p className="text-slate-500 text-sm font-medium">Gestão de Revenue Share</p>
                    </div>
                    <button
                        onClick={handleOpenCalcModal}
                        className="px-4 py-2 bg-primary text-neutral-950 rounded-xl font-bold text-xs uppercase hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">calculate</span>
                        Calcular Semana
                    </button>
                </header>

                <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1 scrollbar-thin">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-neutral-900 border-b border-white/5 z-10">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Lojista</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-right">Faturamento</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-center">% Config</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {state.tenants.map(t => (
                                    <tr
                                        key={t.id}
                                        onClick={() => setSelectedTenant(t)}
                                        className={`cursor-pointer transition-colors ${selectedTenant?.id === t.id ? 'bg-primary/10' : 'hover:bg-white/5'}`}
                                    >
                                        <td className="p-4">
                                            <p className="font-bold text-white text-sm">{t.name}</p>
                                            <p className="text-[10px] text-slate-500">{t.ownerEmail}</p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-mono text-emerald-400 font-bold text-xs">
                                                R$ {(t.cachedGrossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 bg-white/5 rounded text-xs font-bold text-white">
                                                {t.companyPercentage || 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Column: Details & History */}
            <div className="w-1/2 flex flex-col gap-6">
                {selectedTenant ? (
                    <>
                        <header className="shrink-0 h-[68px] flex items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedTenant.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-slate-300">
                                        ID: {selectedTenant.id}
                                    </span>
                                    <span className="text-[10px] font-black bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                                        Fee: {selectedTenant.companyPercentage || 0}%
                                    </span>
                                </div>
                            </div>
                        </header>

                        <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col p-6">
                            <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Histórico de Cobranças</h4>

                            {loadingFees ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="overflow-y-auto flex-1 scrollbar-thin space-y-3">
                                    {fees.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 italic text-sm">Nenhuma cobrança registrada.</div>
                                    ) : (
                                        fees.map(fee => (
                                            <div key={fee.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group hover:border-white/10 transition-all">
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold mb-1">
                                                        {new Date(fee.weekStart).toLocaleDateString()} - {new Date(fee.weekEnd).toLocaleDateString()}
                                                    </p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-lg font-black text-white">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.amountDue)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.revenueWeek)} base)
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${getStatusColor(fee.status)}`}>
                                                        {getStatusLabel(fee.status)}
                                                    </span>

                                                    {fee.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleSendCharge(fee)}
                                                            disabled={processingId === fee.id}
                                                            className="text-[10px] font-bold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            {processingId === fee.id ? 'Enviando...' : 'Gerar Boleto'} <span className="material-symbols-outlined text-sm">send</span>
                                                        </button>
                                                    )}
                                                    {fee.status === 'created' && (
                                                        <a
                                                            href={fee.asaasInvoiceUrl}
                                                            target="_blank"
                                                            className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider flex items-center gap-1"
                                                        >
                                                            Ver Fatura <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 glass-panel rounded-2xl flex items-center justify-center text-slate-500 flex-col gap-4 border-dashed border-2 border-white/5">
                        <span className="material-symbols-outlined text-6xl opacity-20">touch_app</span>
                        <p className="font-medium text-sm">Selecione um lojista para gerenciar taxas.</p>
                    </div>
                )}
            </div>

            {/* Calculation Modal */}
            {showCalcModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl p-8 border-primary/20 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic">Calcular Taxas</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase">Pré-visualização de valores baseados no faturamento</p>
                            </div>
                            <button onClick={() => setShowCalcModal(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        {/* Date Range & Totals */}
                        <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 mb-6 items-end">
                            <div className="space-y-1 flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Data Início</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/40 border-neutral-border rounded-lg px-4 py-2 text-sm text-white"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Data Fim</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/40 border-neutral-border rounded-lg px-4 py-2 text-sm text-white"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="px-6 py-2 bg-black/20 rounded-lg text-right border border-white/5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total a Gerar</span>
                                <span className="text-xl font-black text-primary">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewFees.reduce((acc, curr) => acc + curr.amount, 0))}
                                </span>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="flex-1 overflow-y-auto mb-6 scrollbar-thin bg-black/20 rounded-xl border border-white/5">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-[10px] font-black uppercase text-slate-500">Lojista</th>
                                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 text-right">Faturamento (Ref.)</th>
                                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 text-center">% Fee</th>
                                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 text-right">Valor Calculado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {previewFees.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5">
                                            <td className="p-3 text-xs font-bold text-slate-300">{item.tenantName}</td>
                                            <td className="p-3 text-xs font-mono text-slate-400 text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}
                                            </td>
                                            <td className="p-3 text-xs text-center font-bold text-slate-500">{item.pct}%</td>
                                            <td className="p-3 text-sm font-black text-emerald-400 text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {previewFees.length === 0 && (
                                        <tr><td colSpan={4} className="p-6 text-center text-slate-500 text-xs">Nenhum lojista com configurações de taxa.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button onClick={() => setShowCalcModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-white transition-colors text-xs uppercase">Cancelar</button>
                            <button
                                onClick={handleConfirmCalculation}
                                disabled={previewFees.length === 0}
                                className="px-8 py-3 bg-primary text-neutral-950 rounded-xl font-black uppercase hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                            >
                                Confirmar e Gerar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWeeklyFees;
