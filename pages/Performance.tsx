import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import AdminGoalsSection from '../components/AdminGoalsSection';
import DateRangeFilter from '../components/DateRangeFilter';

const Performance: React.FC = () => {
  const { state, isSyncing, actions } = useData();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date().toISOString()
  });

  const [loading, setLoading] = useState(false);
  const [goalsReport, setGoalsReport] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Stats for distribution
  const [distribution, setDistribution] = useState<any[]>([]);

  // Fetch Goals
  useEffect(() => {
    const loadGoals = async () => {
      setLoadingGoals(true);
      const allTimeStart = new Date('2020-01-01').toISOString();
      const allTimeEnd = new Date().toISOString();
      const data = await actions.fetchGoalsProgress(allTimeStart, allTimeEnd);

      if (data) {
        // Enrich with metaRange from tenants state
        const enriched = data.map((row: any) => {
          const tenant = state.tenants.find(t => t.id === row.tenant_id);
          return {
            ...row,
            meta_range: tenant?.metaRange || 'Não definida'
          };
        });
        setGoalsReport(enriched);

        // Calculate distribution
        const dist = [
          { name: '0-10k', value: enriched.filter((r: any) => r.meta_range === '0-10k').length },
          { name: '10k-100k', value: enriched.filter((r: any) => r.meta_range === '10k-100k').length },
          { name: '100k-1M', value: enriched.filter((r: any) => r.meta_range === '100k-1M').length },
          { name: 'Sem Meta', value: enriched.filter((r: any) => !r.meta_range || r.meta_range === 'Não definida').length },
        ];
        setDistribution(dist);
      }
      setLoadingGoals(false);
    };
    if (state.tenants.length > 0) {
      loadGoals();
    }
  }, [isSyncing, state.tenants]);


  // Conversion Rate (approximate for now as we don't have visitor count easily accessible in this view without tracking)
  // For now, let's just show Order Count or something reliable. Or if we have 'abandonedCheckouts' we can compute conversion from checkouts.
  // The API doesn't fully return abandoned count yet in the optimized endpoint, so let's stick to reliable financial metrics.

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2 italic">Performance <span className="text-primary">& Metas</span></h2>
          <p className="text-slate-400 font-medium tracking-tight">Análise centralizada do progresso de metas de todos os lojistas.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter onFilterChange={(start, end) => setDateRange({ startDate: start.toISOString(), endDate: end.toISOString() })} />
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {distribution.map((item, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Meta: {item.name}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-white">{item.value}</h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Lojistas</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full ${item.name === '100k-1M' ? 'bg-amber-500' : item.name === '10k-100k' ? 'bg-purple-500' : item.name === '0-10k' ? 'bg-emerald-500' : 'bg-slate-700'}`}
                style={{ width: `${(item.value / (state.tenants.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Goals Section */}
      <section className="mt-8">
        <AdminGoalsSection reportData={goalsReport} isLoading={loadingGoals} />
      </section>
    </div>
  );
};

export default Performance;
