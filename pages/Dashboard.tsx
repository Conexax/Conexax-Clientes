import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, CartesianGrid, Legend } from 'recharts';
import { useData } from '../context/DataContext';
import { OrderStatus, Order } from '../types';

import GoalProgressBar from '../components/GoalProgressBar';
import DateRangeFilter from '../components/DateRangeFilter';

// Helper for formatting currency
const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- Subcomponents ---

const StatCard: React.FC<{
  title: string;
  value: string;
  subValue?: string;
  subValueColor?: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
}> = ({ title, value, subValue, subValueColor = "text-emerald-400", icon, gradientFrom, gradientTo, iconColor }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 border border-white/5 bg-gradient-to-br ${gradientFrom} ${gradientTo} shadow-lg transition-transform hover:-translate-y-1 duration-300`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-black/20 shadow-inner backdrop-blur-md`}>
        <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
      </div>
      <button className="text-slate-500 hover:text-white transition-colors">
        <span className="material-symbols-outlined text-sm">more_horiz</span>
      </button>
    </div>

    <div>
      <h3 className="text-slate-400 font-medium text-sm mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-white tracking-tight">{value}</span>
        {subValue && (
          <span className={`text-xs font-bold ${subValueColor} flex items-center`}>
            {subValue.startsWith('+') ? <span className="material-symbols-outlined text-[12px]">trending_up</span> : subValue.startsWith('-') ? <span className="material-symbols-outlined text-[12px]">trending_down</span> : ''}
            {subValue}
          </span>
        )}
      </div>
    </div>

    {/* Decorative background blur */}
    <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white`}></div>
  </div>
);

const Dashboard: React.FC<{ tenantId?: string, readOnly?: boolean }> = ({ tenantId, readOnly }) => {
  const { state, actions, isSyncing } = useData();

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), // Default last 30 days
    endDate: new Date().toISOString()
  });

  const [mobileHeaderNode, setMobileHeaderNode] = useState<HTMLElement | null>(null);

  // Fetch updated orders and goals when the component mounts
  useEffect(() => {
    setMobileHeaderNode(document.getElementById('mobile-header-actions'));

    actions.syncAllOrders().catch(console.error);
    const loadGoals = async () => {
      const allTimeStart = new Date('2020-01-01').toISOString();
      const allTimeEnd = new Date().toISOString();
      await actions.fetchGoalsProgress(allTimeStart, allTimeEnd).catch(console.error);
    };
    loadGoals();
  }, [actions]);

  // --- Data Processing ---

  const filteredOrders = useMemo(() => {
    return state.orders.filter(o => {
      if (tenantId && o.tenantId !== tenantId) return false;
      const orderDate = new Date(o.date);
      return orderDate >= new Date(dateRange.startDate) && orderDate <= new Date(dateRange.endDate);
    });
  }, [state.orders, dateRange, tenantId]);

  const approvedOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === OrderStatus.APROVADO);
  }, [filteredOrders]);

  const periodRevenue = approvedOrders.reduce((sum, o) => sum + o.value, 0);
  const ticketMedio = approvedOrders.length > 0 ? periodRevenue / approvedOrders.length : 0;

  const filteredAbandoned = useMemo(() => {
    return state.abandonedCheckouts.filter(a => {
      if (tenantId && a.tenantId !== tenantId) return false;
      const abandonDate = new Date(a.date);
      return abandonDate >= new Date(dateRange.startDate) && abandonDate <= new Date(dateRange.endDate);
    });
  }, [state.abandonedCheckouts, dateRange, tenantId]);

  // Payment method data for PieChart
  const canonicalMethods = ['PIX', 'Cartão', 'Boleto'];
  const colorsMap: Record<string, string> = {
    'PIX': '#3b82f6', // blue-500
    'Cartão': '#10b981', // emerald-500
    'Boleto': '#f59e0b' // amber-500
  };
  const counts: Record<string, number> = { 'PIX': 0, 'Cartão': 0, 'Boleto': 0 };
  approvedOrders.forEach(o => {
    const pm = String(o.paymentMethod || '').toLowerCase();
    if (pm.includes('pix')) counts['PIX']++;
    else if (pm.includes('card') || pm.includes('credit') || pm.includes('cartão') || pm.includes('cartao')) counts['Cartão']++;
    else if (pm.includes('boleto') || pm.includes('billet')) counts['Boleto']++;
    else counts['Boleto']++; // fallback
  });
  const pieData = canonicalMethods.map(name => ({ name, value: counts[name] || 0, color: colorsMap[name] })).filter(d => d.value > 0);

  // Grouping Revenue by Date (for the Main Chart)
  const chartDataMap = useMemo(() => {
    const map = new Map<string, { dateLabel: string, timestamp: number, pix: number, cartao: number, boleto: number, total: number }>();

    // Determine interval (if > 60 days, group by month, else day)
    const diffDays = (new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 3600 * 24);
    const groupBy = diffDays > 60 ? 'month' : 'day';

    approvedOrders.forEach(o => {
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return;

      let key = '';
      let label = '';
      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!map.has(key)) {
        map.set(key, { dateLabel: label, timestamp: d.getTime(), pix: 0, cartao: 0, boleto: 0, total: 0 });
      }

      const entry = map.get(key)!;
      const pm = String(o.paymentMethod || '').toLowerCase();
      let amnt = o.value || 0;

      if (pm.includes('pix')) entry.pix += amnt;
      else if (pm.includes('card') || pm.includes('credit') || pm.includes('cartão') || pm.includes('cartao')) entry.cartao += amnt;
      else entry.boleto += amnt;

      entry.total += amnt;
    });

    // Sort by chronological order
    const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    return sorted;
  }, [approvedOrders, dateRange]);

  // Top Products
  const topProducts = useMemo(() => {
    const counts = new Map<string, { name: string, quantity: number, revenue: number }>();
    approvedOrders.forEach(o => {
      const prodName = o.product || 'Produto Desconhecido';
      if (!counts.has(prodName)) counts.set(prodName, { name: prodName, quantity: 0, revenue: 0 });
      const entry = counts.get(prodName)!;
      entry.quantity += 1;
      entry.revenue += (o.value || 0);
    });
    return Array.from(counts.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [approvedOrders]);

  // Recent Orders
  const recentOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [filteredOrders]);


  // Custom Tooltip for Chart
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-[#111] border border-white/10 p-4 rounded-xl shadow-xl">
          <p className="text-slate-400 font-medium mb-3 border-b border-white/10 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-6 mb-1 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300">{entry.name}</span>
              </span>
              <span className="text-white font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center gap-6 mt-3 pt-2 border-t border-white/10 font-black text-[15px]">
            <span className="text-slate-300">Total</span>
            <span className="text-emerald-400">{formatCurrency(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="space-y-8 pb-12">
      {/* Header Actions */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-xl">
        {/* Title area: Hidden strictly on mobile completely as requested */}
        <div className="hidden md:flex flex-col w-full lg:w-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-900/20 flex items-center justify-center border border-emerald-500/20 mt-0.5">
              <span className="material-symbols-outlined text-emerald-500">dashboard</span>
            </div>
            <div>
              <h2 className="text-[28px] sm:text-3xl font-black text-white tracking-tight leading-tight">
                Dashboard<br className="md:hidden" /> Overview
              </h2>
            </div>
          </div>
          <p className="text-slate-400 text-[15px] font-medium mt-3">Sua operação e-commerce em tempo real.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full lg:w-auto mt-0">
          <div className="w-full md:w-auto flex flex-col md:w-[280px] xl:w-[320px]">
            <GoalProgressBar currentRevenue={(tenantId ? state.tenants.find(t => t.id === tenantId)?.cachedGrossRevenue : state.activeTenant?.cachedGrossRevenue) || 0} />
          </div>

          <div className="hidden md:flex w-full md:w-auto flex-col md:min-w-[180px]">
            <DateRangeFilter onFilterChange={(start, end) => setDateRange({ startDate: start.toISOString(), endDate: end.toISOString() })} />
          </div>

          {mobileHeaderNode && createPortal(
            <div className="md:hidden">
              <DateRangeFilter onFilterChange={(start, end) => setDateRange({ startDate: start.toISOString(), endDate: end.toISOString() })} />
            </div>,
            mobileHeaderNode
          )}

          {!readOnly && (
            <button
              onClick={() => actions.syncYampi()}
              disabled={isSyncing}
              className={`w-full md:w-auto px-6 py-3 h-[46px] rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSyncing ? 'bg-neutral-800 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-primary text-black hover:bg-primary/90 glow-hover'}`}
            >
              <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
              <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Líquida"
          value={formatCurrency(periodRevenue)}
          subValue="+12,5%" // Mocked trend
          icon="attach_money"
          gradientFrom="from-[#0f172a]"
          gradientTo="to-[#020617]"
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Pedidos Aprovados"
          value={approvedOrders.length.toString()}
          icon="shopping_bag"
          gradientFrom="from-[#1e1b4b]"
          gradientTo="to-[#0a0f25]"
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          subValue={approvedOrders.length > 0 ? "Normal" : ""}
          subValueColor="text-blue-400"
          icon="receipt_long"
          gradientFrom="from-[#0f172a]"
          gradientTo="to-[#020617]"
          iconColor="text-blue-400"
        />
        <StatCard
          title="Abandonos de Carrinho"
          value={filteredAbandoned.length.toString()}
          subValue="Atenção"
          subValueColor="text-amber-500"
          icon="remove_shopping_cart"
          gradientFrom="from-[#271011]"
          gradientTo="to-[#0f0a0a]"
          iconColor="text-rose-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Col: Main Chart (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col items-stretch h-[420px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
                  Resumo Financeiro
                </h3>
                <p className="text-slate-500 text-xs mt-1">Receita bruta por métódo de pagamento</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span className="text-slate-300">PIX</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-slate-300">Cartão</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div><span className="text-slate-300">Boleto</span></div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataMap} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltipContent />} cursor={{ fill: '#ffffff05' }} />

                  <Bar dataKey="pix" name="PIX" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="cartao" name="Cartão" stackId="a" fill="#10b981" />
                  <Bar dataKey="boleto" name="Boleto" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-xl">receipt_long</span>
              Últimas Vendas
            </h3>
            {/* Mobile View */}
            <div className="md:hidden md:mt-2">
              <div className="flex items-center gap-3 mb-4 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Aprovado (A)</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Aguardando (AG)</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Cancelado (C)</div>
              </div>

              <div className="flex text-[11px] text-slate-500 mb-2 px-2 uppercase font-medium tracking-wider">
                <div className="flex-[1.2]">Cliente</div>
                <div className="flex-1 text-left">Produto Data</div>
                <div className="text-right pl-2 shrink-0">Valor</div>
              </div>
              <div className="space-y-1 relative">
                {recentOrders.length > 0 ? recentOrders.map((order, idx) => {
                  let statusColorBg = 'bg-slate-500/50';
                  if (order.status === OrderStatus.APROVADO) statusColorBg = 'bg-emerald-500/50';
                  else if (order.status === OrderStatus.AGUARDANDO) statusColorBg = 'bg-amber-500/50';

                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 px-2 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors relative">
                      {/* Subtle status line on left */}
                      <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-r-md ${statusColorBg}`}></div>

                      <div className="flex-[1.2] min-w-0 pl-1.5">
                        <p className="text-[14px] font-medium text-white truncate">{order.client}</p>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5">{order.paymentMethod}</p>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col items-start justify-center pr-2">
                        <p className="text-[12px] text-slate-300 truncate w-full text-left">{order.product}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap text-left">{new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(order.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        <div className="flex items-center gap-1.5 justify-end w-full">
                          <p className={`text-[12.5px] font-bold whitespace-nowrap ${order.status === OrderStatus.APROVADO ? 'text-emerald-400' : order.status === OrderStatus.AGUARDANDO ? 'text-amber-400' : 'text-slate-400'}`}>
                            {formatCurrency(order.value)}
                          </p>
                          <span className={`w-[18px] h-[18px] shrink-0 flex items-center justify-center text-[9px] font-bold rounded-[3px]
                              ${order.status === OrderStatus.APROVADO ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              order.status === OrderStatus.AGUARDANDO ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }
                          `}>
                            {order.status === OrderStatus.APROVADO ? 'A' : order.status === OrderStatus.AGUARDANDO ? 'AG' : 'C'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-8 text-center text-slate-500 text-sm">Nenhum pedido encontrado.</div>
                )}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Produto</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                    <th className="pb-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                            {order.initials || '?'}
                          </div>
                          <div>
                            <p className="text-white font-medium max-w-[120px] truncate">{order.client}</p>
                            <p className="text-slate-500 text-[10px] uppercase">{order.paymentMethod}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-300 max-w-[150px] truncate" title={order.product}>{order.product}</td>
                      <td className="py-4 text-slate-400">{new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-4 text-right text-emerald-400 font-bold">{formatCurrency(order.value)}</td>
                      <td className="py-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider
                          ${order.status === OrderStatus.APROVADO ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            order.status === OrderStatus.AGUARDANDO ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }
                        `}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">Nenhum pedido encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Secondary Charts & Lists */}
        <div className="space-y-6">

          {/* Payment Methods Donut */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 h-[320px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">pie_chart</span>
              Métodos de Pagamento
            </h3>
            <p className="text-slate-500 text-xs mb-4">Distribuição de vendas aprovadas</p>

            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => <Cell key={`cell -\${ index } `} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">Total</span>
                <span className="text-xl font-black text-white">{approvedOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-xl">workspace_premium</span>
              Top Produtos
            </h3>

            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-black text-slate-400 group-hover:text-primary transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate" title={prod.name}>{prod.name}</p>
                    <p className="text-xs text-slate-400">{prod.quantity} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(prod.revenue)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-slate-500 py-4 text-sm">Sem dados suficientes.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
