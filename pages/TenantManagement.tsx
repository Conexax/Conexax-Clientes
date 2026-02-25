
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Tenant, Domain } from '../types';

const TenantManagement: React.FC = () => {
  const { state, actions, isSyncing } = useData();
  const navigate = useNavigate();
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
    planId: '',
    yampiAlias: '',
    yampiToken: '',
    yampiSecret: '',
    yampiProxyUrl: '',
    document: '',
    metaRange: '0-10k',
    metaAdAccountId: '',
    metaAccessToken: '',
    ga4MeasurementId: '',
    gaCredentials: ''
  });

  React.useEffect(() => {
    actions.syncAllTenants();
  }, []);



  const handleOpenModal = (tenant?: Tenant) => {
    setLocalError(null);
    if (tenant) {
      setEditingTenant(tenant);
      setFormData(tenant);
    } else {
      setEditingTenant(null);
      setFormData({
        name: '', ownerName: '', ownerEmail: '', password: '', planId: '',
        yampiAlias: '', yampiToken: '', yampiSecret: '', yampiProxyUrl: '',
        document: '', metaRange: '0-10k',
        metaAdAccountId: '', metaAccessToken: '', ga4MeasurementId: '', gaCredentials: ''
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
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {state.tenants.map((t) => (
                <tr key={t.id} onClick={() => navigate(`/tenants/${t.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black uppercase text-xs group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        {t.name.substring(0, 2)}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white group-hover:text-primary transition-colors">
                          {t.name}
                        </span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {state.tenants.map((t) => (
            <div key={t.id} onClick={() => navigate(`/tenants/${t.id}`)} className="glass-panel p-6 rounded-2xl border-white/5 space-y-5 cursor-pointer hover:bg-white/5 transition-colors">
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
          <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl bg-[#0a0a0a] border border-white/5 p-8 relative">
            <div className="flex justify-between items-center mb-8 pb-4">
              <h3 className="text-2xl font-black text-white italic">{editingTenant ? 'Editar Lojista' : 'Novo Lojista Conexx'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-all absolute top-8 right-8"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {localError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  {localError}
                </div>
              )}
              <div className="space-y-6 bg-[#141414] p-6 rounded-2xl border border-white/5">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">Dados da Conta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                    <input type="text" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Proprietário</label>
                    <input type="text" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail</label>
                    <input type="email" required className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={formData.ownerEmail} onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Senha de Acesso {editingTenant ? '(Opcional)' : ''}</label>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingTenant ? "Deixe em branco p/ manter" : "Senha inicial"} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ</label>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600" value={formData.document || ''} onChange={e => setFormData({ ...formData, document: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Plano Comercial</label>
                    <select className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none" value={formData.planId} onChange={e => setFormData({ ...formData, planId: e.target.value })}>
                      <option value="">Plano Free (Sem Plano)</option>
                      {state.plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Comissão da Plataforma (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-slate-600"
                      value={formData.companyPercentage || ''}
                      onChange={e => setFormData({ ...formData, companyPercentage: parseFloat(e.target.value) })}
                      placeholder="Ex: 10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-white transition-colors absolute bottom-8 left-8">Cancelar</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 bg-[#0bcc83] hover:bg-[#0aa66b] text-neutral-950 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : editingTenant ? 'Salvar Alterações' : 'Salvar Lojista'}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};

export default TenantManagement;
