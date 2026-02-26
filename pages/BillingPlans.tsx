
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';
import PreCheckout from '../components/PreCheckout';
import { PaymentSuccess } from '../components/PaymentSuccess';

const BillingPlans: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useData();
  const [loading, setLoading] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const currentPlan = state.plans.find(p => p.id === state.activeTenant?.planId);

  // New state for Periodicity Modal
  const [selectedPlanForPeriodicity, setSelectedPlanForPeriodicity] = useState<any>(null);

  // Checkout states
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'semiannual' | 'yearly'>('quarterly');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');
  const [successCheckoutUrl, setSuccessCheckoutUrl] = useState<string | null>(null);
  const [manualCheckoutUrl, setManualCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    actions.fetchMyPayments();
  }, [showInvoices]);

  const handleUpgrade = (plan: any, cycle: 'quarterly' | 'semiannual' | 'yearly') => {
    if (loading) return;
    setBillingCycle(cycle);
    setSelectedPlanForModal(plan);
    setShowPaymentModal(true);
    setSelectedPlanForPeriodicity(null); // Close the periodicity modal
  };

  const executeUpgrade = async (billingType: 'monthly' | 'upfront', paymentMethodArg?: 'CREDIT_CARD' | 'BOLETO' | 'PIX') => {
    if (!selectedPlanForModal) return;
    const methodToUse = paymentMethodArg || paymentMethod;
    const doc = (state.activeTenant?.document || '').replace(/\D/g, '');
    if (!doc || doc.length < 11) {
      toast.error('Documento (CPF/CNPJ) inválido ou ausente. Por favor, atualize em "Dados do Lojista" antes de assinar.');
      return;
    }

    setLoading(true);
    setManualCheckoutUrl(null);

    try {
      const response = await actions.subscribeToPlan(selectedPlanForModal.id, billingCycle, billingType, methodToUse);
      if (response?.checkoutUrl) {
        toast.success('Fatura gerada com sucesso!');
        setSuccessCheckoutUrl(response.checkoutUrl);
        return;
      }
      throw new Error('Não foi possível gerar o link de checkout. Tente novamente.');
    } catch (e: any) {
      toast.error(`Falha no upgrade: ${e.message || 'Erro de conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  const planIcons: Record<string, string> = {
    'IRON': 'nutrition',
    'GOLD': 'workspace_premium',
    'CONEXAX X': 'diamond'
  };

  return (
    <div className="space-y-10 animate-fade-in p-4 lg:p-0 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Planos & <span className="text-primary italic">Assinatura</span></h2>
          <p className="text-slate-500 font-medium text-sm lg:text-base">Gerencie seu nível de serviço e veja os benefícios do ecossistema ConexaX.</p>
        </div>
        <button
          onClick={() => setShowInvoices(true)}
          className="lg:hidden w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">receipt_long</span>
          Ver Histórico de Faturas
        </button>
      </header>

      {/* PLANO ATUAL */}
      <section className="glass-panel p-6 lg:p-10 rounded-[32px] border-primary/20 bg-primary/5 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-start gap-4 lg:gap-6">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
              <span className="material-symbols-outlined text-3xl lg:text-4xl text-primary">verified_user</span>
            </div>
            <div>
              <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30 inline-block mb-3">CONTRATO ATIVO</span>
              <h3 className="text-3xl lg:text-5xl font-black text-white tracking-tighter">{currentPlan?.name || 'Vendedor Iniciante'}</h3>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <p className="text-slate-400 text-xs lg:text-sm font-medium">
                  Próxima renovação: <span className="text-white font-bold">
                    {state.activeTenant?.nextBilling ? new Date(state.activeTenant.nextBilling).toLocaleDateString('pt-BR') : 'Sem data definida'}
                  </span>
                </p>
                {state.activeTenant?.billingCycle && (
                  <div className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] text-slate-500 font-black uppercase tracking-widest italic border border-white/5">
                    {state.activeTenant.billingCycle === 'quarterly' ? 'Trimestral' : state.activeTenant.billingCycle === 'semiannual' ? 'Semestral' : 'Anual'}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-8">
            <div className="text-center lg:text-right px-4 lg:px-0 border-y lg:border-none border-white/5 py-4 lg:py-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Custo Médio</p>
              <h4 className="text-2xl lg:text-3xl font-black text-white italic">
                {(() => {
                  if (!currentPlan || currentPlan.id === 'p_free') return 'Gratuito';
                  const cycle = state.activeTenant?.billingCycle || 'quarterly';
                  const total = cycle === 'quarterly' ? currentPlan.priceQuarterly : cycle === 'semiannual' ? currentPlan.priceSemiannual : currentPlan.priceYearly;
                  const months = cycle === 'quarterly' ? 3 : cycle === 'semiannual' ? 6 : 12;
                  const monthly = total / months;
                  return (
                    <div className="flex flex-col items-center lg:items-end">
                      <span className="text-white">R$ {monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-bold not-italic">/ mês</span></span>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest not-italic opacity-50">Ciclo total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })()}
              </h4>
            </div>
            <button
              onClick={() => setShowInvoices(true)}
              className="hidden lg:flex px-8 h-14 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 transition-all items-center gap-2"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              Ver Faturas
            </button>
          </div>
        </div>

        {/* Decorative Background Icon */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none">
          <span className="material-symbols-outlined text-[240px]">shield</span>
        </div>
      </section>

      {/* GRADE DE PLANOS */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px bg-white/10 flex-1"></div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Upgrade seu Negócio</h3>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {[...state.plans]
            .filter(p => p.active)
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map((plan) => {
              const iconName = planIcons[plan.name?.toUpperCase()] || 'verified';
              const isCurrent = state.activeTenant?.planId === plan.id;

              return (
                <div key={plan.id} className={`glass-panel border rounded-[40px] p-8 lg:p-10 flex flex-col transition-all relative overflow-hidden group ${isCurrent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/40 border-white/5 hover:border-white/10'}`}>

                  {/* Highlight for prominent plans */}
                  {plan.name?.includes('X') && !isCurrent && (
                    <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-black px-4 py-1.5 rounded-bl-[20px] uppercase tracking-widest flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                      Recomendado
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center border shadow-lg mb-8 transition-transform group-hover:scale-110 ${isCurrent ? 'from-emerald-600 to-emerald-900 border-emerald-400/30' : 'from-zinc-800 to-black border-white/10'}`}>
                    <span className="material-symbols-outlined text-2xl lg:text-3xl text-white">{iconName}</span>
                  </div>

                  <h4 className="text-2xl lg:text-3xl font-black text-white mb-6 tracking-tight"> {plan.name}</h4>

                  {/* Features */}
                  <div className="flex-1 space-y-4 mb-10">
                    {plan.features?.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-primary text-[14px] font-black">check</span>
                        </div>
                        <span className="text-slate-300 text-[13px] leading-snug font-medium italic">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  {isCurrent ? (
                    <div className="w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Assinatura Atual
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedPlanForPeriodicity(plan)}
                      className="w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-neutral-950 bg-primary hover:bg-white transition-all shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-2"
                    >
                      <span>Ver Planos & Preços</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* MODAL DE PERIODICIDADE */}
      {selectedPlanForPeriodicity && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 lg:backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#050505] w-full max-w-6xl rounded-[40px] border border-white/10 p-6 lg:p-14 relative shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[95vh] scrollbar-hide">
            <button
              onClick={() => setSelectedPlanForPeriodicity(null)}
              className="absolute top-6 lg:top-8 right-6 lg:right-8 text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full w-12 h-12 flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="mb-10 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Upgrade para {selectedPlanForPeriodicity.name}</span>
              </div>
              <h3 className="text-4xl lg:text-7xl font-black text-white tracking-tighter mb-4 lg:max-w-3xl" style={{ fontFamily: "Georgia, serif" }}>
                Escolha o ciclo de <span className="text-primary italic">investimento</span> para sua operação.
              </h3>
              <p className="text-slate-500 text-sm lg:text-lg max-w-xl">Preços otimizados para maximizar o seu ROAS e escalar o faturamento da loja.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  id: 'quarterly', label: 'Trimestral',
                  price: selectedPlanForPeriodicity.priceQuarterly,
                  desc: selectedPlanForPeriodicity.descriptionQuarterly || (
                    (selectedPlanForPeriodicity.trafficFeePercentQuarterly || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentQuarterly || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : 'Sem taxas adicionais de tráfego'
                  ),
                  months: 3, installments: 6
                },
                {
                  id: 'semiannual', label: 'Semestral',
                  price: selectedPlanForPeriodicity.priceSemiannual,
                  desc: selectedPlanForPeriodicity.descriptionSemiannual || (
                    (selectedPlanForPeriodicity.trafficFeePercentSemiannual || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentSemiannual || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : 'Sem taxas adicionais de tráfego'
                  ),
                  months: 6, installments: 12
                },
                {
                  id: 'yearly', label: 'Anual',
                  price: selectedPlanForPeriodicity.priceYearly,
                  desc: selectedPlanForPeriodicity.descriptionYearly || (
                    (selectedPlanForPeriodicity.trafficFeePercentYearly || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentYearly || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : 'Sem taxas adicionais de tráfego'
                  ),
                  months: 12, installments: 12
                }
              ].map(cycle => (
                <div key={cycle.id} className={`bg-black border rounded-[36px] p-8 lg:p-10 transition-all flex flex-col relative group overflow-hidden ${cycle.id === 'yearly' ? 'border-primary shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'}`}>

                  {cycle.id === 'yearly' && (
                    <div className="absolute top-0 right-0 bg-primary text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl">
                      Recomendado
                    </div>
                  )}

                  <h4 className="text-xl lg:text-2xl font-black text-white mb-6 uppercase tracking-tight">{cycle.label}</h4>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 text-primary">
                      <span className="text-4xl lg:text-5xl font-black">
                        {(cycle.price / cycle.months).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-xs font-bold text-slate-500">/ mês</span>
                    </div>
                    <p className="mt-4 text-xs font-bold text-slate-400 italic leading-snug min-h-[40px] border-l-2 border-primary/20 pl-3">
                      + {cycle.desc}
                    </p>
                  </div>

                  <div className="space-y-1 mb-8">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ciclo Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cycle.price)}</p>
                    <p className="text-[10px] text-slate-600 italic">Em até {cycle.installments}x sem juros no cartão</p>
                  </div>

                  {selectedPlanForPeriodicity.adCredit > 0 && (
                    <div className="mb-8 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                      <p className="text-emerald-400 font-black text-xs uppercase tracking-tight">
                        + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPlanForPeriodicity.adCredit)} de Bônus em Ads
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleUpgrade(selectedPlanForPeriodicity, cycle.id as any)}
                    className={`mt-auto w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${cycle.id === 'yearly' ? 'bg-primary text-neutral-950 shadow-lg shadow-primary/20 hover:bg-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                  >
                    <span>Contratar Agora</span>
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ & SUPORTE */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mt-12">
        <div className="lg:col-span-2 bg-white/5 p-8 lg:p-12 rounded-[40px] border border-white/5 flex flex-col justify-center">
          <h4 className="text-2xl font-black text-white mb-8 italic">Transparência em <span className="text-primary italic">Faturamento</span></h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-xl">autorenew</span>
                <p className="font-black text-xs uppercase tracking-widest">Renovação</p>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed italic">As cobranças são renovadas automaticamente no final de cada ciclo via cartão ou pix mensal.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-xl">cancel</span>
                <p className="font-black text-xs uppercase tracking-widest">Cancelamento</p>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed italic">Cancele a qualquer momento. Seus benefícios permanecem ativos até o fim do período vigente.</p>
            </div>
          </div>
        </div>
        <div className="bg-primary/95 p-10 rounded-[40px] border border-white shadow-2xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">chat</span>
          </div>
          <h5 className="text-black font-black text-2xl mb-2">Suporte 24h</h5>
          <p className="text-black/60 text-sm font-medium mb-6 italic leading-relaxed">Fale com um gerente de contas dedicado para planos personalizados.</p>
          <button className="w-full h-14 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all">Falar no WhatsApp</button>
        </div>
      </section>

      {/* MODAL DE FATURAS */}
      {showInvoices && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 lg:backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#050505] w-full max-w-3xl rounded-[40px] border border-white/10 p-8 lg:p-12 relative shadow-2xl">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter italic">Minhas <span className="text-primary italic">Faturas</span></h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Histórico completo via Asaas</p>
              </div>
              <button
                onClick={() => setShowInvoices(false)}
                className="text-slate-500 hover:text-white transition-all bg-white/5 p-3 rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-3 scrollbar-custom">
              {state.paymentRequests && state.paymentRequests.length > 0 ? (
                state.paymentRequests.map(req => {
                  const planName = state.plans.find(p => p.id === req.planId)?.name || 'Plano Adicional';
                  const isPending = req.status === 'pending' || req.status === 'created' || req.status === 'PENDING';
                  const isPaid = req.status === 'paid' || req.status === 'captured' || req.status === 'RECEIVED' || req.status === 'CONFIRMED';
                  const isOverdue = req.status === 'overdue' || req.status === 'OVERDUE';

                  return (
                    <div key={req.id} className={`p-6 rounded-[24px] border transition-all ${isPending ? 'bg-amber-500/5 border-amber-500/20' : isPaid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                            <span className="material-symbols-outlined">{isPaid ? 'task_alt' : 'hourglass_bottom'}</span>
                          </div>
                          <div>
                            <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${isPending ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                              isPaid ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                                isOverdue ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' :
                                  'bg-slate-500/20 text-slate-500 border-slate-500/30'
                              }`}>
                              {isPending ? 'Aguardando Pagamento' : isPaid ? 'Pago & Ativo' : isOverdue ? 'Atrasada' : req.status}
                            </span>
                            <h4 className="text-base font-black text-white mt-2 leading-tight tracking-tight"> {planName} </h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5 font-medium">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              Vencimento: <span className="text-zinc-400">{req.dueDate ? new Date(req.dueDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
                          <p className="text-xl font-black text-white italic">
                            {(Number(req.billingValue || req.value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          {isPending && (req.asaasInvoiceUrl || req.checkoutUrl) && (
                            <button
                              onClick={() => window.open(req.asaasInvoiceUrl || req.checkoutUrl, '_blank')}
                              className="px-6 py-2.5 bg-primary text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] hover:brightness-110 transition-all flex items-center gap-2"
                            >
                              <span>Pagar</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
                  <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">history_toggle_off</span>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Nenhuma fatura registrada até o momento</p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Cobranças seguras via ConexaX © 2026</p>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedPlanForModal && (
        successCheckoutUrl ? (
          <PaymentSuccess
            checkoutUrl={successCheckoutUrl}
            onClose={() => {
              setShowPaymentModal(false);
              setSuccessCheckoutUrl(null);
              setManualCheckoutUrl(null);
            }}
          />
        ) : (
          <PreCheckout
            plan={selectedPlanForModal}
            billingCycle={billingCycle}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={(billingType, method) => {
              setPaymentMethod(method);
              return executeUpgrade(billingType, method);
            }}
            loading={loading}
            manualCheckoutUrl={manualCheckoutUrl}
          />
        )
      )}
    </div>
  );
};

export default BillingPlans;

