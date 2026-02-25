
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

      <div className="relative glass-panel rounded-3xl overflow-hidden p-8 border border-white/5 bg-[#0a0a0a] min-h-[400px] flex flex-col items-center justify-center">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNSkiLz48L3N2Zz4=')] opacity-50" />

        {/* Radar/Pulse circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-[400px] h-[400px] rounded-full border border-primary/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-primary/20 animate-ping opacity-30" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        </div>

        {/* Floating Tracking Points */}
        <div className="absolute top-[30%] left-[30%] group cursor-pointer">
          <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse" />
          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a1a] border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap transition-opacity shadow-2xl">São Paulo, SP<br /><span className="text-primary text-[10px] uppercase tracking-widest">Em trânsito</span></div>
        </div>
        <div className="absolute top-[60%] left-[70%] group cursor-pointer">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,1)] animate-pulse" />
          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a1a] border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap transition-opacity shadow-2xl">Rio de Janeiro, RJ<br /><span className="text-amber-500 text-[10px] uppercase tracking-widest">Pendente</span></div>
        </div>
        <div className="absolute top-[45%] left-[55%] group cursor-pointer">
          <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center bg-black/40 p-8 rounded-3xl backdrop-blur-md border border-white/5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <span className="material-symbols-outlined text-3xl">explore</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight mb-2">Radar de Logística</h3>
          <p className="text-slate-400 text-sm max-w-sm text-center">Visão global dos seus pacotes em tempo real. Os dados de geolocalização exatos são plotados aqui assim que a transportadora assume a carga.</p>
        </div>
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
                  <thead className="bg-[#0a0a0a] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Criado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.filter(o => o.status === 'AGUARDANDO').map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-md border border-white/5">
                            <span className="material-symbols-outlined text-xs text-slate-500">tag</span>
                            <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-widest">{o.id.split('-')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white group-hover:text-amber-500 transition-colors">{o.client}</td>
                        <td className="px-6 py-4 text-sm font-black text-white">R$ {o.value.toFixed(2)}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(o.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {orders.filter(o => o.status === 'AGUARDANDO').map(o => (
                <div key={o.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-center">
                    <div className="inline-flex items-center gap-1.5 opacity-80">
                      <span className="material-symbols-outlined text-xs text-slate-500">tag</span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{o.id.split('-')[0]}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded border border-amber-500/20 uppercase">PENDENTE</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-wide">{o.client}</h4>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-sm font-black text-white">R$ {o.value.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(o.date).toLocaleDateString()}</span>
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
                  <thead className="bg-[#0a0a0a] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Rastreamento</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Serviço</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-md border border-white/5">
                            <span className="material-symbols-outlined text-xs text-slate-500">tag</span>
                            <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-widest">{o.id.split('-')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-primary font-mono">{o.trackCode || '—'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wide uppercase">{o.shipmentService || '—'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-white group-hover:text-primary transition-colors">{o.client}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {orders.filter(o => !o.delivered && (o.rawStatusAlias === 'shipping' || (o.status === 'APROVADO' && !o.delivered))).map(o => (
                <div key={o.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-5 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Rastreamento</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
                        <span className="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
                        <h4 className="text-sm font-black text-primary font-mono tracking-widest">{o.trackCode || 'Pendente'}</h4>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black border border-primary/20 rounded uppercase shadow-[0_0_10px_rgba(34,197,94,0.2)]">EM TRÂNSITO</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                    <div>
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1.5">Serviço</p>
                      <p className="text-xs text-white font-bold">{o.shipmentService || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1.5">Pedido</p>
                      <div className="inline-flex items-center gap-1 opacity-80">
                        <span className="material-symbols-outlined text-[12px] text-slate-500">tag</span>
                        <p className="text-xs text-slate-300 font-mono font-bold uppercase tracking-widest">{o.id.split('-')[0]}</p>
                      </div>
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
