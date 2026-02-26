import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface PreCheckoutProps {
    plan: any;
    billingCycle: 'quarterly' | 'semiannual' | 'yearly';
    onClose: () => void;
    onConfirm: (billingType: 'monthly' | 'upfront', paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX') => Promise<void>;
    loading: boolean;
    manualCheckoutUrl?: string | null;
}

const PreCheckout: React.FC<PreCheckoutProps> = ({ plan, billingCycle, onClose, onConfirm, loading, manualCheckoutUrl }) => {
    const [billingType, setBillingType] = useState<'monthly' | 'upfront'>('monthly');
    const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');

    const getPrice = () => {
        switch (billingCycle) {
            case 'quarterly': return plan.priceQuarterly;
            case 'semiannual': return plan.priceSemiannual;
            case 'yearly': return plan.priceYearly;
            default: return 0;
        }
    };

    const cycleLabel = billingCycle === 'quarterly' ? 'Trimestral' : billingCycle === 'semiannual' ? 'Semestral' : 'Anual';
    const totalValue = getPrice();
    const months = billingCycle === 'quarterly' ? 3 : billingCycle === 'semiannual' ? 6 : 12;
    const monthlyValue = totalValue / months;

    const discountPercent = plan.discountUpfrontPercent || 0;
    const upfrontValue = totalValue * (1 - discountPercent / 100);

    return (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-end lg:justify-center animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet / Modal Content */}
            <div className="relative z-10 w-full lg:max-w-4xl bg-[#050505] lg:rounded-[40px] rounded-t-[40px] border border-[#1e2a22] h-[90vh] lg:h-auto overflow-y-auto p-8 lg:p-12 shadow-2xl transition-all duration-300 ease-out translate-y-0">

                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 lg:hidden shrink-0" />

                {/* Background Effects (Desktop Only or contained) */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none -z-10" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Header */}
                <div className="flex justify-between items-start mb-8 lg:mb-10">
                    <div>
                        <h2 className="text-2xl lg:text-4xl font-black text-white mb-2">
                            Como deseja <span className="text-emerald-500">pagar?</span>
                        </h2>
                        <p className="text-sm lg:text-base text-slate-400 font-medium italic">
                            Escolha a melhor modalidade para seu fluxo de caixa.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 lg:p-3 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 lg:pb-0">
                    {/* Left Column: Payment Methods */}
                    <div className="lg:col-span-7 space-y-8">
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                                SELECIONE O MEIO DE PAGAMENTO
                            </p>
                            <div className="grid grid-cols-3 gap-3 lg:gap-4">
                                <button
                                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                                    className={`h-20 lg:h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'CREDIT_CARD'
                                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl lg:text-3xl">credit_card</span>
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">Cartão</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('PIX')}
                                    className={`h-20 lg:h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'PIX'
                                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl lg:text-3xl">qr_code_2</span>
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">Pix</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('BOLETO')}
                                    className={`h-20 lg:h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'BOLETO'
                                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl lg:text-3xl">description</span>
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">Boleto</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
                                <span className="material-symbols-outlined max-lg:text-xl">info</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Próximo Passo</p>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Após selecionar o método acima, escolha uma opção abaixo para
                                    <span className="text-white font-bold mx-1">GERAR SUA FATURA</span>
                                    e abrir o checkout seguro.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Billing Options */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Option 1: Monthly */}
                        <button
                            onClick={() => onConfirm('monthly', paymentMethod)}
                            disabled={loading}
                            className="w-full text-left p-5 lg:p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex justify-between items-start mb-3 lg:mb-4">
                                <h3 className="text-base lg:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Pagamento Mensal</h3>
                                <span className="material-symbols-outlined text-slate-500">calendar_month</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 lg:mb-6 leading-relaxed">
                                Pague mês a mês sem comprometer o limite total do cartão.
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl lg:text-3xl font-black text-white italic">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyValue)}
                                </span>
                                <span className="text-xs font-bold text-slate-500">/ mês</span>
                            </div>
                        </button>

                        {/* Option 2: Upfront */}
                        <button
                            onClick={() => onConfirm('upfront', paymentMethod)}
                            disabled={loading}
                            className="w-full text-left p-5 lg:p-6 rounded-3xl bg-emerald-900/20 border border-emerald-500/30 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {discountPercent > 0 && (
                                <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] lg:text-[10px] font-black px-2 lg:px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                    -{discountPercent}% OFF
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-3 lg:mb-4">
                                <h3 className="text-base lg:text-lg font-bold text-white italic group-hover:text-emerald-400 transition-colors">Pagamento Antecipado</h3>
                                <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 lg:mb-6 italic leading-relaxed">
                                Valor único para {cycleLabel}, com desconto exclusivo.
                            </p>

                            <div className="flex items-baseline gap-3">
                                <span className="text-2xl lg:text-3xl font-black text-emerald-500 italic">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upfrontValue)}
                                </span>
                                {discountPercent > 0 && (
                                    <span className="text-xs lg:text-sm font-bold text-slate-500 line-through decoration-emerald-500/50">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="mt-8 lg:mt-12 text-center pb-8 lg:pb-0">
                    {manualCheckoutUrl ? (
                        <a
                            href={manualCheckoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full lg:w-auto py-4 px-8 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 animate-pulse"
                        >
                            <span className="material-symbols-outlined">open_in_new</span>
                            Clique aqui para pagar
                        </a>
                    ) : (
                        <p className="text-[9px] lg:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            Transação Segura Via Asaas
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreCheckout;
