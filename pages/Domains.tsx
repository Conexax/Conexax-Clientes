
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Domain, UserRole } from '../types';

const Domains: React.FC = () => {
  const { state, actions } = useData();
  const [showModal, setShowModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;

  const currentTenantDomains = useMemo(() => {
    if (!state.activeTenant?.id) return [];
    return state.domains.filter(d => d.tenantId === state.activeTenant?.id);
  }, [state.domains, state.activeTenant?.id]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !state.activeTenant?.id) return;
    
    const newDomain: Domain = {
      id: 'D-' + Date.now(),
      tenantId: state.activeTenant.id,
      url: newUrl,
      isMain: currentTenantDomains.length === 0,
      status: 'pending',
      ssl: false
    };
    actions.saveDomain(newDomain);
    setNewUrl('');
    setShowModal(false);
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            <span className="hover:text-primary cursor-pointer">Painel</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-slate-400">Domínios</span>
            {!isAdmin && (
              <>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-amber-500/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">lock</span> Somente Leitura
                </span>
              </>
            )}
          </nav>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">Domínios e <span className="text-primary italic">Web</span></h2>
          <p className="text-slate-400 max-w-xl font-medium">
            {isAdmin 
              ? 'Gestão centralizada de endereços e certificados SSL integrados à Yampi.' 
              : 'Visualize o status de propagação e certificados SSL dos seus domínios.'}
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-4 animate-fade-in">
            <button 
              onClick={() => actions.syncDomains()}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-sm">sync</span> Puxar da Yampi
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-neutral-950 rounded-xl font-black hover:bg-primary-dark transition-all glow-hover shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">add_link</span> Conectar Novo Domínio
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
            <div className="px-8 py-6 border-b border-neutral-border bg-black/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">public</span> Domínios Configurados
              </h3>
              <span className="text-xs font-mono text-slate-500">{currentTenantDomains.length} domínios registrados</span>
            </div>
            <div className="divide-y divide-neutral-border/30">
              {currentTenantDomains.map((domain) => (
                <div key={domain.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                      <span className="material-symbols-outlined">{domain.isMain ? 'captive_portal' : 'language'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-xl font-bold text-white">{domain.url}</h4>
                        {domain.isMain && <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black border border-primary/20 rounded-full uppercase tracking-tighter">Principal</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <span className={`flex items-center gap-1.5 ${domain.ssl ? 'text-primary' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-sm">{domain.ssl ? 'verified_user' : 'gpp_maybe'}</span> 
                          {domain.ssl ? 'SSL Ativo' : 'SSL Pendente'}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${domain.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {domain.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">settings</span></button>
                      <button 
                        onClick={() => { if(confirm('Excluir domínio?')) { actions.deleteDomain(domain.id) } }}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {currentTenantDomains.length === 0 && (
                <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">
                  {isAdmin ? 'Nenhum domínio conectado. Use os botões acima ou o menu de Lojistas para começar.' : 'Aguardando configuração de domínios pela equipe técnica.'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-neutral-950 font-black text-xl mb-4 italic">Instruções DNS</h4>
              <p className="text-neutral-900/70 text-xs font-bold mb-6 leading-relaxed">
                Aponte seu domínio para os servidores da Conexx Hub utilizando os registros abaixo:
              </p>
              <div className="space-y-4">
                <div className="bg-neutral-950/10 p-4 rounded-xl border border-neutral-950/20">
                  <p className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-2">Entrada Tipo A</p>
                  <div className="flex items-center justify-between font-mono text-xs text-neutral-950 font-bold">
                    <span>@</span>
                    <span>76.76.21.21</span>
                  </div>
                </div>
                <div className="bg-neutral-950/10 p-4 rounded-xl border border-neutral-950/20">
                  <p className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-2">Entrada CNAME</p>
                  <div className="flex items-center justify-between font-mono text-xs text-neutral-950 font-bold">
                    <span>www</span>
                    <span>cname.conexx.com</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10"><span className="material-symbols-outlined text-[140px] text-neutral-950">info</span></div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-dashed border-neutral-border">
             <h5 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
               <span className="material-symbols-outlined text-amber-500 text-sm">verified</span> Verificação de SSL
             </h5>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">
               O certificado SSL é gerado automaticamente após o apontamento do DNS ser propagado. Este processo pode levar até 24 horas.
             </p>
          </div>
        </div>
      </div>

      {showModal && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 border-primary/20 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-white italic">Conectar Domínio</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleConnect} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL do Domínio</label>
                <input 
                  type="text" required placeholder="ex: minha-loja.com.br"
                  className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-white focus:ring-primary font-mono text-sm"
                  value={newUrl} onChange={e => setNewUrl(e.target.value)}
                />
              </div>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] text-slate-400 italic">Ao adicionar um novo domínio, o sistema verificará automaticamente os apontamentos de DNS e iniciará a emissão do SSL.</p>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-neutral-950 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Domains;
