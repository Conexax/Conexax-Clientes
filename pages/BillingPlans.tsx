
import React, { useState } from 'react';
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

  React.useEffect(() => {
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
    'IRON': 'build',
    'GOLD': 'workspace_premium',
    'CONEXAX X': 'diamond'
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

      {/* GRADE DE PLANOS (Overview) */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...state.plans]
            .filter(p => p.active)
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map((plan) => {
              const iconName = planIcons[plan.name?.toUpperCase()] || 'star';
              return (
                <div key={plan.id} className="bg-black/40 border border-white/5 rounded-[32px] p-8 flex flex-col hover:border-white/10 transition-all relative">

                  {/* Plan Icon / Header */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#126848] to-[#0A3D2A] flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(20,184,166,0.2)] mb-6">
                    <span className="material-symbols-outlined text-3xl text-white">{iconName}</span>
                  </div>

                  <h4 className="text-2xl font-black text-white mb-6">Plano {plan.name}</h4>

                  {/* Features List */}
                  <div className="flex-1 space-y-4 mb-8">
                    {plan.features?.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">check</span>
                        <span className="text-slate-300 text-[13px] leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  {state.activeTenant?.planId === plan.id ? (
                    <button className="w-full py-4 rounded-xl font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 cursor-default">
                      Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPlanForPeriodicity(plan)}
                      className="w-full py-4 rounded-xl font-bold text-black bg-[#65cba0] hover:bg-[#54b88e] transition-all shadow-[0_0_15px_rgba(101,203,160,0.3)]"
                    >
                      Ver preços
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* MODAL DE PERIODICIDADE */}
      {selectedPlanForPeriodicity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#050505] w-full max-w-6xl rounded-[40px] border border-[#1e2a22] p-8 md:p-12 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedPlanForPeriodicity(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-all bg-white/5 rounded-full p-2">
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-300 tracking-wide">Escolha a periodicidade ideal</span>
            </div>

            <h3 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter" style={{ fontFamily: "Georgia, serif" }}>
              {selectedPlanForPeriodicity.name}
            </h3>
            <p className="text-slate-400 text-lg mb-10">Veja os valores do plano e escolha a melhor opção para o seu negócio.</p>

            <div className="flex overflow-x-auto pt-6 pb-8 md:grid md:grid-cols-3 gap-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {[
                {
                  id: 'quarterly', label: 'Trimestral',
                  price: selectedPlanForPeriodicity.priceQuarterly,
                  desc: selectedPlanForPeriodicity.descriptionQuarterly || (
                    (selectedPlanForPeriodicity.trafficFeePercentQuarterly || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentQuarterly || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : ''
                  ),
                  months: 3, installments: 6
                },
                {
                  id: 'semiannual', label: 'Semestral',
                  price: selectedPlanForPeriodicity.priceSemiannual,
                  desc: selectedPlanForPeriodicity.descriptionSemiannual || (
                    (selectedPlanForPeriodicity.trafficFeePercentSemiannual || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentSemiannual || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : ''
                  ),
                  months: 6, installments: 12
                },
                {
                  id: 'yearly', label: 'Anual',
                  price: selectedPlanForPeriodicity.priceYearly,
                  desc: selectedPlanForPeriodicity.descriptionYearly || (
                    (selectedPlanForPeriodicity.trafficFeePercentYearly || selectedPlanForPeriodicity.trafficFeePercent)
                      ? `${selectedPlanForPeriodicity.trafficFeePercentYearly || selectedPlanForPeriodicity.trafficFeePercent}% das vendas realizadas através do tráfego pago`
                      : ''
                  ),
                  months: 12, installments: 12
                }
              ].map(cycle => (
                <div key={cycle.id} className={`min-w-[85vw] md:min-w-0 snap-center bg-black border ${cycle.id === 'yearly' ? 'border-[#65cba0]/50 shadow-[0_0_30px_rgba(101,203,160,0.15)] mt-4 md:mt-0 pt-10 md:pt-8' : 'border-white/5'} rounded-3xl p-8 hover:border-[#1e2a22] transition-all flex flex-col relative`}>
                  {cycle.id === 'yearly' && (
                    <div className="absolute -top-4 md:-top-3 left-1/2 -translate-x-1/2 bg-[#65cba0] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full whitespace-nowrap z-10">
                      Melhor Custo Benefício
                    </div>
                  )}
                  <h4 className="text-xl font-extrabold text-white mb-4">{cycle.label}</h4>

                  <div className="flex items-baseline gap-2 text-[#65cba0]">
                    <span className="text-4xl font-black">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cycle.price / cycle.months)}
                    </span>
                    <span className="text-xs font-bold text-slate-300">por mês</span>
                  </div>

                  <p className="mt-4 text-xs font-bold text-slate-300 leading-relaxed min-h-[40px]">
                    {cycle.desc ? `+ ${cycle.desc}` : ''}
                  </p>

                  <div className="mt-6 space-y-1">
                    <p className="text-xs text-slate-500">Valor total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cycle.price)}</p>
                    <p className="text-xs text-slate-500">Em até {cycle.installments}x no cartão</p>
                  </div>

                  {selectedPlanForPeriodicity.adCredit > 0 && (
                    <p className="mt-4 text-[#65cba0] font-black text-xs">
                      + R$ {selectedPlanForPeriodicity.adCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em anúncios
                    </p>
                  )}

                  <div className="flex-1"></div>

                  <button
                    onClick={() => handleUpgrade(selectedPlanForPeriodicity, cycle.id as any)}
                    className="mt-8 w-full py-4 rounded-2xl font-black text-black bg-[#65cba0] hover:bg-[#54b88e] transition-all"
                  >
                    Contratar agora
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL DE FATURAS E PRE-CHECKOUT */}
      {/* ... (Keeping the same modal implementations) */}
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

