import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';

const Coupons: React.FC = () => {
  const { state, actions, isSyncing } = useData();
  const [form, setForm] = useState({ code: '', type: 'percentage', value: 0 });

  useEffect(() => {
    // initial local load - subscriptions from state.coupons
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.saveCoupon({ code: form.code, type: form.type as any, value: form.value });
      setForm({ code: '', type: 'percentage', value: 0 });
    } catch (err) {
      console.error(err);
      alert('Erro ao criar cupom');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Cupons</h2>
          <p className="text-slate-500">Sincronize cupons com a Yampi e gerencie localmente.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => actions.syncCoupons()} className="px-4 py-2 bg-primary rounded" disabled={isSyncing}>Puxar da Yampi</button>
        </div>
      </header>

      <div className="glass-panel p-4">
        <form onSubmit={handleCreate} className="flex gap-2 items-center">
          <input required value={form.code} onChange={e => setForm(s => ({ ...s, code: e.target.value }))} placeholder="CÓDIGO" className="px-3 py-2 bg-black/20 rounded" />
          <select value={form.type} onChange={e => setForm(s => ({ ...s, type: e.target.value }))} className="px-3 py-2 bg-black/20 rounded">
            <option value="percentage">Percentual</option>
            <option value="fixed">Valor Fixo</option>
          </select>
          <input type="number" value={form.value} onChange={e => setForm(s => ({ ...s, value: Number(e.target.value) }))} className="w-28 px-3 py-2 bg-black/20 rounded" />
          <button type="submit" className="px-4 py-2 bg-emerald-600 rounded">Criar e Enviar</button>
        </form>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-lg font-bold text-white mb-4">Lista de Cupons</h3>
        <div className="space-y-2">
          {state.coupons.length === 0 && <div className="text-slate-500">Nenhum cupom cadastrado.</div>}
          {state.coupons.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-black/10 rounded">
              <div>
                <div className="text-white font-bold">{c.code}</div>
                <div className="text-slate-400 text-xs">{c.type} — {c.value}</div>
              </div>
              <div className="text-slate-300 text-xs">{c.usageCount || 0} usos</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Coupons;

