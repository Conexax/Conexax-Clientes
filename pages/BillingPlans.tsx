
import React from 'react';
import { useData } from '../context/DataContext';

const BillingPlans: React.FC = () => {
  const { state } = useData();
  const currentPlan = state.plans.find(p => p.id === state.activeTenant?.planId);

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
            <h3 className="text-3xl font-black text-white mt-4">{currentPlan?.name || 'Starter'}</h3>
            <p className="text-slate-400 text-sm font-medium mt-1">Próxima cobrança: <span className="text-white font-bold">{state.activeTenant?.nextBilling ? new Date(state.activeTenant.nextBilling).toLocaleDateString() : 'N/A'}</span></p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Mensal</p>
              <h4 className="text-2xl font-black text-white italic">R$ {currentPlan?.price || 0},00</h4>
            </div>
            <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">Ver Faturas</button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5">
          <span className="material-symbols-outlined text-[200px]">credit_card</span>
        </div>
      </section>

      {/* GRADE DE PLANOS */}
      <section>
        <div className="text-center mb-12">
          <h3 className="text-xl font-black text-white italic mb-2">Eleve o nível do seu negócio</h3>
          <p className="text-slate-500 text-sm">Escolha o plano ideal para a escala da sua operação Yampi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {state.plans.filter(p => p.active).map((plan) => (
            <div key={plan.id} className={`glass-panel p-8 rounded-[40px] flex flex-col border-2 transition-all ${plan.recommended ? 'border-primary shadow-2xl shadow-primary/10' : 'border-white/5'}`}>
              {plan.recommended && <span className="self-start px-3 py-1 bg-primary text-neutral-950 text-[10px] font-black uppercase tracking-tighter rounded-full mb-6">Recomendado</span>}
              
              <h4 className="text-2xl font-black text-white">{plan.name}</h4>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-slate-500 font-bold text-sm">R$</span>
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="text-slate-500 font-medium text-xs">/mês</span>
              </div>

              <div className="mt-8 space-y-4 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                    <span className="text-slate-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                disabled={plan.id === currentPlan?.id}
                className={`mt-10 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  plan.id === currentPlan?.id 
                    ? 'bg-white/5 text-slate-500 cursor-default' 
                    : 'bg-primary text-neutral-950 hover:bg-primary-dark glow-hover'
                }`}
              >
                {plan.id === currentPlan?.id ? 'Seu Plano' : 'Fazer Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SIMPLES */}
      <section className="bg-white/5 p-10 rounded-3xl border border-white/5">
        <h4 className="text-lg font-bold text-white mb-6">Dúvidas sobre faturamento?</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
           <div className="space-y-2">
             <p className="font-bold text-white">Como funcionam as cobranças?</p>
             <p className="text-slate-500 leading-relaxed italic">As cobranças são mensais e automáticas através do cartão cadastrado no momento do upgrade.</p>
           </div>
           <div className="space-y-2">
             <p className="font-bold text-white">Posso cancelar a qualquer momento?</p>
             <p className="text-slate-500 leading-relaxed italic">Sim, o cancelamento interrompe a renovação automática, mantendo o acesso até o fim do período pago.</p>
           </div>
        </div>
      </section>
    </div>
  );
};

export default BillingPlans;
