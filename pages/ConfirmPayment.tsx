
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { supabase } from '../backend/supabaseClient';
import { toast } from 'react-hot-toast';

const ConfirmPayment: React.FC = () => {
    const { state, actions } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
    const [error, setError] = useState<string | null>(null);

    const query = new URLSearchParams(location.search);
    const requestId = query.get('id');

    useEffect(() => {
        const fetchDetails = async () => {
            if (!requestId) {
                navigate('/plans');
                return;
            }

            setLoading(true);
            try {
                const { data: req, error: reqErr } = await supabase.from('payment_requests').select('*').eq('id', requestId).single();
                if (reqErr || !req) throw new Error("Pedido não encontrado.");

                setRequest(req);

                const { data: p } = await supabase.from('plans').select('*').eq('id', req.plan_id).single();
                setPlan(p);

                if (req.status === 'paid') {
                    navigate('/assinatura/sucesso');
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [requestId, navigate]);

    const handleGenerate = async () => {
        if (!requestId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await actions.generateCharge(requestId, paymentMethod);
            if (res.success && res.paymentUrl) {
                window.location.href = res.paymentUrl;
            } else if (res.success) {
                toast.success("Assinatura criada! Verifique seu e-mail ou a aba de assinaturas.");
                navigate('/assinaturas');
            }
        } catch (e: any) {
            setError(e.message);
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!requestId) return;
        if (!confirm("Deseja realmente cancelar este pedido?")) return;

        setLoading(true);
        try {
            await actions.cancelPaymentRequest(requestId);
            navigate('/plans');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !request) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Erro</h2>
                <p className="text-slate-400">{error}</p>
                <button onClick={() => navigate('/plans')} className="mt-8 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-white">
                    Voltar para Planos
                </button>
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <div className="flex items-center gap-4 mb-10">
                <button onClick={() => navigate('/plans')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Confirmar Assinatura</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Finalize seu pedido de upgrade</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lado Esquerdo: Resumo */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-[32px] border-white/5">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Resumo do Pedido</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Plano Selecionado</span>
                                <span className="text-white font-bold">{plan?.name || request.plan_id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Ciclo</span>
                                <span className="text-white font-bold uppercase text-xs">{request.cycle}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Modalidade</span>
                                <span className="text-white font-bold uppercase text-xs">
                                    {request.billing_type === 'monthly' ? 'Mensal Recorrente' : 'À Vista (Antecipado)'}
                                </span>
                            </div>
                            <div className="h-px bg-white/5 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm font-bold">Valor Total</span>
                                <span className="text-primary text-2xl font-black tracking-tighter">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(request.billing_value)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-8 rounded-[32px] border-white/5 bg-red-500/5 border-red-500/10">
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-red-400">info</span>
                            <p className="text-[10px] text-red-200/60 leading-relaxed uppercase font-bold tracking-widest">
                                Seu plano será ativado automaticamente assim que o sistema receber a confirmação de pagamento do Asaas.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Opções de Pagamento */}
                <div className="glass-panel p-8 rounded-[32px] border-primary/20 bg-primary/5">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-8 text-center">Como deseja pagar?</h3>

                    <div className="space-y-4 mb-10">
                        {[
                            { id: 'PIX', name: 'PIX', icon: 'account_balance_wallet', desc: 'Aprovação instantânea' },
                            { id: 'BOLETO', name: 'Boleto', icon: 'barcode', desc: 'Até 3 dias úteis' },
                            { id: 'CREDIT_CARD', name: 'Cartão de Crédito', icon: 'credit_card', desc: 'Aprovação imediata' }
                        ].map(method => (
                            <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id as any)}
                                className={`w-full p-5 rounded-2xl border transition-all flex items-center gap-4 text-left ${paymentMethod === method.id
                                    ? 'bg-primary border-primary text-neutral-900'
                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                                <div className="flex-1">
                                    <p className="font-black uppercase text-xs tracking-wider">{method.name}</p>
                                    <p className={`text-[10px] font-bold ${paymentMethod === method.id ? 'text-neutral-900/60' : 'text-slate-500'}`}>
                                        {method.desc}
                                    </p>
                                </div>
                                {paymentMethod === method.id && (
                                    <span className="material-symbols-outlined">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {request.status === 'pending' ? (
                        <div className="space-y-3">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full py-4 bg-primary text-neutral-950 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {loading ? 'Processando...' : `Gerar ${paymentMethod === 'CREDIT_CARD' ? 'Fatura' : (paymentMethod === 'PIX' ? 'PIX' : 'Boleto')}`}
                            </button>

                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full py-4 bg-transparent text-slate-500 hover:text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all text-[10px]"
                            >
                                Cancelar Pedido
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest text-center">
                                    Cobrança já gerada. Aguardando pagamento.
                                </p>
                            </div>
                            <a
                                href={request.asaas_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 bg-primary text-neutral-950 rounded-2xl font-black uppercase tracking-widest text-center"
                            >
                                Visualizar Fatura/Boleto
                            </a>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full py-4 bg-transparent text-slate-500 hover:text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all text-[10px]"
                            >
                                Cancelar e Tentar Outro
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmPayment;
