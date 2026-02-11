
import React, { useState, useMemo } from 'react';
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
    planId: 'p_pro',
    yampiAlias: '',
    yampiToken: '',
    yampiSecret: '',
    yampiProxyUrl: ''
  });

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
        name: '', ownerName: '', ownerEmail: '', password: '', planId: 'p_pro',
        yampiAlias: '', yampiToken: '', yampiSecret: '', yampiProxyUrl: ''
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

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Loja / Proprietário</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Acesso (E-mail)</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Plano Atual</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Yampi</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {state.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black uppercase text-xs">
                        {t.name.substring(0, 2)}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white group-hover:text-primary transition-colors">{t.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{t.ownerName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-mono text-slate-400 font-bold">{t.ownerEmail}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/10">
                      {state.plans.find(p => p.id === t.planId)?.name || 'Sem Plano'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${t.yampiToken ? 'bg-primary shadow-[0_0_8px_theme(colors.primary)]' : 'bg-slate-700'}`}></span>
                      <span className="text-xs font-bold text-slate-400">{t.yampiToken ? 'Conectado' : 'Pendente'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => handleOpenModal(t)} className="p-2 bg-white/5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if (confirm('Excluir lojista?')) actions.deleteTenant(t.id) }} className="p-2 bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Atribuir Plano Comercial</label>
                    <select className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.planId} onChange={e => setFormData({ ...formData, planId: e.target.value })}>
                      {state.plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (R$ {p.price})</option>
                      ))}
                    </select>
                  </div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;
