
import React from 'react';
import { useData } from '../context/DataContext';

const Automations: React.FC = () => {
  const { state, actions } = useData();
  const settings = state.commSettings;

  const toggleTrigger = (id: string) => {
    const isActive = settings.activeTriggers.includes(id);
    const newTriggers = isActive
      ? settings.activeTriggers.filter(t => t !== id)
      : [...settings.activeTriggers, id];
    actions.saveCommSettings({ ...settings, activeTriggers: newTriggers }, id, !isActive);
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2 italic">Réguas de <span className="text-primary italic">Comunicação</span></h2>
          <p className="text-slate-400 max-w-2xl font-medium">Configure gatilhos sincronizados nativamente com a infraestrutura da Yampi.</p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span> Yampi Native Sync
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* INFO CANAIS NATIVOS */}
        <section className="glass-panel p-10 rounded-3xl border border-white/5 space-y-8 relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">hub</span>
              <h3 className="text-xl font-black text-white italic">Canais Integrados</h3>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Sua conta utiliza os serviços de envio de <strong>E-mail Marketing</strong> e <strong>SMS Transacional</strong> diretamente da Yampi.
              As mensagens são disparadas automaticamente seguindo os gatilhos configurados abaixo.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2">mail</span>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Status E-mail</p>
                <p className="text-xs font-bold text-white">Ativo via Yampi</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2">sms</span>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Status SMS</p>
                <p className="text-xs font-bold text-white">Ativo via Yampi</p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                <span className="material-symbols-outlined text-sm">info</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Os créditos de SMS devem ser gerenciados no painel Yampi.</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-5">
            <span className="material-symbols-outlined text-[180px]">campaign</span>
          </div>
        </section>

        {/* GATILHOS ATIVOS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white tracking-tight">Gatilhos de Automação</h3>
            <span className="text-[10px] font-black text-slate-500 uppercase">{settings.activeTriggers.length} ativos</span>
          </div>

          <div className="space-y-4">
            {[
              { id: 'cart_1h', label: 'Carrinho Abandonado (1 Hora)', icon: 'shopping_cart_checkout', type: 'SMS + E-mail' },
              { id: 'cart_24h', label: 'Carrinho Abandonado (24 Horas)', icon: 'history', type: 'E-mail' },
              { id: 'order_paid', label: 'Confirmação de Pagamento', icon: 'check_circle', type: 'WhatsApp / SMS' },
              { id: 'order_shipped', label: 'Aviso de Envio (Rastreio)', icon: 'local_shipping', type: 'E-mail' },
              { id: 'upsell', label: 'Oferta de Upsell Pós-venda', icon: 'star', type: 'SMS' },
            ].map(trigger => (
              <div
                key={trigger.id}
                onClick={() => toggleTrigger(trigger.id)}
                className={`glass-panel p-6 rounded-2xl flex items-center justify-between cursor-pointer border-l-4 transition-all ${settings.activeTriggers.includes(trigger.id) ? 'border-l-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-l-neutral-700 opacity-60'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined ${settings.activeTriggers.includes(trigger.id) ? 'text-primary' : 'text-slate-600'}`}>{trigger.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{trigger.label}</h4>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{trigger.type}</span>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.activeTriggers.includes(trigger.id) ? 'bg-primary' : 'bg-neutral-800'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.activeTriggers.includes(trigger.id) ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Automations;
