
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

      <section className="glass-panel rounded-2xl overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-neutral-border/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
              {state.orders.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-mono text-sm text-slate-300 font-bold">{row.id}</td>
                  <td className="px-6 py-5 text-sm font-bold text-white">{row.client}</td>
                  <td className="px-6 py-5 text-sm font-black text-white">R$ {row.value.toFixed(2)}</td>
                  <td className="px-6 py-5">
                    <select 
                      value={row.status}
                      // Fix: Call updateOrder through actions
                      onChange={(e) => actions.updateOrder(row.id, { status: e.target.value as OrderStatus })}
                      className="bg-panel-dark border-neutral-border text-[10px] text-white rounded-lg px-2 py-1 focus:ring-primary"
                    >
                      <option value={OrderStatus.APROVADO}>APROVADO</option>
                      <option value={OrderStatus.AGUARDANDO}>AGUARDANDO</option>
                      <option value={OrderStatus.CANCELADO}>CANCELADO</option>
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-2">
                      {/* Fix: Call deleteOrder through actions */}
                      <button onClick={() => actions.deleteOrder(row.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-all">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Orders;
