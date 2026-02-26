
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '../backend/supabaseClient';
import { toast } from 'react-hot-toast';

interface PushSettings {
    tenant_id: string;
    enabled: boolean;
    send_time: string;
    timezone: string;
    scope: 'today' | 'yesterday';
    meta_roas: number;
    meta_margem: number;
    max_cpa: number;
    fixed_costs: number;
    variable_costs_pct: number;
}

interface PushLog {
    id: string;
    date_ref: string;
    payload: any;
    status: string;
    error_message: string;
    created_at: string;
}

const PushAdmin: React.FC = () => {
    const { state } = useData();
    const [tenants, setTenants] = useState<any[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [settings, setSettings] = useState<PushSettings | null>(null);
    const [logs, setLogs] = useState<PushLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<{ stats: any; copy: string } | null>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetchTenants();
    }, []);

    useEffect(() => {
        if (selectedTenantId) {
            fetchSettings(selectedTenantId);
            fetchLogs(selectedTenantId);
            setPreview(null);
        }
    }, [selectedTenantId]);

    const fetchTenants = async () => {
        const { data } = await supabase.from('tenants').select('id, name').eq('active', true).order('name');
        setTenants(data || []);
        if (data && data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(data[0].id);
        }
    };

    const fetchSettings = async (tenantId: string) => {
        try {
            const resp = await fetch(`/api/push/settings?tenantId=${tenantId}`);
            const data = await resp.json();
            setSettings(data);
        } catch (err) {
            toast.error('Erro ao carregar configurações');
        }
    };

    const fetchLogs = async (tenantId: string) => {
        try {
            const resp = await fetch(`/api/push/logs?tenantId=${tenantId}`);
            const data = await resp.json();
            setLogs(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setLoading(true);
        try {
            const resp = await fetch('/api/push/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (resp.ok) {
                toast.success('Configurações salvas com sucesso!');
            } else {
                throw new Error('Falha ao salvar');
            }
        } catch (err) {
            toast.error('Erro ao salvar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = async () => {
        if (!selectedTenantId || !settings) return;
        setLoading(true);
        try {
            const resp = await fetch('/api/push/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: selectedTenantId, scope: settings.scope })
            });
            const data = await resp.json();
            setPreview(data);
        } catch (err) {
            toast.error('Erro ao gerar prévia');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!selectedTenantId || !settings) return;
        setTesting(true);
        try {
            const resp = await fetch('/api/push/send-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: selectedTenantId,
                    scope: settings.scope,
                    userId: state.currentUser?.id
                })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(`Teste enviado para ${data.deliveredCount} dispositivos!`);
                fetchLogs(selectedTenantId);
            } else {
                toast.error('Falha no envio do teste');
            }
        } catch (err) {
            toast.error('Erro ao disparar teste');
        } finally {
            setTesting(false);
        }
    };

    if (!tenants.length) return <div className="p-8 text-slate-500">Carregando lojistas...</div>;

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Notificações Push</h1>
                    <p className="text-slate-400 mt-1">Configuração de relatórios diários de performance</p>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <span className="material-symbols-outlined text-slate-500 ml-2">storefront</span>
                    <select
                        value={selectedTenantId}
                        onChange={(e) => setSelectedTenantId(e.target.value)}
                        className="bg-transparent text-white border-none focus:ring-0 text-sm font-bold pr-8"
                    >
                        {tenants.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.name}</option>)}
                    </select>
                </div>
            </header>

            {settings ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">settings</span>
                                    Configuração de Envio
                                </h2>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enabled}
                                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-300">{settings.enabled ? 'Ativado' : 'Desativado'}</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Horário de Envio</label>
                                    <input
                                        type="time"
                                        value={settings.send_time}
                                        onChange={(e) => setSettings({ ...settings, send_time: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fuso Horário</label>
                                    <select
                                        value={settings.timezone}
                                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all"
                                    >
                                        <option value="America/Sao_Paulo" className="bg-[#1a1a1a]">Brasília (GMT-3)</option>
                                        <option value="America/New_York" className="bg-[#1a1a1a]">New York (GMT-5)</option>
                                        <option value="Europe/London" className="bg-[#1a1a1a]">London (GMT+0)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Escopo de Dados</label>
                                    <select
                                        value={settings.scope}
                                        onChange={(e) => setSettings({ ...settings, scope: e.target.value as any })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all"
                                    >
                                        <option value="today" className="bg-[#1a1a1a]">Hoje (Parcial)</option>
                                        <option value="yesterday" className="bg-[#1a1a1a]">Ontem (Fechado)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">ads_click</span>
                                Metas & Custos para Cálculo
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ROAS Mínimo</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.meta_roas}
                                        onChange={(e) => setSettings({ ...settings, meta_roas: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Margem Mínima %</label>
                                    <input
                                        type="number"
                                        value={settings.meta_margem}
                                        onChange={(e) => setSettings({ ...settings, meta_margem: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CPA Máximo (R$)</label>
                                    <input
                                        type="number"
                                        value={settings.max_cpa}
                                        onChange={(e) => setSettings({ ...settings, max_cpa: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Custos Fixos Mensais</label>
                                    <input
                                        type="number"
                                        value={settings.fixed_costs}
                                        onChange={(e) => setSettings({ ...settings, fixed_costs: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Custos Variáveis %</label>
                                    <input
                                        type="number"
                                        value={settings.variable_costs_pct}
                                        onChange={(e) => setSettings({ ...settings, variable_costs_pct: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-dark text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Salvando...' : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        Salvar Configurações
                                    </>
                                )}
                            </button>
                        </section>
                    </div>

                    {/* Preview & Testing */}
                    <div className="space-y-6">
                        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">visibility</span>
                                Prévia do Report
                            </h2>

                            {preview ? (
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">smartphone</span>
                                            Notificação Push
                                        </p>
                                        <p className="text-white text-sm font-medium leading-relaxed">
                                            {preview.copy}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[8px] font-black uppercase text-slate-500">Receita (BR)</p>
                                            <p className="text-sm font-bold text-white">R$ {preview.stats.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[8px] font-black uppercase text-slate-500">Ads Spend</p>
                                            <p className="text-sm font-bold text-white">R$ {preview.stats.ads.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[8px] font-black uppercase text-slate-500">Lucro Est.</p>
                                            <p className={`text-sm font-bold ${preview.stats.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                R$ {preview.stats.lucro.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <p className="text-[8px] font-black uppercase text-slate-500">ROAS</p>
                                            <p className="text-sm font-bold text-white">{preview.stats.roas.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/5 aspect-video rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 gap-2">
                                    <span className="material-symbols-outlined text-3xl">summarize</span>
                                    <p className="text-xs">Nenhuma prévia gerada</p>
                                </div>
                            )}

                            <button
                                onClick={handleGeneratePreview}
                                disabled={loading}
                                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                Gerar Prévia com Dados Reais
                            </button>

                            <button
                                onClick={handleSendTest}
                                disabled={testing || !settings.enabled}
                                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3 rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-sm">send</span>
                                {testing ? 'Disparando...' : 'Disparar Notificação de Teste'}
                            </button>
                            {!settings.enabled && <p className="text-[10px] text-center text-rose-500">Ative o serviço para enviar testes</p>}
                        </section>

                        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">history</span>
                                Últimos Envios
                            </h2>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {logs.length > 0 ? logs.map(log => (
                                    <div key={log.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold text-white">Ref: {log.date_ref}</p>
                                            <p className="text-[9px] text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-600 text-center py-4 italic">Nenhum log encontrado</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PushAdmin;
