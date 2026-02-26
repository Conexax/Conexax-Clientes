
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Tenant, WeeklyFee } from '../types';

const AdminWeeklyFees: React.FC = () => {
    const { state, actions, isLoading } = useData();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [fees, setFees] = useState<WeeklyFee[]>([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Calculation State
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [paymentModal, setPaymentModal] = useState<string | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
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

    const handleMarkAsPaid = async (feeId: string) => {
        if (!adminPassword) return showToast('A senha é obrigatória', 'error');
        setProcessingId(feeId);
        try {
            await actions.markFeeAsPaid(feeId, adminPassword);
            showToast('Taxa marcada como paga com sucesso!', 'success');
            setPaymentModal(null);
            setAdminPassword('');
            actions.fetchWeeklyFees(selectedTenant!.id);
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelFee = async (feeId: string) => {
        if (!confirm("Tem certeza que deseja cancelar esta taxa?")) return;
        setProcessingId(feeId);
        try {
            await actions.cancelWeeklyFee(feeId);
            showToast('Taxa cancelada com sucesso.', 'success');
            actions.fetchWeeklyFees(selectedTenant!.id);
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
            <div className="w-full lg:w-1/3 glass-panel rounded-3xl overflow-hidden border border-[#1e2a22] shadow-2xl flex flex-col h-[600px] bg-[#050505]/40 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="p-5 border-b border-[#1e2a22] bg-[#050505]">
                    <div className="relative mb-4">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar lojista..."
                            className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleOpenCalcModal}
                        className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-neutral-950 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[14px]">calculate</span>
                        Gerar Retroativas
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="p-5 border-b border-[#1e2a22] bg-[#050505]">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar lojista..."
                            className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors"
                            value={searchTerm} // Add if you need search handling, but I'll omit to avoid type errors since it's not defined here
                            onChange={e => { }} // dummy onChange
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#050505] border-b border-[#1e2a22] z-10">
                            <tr>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lojista</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Faturamento</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">% Config</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2a22] bg-[#000000]/20">
                            {state.tenants.filter(t => t.businessType !== 'traffic-management' && t.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                                <tr
                                    key={t.id}
                                    onClick={() => setSelectedTenant(t)}
                                    className={`cursor-pointer transition-colors group ${selectedTenant?.id === t.id ? 'bg-primary/10' : 'hover:bg-[#050505]'}`}
                                >
                                    <td className="p-4">
                                        <p className={`font-bold text-sm ${selectedTenant?.id === t.id ? 'text-white' : 'text-slate-300'} group-hover:text-primary transition-colors`}>{t.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase truncate max-w-[120px]">{t.ownerEmail}</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-mono text-emerald-400 font-bold text-xs">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.cachedGrossRevenue || 0)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-black text-slate-400">
                                            {t.companyPercentage || 0}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column: Details & History */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                {selectedTenant ? (
                    <>
                        <header className="shrink-0 h-[68px] flex items-center justify-between border-b border-[#1e2a22] pb-4">
                            <div>
                                <h3 className="text-2xl font-black text-white">{selectedTenant.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                        ID: {selectedTenant.id.split('-')[0]}
                                    </span>
                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                                        Fee Acordado: {selectedTenant.companyPercentage || 0}%
                                    </span>
                                </div>
                            </div>
                        </header>

                        <div className="glass-panel flex-1 rounded-3xl overflow-hidden flex flex-col p-6 border border-[#1e2a22] shadow-2xl relative bg-[#050505]/40">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest relative">Histórico de Cobranças</h4>

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
                                            <div key={fee.id} className="p-5 bg-[#050505] rounded-2xl border border-[#1e2a22] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-[#00D189]/30 transition-all relative overflow-hidden">
                                                {fee.status === 'paid' && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>}
                                                <div className="relative">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                                                        {new Date(fee.weekStart).toLocaleDateString()} a {new Date(fee.weekEnd).toLocaleDateString()}
                                                    </p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className={`text-2xl font-black tracking-tight ${fee.status === 'paid' ? 'text-emerald-400' : 'text-white'}`}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.amountDue)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-mono">
                                                            (Base {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.revenueWeek)})
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:items-end gap-3 relative">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(fee.status)}`}>
                                                        {getStatusLabel(fee.status)}
                                                    </span>

                                                    <div className="flex gap-2">
                                                        {fee.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleSendCharge(fee)}
                                                                disabled={processingId === fee.id}
                                                                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-neutral-950 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                                            >
                                                                {processingId === fee.id ? 'Enviando...' : 'Boleto/Pix'}
                                                            </button>
                                                        )}
                                                        {fee.status === 'created' && (
                                                            <a
                                                                href={fee.asaasInvoiceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-4 py-2 bg-slate-700/50 text-slate-300 border border-slate-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-slate-600/50 flex items-center gap-1"
                                                            >
                                                                Fatura <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                            </a>
                                                        )}
                                                        {(fee.status === 'pending' || fee.status === 'created') && (
                                                            <>
                                                                <button
                                                                    onClick={() => setPaymentModal(fee.id)}
                                                                    disabled={processingId === fee.id}
                                                                    className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                                                >
                                                                    Marcar Pago
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelFee(fee.id)}
                                                                    disabled={processingId === fee.id}
                                                                    className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 glass-panel rounded-3xl flex items-center justify-center text-slate-500 flex-col gap-4 border-dashed border-2 border-[#1e2a22] bg-[#050505]/40 h-[600px]">
                        <span className="material-symbols-outlined text-6xl opacity-20">touch_app</span>
                        <p className="font-bold text-sm tracking-widest uppercase text-slate-600">Selecione Lojista na Lista</p>
                    </div>
                )}
            </div>

            {/* Calculation Modal */}
            {
                showCalcModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl p-8 border-[#1e2a22] shadow-2xl bg-[#050505]/95 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic">Calcular Taxas</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase">Pré-visualização de valores baseados no faturamento</p>
                                </div>
                                <button onClick={() => setShowCalcModal(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            {/* Date Range & Totals */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1">Início da Semana</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1">Fim da Semana</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 italic">O sistema irá iterar semana a semana dentro deste período e gerar as cobranças.</p>
                                </div>
                                <div className="bg-[#00D189]/10 border border-[#00D189]/20 rounded-2xl p-5 flex flex-col justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00D189] mb-1">Resumo (Prévia)</span>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-3xl font-black text-white tracking-tighter">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewFees.reduce((acc, f) => acc + f.amount, 0))}
                                            </p>
                                            <p className="text-xs text-[#00D189]/70 font-bold uppercase tracking-widest mt-1">Total a Gerar</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-white content-end">
                                                {previewFees.length}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Taxas Mapeadas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview List */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin rounded-xl border border-[#1e2a22] bg-[#000000]/40 mb-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#050505] sticky top-0 z-10 border-b border-[#1e2a22]">
                                        <tr>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lojista</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Semana</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Faturamento</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Valor Taxa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e2a22]">
                                        {previewFees.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold text-slate-300">{p.tenantName}</td>
                                                <td className="p-4 text-center text-xs text-slate-500">
                                                    {new Date(p.weekStart).toLocaleDateString()} a {new Date(p.weekEnd).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right font-mono text-xs">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.revenue)}
                                                </td>
                                                <td className="p-4 text-right font-black text-white">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}
                                                    <span className="block text-[10px] text-slate-500 font-normal">({p.pct}%)</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {previewFees.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-500">Nenhuma taxa encontrada para o período selecionado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-[#1e2a22]">
                                <button
                                    onClick={() => setShowCalcModal(false)}
                                    className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmCalculation}
                                    disabled={previewFees.length === 0}
                                    className="px-8 py-3 bg-primary text-neutral-950 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                    Processar & Gerar Taxas
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Payment Confirmation Modal */}
            {paymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-sm rounded-[32px] p-8 border-primary/20 bg-neutral-900 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2 text-center">Confirmar Pagamento</h3>
                        <p className="text-xs text-slate-400 text-center mb-6">Confirme sua senha de administrador para marcar esta taxa como paga manualmente.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Senha do Admin</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                onClick={() => handleMarkAsPaid(paymentModal)}
                                disabled={!adminPassword || processingId === paymentModal}
                                className="w-full py-3 bg-primary text-neutral-950 rounded-xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === paymentModal ? (
                                    <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Confirmar Baixa
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setPaymentModal(null);
                                    setAdminPassword('');
                                }}
                                className="w-full py-3 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminWeeklyFees;
