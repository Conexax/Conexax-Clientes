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

        const tokenUrl = import.meta.env.VITE_YAMPI_TOKEN_URL;
        const clientId = import.meta.env.VITE_YAMPI_CLIENT_ID;
        const redirectUri = `${window.location.origin}/#/yampi-callback`;

        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: String(clientId),
          code: String(code),
          redirect_uri: redirectUri,
          code_verifier: String(code_verifier)
        });

        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });

        if (!res.ok) {
          const txt = await res.text();
          setError(`Token exchange falhou: ${res.status} ${txt}`);
          return;
        }

        const tokenJson = await res.json();
        // tokenJson: access_token, refresh_token, expires_in, scope, token_type

        // Save tokens on Supabase tenants table
        const expiresAt = tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString() : null;

        const { error: upErr } = await supabase
          .from('tenants')
          .update({
            yampi_oauth_access_token: tokenJson.access_token,
            yampi_oauth_refresh_token: tokenJson.refresh_token,
            yampi_oauth_token_expires_at: expiresAt,
            yampi_oauth_scope: tokenJson.scope || null
          })
          .eq('id', tenantId);

        if (upErr) {
          setError(`Falha ao salvar tokens no banco: ${upErr.message}`);
          return;
        }

        // cleanup
        sessionStorage.removeItem('yampi_code_verifier');
        sessionStorage.removeItem('yampi_oauth_tenant');

        // Redirect to billing page
        navigate('/billing');
      } catch (e: any) {
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

