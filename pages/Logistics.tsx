
import React from 'react';
import { useData } from '../context/DataContext';

const Logistics: React.FC = () => {
  const { state } = useData();
  const inTransitCount = 0; // Seria calculado via API futuramente

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Logística e <span className="text-primary">Entregas</span></h2>
          <p className="text-slate-500 mt-1 font-medium">Gestão de distribuição e rastreamento de envios em tempo real via Yampi.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {label: 'Total em Trânsito', val: inTransitCount.toString(), color: 'text-white'},
          {label: 'Pendências de Envio', val: '0', color: 'text-slate-500'},
          {label: 'Entregues (Hoje)', val: '0', color: 'text-primary'},
          {label: 'Prazo Médio', val: '0 dias', color: 'text-white'},
        ].map((card, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
            <h4 className={`text-2xl font-black ${card.color}`}>{card.val}</h4>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden text-center py-32 border-dashed border-neutral-border">
          <span className="material-symbols-outlined text-slate-800 text-6xl mb-4">local_shipping</span>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aguardando dados de logística da Yampi</p>
          <p className="text-slate-600 text-xs mt-2">Os status de envio serão sincronizados automaticamente após a conexão.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-white tracking-tight">Pendências de Envio</h3>
            <span className="ml-auto px-2 py-0.5 bg-neutral-800 text-slate-500 text-[10px] font-black rounded border border-neutral-border">0 AGUARDANDO</span>
          </div>
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
            Sem pendências
          </div>
        </section>
        
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <h3 className="text-xl font-bold text-white tracking-tight">Pacotes em Trânsito</h3>
            <span className="ml-auto px-2 py-0.5 bg-neutral-800 text-slate-500 text-[10px] font-black rounded border border-neutral-border">0 ATIVOS</span>
          </div>
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
            Nenhum pacote em trânsito
          </div>
        </section>
      </div>
    </div>
  );
};

export default Logistics;
