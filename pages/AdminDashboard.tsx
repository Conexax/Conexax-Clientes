
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';

import DateRangeFilter from '../components/DateRangeFilter';

const AdminDashboard: React.FC = () => {
  const { state, stats, actions, isSyncing } = useData();
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  });
  const [filterPeriod, setFilterPeriod] = useState('today');

  const handleFilterChange = (start: Date, end: Date, period: string) => {
    setDateRange({ start, end });
    setFilterPeriod(period);
  };

  const filteredOrders = useMemo(() => {
    return state.orders.filter(o => {
      // Yampi dates might be 'YYYY-MM-DD HH:mm:ss' or ISO
      // Parse safely
      const d = new Date(o.date);
      // Ensure we count valid orders
      const validStatus = o.status === 'APROVADO' || (o.status as any) === 'paid' || (o.status as any) === 'approved';
      return validStatus && d >= dateRange.start && d <= dateRange.end;
    });
  }, [state.orders, dateRange]);

  // Calculate aggregated stats from filtered orders
  const totalVolume = filteredOrders.reduce((acc, o) => acc + (Number(o.value) || 0), 0);

  const totalProfit = filteredOrders.reduce((acc, o) => {
    const tenant = state.tenants.find(t => t.id === o.tenantId);
    const pct = Number(tenant?.companyPercentage) || 0;
    return acc + ((Number(o.value) || 0) * (pct / 100));
  }, 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white mb-2">Painel <span className="text-primary italic">Conexx Corporativo</span></h2>
          <p className="text-slate-500 font-medium italic">Visão consolidada de toda a infraestrutura e ecossistema de lojistas.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => actions.syncYampi()}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all w-full sm:w-auto justify-center ${isSyncing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-primary text-neutral-950 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20'
              }`}
          >
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Yampi'}
          </button>
          <DateRangeFilter onFilterChange={handleFilterChange} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: filterPeriod === 'total' ? 'Receita Bruta (Total)' : 'Receita Bruta (Período)',
            val: `R$ ${totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: 'hub',
            color: 'text-primary'
          },
          {
            label: 'Comissão da Empresa',
            val: `R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: 'payments',
            color: 'text-emerald-400'
          },
          { label: 'Lojistas Ativos', val: (state.tenants.length || 0).toString(), icon: 'store', color: 'text-blue-400' },
          { label: 'Sincronizações Ativas', val: (stats.activeSyncs || 0).toString(), icon: 'sync', color: 'text-amber-500' },
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', border: 'none', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Últimos Lojistas Registrados</h3>
          <div className="space-y-4">
            {state.tenants.slice(-4).reverse().map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase">{(t.name || 'Loja').substring(0, 2)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{t.id}</p>
                  </div>
                </div>
                <span className={`self-start sm:self-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.yampiToken ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-500'}`}>
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
