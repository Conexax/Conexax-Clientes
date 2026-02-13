
import { Order, OrderStatus, AbandonedCheckout, Tenant, User, UserRole, Domain, Coupon, Influencer, CommSettings, Plan } from '../types';
import { YampiBackend } from './yampiService';

const STORAGE_KEY = 'conexx_enterprise_db_v3';

const getDB = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const db = JSON.parse(saved);
    return { ...db, plans: [] }; // Always force plans empty to migrate to Supabase
  }

  return {
    users: [
      { id: 'ADM-01', tenantId: 'CONEXX', email: 'admin@conexx.corp', role: UserRole.CONEXX_ADMIN, name: 'CEO Conexx', password: 'admin' }
    ],
    tenants: [],
    domains: [],
    plans: [],
    coupons: [],
    influencers: [],
    commSettings: { emailProvider: 'Yampi Native', smsProvider: 'Yampi Native', activeTriggers: [] }
  };
};

const saveDB = (db: any) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

export const YampiService = {
  async syncAllData(tenant: Tenant) {
    /**
     * IMPORTANTE (Ambiente Frontend):
     * 
     * Estávamos usando `tenant.yampiProxyUrl` como base, o que fazia
     * o navegador chamar diretamente domínios como:
     *
     *   https://kairuscamping.com.br/api/yampi/auth/me
     *
     * Isso gera erro de CORS, porque o frontend React não pode
     * conversar diretamente com esse host externo sem que ele esteja
     * preparado para CORS.
     *
     * Para o app rodando no navegador, o fluxo correto é sempre:
     *   frontend -> /api/yampi/... (no mesmo host)
     * e então o Vite proxy (em dev) ou um backend próprio em /api/yampi
     * faz a chamada real para a Yampi.
     *
     * Por isso, aqui forçamos o uso de caminho relativo (`''`),
     * ignorando `yampiProxyUrl` no contexto do app frontend.
     */
    const proxyUrl = ''; // Sempre usar /api/yampi/... no browser (Vite proxy / backend cuida do externo)
    try {
      const raw = await YampiBackend.getAllMetrics({
        token: tenant.yampiToken || '',
        secret: tenant.yampiSecret || '',
        alias: tenant.yampiAlias || '',
        proxyBaseUrl: proxyUrl,
        oauthToken: (tenant as any).yampi_oauth_access_token || undefined
      });
      const orders: Order[] = (raw.orders || []).map((yo: any) => {
        // A API oficial da Yampi usa `value_total` como campo principal do pedido.
        // Alguns ambientes/versões podem expor `total`. Usamos ambos como fallback.
        const rawTotal = yo.value_total ?? yo.total ?? 0;

        // Status costuma vir como objeto (`status.data.alias`) em algumas respostas.
        const statusAlias =
          (typeof yo.status === 'string'
            ? yo.status
            : yo.status?.data?.alias || '').toLowerCase();

        return {
          id: `#${yo.number}`,
          tenantId: tenant.id,
          externalId: yo.id?.toString?.() || String(yo.id || yo.number),
          client: `${yo.customer?.data?.first_name || 'Cliente'} ${yo.customer?.data?.last_name || ''}`.trim(),
          email: yo.customer?.data?.email || '',
          product:
            yo.items?.data?.[0]?.product_name ||
            yo.items?.data?.[0]?.name ||
            'Produto',
          date: yo.created_at?.date || yo.created_at || new Date().toISOString(),
          status:
            statusAlias === 'paid' ||
              statusAlias === 'shipping' ||
              statusAlias === 'delivered'
              ? OrderStatus.APROVADO
              : OrderStatus.AGUARDANDO,
          paymentMethod: (() => {
            const method =
              yo.payment_method ||
              yo.payments?.data?.[0]?.payment_method_id ||
              yo.payments?.data?.[0]?.payment_method_alias ||
              'unknown';
            const m = String(method).toLowerCase();
            if (m.includes('pix')) return 'PIX';
            if (m.includes('card') || m.includes('credit')) return 'Cartão';
            if (m.includes('billet') || m.includes('boleto')) return 'Boleto';
            if (m.includes('billet') || m.includes('boleto')) return 'Boleto';
            return 'Cartão'; // Default/Fallback
          })() as any,
          value: Number(rawTotal) || 0,
          initials: (yo.customer?.data?.first_name?.[0] || 'C').toUpperCase(),
          couponCode:
            yo.promocode?.data?.code ||
            yo.promotions?.data?.[0]?.code ||
            undefined
        };
      });

      const abandoned: AbandonedCheckout[] = (raw.abandoned || []).map((ya: any) => {
        const rawTotal = ya.value_total ?? ya.total ?? 0;
        return {
          id: ya.id?.toString?.() || String(ya.id),
          tenantId: tenant.id,
          externalId: ya.id?.toString?.() || String(ya.id),
          clientName: `${ya.customer?.data?.first_name || 'Interessado'} ${ya.customer?.data?.last_name || ''}`.trim(),
          email: ya.customer?.data?.email || '',
          phone: ya.customer?.data?.phone || '',
          product: ya.items?.data?.[0]?.product_name || ya.items?.data?.[0]?.name || 'Carrinho Abandonado',
          value: Number(rawTotal) || 0,
          date: ya.created_at?.date || ya.created_at || new Date().toISOString(),
          items:
            ya.items?.data
              ?.map((i: any) => i.product_name || i.name)
              .join(', ') || 'Carrinho sem itens',
          recovered: false
        };
      });
      // Attach logistics/tracking fields (if present) to mapped orders
      const ordersWithLogistics = orders.map((o, idx) => {
        const yo = (raw.orders || [])[idx] || {};
        const rawStatus =
          typeof yo.status === 'string' ? yo.status : yo.status?.data?.alias;
        return {
          ...o,
          rawStatusAlias: rawStatus || undefined,
          delivered: yo.delivered === true || false,
          trackCode: yo.track_code || yo.tracking_code || undefined,
          trackUrl: yo.track_url || yo.tracking_url || undefined,
          shipmentService: yo.shipment_service || yo.shipping_service || undefined,
          shipmentQuoteId: yo.shipment_quote_id || undefined,
          daysDelivery: yo.days_delivery !== undefined ? Number(yo.days_delivery) : undefined,
          valueShipment: yo.value_shipment !== undefined ? Number(yo.value_shipment) : undefined
        };
      });

      return { orders: ordersWithLogistics, abandoned };
    } catch (err: any) {
      throw new Error(err.details || err.error || "Erro de conexão.");
    }
  },
  async syncDomains(tenant: Tenant) {
    return [
      { id: 'D1', tenantId: tenant.id, url: `${tenant.yampiAlias}.com.br`, isMain: true, status: 'active', ssl: true },
      { id: 'D2', tenantId: tenant.id, url: `checkout.${tenant.yampiAlias}.net`, isMain: false, status: 'active', ssl: true }
    ] as Domain[];
  },
  async registerDomainOnYampi(tenant: Tenant, url: string) {
    if (!tenant.yampiToken || !tenant.yampiProxyUrl) throw new Error("Configurações da Yampi ausentes.");
    return await YampiBackend.createDomain({
      token: tenant.yampiToken,
      secret: tenant.yampiSecret || '',
      alias: tenant.yampiAlias || '',
      proxyBaseUrl: tenant.yampiProxyUrl
    }, url);
  },
  async createCouponOnYampi(tenant: Tenant, coupon: Partial<Coupon>) {
    // If tenant has Yampi alias, try to create promotion on Yampi via proxy
    if (!tenant.yampiAlias) {
      return { ...coupon, id: coupon.id || 'YCP-' + Date.now(), usageCount: coupon.usageCount || 0 } as Coupon;
    }
    try {
      const creds = {
        token: tenant.yampiToken || '',
        secret: tenant.yampiSecret || '',
        alias: tenant.yampiAlias || '',
        proxyBaseUrl: tenant.yampiProxyUrl || ''
      };
      const payload: any = {
        code: coupon.code,
        description: coupon.code || coupon.id,
        type: coupon.type || 'percentage',
        value: coupon.value || 0,
        active: true
      };
      const res = await YampiBackend.createPromotion(creds as any, payload);
      const created = res?.data || res;
      return {
        id: created?.id?.toString?.() || coupon.id || 'YCP-' + Date.now(),
        code: created?.code || coupon.code,
        type: coupon.type || 'percentage',
        value: coupon.value || 0,
        usageCount: created?.usage_count || 0,
        active: created?.active ?? true
      } as Coupon;
    } catch (e) {
      // fallback to local-only coupon
      return { ...coupon, id: coupon.id || 'YCP-' + Date.now(), usageCount: coupon.usageCount || 0 } as Coupon;
    }
  },

  async syncCoupons(tenant: Tenant) {
    if (!tenant.yampiAlias) return [];
    try {
      const creds = {
        token: tenant.yampiToken || '',
        secret: tenant.yampiSecret || '',
        alias: tenant.yampiAlias || '',
        proxyBaseUrl: tenant.yampiProxyUrl || ''
      };
      const list = await YampiBackend.listPromotions(creds as any);
      return (list || []).map((p: any) => ({
        id: p.id?.toString?.() || p.code,
        code: p.code,
        type: p.type || 'percentage',
        value: parseFloat(p.value || p.amount || 0) || 0,
        usageCount: p.usage_count || 0,
        active: p.active ?? true
      })) as Coupon[];
    } catch (e) {
      return [];
    }
  },

  async syncProductsFromYampi(tenant: Tenant) {
    if (!tenant.yampiAlias) return [];
    try {
      const creds = {
        token: tenant.yampiToken || '',
        secret: tenant.yampiSecret || '',
        alias: tenant.yampiAlias || '',
        proxyBaseUrl: tenant.yampiProxyUrl || ''
      };
      const list = await YampiBackend.listProducts(creds as any);
      return (list || []).map((p: any) => ({
        id: p.id?.toString?.() || p.sku || ('P-' + Date.now()),
        name: p.name || p.product_name || 'Produto',
        sku: p.sku || p.id,
        description: p.description || '',
        price: parseFloat(p.price || p.value_total || 0) || 0,
        images: p.images?.data?.map((i: any) => i.url) || [] // Map images
      }));
    } catch (e) {
      return [];
    }
  }
};

export const AuthService = {
  login(email: string, password?: string): { user: User | null, tenant: Tenant | null } {
    const db = getDB();
    const user = db.users.find((u: User) => u.email === email);
    if (!user) return { user: null, tenant: null };
    if (password && user.password !== password) return { user: null, tenant: null };
    const tenant = db.tenants.find((t: Tenant) => t.id === user.tenantId) || null;
    return { user, tenant };
  },
  registerTenant(tenantData: Partial<Tenant>) {
    const db = getDB();
    const tenantId = 'T-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTenant: Tenant = {
      id: tenantId,
      name: tenantData.name || 'Nova Loja',
      ownerName: tenantData.ownerName || '',
      ownerEmail: tenantData.ownerEmail || '',
      password: tenantData.password || '123456',
      planId: tenantData.planId || 'p_pro',
      active: true,
      subscriptionStatus: 'active',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...tenantData
    };
    const newUser: User = { id: 'U-' + Date.now(), tenantId: tenantId, email: newTenant.ownerEmail, name: newTenant.ownerName, password: newTenant.password, role: UserRole.CLIENT_ADMIN };
    db.tenants.push(newTenant);
    db.users.push(newUser);
    saveDB(db);
    return { tenant: newTenant, user: newUser };
  },
  updateTenant(id: string, updates: Partial<Tenant>) {
    const db = getDB();
    const index = db.tenants.findIndex((t: Tenant) => t.id === id);
    if (index !== -1) {
      db.tenants[index] = { ...db.tenants[index], ...updates };
      saveDB(db);
      return db.tenants[index];
    }
    return null;
  },
  getAllTenants(): Tenant[] { return getDB().tenants; },
  deleteTenant(id: string) {
    const db = getDB();
    db.tenants = db.tenants.filter((t: Tenant) => t.id !== id);
    db.domains = db.domains.filter((d: Domain) => d.tenantId !== id);
    saveDB(db);
  },
  savePlan(plan: Plan) {
    const db = getDB();
    const idx = db.plans.findIndex((p: Plan) => p.id === plan.id);
    if (idx !== -1) db.plans[idx] = plan;
    else db.plans.push({ ...plan, id: plan.id || 'plan_' + Date.now() });
    saveDB(db);
  },
  deletePlan(id: string) {
    const db = getDB();
    db.plans = db.plans.filter((p: Plan) => p.id !== id);
    saveDB(db);
  },
  saveDomain(domain: Domain) {
    const db = getDB();
    const idx = db.domains.findIndex((d: Domain) => d.id === domain.id);
    if (idx !== -1) db.domains[idx] = domain;
    else db.domains.push(domain);
    saveDB(db);
  },
  deleteDomain(id: string) {
    const db = getDB();
    db.domains = db.domains.filter((d: Domain) => d.id !== id);
    saveDB(db);
  },
  getOperationalData() {
    const db = getDB();
    return {
      domains: db.domains || [],
      plans: db.plans || [],
      coupons: db.coupons || [],
      influencers: db.influencers || [],
      commSettings: db.commSettings || { emailProvider: 'Yampi Native', smsProvider: 'Yampi Native', activeTriggers: [] }
    };
  },
  saveUser(userData: Partial<User>) {
    const db = getDB();
    if (userData.id) {
      const index = db.users.findIndex((u: User) => u.id === userData.id);
      if (index !== -1) db.users[index] = { ...db.users[index], ...userData };
    } else {
      db.users.push({ id: 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase(), ...userData });
    }
    saveDB(db);
  },
  deleteUser(id: string) {
    const db = getDB();
    if (id === 'ADM-01') return;
    db.users = db.users.filter((u: User) => u.id !== id);
    saveDB(db);
  },
  getUsersByTenant(tenantId: string): User[] { return getDB().users.filter((u: User) => u.tenantId === tenantId); },
  getGlobalAdmins(): User[] { return getDB().users.filter((u: User) => u.role === UserRole.CONEXX_ADMIN); },
  saveCoupon(coupon: Coupon) {
    const db = getDB();
    const idx = db.coupons.findIndex((c: Coupon) => c.id === coupon.id);
    if (idx !== -1) db.coupons[idx] = coupon;
    else db.coupons.push(coupon);
    saveDB(db);
  },
  deleteCoupon(id: string) {
    const db = getDB();
    db.coupons = db.coupons.filter((c: Coupon) => c.id !== id);
    saveDB(db);
  },
  saveInfluencer(influencer: Influencer) {
    const db = getDB();
    const idx = db.influencers.findIndex((i: Influencer) => i.id === influencer.id);
    if (idx !== -1) db.influencers[idx] = influencer;
    else db.influencers.push(influencer);
    saveDB(db);
  },
  deleteInfluencer(id: string) {
    const db = getDB();
    db.influencers = db.influencers.filter((i: Influencer) => i.id !== id);
    saveDB(db);
  },
  saveCommSettings(settings: CommSettings) {
    const db = getDB();
    db.commSettings = settings;
    saveDB(db);
  }
};
