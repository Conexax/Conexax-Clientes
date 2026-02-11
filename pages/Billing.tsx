
import React from 'react';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';

const Billing: React.FC = () => {
  const { state, actions, isSyncing, syncError } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;
  const isConnected = !!state.activeTenant?.yampiToken;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl font-black tracking-tight text-white">Status da <span className="text-primary text-3xl italic">Integração Yampi</span></h2>
            <span className={`px-2 py-0.5 ${isConnected ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'} text-[10px] font-black border border-current opacity-50 tracking-tighter rounded uppercase`}>
              {isConnected ? 'Conectado' : 'Aguardando Configuração'}
            </span>
          </div>
          <p className="text-slate-400 max-w-2xl font-medium">A sincronização é gerenciada pela equipe administrativa da Conexx Hub para garantir segurança total.</p>
        </div>
        <button
          onClick={() => actions.syncYampi()}
          disabled={isSyncing || !isConnected}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
        >
          <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Manualmente'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-10 rounded-3xl border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-white mb-6 italic">Dados do Endpoint</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loja Conectada</span>
                <span className="text-sm font-black text-white">{state.activeTenant?.yampiAlias || 'Nenhuma'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Servidor Proxy</span>
                <span className="text-xs font-mono text-primary truncate max-w-[200px]">{state.activeTenant?.yampiProxyUrl || 'Não configurado'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Último Sync</span>
                <span className="text-sm font-bold text-slate-300">{state.activeTenant?.lastSync || 'Nunca'}</span>
              </div>
            </div>

            {syncError && (
              <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500">
                <span className="material-symbols-outlined">warning</span>
                <p className="text-xs font-bold">{syncError}</p>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined text-[120px]">hub</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-8 rounded-3xl bg-primary/5 border-primary/20">
            <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">security</span> Gerenciamento de Acesso
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 font-medium">
              Por questões de segurança corporativa, as chaves de API (<code className="bg-black/40 px-1">User-Token</code> e <code className="bg-black/40 px-1">User-Secret-Key</code>) são criptografadas e mantidas sob custódia da Conexx.
            </p>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-[11px] text-slate-500">
              Caso precise atualizar suas credenciais da Yampi, solicite a alteração através do e-mail de suporte: <span className="text-white">suporte@conexxhub.com.br</span>
            </div>
          </div>

          {!isAdmin && (
            <div className="p-8 border border-dashed border-neutral-border rounded-3xl text-center">
              <span className="material-symbols-outlined text-slate-700 text-4xl mb-4">lock</span>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Modo de Acesso: Lojista</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
