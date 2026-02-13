
import React from 'react';
import { useData } from '../context/DataContext';

const Logistics: React.FC = () => {
  const { state } = useData();
  // Derivar métricas de logística a partir dos pedidos sincronizados
  const orders = state.orders || [];
  const inTransitCount = orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === undefined ? false : o.status === 'APROVADO' && !o.delivered))).length;
  const pendingCount = orders.filter(o => o.status === 'AGUARDANDO').length;
  const deliveredTodayCount = orders.filter(o => {
    if (!o.delivered) return false;
    try {
      const d = new Date(o.date);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    } catch { return false; }
  }).length;
  const avgDays = (() => {
    const vals = orders.map(o => o.daysDelivery).filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return '—';
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    return `${avg} dias`;
  })();

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
          { label: 'Total em Trânsito', val: inTransitCount.toString(), color: 'text-white' },
          { label: 'Pendências de Envio', val: pendingCount.toString(), color: 'text-slate-500' },
          { label: 'Entregues (Hoje)', val: deliveredTodayCount.toString(), color: 'text-primary' },
          { label: 'Prazo Médio', val: avgDays, color: 'text-white' },
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
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden lg:block glass-panel rounded-2xl p-6">
              {orders.filter(o => o.status === 'AGUARDANDO').length === 0 ? (
                <div className="text-center text-slate-600 text-xs font-bold uppercase tracking-widest p-12">Sem pendências</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-black/40 border-b border-neutral-border/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Pedido</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Cliente</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Valor</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.status === 'AGUARDANDO').map(o => (
                      <tr key={o.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-sm text-slate-300">{o.id}</td>
                        <td className="px-4 py-3 text-sm text-white">{o.client}</td>
                        <td className="px-4 py-3 text-sm text-white">R$ {o.value.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{new Date(o.date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {orders.filter(o => o.status === 'AGUARDANDO').map(o => (
                <div key={o.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido: {o.id}</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded uppercase">PENDENTE</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{o.client}</h4>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-sm font-black text-white">R$ {o.value.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500">{new Date(o.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status === 'AGUARDANDO').length === 0 && (
                <div className="glass-panel p-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest rounded-2xl">Sem pendências</div>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <h3 className="text-xl font-bold text-white tracking-tight">Pacotes em Trânsito</h3>
            <span className="ml-auto px-2 py-0.5 bg-neutral-800 text-slate-500 text-[10px] font-black rounded border border-neutral-border">0 ATIVOS</span>
          </div>
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden lg:block glass-panel rounded-2xl p-6">
              {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).length === 0 ? (
                <div className="text-center text-slate-600 text-xs font-bold uppercase tracking-widest p-12">Nenhum pacote em trânsito</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-black/40 border-b border-neutral-border/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Pedido</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Rastreamento</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Serviço</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).map(o => (
                      <tr key={o.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-sm text-slate-300">{o.id}</td>
                        <td className="px-4 py-3 text-sm text-white">{o.trackCode || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{o.shipmentService || '—'}</td>
                        <td className="px-4 py-3 text-sm text-white">{o.client}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).map(o => (
                <div key={o.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rastreamento</p>
                      <h4 className="text-sm font-black text-primary font-mono">{o.trackCode || 'Pendente'}</h4>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded uppercase">EM TRÂNSITO</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Serviço</p>
                      <p className="text-xs text-white font-bold">{o.shipmentService || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pedido</p>
                      <p className="text-xs text-white font-mono">{o.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                    </div>
                    <p className="text-sm font-bold text-white italic">{o.client}</p>
                  </div>
                </div>
              ))}
              {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).length === 0 && (
                <div className="glass-panel p-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest rounded-2xl">Nenhum pacote em trânsito</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Logistics;
