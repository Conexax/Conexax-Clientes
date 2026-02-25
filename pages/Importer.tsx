import React, { useState } from 'react';
import { supabase } from '../backend/supabaseClient';

const Importer: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) => setLog(l => [s, ...l]);

  const tryImportPedidos = async () => {
    append('Tentando ler tabela "pedidos"...');
    try {
      const { data, error } = await supabase.from('pedidos').select('*');
      if (error) { append(`Tabela 'pedidos' não encontrada ou erro: ${error.message}`); return; }
      append(`Encontrados ${data.length} registros em 'pedidos'. Iniciando cópia...`);
      // map and insert into orders
      const mapped = (data as any[]).map(r => ({
        tenant_id: null,
        external_id: r.id || r.external_id || null,
        client_name: r.client_name || r.cliente || (r.customer?.data?.first_name),
        client_email: r.client_email || r.customer?.data?.email,
        product_name: r.product_name || (r.items?.[0]?.product_name) || null,
        order_date: r.created_at || r.order_date || null,
        status: r.status || null,
        payment_method: r.payment_method || null,
        total_value: r.value_total || r.total || r.valor || 0,
        raw: r
      }));
      const { error: insErr } = await supabase.from('orders').insert(mapped);
      if (insErr) { append(`Erro ao inserir pedidos: ${insErr.message}`); return; }
      append(`Importação de 'pedidos' concluída (${mapped.length}).`);
    } catch (e: any) {
      append(`Erro inesperado: ${e.message}`);
    }
  };

  const tryImportCheckouts = async () => {
    append('Tentando ler tabela "checkouts_abandonados"...');
    try {
      const { data, error } = await supabase.from('checkouts_abandonados').select('*');
      if (error) { append(`Tabela 'checkouts_abandonados' não encontrada ou erro: ${error.message}`); return; }
      append(`Encontrados ${data.length} registros. Iniciando cópia...`);
      const mapped = (data as any[]).map(r => ({
        id: r.id || (Math.random().toString(36).slice(2, 12)),
        tenant_id: null,
        client_name: r.client_name || r.cliente || (r.customer?.data?.first_name),
        email: r.email || r.customer?.data?.email,
        items: r.items ? (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) : null,
        total_value: r.total_value || r.value_total || r.total || 0,
        created_at: r.created_at || new Date().toISOString()
      }));
      const { error: insErr } = await supabase.from('abandoned_checkouts').insert(mapped);
      if (insErr) { append(`Erro ao inserir abandonados: ${insErr.message}`); return; }
      append(`Importação de abandonados concluída (${mapped.length}).`);
    } catch (e: any) {
      append(`Erro inesperado: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white">Importador</h2>
        <p className="text-slate-500">Importe dados de tabelas antigas (português) para o novo esquema.</p>
      </header>
      <div className="glass-panel p-4 flex gap-2">
        <button onClick={tryImportPedidos} className="px-4 py-2 bg-primary rounded">Importar "pedidos"</button>
        <button onClick={tryImportCheckouts} className="px-4 py-2 bg-amber-600 rounded">Importar "checkouts_abandonados"</button>
      </div>
      <div className="glass-panel p-4">
        <h3 className="text-lg font-bold text-white mb-3">Log</h3>
        <div className="max-h-64 overflow-auto text-xs font-mono text-slate-300">
          {log.length === 0 ? <div className="text-slate-500">Nenhuma ação ainda.</div> : log.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
        </div>
      </div>
    </div>
  );
};

export default Importer;

