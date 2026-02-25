
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
        <div className="space-y-10 animate-fade-in">
            <header>
                <h2 className="text-4xl font-black text-white mb-2 italic">Configuração <span className="text-primary italic">Asaas Platform</span></h2>
                <p className="text-slate-500 font-medium tracking-wide">Configure as chaves de API globais usadas para cobrança de assinaturas dos lojistas.</p>
            </header>

            <div className="max-w-2xl relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <form onSubmit={handleSubmit} className="glass-panel p-10 rounded-3xl space-y-8 border-[#1e2a22] shadow-2xl relative bg-[#050505]/40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ambiente de Execução</label>
                        <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-[#1e2a22]">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, environment: 'sandbox' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${formData.environment === 'sandbox'
                                    ? 'bg-primary text-neutral-950 shadow-lg shadow-primary/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Sandbox (Teste)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, environment: 'production' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${formData.environment === 'production'
                                    ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
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
                            className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-4 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors font-mono"
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
                            className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-4 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors font-mono"
                            value={formData.webhook_secret}
                            onChange={e => setFormData({ ...formData, webhook_secret: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-600 italic">Usado para validar a autenticidade dos webhooks do Asaas.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 ${success
                                ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                                : 'bg-primary text-neutral-950 hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20 hover:bg-primary-dark'
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

                    <div className="p-4 bg-[#0a0a0a] border border-[#1e2a22] rounded-xl flex gap-3 items-start">
                        <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">warning</span>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Atenção Crítica</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Estas chaves controlam o faturamento de toda a plataforma, garantindo pagamentos de mensalidade. Certifique-se de que o webhook no Asaas está apontando para a sua URL correta.</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AsaasConfig;
