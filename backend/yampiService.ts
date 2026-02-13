
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
  oauthToken?: string;
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
        // If an OAuth access token for this tenant exists, prefer Authorization Bearer
        ...(credentials.oauthToken ? { 'Authorization': `Bearer ${credentials.oauthToken}` } : {}),
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
    /**
     * Importante:
     * A API da Yampi pode não expor todos os recursos (ex: abandoned-checkouts)
     * para todas as contas. Se tratarmos qualquer 404 como erro fatal, o painel
     * inteiro quebra.
     *
     * Em vez disso:
     *  - Tentamos buscar pedidos e checkouts abandonados separadamente;
     *  - Se algum recurso retornar 404, apenas consideramos a lista vazia
     *    e seguimos com o que estiver disponível.
     */
    const result = { orders: [] as any[], abandoned: [] as any[] };

    // Helper para tentar com/sem alias no path
    const fetchWithFallback = async (endpoint: string, useAliasInPath: boolean = true) => {
      try {
        return await proxyRequest(endpoint, creds, 'GET', undefined, useAliasInPath);
      } catch (err: any) {
        if (err?.code === 404 || err?.status === 404) {
          // Se 404 e estávamos usando alias, tenta sem alias
          if (useAliasInPath) {
            console.log(`[YampiBackend] ${endpoint} com alias retornou 404. Tentando sem alias...`);
            return await proxyRequest(endpoint, creds, 'GET', undefined, false);
          }
        }
        throw err;
      }
    };

    // 1) Pedidos
    try {
      console.log("[YampiBackend] Buscando pedidos (orders)...");
      const ordersRes = await fetchWithFallback('orders?limit=100&include=customer,items,payments', true);
      result.orders = ordersRes?.data || [];
    } catch (err: any) {
      if (err?.code === 404 || err?.status === 404) {
        console.warn("[YampiBackend] Endpoint de pedidos retornou 404. Seguindo com lista vazia.");
      } else {
        console.error("[YampiBackend] Erro ao buscar pedidos:", err);
        throw err;
      }
    }

    // 2) Checkouts Abandonados
    try {
      console.log("[YampiBackend] Buscando checkouts abandonados...");
      const abandonedRes = await fetchWithFallback('abandoned-checkouts?limit=100&include=customer,items', true);
      result.abandoned = abandonedRes?.data || [];
    } catch (err: any) {
      if (err?.code === 404 || err?.status === 404) {
        console.warn("[YampiBackend] Endpoint de abandoned-checkouts retornou 404. Seguindo com lista vazia.");
      } else {
        console.error("[YampiBackend] Erro ao buscar abandoned-checkouts:", err);
        throw err;
      }
    }

    return result;
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

  /**
   * List promotions (coupons) on Yampi
   */
  async listPromotions(creds: YampiProxyCredentials) {
    try {
      // promotions endpoint commonly lives under /promotions or /coupons -> try promotions first
      const res = await proxyRequest('promotions?limit=100', creds);
      return res?.data || [];
    } catch (e: any) {
      // fallback to coupons endpoint (older)
      try {
        const res2 = await proxyRequest('coupons?limit=100', creds);
        return res2?.data || [];
      } catch (err) {
        throw err;
      }
    }
  },

  /**
   * Create promotion/coupon on Yampi
   */
  async createPromotion(creds: YampiProxyCredentials, payload: any) {
    // Try promotions endpoint
    try {
      const res = await proxyRequest('promotions', creds, 'POST', payload);
      return res;
    } catch (e: any) {
      // fallback to coupons
      try {
        const res2 = await proxyRequest('coupons', creds, 'POST', payload);
        return res2;
      } catch (err) {
        throw err;
      }
    }
  },

  /**
   * List products - convenience helper
   */
  async listProducts(creds: YampiProxyCredentials) {
    try {
      const res = await proxyRequest('catalog/products?limit=100', creds);
      return res?.data || [];
    } catch (e: any) {
      throw e;
    }
  }
,

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
