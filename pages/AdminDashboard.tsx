
import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useData } from '../context/DataContext';

import DateRangeFilter from '../components/DateRangeFilter';

const AdminDashboard: React.FC = () => {
  const { state, stats, actions, isSyncing, isLoading } = useData();
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  });
  const [filterPeriod, setFilterPeriod] = useState('today');

  const [yampiStats, setYampiStats] = useState<any>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  const handleFilterChange = (start: Date, end: Date, period: string) => {
    setDateRange({ start, end });
    setFilterPeriod(period);
  };

  // Fetch metrics from backend
  React.useEffect(() => {
    const fetchStats = async () => {
      setIsFetchingStats(true);
      try {
        const startStr = dateRange.start.toISOString();
        const endStr = dateRange.end.toISOString();
        const res = await fetch(`/api/admin/metricas/yampi/overview?startDate=${startStr}&endDate=${endStr}`);
        const json = await res.json();
        if (json.success) setYampiStats(json.data);
      } catch (err) {
        console.error("Failed to fetch Yampi stats:", err);
      } finally {
        setIsFetchingStats(false);
      }
    };
    fetchStats();
  }, [dateRange, isSyncing]);

  const totalVolume = useMemo(() => {
    if (filterPeriod === 'total') {
      return state.tenants.reduce((acc, t) => acc + (Number(t.cachedGrossRevenue) || 0), 0);
    }
    return yampiStats?.grossRevenue || 0;
  }, [filterPeriod, state.tenants, yampiStats]);

  const totalProfit = useMemo(() => {
    // Calculate precise commission based on each tenant's settings

    // 1. All-time (Total)
    if (filterPeriod === 'total') {
      return state.tenants.reduce((acc, t) => {
        const pct = Number(t.companyPercentage) || 0;
        return acc + ((Number(t.cachedGrossRevenue) || 0) * (pct / 100));
      }, 0);
    }

    // 2. Filtered Period (Approximate using weighted average)
    // We calculate the effective commission rate across all tenants based on their all-time performance
    // and apply it to the period's gross revenue.
    const allTimeRevenue = state.tenants.reduce((acc, t) => acc + (Number(t.cachedGrossRevenue) || 0), 0);
    const allTimeCommission = state.tenants.reduce((acc, t) => {
      const pct = Number(t.companyPercentage) || 0;
      return acc + ((Number(t.cachedGrossRevenue) || 0) * (pct / 100));
    }, 0);

    const effectiveRate = allTimeRevenue > 0 ? (allTimeCommission / allTimeRevenue) : 0;

    // Apply effective rate to the period revenue from Yampi stats
    return (yampiStats?.grossRevenue || 0) * effectiveRate;
  }, [filterPeriod, state.tenants, yampiStats]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Painel <span className="text-[#00D189] italic">Conexx Corporativo</span></h2>
          <p className="text-slate-500 font-bold italic tracking-wide">Visão consolidada de toda a infraestrutura e ecossistema de lojistas.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => actions.syncYampi()}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all w-full sm:w-auto justify-center ${isSyncing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-[#00D189] text-neutral-950 hover:bg-[#00D189]/90 shadow-lg shadow-[#00D189]/20'
              }`}
          >
            <span className={`material-symbols-outlined text-[14px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Yampi'}
          </button>

          <button
            onClick={async () => {
              if (confirm('Deseja calcular as taxas de lucro de todos os lojistas para a semana passada?')) {
                try {
                  const res = await actions.calculateWeeklyFees();
                  alert(`Sucesso! Processados ${res.processed} lojistas.`);
                } catch (e: any) {
                  alert(e.message);
                }
              }
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all w-full sm:w-auto justify-center bg-[#0a0a0a] border border-[#1e2a22] text-slate-400 hover:text-white hover:bg-[#1a1a1a]"
          >
            <span className="material-symbols-outlined text-[14px]">calculate</span>
            Gerar Semanal
          </button>

          <DateRangeFilter onFilterChange={handleFilterChange} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        {[
          {
            label: filterPeriod === 'total' ? 'Receita Bruta (Total)' : 'Receita Bruta (Período)',
            val: `R$ ${totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: 'hub',
            color: 'text-[#00D189]'
          },
          {
            label: 'Comissão da Empresa',
            val: `R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: 'payments',
            color: 'text-[#00D189]'
          },
          { label: 'Lojistas Ativos', val: (state.tenants.length || 0).toString(), icon: 'store', color: 'text-blue-500' },
          { label: 'Sincronizações', val: (stats.activeSyncs || 0).toString(), icon: 'sync', color: 'text-amber-500' },
        ].map((card, i) => (
          <div key={i} className="bg-[#050505] p-5 rounded-2xl border border-[#1e2a22] shadow-2xl relative overflow-hidden group hover:border-[#00D189]/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D189]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all group-hover:bg-[#00D189]/10"></div>
            <div className="flex justify-between items-center mb-5 relative">
              <span className="material-symbols-outlined text-slate-600 text-[20px] transition-colors group-hover:text-slate-400">{card.icon}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-md border border-white/5">Global</span>
            </div>
            <div className="relative">
              <p className="text-slate-500 text-[9px] font-black mb-1 uppercase tracking-widest">{card.label}</p>
              <h4 className={`text-2xl font-black ${card.color} tracking-tight`}>{card.val}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        <div className="bg-[#0a0a0a] p-6 rounded-[24px] border border-[#1e2a22] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#00D189]/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 mb-8">
            <h3 className="text-[16px] font-bold text-white tracking-wide">Crescimento de Receita</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Evolução da plataforma</p>
          </div>
          <div className="h-[280px] w-full relative z-10">
            {yampiStats?.chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yampiStats.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D189" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00D189" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2a22" />
                  <XAxis
                    dataKey="day"
                    stroke="#475569"
                    fontSize={10}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                    }}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050505', border: '1px solid #1e2a22', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#00D189', fontWeight: '900' }}
                    labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  />
                  <Area type="monotone" dataKey="value" stroke="#00D189" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-full opacity-50">
                <span className="material-symbols-outlined text-4xl mb-2">trending_up</span>
                <p className="font-bold italic text-sm">Aguardando dados de receita.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-6 lg:p-8 rounded-[24px] border border-[#1e2a22] shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#00D189]/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>
          <div className="relative z-10 mb-6">
            <h3 className="text-[16px] font-bold text-white tracking-wide mb-1">Últimos Lojistas Registrados</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Recém-chegados na rede</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto scrollbar-none relative z-10">
            {state.tenants.slice(-5).reverse().map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-[#050505] rounded-2xl border border-[#1e2a22] transition-all hover:border-[#00D189]/30 hover:bg-[#00D189]/5 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00D189]/10 flex items-center justify-center text-[#00D189] font-black uppercase text-xl group-hover:scale-110 transition-transform">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      (t.name || 'L').substring(0, 1)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate tracking-wide">{t.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest truncate">{t.id.split('-')[0]}</p>
                  </div>
                </div>
                <div className="flex items-center shrink-0">
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.yampiToken ? 'bg-[#00D189]/10 text-[#00D189]' : 'bg-rose-500/10 text-rose-500'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {t.yampiToken ? 'YAMPI OK' : 'S/ CONEXÃO'}
                  </span>
                </div>
              </div>
            ))}
            {state.tenants.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-10 opacity-50">
                <span className="material-symbols-outlined text-4xl mb-2">store_off</span>
                <p className="font-bold italic">Nenhum lojista encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
