
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { OrderStatus } from '../types';
import AdminGoalsSection from '../components/AdminGoalsSection';
import DateRangeFilter from '../components/DateRangeFilter';

const Performance: React.FC = () => {
  const { state, stats, actions, isSyncing } = useData();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date().toISOString()
  });
  const [goalsReport, setGoalsReport] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  useEffect(() => {
    const loadGoals = async () => {
      setLoadingGoals(true);
      // Goals should always reflect TOTAL all-time revenue
      const allTimeStart = new Date('2020-01-01').toISOString();
      const allTimeEnd = new Date().toISOString();
      const data = await actions.fetchGoalsProgress(allTimeStart, allTimeEnd);
      setGoalsReport(data || []);
      setLoadingGoals(false);
    };
    loadGoals();
  }, [isSyncing]); // Refresh after sync, but independent of date filter

  // Filtered stats for the summary cards
  const filteredOrders = React.useMemo(() => {
    return (state.orders || []).filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= new Date(dateRange.startDate) && orderDate <= new Date(dateRange.endDate);
    });
  }, [state.orders, dateRange]);

  const approvedOrders = React.useMemo(() => {
    return filteredOrders.filter(o => o.status === OrderStatus.APROVADO);
  }, [filteredOrders]);

  const filteredAbandoned = React.useMemo(() => {
    return (state.abandonedCheckouts || []).filter(a => {
      const abandonDate = new Date(a.date);
      return abandonDate >= new Date(dateRange.startDate) && abandonDate <= new Date(dateRange.endDate);
    });
  }, [state.abandonedCheckouts, dateRange]);

  const periodRevenue = approvedOrders.reduce((sum, o) => sum + o.value, 0);
  const periodConversion = (filteredOrders.length + filteredAbandoned.length) > 0
    ? (approvedOrders.length / (filteredOrders.length + filteredAbandoned.length)) * 100
    : 0;
  const periodAvgTicket = approvedOrders.length > 0 ? periodRevenue / approvedOrders.length : 0;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">Relatórios de <span className="text-primary">Performance</span></h2>
          <p className="text-slate-400 font-medium">Análise avançada de métricas e conversões sincronizadas da Yampi.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter onFilterChange={(start, end) => setDateRange({ startDate: start.toISOString(), endDate: end.toISOString() })} />
        </div>
      </header>

      {/* Admin Goals Section */}
      <section>
        <AdminGoalsSection reportData={goalsReport} isLoading={loadingGoals} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Receita no Período', val: `R$ ${periodRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: 'Real-time', icon: 'payments' },
          { label: 'Conversão no Período', val: `${periodConversion.toFixed(2)}%`, change: 'Vendas/Checkouts', icon: 'query_stats' },
          { label: 'Ticket Médio', val: `R$ ${periodAvgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: 'Pedidos pagos', icon: 'shopping_bag' },
          { label: 'Carrinhos no Período', val: filteredAbandoned.length.toString(), change: 'A recuperar', icon: 'shopping_cart_checkout' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl stat-card">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-black text-white">{stat.val}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-primary/10 text-primary`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 glass-panel p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Receita por Dia</h3>
              <p className="text-xs text-slate-500">Histórico de vendas aprovadas nos últimos dias</p>
            </div>
          </div>
          <div className="h-64">
            {stats.ordersByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ordersByDay}>
                  <defs>
                    <linearGradient id="perfColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', border: 'none', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#perfColor)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">Sem dados no período</div>
            )}
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Top Produtos</h3>
          <div className="space-y-6">
            {stats.productPerformance.map((prod, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400 truncate max-w-[150px]">{prod.name}</span>
                  <span className="text-white">R$ {prod.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(prod.revenue / stats.totalRevenue) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-500 font-black uppercase">{prod.sales} Vendas</p>
              </div>
            ))}
            {stats.productPerformance.length === 0 && (
              <p className="text-center text-slate-600 py-10 italic">Nenhum produto vendido.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;
