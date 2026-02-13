import React, { useState, useEffect } from 'react';
import { supabase } from '../backend/supabaseClient'; // Ensure this exists or use state.supabase if available

interface Subscription {
    id: string;
    status: string;
    value: number;
    next_due_date: string;
    plans: {
        name: string;
    };
    payments: Array<{
        status: string;
        value: number;
        due_date: string;
        paid_at: string;
    }>;
}

const SubscriptionPanel: React.FC = () => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id || localStorage.getItem('conexx_user_id');
            if (!userId) return;

            const { data, error } = await supabase.functions.invoke('get-subscription-status', {
                body: { user_id: userId }
            });

            if (data) setSubscription(data.subscription);
            if (error) console.error("Error fetching subscription:", error);
        } catch (error) {
            console.error("Error fetching subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Poll for status updates every 30 seconds if pending
        const interval = setInterval(() => {
            if (subscription?.status === 'pending') fetchStatus();
        }, 30000);
        return () => clearInterval(interval);
    }, [subscription?.status]);

    const handleCancel = async () => {
        if (!subscription || !window.confirm("Deseja realmente cancelar sua assinatura?")) return;
        setActionLoading(true);
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id || localStorage.getItem('conexx_user_id');
            const { error } = await supabase.functions.invoke('cancel-subscription', {
                body: { subscription_id: subscription.id, user_id: userId }
            });
            if (error) throw error;
            await fetchStatus();
        } catch (error) {
            console.error("Error canceling:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-40 bg-white/5 rounded-3xl" />;

    if (!subscription) {
        return (
            <div className="glass-panel p-8 rounded-3xl border-dashed border-white/10 text-center">
                <p className="text-slate-500 font-medium italic">Nenhuma assinatura ativa encontrada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${subscription.status === 'active' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                        }`}>
                        {subscription.status === 'active' ? 'Ativo' : 'Pendente / Aguardando'}
                    </span>
                    <h3 className="text-2xl font-black text-white mt-2">{subscription.plans?.name}</h3>
                    <p className="text-slate-400 text-sm">
                        Próximo vencimento: <span className="text-white font-bold">{subscription.next_due_date ? new Date(subscription.next_due_date).toLocaleDateString() : 'N/A'}</span>
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <p className="text-2xl font-black text-white italic">R$ {Number(subscription.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <button
                        onClick={handleCancel}
                        disabled={actionLoading || subscription.status === 'canceled'}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                    >
                        {actionLoading ? 'Cancelando...' : 'Cancelar Assinatura'}
                    </button>
                </div>
            </div>

            {subscription.payments && subscription.payments.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl border-white/5 bg-black/20">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Últimos Pagamentos</h4>
                    <div className="space-y-3">
                        {subscription.payments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-bold text-white">R$ {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(p.due_date).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase ${p.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {p.status === 'paid' ? 'Pago' : 'Pendente'}
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
