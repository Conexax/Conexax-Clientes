import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import DateRangeFilter from '../components/DateRangeFilter';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdsAnalytics: React.FC<{ tenantId?: string }> = ({ tenantId: explicitTenantId }) => {
    const { state } = useData();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'meta' | 'google'>('meta');

    // Estado detalhado das métricas
    const [metaMetrics, setMetaMetrics] = useState({
        spend: 0, roas: 0, purchases: 0, cpa: 0, cpc: 0, cpm: 0, ctr: 0, clicks: 0
    });

    const [googleMetrics, setGoogleMetrics] = useState({
        spend: 0, sessions: 0, conversions: 0, conversionRate: 0, cpa: 0, bounceRate: 0
    });

    const [dailyData, setDailyData] = useState<any[]>([]);

    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const tenantId = explicitTenantId || state.currentUser?.tenantId;

                // Fetching real endpoints (they might return limited data now, so we merge with realistic fallbacks if empty)
                const [metaRes, gaRes] = await Promise.allSettled([
                    fetch(`/api/analytics/meta/metrics?tenantId=${tenantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
                    fetch(`/api/analytics/google/metrics?tenantId=${tenantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
                ]);

                let fetchedMeta: any = {};
                let fetchedGa: any = {};

                if (metaRes.status === 'fulfilled' && metaRes.value.ok) fetchedMeta = await metaRes.value.json();
                if (gaRes.status === 'fulfilled' && gaRes.value.ok) fetchedGa = await gaRes.value.json();

                // Simulando métricas avançadas baseadas no que chegou ou fallbacks (mock) para visualização rica
                const mSpend = fetchedMeta.spend || 0;
                const mRoas = fetchedMeta.roas || 0;
                const mPurchases = fetchedMeta.conversions || 0;

                setMetaMetrics({
                    spend: mSpend,
                    roas: mRoas,
                    purchases: mPurchases,
                    cpa: mPurchases > 0 ? mSpend / mPurchases : 0,
                    cpc: fetchedMeta.cpc || 0,
                    cpm: fetchedMeta.cpm || 0, // Mocked until API supports
                    ctr: fetchedMeta.ctr || 0,   // Mocked %
                    clicks: fetchedMeta.clicks || 0
                });

                const gSpend = fetchedGa.spend || 0;
                const gSessions = fetchedGa.sessions || 0;
                const gConversions = fetchedGa.conversions || 0;

                setGoogleMetrics({
                    spend: gSpend,
                    sessions: gSessions,
                    conversions: gConversions,
                    conversionRate: gSessions > 0 ? (gConversions / gSessions) * 100 : 0,
                    cpa: gConversions > 0 ? gSpend / gConversions : 0,
                    bounceRate: fetchedGa.bounceRate || 0
                });

                // Generating zeroed daily data to avoid empty charts visually breaking
                const diffDays = Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 3600 * 24)));

                const zeroDaily = Array.from({ length: diffDays }).map((_, i) => {
                    const d = new Date(dateRange.startDate);
                    d.setDate(d.getDate() + i + 1);
                    return {
                        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        metaSpend: 0,
                        metaConversions: 0,
                        googleSpend: 0,
                        googleConversions: 0
                    };
                });

                setDailyData(fetchedMeta.daily || fetchedGa.daily || zeroDaily);

            } catch (e) {
                console.error("Erro ao buscar métricas de tráfego:", e);
            } finally {
                setLoading(false);
            }
        };

        if (explicitTenantId || state.currentUser?.tenantId) {
            fetchMetrics();
        }
    }, [explicitTenantId, state.currentUser?.tenantId, dateRange]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

    const MetricCard = ({ title, value, icon, colorClass, gradient, subtitle }: any) => (
        <div className={`glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/5`}>
            {/* Background Glow */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${gradient} group-hover:opacity-20 transition-opacity`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 shadow-inner border border-white/5`}>
                    <span className={`material-symbols-outlined text-2xl ${colorClass}`}>{icon}</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <p className="text-3xl font-black text-white tracking-tight">{value}</p>
                {subtitle && <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">{subtitle}</p>}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#111] border border-white/10 p-4 rounded-xl shadow-2xl">
                    <p className="text-slate-400 font-medium mb-3 border-b border-white/10 pb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-6 mb-1 text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-slate-300">{entry.name}</span>
                            </span>
                            <span className="text-white font-bold">
                                {entry.dataKey.toLowerCase().includes('spend') ? formatCurrency(entry.value) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0a0a0a] p-6 lg:p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Tráfego & Ads</h2>
                    </div>
                    <p className="text-slate-400 text-sm font-medium ml-16">Gestão avançada de performance e aquisição.</p>
                </div>

                <div className="w-full md:w-auto relative z-10 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('meta')}
                            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'meta' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Meta Ads
                        </button>
                        <button
                            onClick={() => setActiveTab('google')}
                            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'google' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Google/GA4
                        </button>
                    </div>
                    <div className="w-full sm:w-auto">
                        <DateRangeFilter
                            onFilterChange={(start, end) => setDateRange({
                                startDate: start.toISOString().split('T')[0],
                                endDate: end.toISOString().split('T')[0]
                            })}
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="h-64 flex items-center justify-center glass-panel rounded-[32px] border border-white/5">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {activeTab === 'meta' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                                <MetricCard
                                    title="Valor Gasto"
                                    value={formatCurrency(metaMetrics.spend)}
                                    icon="payments" colorClass="text-fuchsia-400" gradient="bg-fuchsia-500"
                                />
                                <MetricCard
                                    title="ROAS de Compras"
                                    value={`${metaMetrics.roas.toFixed(2)}x`}
                                    icon="rocket_launch" colorClass={metaMetrics.roas >= 2 ? "text-emerald-400" : "text-amber-400"} gradient={metaMetrics.roas >= 2 ? "bg-emerald-500" : "bg-amber-500"}
                                    subtitle="Retorno sobre investimento"
                                />
                                <MetricCard
                                    title="Compras"
                                    value={formatNumber(metaMetrics.purchases)}
                                    icon="shopping_bag" colorClass="text-indigo-400" gradient="bg-indigo-500"
                                    subtitle={`CPA: ${formatCurrency(metaMetrics.cpa)}`}
                                />
                                <MetricCard
                                    title="Custo por Clique (CPC)"
                                    value={formatCurrency(metaMetrics.cpc)}
                                    icon="ads_click" colorClass="text-blue-400" gradient="bg-blue-500"
                                    subtitle={`${formatNumber(metaMetrics.clicks)} Cliques no link`}
                                />
                                <MetricCard
                                    title="Custo por Mil (CPM)"
                                    value={formatCurrency(metaMetrics.cpm)}
                                    icon="visibility" colorClass="text-purple-400" gradient="bg-purple-500"
                                />
                                <MetricCard
                                    title="CTR (Todos)"
                                    value={`${metaMetrics.ctr.toFixed(2)}%`}
                                    icon="touch_app" colorClass="text-rose-400" gradient="bg-rose-500"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'google' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                                <MetricCard
                                    title="Custo (Ads)"
                                    value={formatCurrency(googleMetrics.spend)}
                                    icon="monetization_on" colorClass="text-blue-400" gradient="bg-blue-500"
                                />
                                <MetricCard
                                    title="Sessões"
                                    value={formatNumber(googleMetrics.sessions)}
                                    icon="public" colorClass="text-emerald-400" gradient="bg-emerald-500"
                                    subtitle="Tráfego do site (GA4)"
                                />
                                <MetricCard
                                    title="Conversões"
                                    value={formatNumber(googleMetrics.conversions)}
                                    icon="flag" colorClass="text-amber-400" gradient="bg-amber-500"
                                    subtitle={`Taxa: ${googleMetrics.conversionRate.toFixed(2)}%`}
                                />
                                <MetricCard
                                    title="Custo por Aquisição (CPA)"
                                    value={formatCurrency(googleMetrics.cpa)}
                                    icon="target" colorClass="text-rose-400" gradient="bg-rose-500"
                                />
                                <MetricCard
                                    title="Taxa de Rejeição"
                                    value={`${googleMetrics.bounceRate.toFixed(2)}%`}
                                    icon="move_up" colorClass="text-slate-400" gradient="bg-slate-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Daily Historical Chart area */}
                    <div className="glass-panel p-6 lg:p-8 rounded-[32px] border border-white/5 mt-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className={`material-symbols-outlined ${activeTab === 'meta' ? 'text-fuchsia-500' : 'text-blue-500'}`}>show_chart</span>
                                    Desempenho Diário
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Comparativo de Custo vs Conversões ({activeTab === 'meta' ? 'Meta Ads' : 'Google Ads'})
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${activeTab === 'meta' ? 'bg-fuchsia-500' : 'bg-blue-500'}`}></div> Gasto
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Conversões
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={activeTab === 'meta' ? '#d946ef' : '#3b82f6'} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={activeTab === 'meta' ? '#d946ef' : '#3b82f6'} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(val) => `R$${val}`}
                                        dx={-10}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dx={10}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }} />

                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey={activeTab === 'meta' ? 'metaSpend' : 'googleSpend'}
                                        name="Gasto"
                                        stroke={activeTab === 'meta' ? '#d946ef' : '#3b82f6'}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSpend)"
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey={activeTab === 'meta' ? 'metaConversions' : 'googleConversions'}
                                        name="Conversões"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorConv)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdsAnalytics;
