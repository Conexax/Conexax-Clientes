
import React from 'react';
import { useData } from '../context/DataContext';

const AbandonedCarts: React.FC = () => {
  const { state, stats } = useData();

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white">Carrinhos <span className="text-rose-500">Abandonados</span></h2>
          <p className="text-slate-500 font-medium">Recupere vendas perdidas identificando os checkouts inacabados.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-rose-500">
          <p className="text-xs font-black text-slate-500 uppercase mb-1">Total Abandonado</p>
          <h4 className="text-3xl font-black text-white">R$ {stats.abandonedTotalValue.toLocaleString()}</h4>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500">
          <p className="text-xs font-black text-slate-500 uppercase mb-1">Quantidade</p>
          <h4 className="text-3xl font-black text-white">{stats.abandonedCount} <span className="text-sm font-medium text-slate-500">checkouts</span></h4>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
          <p className="text-xs font-black text-slate-500 uppercase mb-1">Recuperação IA</p>
          <h4 className="text-3xl font-black text-white">Disponível</h4>
        </div>
      </div>

      <section className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Cliente</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Itens</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Data</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/20">
              {state.abandonedCheckouts.map((cart) => (
                <tr key={cart.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-white">{cart.clientName}</p>
                    <p className="text-[10px] text-slate-500">{cart.email}</p>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-400 max-w-xs truncate">{cart.items}</td>
                  <td className="px-8 py-6 text-sm font-black text-white">R$ {cart.value.toFixed(2)}</td>
                  <td className="px-8 py-6 text-xs text-slate-500">{new Date(cart.date).toLocaleDateString()}</td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2">
                      <a href={`https://wa.me/${cart.phone}`} target="_blank" className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20"><span className="material-symbols-outlined text-sm">chat</span></a>
                      <button className="p-2 bg-white/5 text-slate-400 rounded-lg"><span className="material-symbols-outlined text-sm">mail</span></button>
                    </div>
                  </td>
                </tr>
              ))}
              {state.abandonedCheckouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-600 italic font-bold">Nenhum checkout abandonado encontrado na Yampi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AbandonedCarts;
