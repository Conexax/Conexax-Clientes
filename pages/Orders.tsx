
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { OrderStatus } from '../types';

const Orders: React.FC = () => {
  // Fix: Destructure actions from useData instead of directly trying to access order management functions
  const { state, actions } = useData();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Vendas: <span className="text-primary">Lista de Pedidos</span></h2>
            <p className="text-slate-500 mt-1">Gerencie e acompanhe todos os pedidos da sua plataforma.</p>
          </div>
          <button
            // Fix: Call addOrder through actions
            onClick={() => actions.addOrder({ client: 'Novo Cliente via API', value: 150.00, status: OrderStatus.AGUARDANDO })}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-neutral-950 rounded-xl font-bold hover:bg-primary-dark transition-all glow-hover"
          >
            <span className="material-symbols-outlined text-lg">add_shopping_cart</span> Criar Pedido Teste
          </button>
        </div>
      </header>

      <section className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#0a0a0a] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {state.orders.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-md border border-white/5">
                      <span className="material-symbols-outlined text-xs text-slate-500">tag</span>
                      <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-widest">{row.id.split('-')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs uppercase shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                        {row.client.substring(0, 2)}
                      </div>
                      <span className="text-sm font-bold text-white tracking-wide group-hover:text-primary transition-colors">{row.client}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-white">R$ {row.value.toFixed(2)}</td>
                  <td className="px-6 py-5">
                    <select
                      value={row.status}
                      onChange={(e) => actions.updateOrder(row.id, { status: e.target.value as OrderStatus })}
                      className={`text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-white/20 outline-none appearance-none cursor-pointer border ${row.status === OrderStatus.APROVADO ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          row.status === OrderStatus.AGUARDANDO ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}
                    >
                      <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.APROVADO}>APROVADO</option>
                      <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.AGUARDANDO}>AGUARDANDO</option>
                      <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.CANCELADO}>CANCELADO</option>
                    </select>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button onClick={() => actions.deleteOrder(row.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {state.orders.map((row) => (
            <div key={row.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-4 shadow-lg shadow-black/20">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    {row.client.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white tracking-wide">{row.client}</h4>
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">#{row.id.split('-')[0]}</span>
                  </div>
                </div>
                <button onClick={() => actions.deleteOrder(row.id)} className="w-8 h-8 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 transition-colors rounded-lg text-rose-500">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-y border-white/5">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Valor do Pedido</span>
                <span className="text-sm font-black text-white">R$ {row.value.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Status</span>
                <select
                  value={row.status}
                  onChange={(e) => actions.updateOrder(row.id, { status: e.target.value as OrderStatus })}
                  className={`text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-white/20 outline-none appearance-none cursor-pointer border ${row.status === OrderStatus.APROVADO ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      row.status === OrderStatus.AGUARDANDO ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}
                >
                  <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.APROVADO}>APROVADO</option>
                  <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.AGUARDANDO}>AGUARDANDO</option>
                  <option className="bg-[#0a0a0a] text-slate-300" value={OrderStatus.CANCELADO}>CANCELADO</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {state.orders.length === 0 && (
          <div className="text-center py-20 glass-panel rounded-2xl border-dashed">
            <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">shopping_cart_off</span>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Orders;
