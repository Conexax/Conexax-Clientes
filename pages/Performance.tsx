
import React from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

const Performance: React.FC = () => {
  const { stats, state } = useData();

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">Relatórios de <span className="text-primary">Performance</span></h2>
          <p className="text-slate-400 font-medium">Análise avançada de métricas e conversões sincronizadas da Yampi.</p>
        </div>
        <div className="flex items-center gap-3 bg-panel-dark border border-neutral-border p-1.5 rounded-xl">
          <button className="px-4 py-2 text-xs font-bold bg-white/5 text-primary rounded-lg shadow-sm">Últimos 7 Dias</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {label: 'Receita Total', val: `R$ ${stats.totalRevenue.toLocaleString()}`, change: 'Real-time', icon: 'payments'},
          {label: 'Conversão Global', val: `${stats.conversionRate.toFixed(2)}%`, change: 'Vendas/Checkouts', icon: 'query_stats'},
          {label: 'Ticket Médio', val: `R$ ${stats.averageTicket.toLocaleString()}`, change: 'Por pedido pago', icon: 'shopping_bag'},
          {label: 'Carrinhos', val: stats.abandonedCount.toString(), change: 'A recuperar', icon: 'shopping_cart_checkout'},
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
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f0f0f', border: 'none', borderRadius: '12px'}} />
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
                    style={{width: `${(prod.revenue / stats.totalRevenue) * 100}%`}}
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
