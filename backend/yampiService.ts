
/**
 * Yampi External Proxy Service
 * Esta camada redireciona todas as chamadas para um backend externo
 * para contornar bloqueios de rede (Egress/DNS) do ambiente local.
 */

interface YampiProxyCredentials {
  token: string;
  secret: string;
  alias: string;
  proxyBaseUrl: string;
}

const REQUEST_TIMEOUT = 15000;

/**
 * Função centralizada que chama o Backend Externo (Proxy)
 */
async function proxyRequest(endpoint: string, credentials: YampiProxyCredentials, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any, useAliasInPath: boolean = true) {
  const { token, secret, alias, proxyBaseUrl } = credentials;

  // if (!proxyBaseUrl) {
  //   throw { 
  //     error: "CONFIG_MISSING", 
  //     hint: "URL do Proxy não configurada. Defina o endereço do seu backend externo nas configurações." 
  //   };
  // }

  const baseUrl = proxyBaseUrl.replace(/\/+$/, '');

  // Dooki V2 Logic:
  // /auth/me -> No alias in path
  // /orders -> Alias in path

  let finalUrl;
  // If endpoint explicitly says so, or if it is auth, no alias.
  if (!useAliasInPath || endpoint.startsWith('auth/')) {
    finalUrl = `${baseUrl}/api/yampi/${endpoint.replace(/^\//, '')}`;
  } else {
    finalUrl = `${baseUrl}/api/yampi/${alias}/${endpoint.replace(/^\//, '')}`;
  }

  console.log(`[Proxy] Solicitando (${method}) via Backend Externo: ${finalUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(finalUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // Official Yampi API Headers
        'User-Token': token,
        'User-Secret-Key': secret,
        'Alias': alias,
        // Some endpoints/versions might use these
        'Token': token,
        'Secret': secret,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw {
        error: "YAMPI_API_ERROR",
        code: response.status,
        details: errorText || "Erro retornado pela API da Yampi."
      };
    }

    return await response.json();

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw { error: "TIMEOUT", details: "O servidor demorou muito para responder." };
    }
    throw error;
  }
}

export const YampiBackend = {
  async testConnectivity(proxyUrl: string) {
    if (!proxyUrl) return { ok: false, error: "URL Vazia" };
    try {
      const target = `${proxyUrl.replace(/\/+$/, '')}/api/yampi/ping`;
      const res = await fetch(target);
      return { ok: res.ok, status: res.status };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  async getAllMetrics(creds: YampiProxyCredentials) {
    try {
      // Try Strategy A: Alias in Path (Standard Dooki V2)
      console.log("[YampiBackend] Tentando Estratégia A: Alias no Path");
      const [ordersRes, abandonedRes] = await Promise.all([
        proxyRequest('orders?limit=100&include=customer,items,payments', creds),
        proxyRequest('abandoned-checkouts?limit=100&include=customer,items', creds)
      ]);
      return {
        orders: ordersRes?.data || [],
        abandoned: abandonedRes?.data || []
      };
    } catch (err: any) {
      // If 404, Try Strategy B: No Alias in Path (V1 / Root style)
      if (err?.code === 404 || err?.status === 404) {
        console.log("[YampiBackend] Estratégia A falhou (404). Tentando Estratégia B: Sem Alias no Path");
        const [ordersRes, abandonedRes] = await Promise.all([
          proxyRequest('orders?limit=100&include=customer,items,payments', creds, 'GET', undefined, false),
          proxyRequest('abandoned-checkouts?limit=100&include=customer,items', creds, 'GET', undefined, false)
        ]);
        return {
          orders: ordersRes?.data || [],
          abandoned: abandonedRes?.data || []
        };
      }
      console.error("[YampiBackend] Falha na sincronização via Proxy:", err);
      throw err;
    }
  },

  /**
   * Registra um novo domínio na Yampi
   */
  async createDomain(creds: YampiProxyCredentials, domainUrl: string) {
    return proxyRequest('domains', creds, 'POST', {
      url: domainUrl,
      main: false // Inicialmente como secundário
    });
  },

  async verifyCreds(creds: YampiProxyCredentials) {
    try {
      // /auth/me requires POST
      const res = await proxyRequest('auth/me', creds, 'POST');
      return { ok: true, data: res.data };
    } catch (e: any) {
      console.warn("[YampiBackend] VerifyCreds falhou:", e);
      return { ok: false, error: e };
    }
  }
};

// Monkey-patching getAllMetrics to include verification log
const originalGetAllMetrics = YampiBackend.getAllMetrics;
YampiBackend.getAllMetrics = async (creds: YampiProxyCredentials) => {
  console.log("[Debug] Verificando credenciais antes de buscar métricas...");
  const verify = await YampiBackend.verifyCreds(creds);

  if (verify.ok) {
    console.log("[Debug] Credenciais VÁLIDAS! Usuário Yampi:", verify.data);
  } else {
    console.error("[Debug] Credenciais INVÁLIDAS ou Erro de Auth:", verify.error);
  }

  // Try the normal flow anyway to see the 404
  return originalGetAllMetrics.call(YampiBackend, creds);
};
