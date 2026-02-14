
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { useData } from '../context/DataContext';
import { OrderStatus } from '../types';

import GoalProgressBar from '../components/GoalProgressBar';
import DateRangeFilter from '../components/DateRangeFilter';

const StatCard: React.FC<{ label: string; value: string; sub: string; icon: string; color: string }> = ({ label, value, sub, icon, color }) => (
  <div className="stat-card p-6 rounded-2xl">
    <div className={`w-10 h-10 ${color} bg-opacity-10 rounded-xl flex items-center justify-center mb-4 border border-white/5`}>
      <span className={`material-symbols-outlined ${color.replace('bg-', 'text-')}`}>{icon}</span>
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-black text-white">{value}</h4>
    <p className="text-[10px] text-slate-400 mt-2 font-bold">{sub}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { state, stats, actions, isSyncing } = useData();
  const [aiInsight, setAiInsight] = useState("Analisando performance...");

  // Goals & Date Filter Logic
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date().toISOString()
  });
  const [goalsData, setGoalsData] = useState<any>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Filtered stats for the selected period
  const filteredOrders = React.useMemo(() => {
    return state.orders.filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= new Date(dateRange.startDate) && orderDate <= new Date(dateRange.endDate);
    });
  }, [state.orders, dateRange]);

  const approvedOrders = React.useMemo(() => {
    return filteredOrders.filter(o => o.status === OrderStatus.APROVADO);
  }, [filteredOrders]);

  const filteredAbandoned = React.useMemo(() => {
    return state.abandonedCheckouts.filter(a => {
      const abandonDate = new Date(a.date);
      return abandonDate >= new Date(dateRange.startDate) && abandonDate <= new Date(dateRange.endDate);
    });
  }, [state.abandonedCheckouts, dateRange]);

  const periodRevenue = approvedOrders.reduce((sum, o) => sum + o.value, 0);

  const getPeriodLabel = () => {
    const filter = localStorage.getItem('conexx_date_filter') || 'today';
    switch (filter) {
      case 'today': return 'Hoje';
      case 'week': return 'Últimos 7 dias';
      case 'month': return 'Este Mês';
      case 'total': return 'Total';
      case 'custom': return 'Período';
      default: return 'Seleção';
    }
  };

  useEffect(() => {
    const loadGoals = async () => {
      setLoadingGoals(true);
      // Goals should always reflect TOTAL all-time revenue (as per user request)
      // Hardcode a wide range, e.g., from 2000 to 2100 or simply "now" back to beginning
      const allTimeStart = new Date('2020-01-01').toISOString();
      const allTimeEnd = new Date().toISOString();

      const data = await actions.fetchGoalsProgress(allTimeStart, allTimeEnd);
      if (data && data.length > 0) {
        setGoalsData(data[0]); // Client view: expect single row
      }
      setLoadingGoals(false);
    };
    loadGoals();
  }, [isSyncing]); // Dep on isSyncing to refresh after sync, but NOT on dateRange


  /* 
  useEffect(() => {
    if (state.orders.length > 0) {
      const fetchInsight = async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: '' }); // Disabled to prevent crash
          // const response = await ai.models.generateContent({
          //   model: 'gemini-3-flash-preview',
          //   contents: `Analise estes dados de venda da Yampi: Receita R$${stats.totalRevenue}, Conversão ${stats.conversionRate.toFixed(2)}%, Abandonos ${stats.abandonedCount}. Dê uma dica curta.`,
          // });
          // setAiInsight(response.text || "Foco em recuperação de carrinhos.");
          setAiInsight("Foco em recuperação de carrinhos.");
        } catch { setAiInsight("Aumente o tráfego para melhorar o ROI."); }
      };
      fetchInsight();
    }
  }, [state.orders, stats.totalRevenue, stats.conversionRate, stats.abandonedCount]);
  */

  // Payment method counts — normalize to PIX, Cartão, Boleto
  const canonicalMethods = ['PIX', 'Cartão', 'Boleto'];
  const colorsMap: Record<string, string> = {
    'PIX': '#3b82f6',
    'Cartão': '#10b981',
    'Boleto': '#f59e0b'
  };
  const counts: Record<string, number> = { 'PIX': 0, 'Cartão': 0, 'Boleto': 0 };
  state.orders.forEach(o => {
    const pm = String(o.paymentMethod || '').toLowerCase();
    if (pm.includes('pix')) counts['PIX']++;
    else if (pm.includes('card') || pm.includes('credit') || pm.includes('cartão')) counts['Cartão']++;
    else if (pm.includes('boleto') || pm.includes('billet')) counts['Boleto']++;
    else {
      // try exact matches
      if (pm === 'pix') counts['PIX']++;
      else if (pm === 'cartão' || pm === 'cartao' || pm === 'card') counts['Cartão']++;
      else if (pm === 'boleto') counts['Boleto']++;
    }
  });
  const pieData = canonicalMethods.map(name => ({ name, value: counts[name] || 0, color: colorsMap[name] })).filter(d => d.value >= 0);
  const topMethod = pieData.reduce((best, cur) => (cur.value > (best?.value || 0) ? cur : best), pieData[0] || null);

  // Orders per month (last 6 months) - volume by month
  const getMonthKey = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch { return null; }
  };
  const lastNMonths = (n = 6) => {
    const arr: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return arr;
  };
  const months = lastNMonths(6);
  const ordersByMonthCounts = months.map(m => {
    const [y, mm] = m.split('-').map(Number);
    const count = state.orders.filter(o => {
      const key = getMonthKey(o.date || '');
      return key === m;
    }).length;
    const label = new Date(y, mm - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' });
    return { month: m, label, count };
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white">Dashboard <span className="text-primary italic">Live</span></h2>
          <p className="text-slate-500 text-sm font-medium">Insights automáticos da sua operação Yampi.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center w-full lg:w-auto">
          <div className="hidden lg:block border-r border-white/10 pr-6 mr-2">
            <GoalProgressBar currentRevenue={state.activeTenant?.cachedGrossRevenue || 0} />
          </div>
          <div className="w-full md:w-auto">
            <DateRangeFilter onFilterChange={(start, end) => setDateRange({ startDate: start.toISOString(), endDate: end.toISOString() })} />
          </div>
          <button
            onClick={() => actions.syncYampi()}
            className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSyncing ? 'bg-neutral-800 text-slate-500' : 'bg-primary text-neutral-950 glow-hover'}`}
          >
            <span className={`material-symbols-outlined ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </header >



      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-16">
        <StatCard
          label={`Vendas (${getPeriodLabel()})`}
          value={`R$ ${periodRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          sub="Vendas Aprovadas"
          icon="payments"
          color="bg-primary"
        />
        <StatCard
          label="Pedidos"
          value={filteredOrders.length.toString()}
          sub="Total no Período"
          icon="shopping_cart"
          color="bg-indigo-400"
        />
        <StatCard
          label="Carrinhos"
          value={filteredAbandoned.length.toString()}
          sub="Abandonados"
          icon="shopping_basket"
          color="bg-amber-400"
        />
        <StatCard label="Loja Online" value="Ativa" sub="Status Yampi" icon="cloud_done" color="bg-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-4 md:p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Volume de Pedidos (últimos 6 meses)</h3>
          <div className="h-56 md:h-64 overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByMonthCounts}>
                <XAxis dataKey="label" />
                <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-4 md:p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Métodos de Pagamento</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map(p => (
              <div key={p.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, backgroundColor: p.color }} className="rounded-full inline-block" />
                  <span className="text-slate-400">{p.name}</span>
                </div>
                <span className="text-white font-black">{p.value}</span>
              </div>
            ))}
            {topMethod && <div className="mt-3 text-[12px] text-slate-300 font-bold">Mais usado: <span className="text-white">{topMethod.name} ({topMethod.value})</span></div>}
          </div>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;
