import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../backend/supabaseClient';
import { useData } from '../context/DataContext';

const YampiOAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { state } = useData();

  useEffect(() => {
    (async () => {
      try {
        // Parse code from hash (HashRouter uses #/)
        const hash = window.location.hash || '';
        const parts = hash.split('?');
        const query = parts[1] || window.location.search.substring(1);
        const params = new URLSearchParams(query);
        const code = params.get('code');
        if (!code) {
          setError('Código OAuth ausente na URL.');
          return;
        }

        const code_verifier = sessionStorage.getItem('yampi_code_verifier');
        const tenantId = sessionStorage.getItem('yampi_oauth_tenant');
        if (!code_verifier || !tenantId) {
          setError('PKCE verifier ou tenant ausente (sessionStorage).');
          return;
        }

        const clientId = import.meta.env.VITE_YAMPI_CLIENT_ID;
        const redirectUri = `${window.location.origin}/#/yampi-callback`;

        // Call our server endpoint to handle exchange + DB save
        const res = await fetch('/api/yampi/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            clientId,
            redirectUri,
            codeVerifier: code_verifier,
            tenantId
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || errData.details || `Erro do servidor: ${res.status}`);
        }

        const data = await res.json();
        // data: { success: true, alias: ... }

        // cleanup
        sessionStorage.removeItem('yampi_code_verifier');
        sessionStorage.removeItem('yampi_oauth_tenant');

        // Redirect to billing page
        navigate('/billing');
      } catch (e: any) {
        console.error("OAuth Callback Error:", e);
        setError(e.message || 'Erro desconhecido durante OAuth.');
      }
    })();
  }, [navigate, state]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-panel-dark rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Finalizando conexão Yampi...</h3>
        {error ? (
          <div className="text-rose-400">{error}</div>
        ) : (
          <div className="text-slate-300">Aguarde — estamos salvando as credenciais.</div>
        )}
      </div>
    </div>
  );
};

export default YampiOAuthCallback;

