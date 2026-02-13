
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import SubscriptionPanel from '../components/SubscriptionPanel';

const BillingPlans: React.FC = () => {
  const { state, actions } = useData();
  const [loading, setLoading] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const currentPlan = state.plans.find(p => p.id === state.activeTenant?.planId);
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'semiannual' | 'yearly'>('quarterly');

  const pendingPlan = state.plans.find(p => p.id === state.activeTenant?.pendingPlanId);

  const getPrice = (plan: any) => {
    switch (billingCycle) {
      case 'quarterly': return plan.priceQuarterly;
      case 'semiannual': return plan.priceSemiannual;
      case 'yearly': return plan.priceYearly;
      default: return 0;
    }
  };

  const getLabel = () => {
    switch (billingCycle) {
      case 'quarterly': return 'Trimestral';
      case 'semiannual': return 'Semestral';
      case 'yearly': return 'Anual';
    }
  };

  const getDescription = (plan: any) => {
    switch (billingCycle) {
      case 'quarterly': return plan.descriptionQuarterly;
      case 'semiannual': return plan.descriptionSemiannual;
      case 'yearly': return plan.descriptionYearly;
      default: return '';
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const paymentUrl = await actions.subscribeToPlan(planId, billingCycle);
      if (paymentUrl && typeof paymentUrl === 'string') {
        window.open(paymentUrl, '_blank');
      }
      // Optional: success toast
    } catch (e: any) {
      console.error(e);
      alert(`Erro no upgrade: ${e.message || 'Erro desconhecido'}. Verifique se a integração Asaas está configurada no Admin.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-4xl font-black text-white mb-2">Planos & <span className="text-primary italic">Assinatura</span></h2>
        <p className="text-slate-500 font-medium">Gerencie seu nível de serviço e veja os benefícios do ecossistema Conexx.</p>
      </header>

      <SubscriptionPanel />

      {/* PLANO ATUAL */}
      <section className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/5 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30">Plano Ativo</span>
            <h3 className="text-3xl font-black text-white mt-4">{currentPlan?.name || 'Gratuito'}</h3>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Próxima cobrança: <span className="text-white font-bold">
                {state.activeTenant?.nextBilling ? new Date(state.activeTenant.nextBilling).toLocaleDateString('pt-BR') : 'N/A'}
              </span>
              {state.activeTenant?.billingCycle && (
                <span className="ml-2 text-[10px] text-slate-500 uppercase font-black tracking-tighter italic">
                  ({state.activeTenant.billingCycle === 'quarterly' ? 'Trimestral' : state.activeTenant.billingCycle === 'semiannual' ? 'Semestral' : 'Anual'})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Contrato</p>
              <h4 className="text-2xl font-black text-white italic">
                {(() => {
                  if (!currentPlan || currentPlan.id === 'p_free') return 'Gratuito';
                  const cycle = state.activeTenant?.billingCycle || 'quarterly';
                  const total = cycle === 'quarterly' ? currentPlan.priceQuarterly : cycle === 'semiannual' ? currentPlan.priceSemiannual : currentPlan.priceYearly;
                  const months = cycle === 'quarterly' ? 3 : cycle === 'semiannual' ? 6 : 12;
                  const monthly = total / months;
                  return (
                    <div className="flex flex-col items-end">
                      <span className="text-white">R$ {monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-bold not-italic">/ mês</span></span>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest not-italic">Pago em ciclos de R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })()}
              </h4>
            </div>
            <button
              onClick={() => setShowInvoices(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all"
            >
              Ver Faturas
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5">
          <span className="material-symbols-outlined text-[200px]">credit_card</span>
        </div>
      </section>

      {/* Selector de Ciclo */}
      <div className="flex justify-center mb-8">
        <div className="bg-black/40 p-1 rounded-xl flex gap-1 border border-white/5">
          <button onClick={() => setBillingCycle('quarterly')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'quarterly' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}>Trimestral</button>
          <button onClick={() => setBillingCycle('semiannual')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'semiannual' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}>Semestral</button>
          <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'yearly' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}>Anual</button>
        </div>
      </div>

      {/* GRADE DE PLANOS */}
      <section>
        <div className="text-center mb-12">
          <h3 className="text-xl font-black text-white italic mb-2">Eleve o nível do seu negócio</h3>
          <p className="text-slate-500 text-sm">Escolha o plano ideal e o ciclo que melhor se adapta à sua operação.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...state.plans]
            .filter(p => p.active)
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map((plan) => {
              const explicitMonthly = billingCycle === 'quarterly' ? plan.monthlyPriceQuarterly : billingCycle === 'semiannual' ? plan.monthlyPriceSemiannual : plan.monthlyPriceYearly;
              const cycleInstallments = billingCycle === 'quarterly' ? plan.installmentsQuarterly : billingCycle === 'semiannual' ? plan.installmentsSemiannual : plan.installmentsYearly;
              const cycleTrafficFee = billingCycle === 'quarterly' ? plan.trafficFeePercentQuarterly : billingCycle === 'semiannual' ? plan.trafficFeePercentSemiannual : plan.trafficFeePercentYearly;
              const cycleAdCredit = billingCycle === 'quarterly' ? plan.adCreditQuarterly : billingCycle === 'semiannual' ? plan.adCreditSemiannual : plan.adCreditYearly;

              const displayMonthly = explicitMonthly || (getPrice(plan) / (billingCycle === 'quarterly' ? 3 : billingCycle === 'semiannual' ? 6 : 12));
              const trafficFee = cycleTrafficFee || plan.trafficFeePercent || 0;
              const adCredit = cycleAdCredit || plan.adCredit || 0;

              return (
                <div key={plan.id} className={`glass-panel p-8 rounded-[40px] flex flex-col border-2 transition-all ${plan.recommended ? 'border-primary shadow-2xl shadow-primary/10' : 'border-white/5'}`}>
                  {plan.recommended && <span className="absolute top-4 right-8 px-3 py-1 bg-primary text-neutral-950 text-[10px] font-black uppercase tracking-tighter rounded-full">Recomendado</span>}

                  <h4 className="text-2xl font-black text-white">{plan.name}</h4>

                  <div className="mt-6 flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayMonthly)}
                      </span>
                      <span className="text-slate-400 font-medium text-sm">por mês</span>
                    </div>

                    {trafficFee > 0 && (
                      <p className="mt-4 text-sm font-bold text-slate-300">
                        + {trafficFee}% das vendas realizadas através do tráfego pago
                      </p>
                    )}

                    <div className="mt-6 space-y-1 text-xs font-bold uppercase tracking-tight">
                      <p className="text-slate-500">Valor total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getPrice(plan))}</p>
                      <p className="text-slate-500">Em até {cycleInstallments || plan.installments || 1}x no cartão</p>
                    </div>

                    {adCredit > 0 && (
                      <p className="mt-6 text-primary font-black text-base flex items-center gap-2">
                        <span className="text-xl">+</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(adCredit)} em anúncios
                      </p>
                    )}
                  </div>

                  {/* Display specific interval description */}
                  {getDescription(plan) && (
                    <p className="mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 py-2 px-4 rounded-full self-start border border-white/10">{getDescription(plan)}</p>
                  )}

                  <div className="mt-8 space-y-4 flex-1">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs">
                        <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                        <span className="text-slate-300 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col gap-3">
                    {state.activeTenant?.pendingPlanId === plan.id ? (
                      <button
                        type="button"
                        onClick={() => state.activeTenant?.pendingPaymentUrl && window.open(state.activeTenant.pendingPaymentUrl, '_blank')}
                        className="w-full py-4 bg-amber-500 text-neutral-950 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Continuar Pagamento
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loading || state.activeTenant?.planId === plan.id}
                        onClick={() => handleUpgrade(plan.id)}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${state.activeTenant?.planId === plan.id
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                          : 'bg-primary text-neutral-950 hover:bg-primary-dark shadow-xl shadow-primary/20'
                          }`}
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          state.activeTenant?.planId === plan.id ? 'Plano Atual' : 'Fazer Upgrade'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

        </div>
      </section>

      {/* FAQ SIMPLES */}
      <section className="bg-white/5 p-10 rounded-3xl border border-white/5">
        <h4 className="text-lg font-bold text-white mb-6">Dúvidas sobre faturamento?</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-bold text-white">Como funcionam as cobranças?</p>
            <p className="text-slate-500 leading-relaxed italic">As cobranças são renovadas automaticamente de acordo com o ciclo escolhido (Trimestral, Semestral ou Anual).</p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white">Posso cancelar a qualquer momento?</p>
            <p className="text-slate-500 leading-relaxed italic">Sim, o cancelamento interrompe a renovação automática, mantendo o acesso até o fim do período já pago.</p>
          </div>
        </div>
      </section>
      {/* MODAL DE FATURAS */}
      {showInvoices && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-3xl shadow-2xl border-white/5 p-8">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
              <h3 className="text-2xl font-black text-white italic">Histórico de <span className="text-primary italic">Faturas</span></h3>
              <button onClick={() => setShowInvoices(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* PENDING INVOICE */}
              {pendingPlan && (
                <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded border border-amber-500/30">Aguardando Pagamento</span>
                      <h4 className="text-lg font-black text-white mt-2">Plano {pendingPlan.name}</h4>
                      <p className="text-xs text-slate-400">Ciclo: {state.activeTenant?.pendingBillingCycle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">R$ {(state.activeTenant?.pendingBillingCycle === 'quarterly' ? pendingPlan.priceQuarterly : state.activeTenant?.pendingBillingCycle === 'semiannual' ? pendingPlan.priceSemiannual : pendingPlan.priceYearly).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => state.activeTenant?.pendingPaymentUrl && window.open(state.activeTenant.pendingPaymentUrl, '_blank')}
                      disabled={!state.activeTenant?.pendingPaymentUrl}
                      className="flex-1 py-3 bg-primary text-neutral-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                      Pagar Agora
                    </button>
                    <button
                      disabled={loading}
                      onClick={async () => {
                        if (!state.activeTenant) return;
                        setLoading(true);
                        try {
                          await actions.confirmPayment(state.activeTenant.id);
                          setShowInvoices(false);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Confirmando...' : 'Confirmar (Simular)'}
                    </button>
                  </div>
                </div>
              )}

              {/* SIMULATED PAST INVOICE */}
              <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex justify-between items-center opacity-70">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded border border-emerald-500/30">Pago</span>
                  <p className="text-sm font-bold text-white mt-1">Plano Starter - Assinatura Inicial</p>
                  <p className="text-[10px] text-slate-500">Fatura #0001 • {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">R$ 0,00</p>
                </div>
              </div>

              {!pendingPlan && (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-slate-700 text-4xl mb-2">receipt_long</span>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhuma fatura pendente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPlans;
