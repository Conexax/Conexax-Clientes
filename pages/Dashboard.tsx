
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { useData } from '../context/DataContext';
import { GoogleGenAI } from "@google/genai";

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

  useEffect(() => {
    if (state.orders.length > 0) {
      const fetchInsight = async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise estes dados de venda da Yampi: Receita R$${stats.totalRevenue}, Conversão ${stats.conversionRate.toFixed(2)}%, Abandonos ${stats.abandonedCount}. Dê uma dica curta.`,
          });
          setAiInsight(response.text || "Foco em recuperação de carrinhos.");
        } catch { setAiInsight("Aumente o tráfego para melhorar o ROI."); }
      };
      fetchInsight();
    }
  }, [state.orders, stats.totalRevenue, stats.conversionRate, stats.abandonedCount]);

  const pieData = [
    { name: 'Cartão', value: state.orders.filter(o => o.paymentMethod === 'Cartão').length, color: '#10b981' },
    { name: 'PIX', value: state.orders.filter(o => o.paymentMethod === 'PIX').length, color: '#3b82f6' },
    { name: 'Boleto', value: state.orders.filter(o => o.paymentMethod === 'Boleto').length, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white">Dashboard <span className="text-primary italic">Live</span></h2>
          <p className="text-slate-500 text-sm font-medium">Insights automáticos da sua operação Yampi.</p>
        </div>
        <button 
          onClick={() => actions.syncYampi()}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isSyncing ? 'bg-neutral-800 text-slate-500' : 'bg-primary text-neutral-950 glow-hover'}`}
        >
          <span className={`material-symbols-outlined ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Receita Bruta" value={`R$ ${(stats.totalRevenue || 0).toLocaleString()}`} sub="Vendas Aprovadas" icon="payments" color="bg-primary" />
        <StatCard label="Abandonados" value={`R$ ${(stats.abandonedTotalValue || 0).toLocaleString()}`} sub={`${stats.abandonedCount || 0} Carrinhos`} icon="shopping_cart_checkout" color="bg-rose-500" />
        <StatCard label="Taxa Conversão" value={`${(stats.conversionRate || 0).toFixed(1)}%`} sub="Média da Loja" icon="query_stats" color="bg-blue-500" />
        <StatCard label="IA Insight" value="Sugestão" sub={aiInsight} icon="bolt" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-8">Volume de Pedidos Sincronizados</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.orders.slice(0, 15)}>
                <XAxis dataKey="id" hide />
                <Tooltip contentStyle={{backgroundColor: '#0f0f0f', border: 'none', borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-8">Métodos de Pagamento</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
            {pieData.map(p => (
              <div key={p.name} className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{p.name}</span>
                <span className="text-white font-black">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
