
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const AsaasConfig: React.FC = () => {
    const { state, actions } = useData();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        api_key: '',
        environment: 'sandbox' as 'sandbox' | 'production',
        webhook_secret: ''
    });

    useEffect(() => {
        actions.syncAsaasConfig();
    }, []);

    useEffect(() => {
        if (state.asaasConfig) {
            setFormData({
                api_key: state.asaasConfig.api_key || '',
                environment: state.asaasConfig.environment || 'sandbox',
                webhook_secret: state.asaasConfig.webhook_secret || ''
            });
        }
    }, [state.asaasConfig]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await actions.saveAsaasConfig(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao salvar configurações: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            <header>
                <h2 className="text-4xl font-black text-white mb-2 italic">Configuração <span className="text-primary italic">Asaas Platform</span></h2>
                <p className="text-slate-500 font-medium">Configure as chaves de API globais usadas para cobrança de assinaturas dos lojistas.</p>
            </header>

            <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="glass-panel p-10 rounded-3xl space-y-8 border-primary/20">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ambiente</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, environment: 'sandbox' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${formData.environment === 'sandbox'
                                    ? 'bg-primary/20 text-primary border-primary/40'
                                    : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                Sandbox (Teste)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, environment: 'production' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${formData.environment === 'production'
                                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                    : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                Produção (Real)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">API Key (Access Token)</label>
                        <input
                            type="password"
                            required
                            placeholder="$a..."
                            className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-4 text-sm text-white focus:ring-primary"
                            value={formData.api_key}
                            onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-600 italic">Encontrado em Configurações &gt; Integrações no painel do Asaas.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Webhook Token (Opcional)</label>
                        <input
                            type="text"
                            placeholder="token_secreto_do_webhook"
                            className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-4 text-sm text-white focus:ring-primary"
                            value={formData.webhook_secret}
                            onChange={e => setFormData({ ...formData, webhook_secret: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-600 italic">Usado para validar a autenticidade dos webhooks do Asaas.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${success
                                ? 'bg-emerald-500 text-neutral-950'
                                : 'bg-primary text-neutral-950 hover:bg-primary-dark shadow-xl shadow-primary/20 shadow-primary/20'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : success ? (
                                <>
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Salvo com Sucesso
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">lock</span>
                                    Salvar Configurações
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-amber-500 text-xl">warning</span>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-tighter">Atenção</p>
                                <p className="text-[10px] text-slate-400 font-medium">Estas chaves controlam o faturamento de toda a plataforma. Certifique-se de que o webhook no Asaas está apontando para a sua URL do Supabase.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AsaasConfig;
