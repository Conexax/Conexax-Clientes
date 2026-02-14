
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';
import SubscriptionPanel from '../components/SubscriptionPanel';
import PreCheckout from '../components/PreCheckout';
import { PaymentSuccess } from '../components/PaymentSuccess';

const BillingPlans: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useData();
  const [loading, setLoading] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const currentPlan = state.plans.find(p => p.id === state.activeTenant?.planId);
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'semiannual' | 'yearly'>('quarterly');

  const [manualCheckoutUrl, setManualCheckoutUrl] = useState<string | null>(null);

  const [selectedPlanForModal, setSelectedPlanForModal] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');
  const [successCheckoutUrl, setSuccessCheckoutUrl] = useState<string | null>(null);

  // Fetch payments on mount or when invoices are shown
  React.useEffect(() => {
    actions.fetchMyPayments();
  }, [showInvoices]); // Reload when opening modal to be sure

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

  const handleUpgrade = (plan: any) => {
    if (loading) return;
    setSelectedPlanForModal(plan);
    setShowPaymentModal(true);
  };

  const executeUpgrade = async (billingType: 'monthly' | 'upfront', paymentMethodArg?: 'CREDIT_CARD' | 'BOLETO' | 'PIX') => {
    if (!selectedPlanForModal) return;

    // Use argument or state
    const methodToUse = paymentMethodArg || paymentMethod;

    // Prefight check for document
    const doc = (state.activeTenant?.document || '').replace(/\D/g, '');
    if (!doc || doc.length < 11) {
      toast.error('Documento (CPF/CNPJ) inválido ou ausente. Por favor, atualize em "Dados do Lojista" antes de assinar.');
      return;
    }

    setLoading(true);
    setManualCheckoutUrl(null); // Reset previous

    try {
      const response = await actions.subscribeToPlan(selectedPlanForModal.id, billingCycle, billingType, methodToUse);
      console.log('[Debug] Subscribe response full:', response);

      if (response?.checkoutUrl) {
        console.log('[Debug] checkoutUrl found:', response.checkoutUrl);
        toast.success('Fatura gerada com sucesso!');
        setSuccessCheckoutUrl(response.checkoutUrl);
        return;
      } else {
        console.warn('[Debug] No checkoutUrl found in response!');
      }

      throw new Error('Não foi possível gerar o link de checkout. Tente novamente.');
    } catch (e: any) {
      console.error(e);
      toast.error(`Falha no upgrade: ${e.message || 'Erro de conexão'}`);
      // Keep modal open so user can retry
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
              const explicitMonthly = billingCycle === 'quarterly' ? plan.monthlyPriceQuarterly : billingCycle === 'semiannual' ? plan.monthlyPriceSemiannual : billingCycle === 'yearly' ? plan.monthlyPriceYearly : 0;
              const cycleInstallments = billingCycle === 'quarterly' ? plan.installmentsQuarterly : billingCycle === 'semiannual' ? plan.installmentsSemiannual : billingCycle === 'yearly' ? plan.installmentsYearly : 0;
              const cycleTrafficFee = billingCycle === 'quarterly' ? plan.trafficFeePercentQuarterly : billingCycle === 'semiannual' ? plan.trafficFeePercentSemiannual : billingCycle === 'yearly' ? plan.trafficFeePercentYearly : 0;
              const cycleAdCredit = billingCycle === 'quarterly' ? plan.adCreditQuarterly : billingCycle === 'semiannual' ? plan.adCreditSemiannual : billingCycle === 'yearly' ? plan.adCreditYearly : 0;

              const displayMonthly = explicitMonthly || (getPrice(plan) / (billingCycle === 'quarterly' ? 3 : billingCycle === 'semiannual' ? 6 : 12));
              const trafficFee = cycleTrafficFee || plan.trafficFeePercent || 0;
              const adCredit = cycleAdCredit || plan.adCredit || 0;

              return (
                <div key={plan.id} className={`glass-panel p-8 rounded-[40px] flex flex-col border-2 transition-all ${plan.recommended ? 'border-primary shadow-2xl shadow-primary/10' : 'border-white/5'} relative overflow-hidden`}>
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
                    {plan.features.map((feature: string, i: number) => (
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
                        onClick={() => handleUpgrade(plan)}
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

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              {state.paymentRequests && state.paymentRequests.length > 0 ? (
                state.paymentRequests.map(req => {
                  const planName = state.plans.find(p => p.id === req.planId)?.name || 'Plano Desconhecido';
                  const isPending = req.status === 'pending' || req.status === 'created';
                  const isPaid = req.status === 'paid' || req.status === 'captured'; // Asaas statuses
                  const isOverdue = req.status === 'overdue';

                  return (
                    <div key={req.id} className={`p-4 rounded-2xl border ${isPending ? 'bg-amber-500/5 border-amber-500/20' : isPaid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${isPending ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                            isPaid ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                              isOverdue ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' :
                                'bg-slate-500/20 text-slate-500 border-slate-500/30'
                            }`}>
                            {isPending ? 'Aguardando Pagamento' : isPaid ? 'Pago' : isOverdue ? 'Vencido' : req.status}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-2">Plano {planName}</h4>
                          <p className="text-[10px] text-slate-400">Criado em: {new Date(req.createdAt).toLocaleDateString('pt-BR')}</p>
                          {req.dueDate && <p className="text-[10px] text-slate-500">Vencimento: {new Date(req.dueDate).toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.billingValue)}
                          </p>
                          {req.billingType && <p className="text-[10px] text-slate-500 uppercase">{req.billingType === 'upfront' ? 'À Vista/Ciclo' : 'Mensal'}</p>}
                        </div>
                      </div>

                      {/* Actions for Pending */}
                      {isPending && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                          {req.asaasInvoiceUrl || req.checkoutUrl ? (
                            <button
                              onClick={() => window.open(req.asaasInvoiceUrl || req.checkoutUrl, '_blank')}
                              className="flex-1 py-2 bg-primary text-neutral-950 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all"
                            >
                              Pagar Agora
                            </button>
                          ) : (
                            <div className="flex-1 text-[10px] text-slate-500 font-bold uppercase italic flex items-center justify-center">
                              Link indisponível
                            </div>
                          )}

                          <button
                            onClick={async () => {
                              if (confirm("Deseja cancelar este pedido pendente?")) {
                                setLoading(true);
                                try {
                                  await actions.cancelPaymentRequest(req.id);
                                  await actions.fetchMyPayments(); // Refresh
                                } catch (e) { console.error(e); }
                                finally { setLoading(false); }
                              }
                            }}
                            disabled={loading}
                            className="px-3 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/20 hover:text-red-400 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-slate-700 text-4xl mb-2">receipt_long</span>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhuma fatura encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRE-CHECKOUT FULL SCREEN OVERLAY */}
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
