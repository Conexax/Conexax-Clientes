
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';

const AdminDashboard: React.FC = () => {
  const { stats, state } = useData();

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-4xl font-black text-white mb-2">Painel <span className="text-primary italic">Conexx Corporativo</span></h2>
        <p className="text-slate-500 font-medium italic">Visão consolidada de toda a infraestrutura e ecossistema de lojistas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            label: 'Volume Transacionado (Total)', 
            val: `R$ ${(stats.globalRevenue || 0).toLocaleString()}`, 
            icon: 'hub', 
            color: 'text-primary' 
          },
          { label: 'Lojistas Ativos', val: (stats.totalTenants || 0).toString(), icon: 'store', color: 'text-blue-400' },
          { label: 'Sincronizações Ativas', val: (stats.activeSyncs || 0).toString(), icon: 'sync', color: 'text-amber-500' },
          { label: 'Saúde da Plataforma', val: '99.9%', icon: 'bolt', color: 'text-emerald-400' },
        ].map((card, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl stat-card">
            <div className="flex justify-between items-center mb-4">
              <span className="material-symbols-outlined text-slate-600">{card.icon}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global</span>
            </div>
            <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-tighter">{card.label}</p>
            <h4 className={`text-2xl font-black ${card.color}`}>{card.val}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-8">Crescimento de Receita (Plataforma)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.orders.slice(-10)}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{backgroundColor: '#0f0f0f', border: 'none', borderRadius: '12px'}} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Últimos Lojistas Registrados</h3>
          <div className="space-y-4">
            {state.tenants.slice(-4).reverse().map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase">{(t.name || 'Loja').substring(0,2)}</div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.id}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.yampiToken ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-500'}`}>
                  {t.yampiToken ? 'Conectado Yampi' : 'Sem Conexão'}
                </span>
              </div>
            ))}
            {state.tenants.length === 0 && <p className="text-center text-slate-600 py-10 font-bold italic">Nenhum lojista encontrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
