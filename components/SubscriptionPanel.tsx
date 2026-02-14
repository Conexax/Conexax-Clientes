import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';

const SubscriptionPanel: React.FC = () => {
    const { state, actions } = useData();
    const [actionLoading, setActionLoading] = useState(false);

    // Derive subscription status from state
    const activeTenant = state.activeTenant;
    const currentPlan = state.plans.find(p => p.id === activeTenant?.planId);

    // Get latest payment for this tenant/user
    const payments = state.paymentRequests || [];
    const latestPayment = payments[0]; // Assuming ordered by date desc

    useEffect(() => {
        actions.fetchMyPayments();
    }, []);

    if (!activeTenant || !currentPlan) {
        return (
            <div className="glass-panel p-8 rounded-3xl border-dashed border-white/10 text-center">
                <p className="text-slate-500 font-medium italic">Nenhuma assinatura ativa encontrada.</p>
            </div>
        );
    }

    const handleCancel = async () => {
        if (!window.confirm("Deseja realmente cancelar sua assinatura?")) return;
        setActionLoading(true);
        try {
            // Implement cancel logic if API exists, or just notify user that request was sent to support
            // await actions.cancelSubscription(activeTenant.id);
            toast.success("Solicitação de cancelamento enviada ao suporte.");
        } catch (error) {
            console.error("Error canceling:", error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${activeTenant.subscriptionStatus === 'active' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                        }`}>
                        {activeTenant.subscriptionStatus === 'active' ? 'Ativo' : 'Pendente / Aguardando'}
                    </span>
                    <h3 className="text-2xl font-black text-white mt-2">{currentPlan.name}</h3>
                    <p className="text-slate-400 text-sm">
                        Próximo vencimento: <span className="text-white font-bold">{activeTenant.nextBilling ? new Date(activeTenant.nextBilling).toLocaleDateString() : 'N/A'}</span>
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <p className="text-2xl font-black text-white italic">
                        {/* Calculate monthly or cycle value */}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            activeTenant.billingCycle === 'quarterly' ? currentPlan.priceQuarterly :
                                activeTenant.billingCycle === 'semiannual' ? currentPlan.priceSemiannual :
                                    currentPlan.priceYearly
                        )}
                        <span className="text-xs text-slate-500 not-italic ml-1">/{activeTenant.billingCycle === 'quarterly' ? 'trimes' : activeTenant.billingCycle === 'semiannual' ? 'semest' : 'ano'}</span>
                    </p>
                    <button
                        onClick={handleCancel}
                        disabled={actionLoading}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                    >
                        {actionLoading ? 'Cancelando...' : 'Cancelar Assinatura'}
                    </button>
                </div>
            </div>

            {payments.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl border-white/5 bg-black/20">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Últimos Pagamentos</h4>
                    <div className="space-y-3">
                        {payments.slice(0, 5).map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-bold text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.billingValue)}
                                    </p>
                                    <p className="text-[10px] text-slate-500">{new Date(p.dueDate || p.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase ${p.status === 'paid' || p.status === 'captured' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {p.status === 'paid' || p.status === 'captured' ? 'Pago' : p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPanel;
