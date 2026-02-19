
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Tenant, Domain } from '../types';

const TenantManagement: React.FC = () => {
  const { state, actions, isSyncing } = useData();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
  const [newDomainUrl, setNewDomainUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    planId: 'p_free',
    yampiAlias: '',
    yampiToken: '',
    yampiSecret: '',
    yampiProxyUrl: '',
    document: '',
    metaRange: '0-10k'
  });

  React.useEffect(() => {
    actions.syncAllTenants();
  }, []);

  const tenantDomains = useMemo(() => {
    if (!editingTenant?.id) return [];
    return state.domains.filter(d => d.tenantId === editingTenant.id);
  }, [state.domains, editingTenant?.id]);

  const handleOpenModal = (tenant?: Tenant) => {
    setLocalError(null);
    if (tenant) {
      setEditingTenant(tenant);
      setFormData(tenant);
    } else {
      setEditingTenant(null);
      setFormData({
        name: '', ownerName: '', ownerEmail: '', password: '', planId: 'p_free',
        yampiAlias: '', yampiToken: '', yampiSecret: '', yampiProxyUrl: '',
        document: '', metaRange: '0-10k'
      });
    }
    setNewDomainUrl('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await actions.saveTenant(formData);
      setShowModal(false);
      // Optional: Add success toast here if toast system existed
    } catch (e: any) {
      console.error(e);
      setLocalError(e.message || "Erro desconhecido ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomainUrl || !editingTenant?.id) return;
    setLocalError(null);
    const newDomain: Domain = {
      id: 'D-' + Date.now(),
      tenantId: editingTenant.id,
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

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white mb-2">Gestão de <span className="text-primary">Lojistas</span></h2>
          <p className="text-slate-500 font-medium italic">Configuração de contas, acessos de proprietários e integrações Yampi.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">person_add</span> Cadastrar Lojista
        </button>
      </header>

      <section className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 underline decoration-primary/30">Lojista</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 underline decoration-primary/30">Proprietário</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 underline decoration-primary/30">Status Conexão</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 underline decoration-primary/30">Documento / PJ</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 underline decoration-primary/30 text-center">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {state.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black uppercase text-xs group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        {t.name.substring(0, 2)}
                      </div>
                      <div>
                        <Link to={`/tenants/${t.id}`} className="block text-sm font-bold text-white group-hover:text-primary transition-colors hover:underline">
                          {t.name}
                        </Link>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-400 italic">{t.ownerEmail}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${t.yampiOauthAccessToken ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : t.yampiToken ? 'bg-primary shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${t.yampiOauthAccessToken ? 'text-emerald-500' : t.yampiToken ? 'text-primary' : 'text-rose-500'}`}>
                        {t.yampiOauthAccessToken ? 'OAUTH CONECTADO' : t.yampiToken ? 'TOKEN LEGADO' : 'AGUARDANDO SYNC'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-mono text-slate-500 font-bold">{t.document || '---.---.---/--'}</td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => actions.syncYampi(t.id)}
                        disabled={isSyncing}
                        className="p-2.5 bg-blue-500/5 text-blue-500 hover:text-white hover:bg-blue-500/20 rounded-xl transition-all disabled:opacity-50"
                        title="Sincronizar Yampi Agora"
                      >
                        <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                      </button>
                      <button onClick={() => handleOpenModal(t)} className="p-2.5 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if (confirm('Excluir lojista?')) actions.deleteTenant(t.id) }} className="p-2.5 bg-rose-500/5 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/15 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {state.tenants.map((t) => (
            <div key={t.id} className="glass-panel p-6 rounded-2xl border-white/5 space-y-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase text-sm">
                    {t.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white leading-tight">{t.name}</h4>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => actions.syncYampi(t.id)}
                    disabled={isSyncing}
                    className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-xl disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                  </button>
                  <button onClick={() => handleOpenModal(t)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 rounded-xl">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => { if (confirm('Excluir lojista?')) actions.deleteTenant(t.id) }} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 py-4 border-y border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Proprietário</span>
                  <span className="text-slate-300 italic normal-case font-bold">{t.ownerEmail}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Documento</span>
                  <span className="text-slate-300 font-mono font-bold">{t.document || '---.---.---/--'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status de Integração</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${t.yampiToken ? 'bg-primary shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${t.yampiToken ? 'text-primary' : 'text-rose-500'}`}>
                    {t.yampiToken ? 'CONECTADO' : 'PENDENTE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.tenants.length === 0 && (
          <div className="text-center py-20 glass-panel rounded-2xl border-dashed">
            <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">storefront</span>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum lojista cadastrado</p>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl border-primary/20 p-8">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-2xl font-black text-white italic">{editingTenant ? 'Editar Lojista' : 'Novo Lojista Conexx'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {localError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  {localError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">Dados da Conta</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                    <input type="text" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Proprietário</label>
                    <input type="text" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail</label>
                    <input type="email" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.ownerEmail} onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Senha de Acesso {editingTenant ? '(Deixe em branco para manter)' : ''}</label>
                    <input type="text" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingTenant ? "Nova senha (opcional)" : "Senha inicial"} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ (Documento)</label>
                    <input type="text" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.document || ''} onChange={e => setFormData({ ...formData, document: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Atribuir Plano Comercial</label>
                    <select className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.planId} onChange={e => setFormData({ ...formData, planId: e.target.value })}>
                      <option value="p_free">Plano Free (R$ 0,00)</option>
                      {state.plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (R$ {p.priceQuarterly})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Percentual da Empresa (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary"
                      value={formData.companyPercentage || ''}
                      onChange={e => setFormData({ ...formData, companyPercentage: parseFloat(e.target.value) })}
                      placeholder="Ex: 10"
                    />
                    <p className="text-[9px] text-slate-500">Percentual sobre o faturamento bruto para cálculo de lucro.</p>
                  </div>
                  {/* Meta Range removed as it is now auto-calculated */}
                </div>

                <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-l-2 border-blue-500 pl-2">Domínios</h4>
                  {editingTenant ? (
                    <>
                      <div className="flex gap-2">
                        <input type="text" placeholder="loja.com.br" className="flex-1 bg-black/20 border-neutral-border rounded-xl px-4 py-2 text-xs text-white" value={newDomainUrl} onChange={e => setNewDomainUrl(e.target.value)} />
                        <button type="button" disabled={isSyncing} onClick={handleAddDomain} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50">Add</button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto bg-black/30 rounded-xl p-3">
                        {tenantDomains.map(d => (
                          <div key={d.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                            <span className="text-white font-mono truncate">{d.url}</span>
                            <div className="flex gap-2">
                              {!d.isMain && <button type="button" onClick={() => handleSetMainDomain(d.id)} className="text-[9px] font-bold uppercase text-slate-500 hover:text-primary">Main</button>}
                              <button type="button" onClick={() => actions.deleteDomain(d.id)} className="text-slate-500 hover:text-rose-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-[10px] text-slate-500 italic">Salve para gerenciar domínios.</p>}
                </div>

                <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest border-l-2 border-amber-500 pl-2">Integração Yampi</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Alias da Loja</label>
                    <input type="text" className="w-full bg-black/20 border-neutral-border rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" value={formData.yampiAlias} onChange={e => setFormData({ ...formData, yampiAlias: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">X-Token</label>
                    <input type="text" className="w-full bg-black/20 border-neutral-border rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" value={formData.yampiToken} onChange={e => setFormData({ ...formData, yampiToken: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">User Secret Key (Chave Secreta)</label>
                    <input type="password" className="w-full bg-black/20 border-neutral-border rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" value={formData.yampiSecret} onChange={e => setFormData({ ...formData, yampiSecret: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">URL do Proxy (Opcional)</label>
                    <input type="text" className="w-full bg-black/20 border-neutral-border rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" value={formData.yampiProxyUrl || ''} onChange={e => setFormData({ ...formData, yampiProxyUrl: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Conectar via Yampi Parceiros (OAuth)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingTenant?.id) { setLocalError("Salve o lojista antes de conectar via OAuth."); return; }
                          // PKCE: generate verifier & challenge, store verifier + tenantId, then redirect to Yampi authorize
                          const randomString = (len = 128) => {
                            const arr = new Uint8Array(len);
                            crypto.getRandomValues(arr);
                            return Array.from(arr).map(n => ('0' + (n % 36).toString(36)).slice(-1)).join('');
                          };
                          const base64url = (buffer: ArrayBuffer) => {
                            const s = String.fromCharCode(...new Uint8Array(buffer));
                            return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                          };
                          (async () => {
                            const code_verifier = randomString(64);
                            const enc = new TextEncoder();
                            const digest = await crypto.subtle.digest('SHA-256', enc.encode(code_verifier));
                            const code_challenge = base64url(digest);
                            // store verifier and tenant id temporarily
                            sessionStorage.setItem('yampi_code_verifier', code_verifier);
                            sessionStorage.setItem('yampi_oauth_tenant', editingTenant.id!);
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
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                      >
                        Conectar (OAuth)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // quick-clear stored verifier/tenant
                          sessionStorage.removeItem('yampi_code_verifier');
                          sessionStorage.removeItem('yampi_oauth_tenant');
                          setLocalError(null);
                        }}
                        className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-xs font-bold hover:text-white"
                      >
                        Limpar PKCE
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Use este fluxo para conectar sua conta via Yampi Parceiros (OAuth PKCE). Configure <code className="bg-black/20 px-1">VITE_YAMPI_CLIENT_ID</code> e <code className="bg-black/20 px-1">VITE_YAMPI_AUTHORIZE_URL</code> no seu .env.local.</p>

                    {formData.yampiOauthAccessToken && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                        <div>
                          <p className="text-xs font-bold text-emerald-500 uppercase">Conectado via OAuth</p>
                          <p className="text-[10px] text-slate-400">Token expira em: {formData.yampiOauthExpiresAt ? new Date(formData.yampiOauthExpiresAt).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-white/5 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-400">Cancelar</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : 'Salvar Lojista'}
                </button>
              </div>
            </form>
          </div >
        </div >
      )}
    </div >
  );
};

export default TenantManagement;
