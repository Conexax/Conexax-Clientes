import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Tenant, User, Product, WeeklyFee, Domain } from '../types';
import { toast } from 'react-hot-toast';
import Dashboard from './Dashboard';
import WeeklyFees from './WeeklyFees';
import AdsAnalytics from './AdsAnalytics';
import { supabase } from '../backend/supabaseClient';

// Components for Tabs

const ProductsTab = ({ tenantId }: { tenantId: string }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProds = async () => {
            const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
            if (data) setProducts(data.map((p: any) => ({
                id: p.id,
                tenantId: p.tenant_id,
                name: p.name,
                price: p.price,
                active: p.active,
                sku: p.sku
            })));
            setLoading(false);
        };
        fetchProds();
    }, [tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando produtos...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {products.map(p => (
                <div key={p.id} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <span className={`w-2 h-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{p.sku || 'Sem SKU'}</p>
                    <p className="text-primary font-black font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </p>
                </div>
            ))}
            {products.length === 0 && <p className="text-slate-500 text-sm col-span-3 text-center">Nenhum produto cadastrado.</p>}
        </div>
    );
};

const TeamTab = ({ tenantId }: { tenantId: string }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase.from('users').select('*').eq('tenant_id', tenantId);
            if (data) setUsers(data.map((u: any) => ({
                id: u.id,
                tenantId: u.tenant_id,
                email: u.email,
                role: u.role,
                name: u.name
            })));
            setLoading(false);
        };
        fetchUsers();
    }, [tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando equipe...</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            {users.map(u => (
                <div key={u.id} className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold">
                            {u.name.substring(0, 2)}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{u.name}</p>
                            <p className="text-slate-500 text-xs">{u.email}</p>
                        </div>
                    </div>
                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {u.role}
                    </span>
                </div>
            ))}
            {users.length === 0 && <p className="text-slate-500 text-sm text-center">Nenhum usuário encontrado.</p>}
        </div>
    );
};

const IntegrationsTab = ({ tenantId }: { tenantId: string }) => {
    const { state, actions } = useData();
    const [formData, setFormData] = useState<Partial<Tenant>>({});
    const [newDomainUrl, setNewDomainUrl] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const tenant = useMemo(() => state.tenants.find(t => t.id === tenantId), [state.tenants, tenantId]);

    useEffect(() => {
        if (tenant) {
            setFormData(tenant);
        }
    }, [tenant]);

    const tenantDomains = useMemo(() => {
        return state.domains.filter(d => d.tenantId === tenantId);
    }, [state.domains, tenantId]);

    const handleAddDomain = async () => {
        if (!newDomainUrl) return;
        setLocalError(null);
        const newDomain: Domain = {
            id: 'D-' + Date.now(),
            tenantId: tenantId,
            url: newDomainUrl.toLowerCase().trim(),
            isMain: tenantDomains.length === 0,
            status: 'pending',
            ssl: false
        };
        try {
            await actions.saveDomain(newDomain);
            setNewDomainUrl('');
        } catch (err: any) {
            setLocalError(err.message || "Erro ao adicionar domínio.");
        }
    };

    const handleSetMainDomain = async (domainId: string) => {
        const promises = tenantDomains.map(d => actions.saveDomain({ ...d, isMain: d.id === domainId }));
        await Promise.all(promises);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setLocalError(null);
        try {
            await actions.saveTenant(formData);
            toast.success("Integrações atualizadas com sucesso!");
        } catch (err: any) {
            setLocalError(err.message || "Erro ao salvar integrações.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-4 animate-fade-in relative pb-20">
            {localError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-sm font-bold flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined">error</span>
                    {localError}
                </div>
            )}

            {/* Domínios */}
            <div className={`rounded-2xl border transition-all overflow-hidden ${expandedCard === 'domains' ? 'bg-[#141414] border-blue-500/20 shadow-lg shadow-blue-500/5' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
                <button type="button" onClick={() => setExpandedCard(expandedCard === 'domains' ? null : 'domains')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <span className="material-symbols-outlined">language</span>
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-black text-white">Domínios</h4>
                            <p className="text-[10px] text-slate-500">Gerenciar URLs personalizadas da loja</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500">{expandedCard === 'domains' ? 'expand_less' : 'expand_more'}</span>
                </button>
                {expandedCard === 'domains' && (
                    <div className="p-6 pt-0 border-t border-white/5 mt-2 space-y-6">
                        <div className="flex gap-2">
                            <input type="text" placeholder="loja.com.br" className="flex-1 bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors" value={newDomainUrl} onChange={e => setNewDomainUrl(e.target.value)} />
                            <button type="button" onClick={handleAddDomain} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">Adicionar</button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {tenantDomains.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-4 bg-[#050505] rounded-xl border border-white/5">
                                    <span className="text-white font-mono text-xs">{d.url}</span>
                                    <div className="flex gap-2 items-center">
                                        {d.isMain && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded">Principal</span>}
                                        {!d.isMain && <button type="button" onClick={() => handleSetMainDomain(d.id)} className="text-[9px] font-bold uppercase text-slate-500 hover:text-blue-500 transition-colors">Tornar Principal</button>}
                                        <div className="w-px h-4 bg-white/10 mx-2" />
                                        <button type="button" onClick={() => actions.deleteDomain(d.id)} className="text-slate-500 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                                    </div>
                                </div>
                            ))}
                            {tenantDomains.length === 0 && <p className="text-[10px] text-slate-500 italic text-center p-4">Nenhum domínio cadastrado.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Integração Yampi */}
            <div className={`rounded-2xl border transition-all overflow-hidden ${expandedCard === 'yampi' ? 'bg-[#141414] border-amber-500/20 shadow-lg shadow-amber-500/5' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
                <button type="button" onClick={() => setExpandedCard(expandedCard === 'yampi' ? null : 'yampi')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <span className="material-symbols-outlined">shopping_cart</span>
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-black text-white">Integração Yampi</h4>
                            <p className="text-[10px] text-slate-500">Conexão com a plataforma de checkout</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {formData.yampiOauthAccessToken ? (
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20">Conectado (OAuth)</span>
                        ) : formData.yampiToken ? (
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-500/20">Modo Legado</span>
                        ) : (
                            <span className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-rose-500/20">Pendente</span>
                        )}
                        <span className="material-symbols-outlined text-slate-500">{expandedCard === 'yampi' ? 'expand_less' : 'expand_more'}</span>
                    </div>
                </button>
                {expandedCard === 'yampi' && (
                    <div className="p-6 pt-0 border-t border-white/5 mt-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Alias da Loja</label>
                                <input type="text" className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500/50 transition-colors" value={formData.yampiAlias || ''} onChange={e => setFormData({ ...formData, yampiAlias: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">URL do Proxy (Opcional)</label>
                                <input type="text" className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500/50 transition-colors" value={formData.yampiProxyUrl || ''} onChange={e => setFormData({ ...formData, yampiProxyUrl: e.target.value })} placeholder="https://..." />
                            </div>
                            <div className="space-y-2 md:col-span-2 pt-4 border-t border-white/5 mt-2">
                                <h5 className="text-[11px] font-bold text-white mb-3">Conexão via OAuth (Recomendado)</h5>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!tenant?.id) { setLocalError("Lojista não encontrado."); return; }
                                            const randomString = (len = 128) => {
                                                const arr = new Uint8Array(len);
                                                crypto.getRandomValues(arr);
                                                return Array.from(arr).map(n => ('0' + (n % 36).toString(36)).slice(-1)).join('');
                                            };
                                            const base64url = (buffer: ArrayBuffer) => {
                                                // @ts-ignore
                                                const s = String.fromCharCode(...new Uint8Array(buffer));
                                                return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                                            };
                                            (async () => {
                                                const code_verifier = randomString(64);
                                                const enc = new TextEncoder();
                                                const digest = await crypto.subtle.digest('SHA-256', enc.encode(code_verifier));
                                                const code_challenge = base64url(digest);
                                                sessionStorage.setItem('yampi_code_verifier', code_verifier);
                                                sessionStorage.setItem('yampi_oauth_tenant', tenant.id!);
                                                const clientId = import.meta.env.VITE_YAMPI_CLIENT_ID;
                                                const authorizeUrl = import.meta.env.VITE_YAMPI_AUTHORIZE_URL;
                                                const redirectUri = `${window.location.origin}/#/yampi-callback`;
                                                const params = new URLSearchParams({
                                                    client_id: clientId,
                                                    response_type: 'code',
                                                    redirect_uri: redirectUri,
                                                    code_challenge: code_challenge,
                                                    code_challenge_method: 'S256',
                                                    scope: 'read write'
                                                });
                                                window.location.href = `${authorizeUrl}?${params.toString()}`;
                                            })();
                                        }}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">link</span> Conectar Yampi Parceiros
                                    </button>
                                    <button type="button" onClick={() => { sessionStorage.removeItem('yampi_code_verifier'); sessionStorage.removeItem('yampi_oauth_tenant'); setLocalError(null); }} className="text-xs text-slate-500 hover:text-white transition-colors">Limpar Sessão PKCE</button>
                                </div>
                                {formData.yampiOauthAccessToken && (
                                    <p className="text-[10px] text-emerald-500 mt-2 font-mono">Autenticado com sucesso. Token expira em: {formData.yampiOauthExpiresAt ? new Date(formData.yampiOauthExpiresAt).toLocaleString() : 'N/A'}</p>
                                )}
                            </div>

                            <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/5 mt-2 opacity-60 hover:opacity-100 transition-opacity">
                                <h5 className="text-[11px] font-bold text-white">Chaves Legadas (Alternativo)</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">X-Token</label>
                                        <input type="text" className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500/50 transition-colors" value={formData.yampiToken || ''} onChange={e => setFormData({ ...formData, yampiToken: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">User Secret Key</label>
                                        <input type="password" placeholder="••••••••" className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500/50 transition-colors" value={formData.yampiSecret || ''} onChange={e => setFormData({ ...formData, yampiSecret: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Meta Ads */}
            <div className={`rounded-2xl border transition-all overflow-hidden ${expandedCard === 'meta_ads' ? 'bg-[#141414] border-fuchsia-500/20 shadow-lg shadow-fuchsia-500/5' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
                <button type="button" onClick={() => setExpandedCard(expandedCard === 'meta_ads' ? null : 'meta_ads')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
                            <span className="material-symbols-outlined">campaign</span>
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-black text-white">Meta Ads</h4>
                            <p className="text-[10px] text-slate-500">Integração com Business Manager</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500">{expandedCard === 'meta_ads' ? 'expand_less' : 'expand_more'}</span>
                </button>
                {expandedCard === 'meta_ads' && (
                    <div className="p-6 pt-0 border-t border-white/5 mt-2 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Ad Account ID</label>
                            <input type="text" placeholder="act_..." className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-fuchsia-500/50 transition-colors" value={formData.metaAdAccountId || ''} onChange={e => setFormData({ ...formData, metaAdAccountId: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Access Token</label>
                            <input type="password" placeholder="EAAB..." className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-fuchsia-500/50 transition-colors" value={formData.metaAccessToken || ''} onChange={e => setFormData({ ...formData, metaAccessToken: e.target.value })} />
                        </div>
                    </div>
                )}
            </div>

            {/* Google Analytics 4 */}
            <div className={`rounded-2xl border transition-all overflow-hidden ${expandedCard === 'ga4' ? 'bg-[#141414] border-blue-400/20 shadow-lg shadow-blue-400/5' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
                <button type="button" onClick={() => setExpandedCard(expandedCard === 'ga4' ? null : 'ga4')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400">
                            <span className="material-symbols-outlined">public</span>
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-black text-white">Google Analytics 4</h4>
                            <p className="text-[10px] text-slate-500">Métricas analíticas detalhadas</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500">{expandedCard === 'ga4' ? 'expand_less' : 'expand_more'}</span>
                </button>
                {expandedCard === 'ga4' && (
                    <div className="p-6 pt-0 border-t border-white/5 mt-2 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Measurement ID</label>
                            <input type="text" placeholder="G-XXXXXX" className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-400/50 transition-colors" value={formData.ga4MeasurementId || ''} onChange={e => setFormData({ ...formData, ga4MeasurementId: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Credentials JSON (Service Account)</label>
                            <textarea placeholder="Cole o JSON completo do Google Cloud aqui..." className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-400/50 transition-colors h-32 resize-none" value={formData.gaCredentials || ''} onChange={e => setFormData({ ...formData, gaCredentials: e.target.value })} />
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pointer-events-none z-50">
                <div className="max-w-7xl mx-auto flex justify-end pointer-events-auto">
                    <button type="submit" disabled={isSaving} className="px-10 py-4 bg-[#0bcc83] hover:bg-[#0aa66b] text-neutral-950 rounded-2xl font-black shadow-lg shadow-[#0bcc83]/20 transition-all flex items-center gap-2">
                        {isSaving ? <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </form>
    );
};

const TenantDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { state, actions, isSyncing } = useData();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'products' | 'team' | 'integrations' | 'ads'>('dashboard');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const tenant = state.tenants.find(t => t.id === id);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenant) return;

        setIsUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${tenant.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

            await actions.saveTenant({ id: tenant.id, logoUrl: data.publicUrl });
            toast.success('Logo atualizada com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao fazer upload da logo');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    useEffect(() => {
        if (tenant) setEditFormData(tenant);
    }, [tenant]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await actions.saveTenant(editFormData);
            setShowEditModal(false);
            toast.success("Lojista atualizado com sucesso!");
        } catch (err) {
            toast.error("Erro ao salvar lojista.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!tenant) return <div className="p-10 text-center text-slate-500">Lojista não encontrado ou carregando...</div>;

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* HEADER */}
            <header className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div className="flex items-center gap-6">
                            <Link to="/tenants" className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>

                            {/* AVATAR / LOGO */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center text-primary font-black text-2xl shadow-xl overflow-hidden relative group">
                                {tenant.logoUrl ? (
                                    <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{tenant.name.substring(0, 2)}</span>
                                )}
                                {/* Quick Edit Overlay */}
                                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {isUploadingLogo ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                                            <span className="text-[8px] font-bold text-white mt-1 uppercase tracking-widest">Alterar</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                        </>
                                    )}
                                </label>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-black text-white">{tenant.name}</h1>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${tenant.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {tenant.active ? 'ATIVO' : 'INATIVO'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">id_card</span> {tenant.id}</span>
                                    <span className="flex items-center gap-1 border-l border-white/10 pl-4"><span className="material-symbols-outlined text-[16px]">business</span> {tenant.document || 'N/A'}</span>
                                    <span className="flex items-center gap-1 border-l border-white/10 pl-4"><span className="material-symbols-outlined text-[16px]">mail</span> {tenant.ownerEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => actions.syncYampi(tenant.id)}
                                disabled={isSyncing}
                                className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                title="Sincronizar Yampi Agora"
                            >
                                <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                                Sync
                            </button>

                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-all flex items-center gap-2"
                                title="Excluir Lojista"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Excluir
                            </button>

                            <button
                                onClick={() => { setEditFormData(tenant); setShowEditModal(true); }}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Editar
                            </button>

                            <div className="text-right hidden md:block border-l border-white/10 pl-6 ml-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Score</p>
                                <p className="text-xl font-black text-emerald-400">98/100</p>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-500">
                                98%
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl max-w-fit">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: 'monitoring' },
                            { id: 'finance', label: 'Financeiro', icon: 'payments' },
                            { id: 'products', label: 'Produtos', icon: 'inventory_2' },
                            { id: 'team', label: 'Equipe', icon: 'group' },
                            { id: 'integrations', label: 'Integrações', icon: 'settings_input_component' },
                            { id: 'ads', label: 'Ads', icon: 'campaign' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-neutral-950 shadow-lg shadow-primary/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === 'dashboard' && <Dashboard tenantId={id!} readOnly />}
                {activeTab === 'finance' && <WeeklyFees tenantId={id!} readOnly />}
                {activeTab === 'products' && <ProductsTab tenantId={id!} />}
                {activeTab === 'team' && <TeamTab tenantId={id!} />}
                {activeTab === 'integrations' && <IntegrationsTab tenantId={id!} />}
                {activeTab === 'ads' && <AdsAnalytics tenantId={id!} />}
            </div>

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl bg-[#0a0a0a] border border-white/5 p-8 relative">
                        <div className="flex justify-between items-center mb-8 pb-4">
                            <h3 className="text-2xl font-black text-white italic">Editar Lojista</h3>
                            <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white transition-all absolute top-8 right-8"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="space-y-6 bg-[#141414] p-6 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">Dados da Conta</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                                        <input type="text" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Proprietário</label>
                                        <input type="text" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={editFormData.ownerName || ''} onChange={e => setEditFormData({ ...editFormData, ownerName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail</label>
                                        <input type="email" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={editFormData.ownerEmail || ''} onChange={e => setEditFormData({ ...editFormData, ownerEmail: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Senha de Acesso (Opcional)</label>
                                        <input type="text" className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={editFormData.password || ''} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} placeholder="Deixe em branco p/ manter" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ</label>
                                        <input type="text" className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={editFormData.document || ''} onChange={e => setEditFormData({ ...editFormData, document: e.target.value })} placeholder="000.000.000-00" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Plano Comercial</label>
                                        <select className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none" value={editFormData.planId || ''} onChange={e => setEditFormData({ ...editFormData, planId: e.target.value })}>
                                            <option value="">Plano Free (Sem Plano)</option>
                                            {state.plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Negócio</label>
                                        <select className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none" value={editFormData.businessType || 'e-commerce'} onChange={e => setEditFormData({ ...editFormData, businessType: e.target.value as any })}>
                                            <option value="e-commerce">E-commerce Focus</option>
                                            <option value="traffic-management">Gestão de Tráfego Só</option>
                                            <option value="both">Híbrido (Ambos)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Comissão da Plataforma (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600"
                                            value={editFormData.companyPercentage || ''}
                                            onChange={e => setEditFormData({ ...editFormData, companyPercentage: parseFloat(e.target.value) })}
                                            placeholder="Ex: 10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-white transition-colors absolute bottom-8 left-8">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="px-10 py-3 bg-[#0bcc83] hover:bg-[#0aa66b] text-neutral-950 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl shadow-2xl bg-[#0a0a0a] border border-rose-500/20 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex flex-col items-center text-center space-y-4 mb-8">
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 border border-rose-500/20">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Excluir Lojista</h3>
                            <p className="text-slate-400 text-sm">
                                Tem certeza que deseja excluir permanentemente o lojista <span className="text-white font-bold">{tenant.name}</span>? Esta ação não pode ser desfeita e todos os dados serão perdidos.
                            </p>
                        </div>

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-6 py-3 font-bold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => { actions.deleteTenant(tenant.id); navigate('/tenants'); }}
                                className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20 text-sm"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantDetails;
