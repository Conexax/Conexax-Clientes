
import { Order, OrderStatus, AbandonedCheckout, Tenant, User, UserRole, Domain, Coupon, Influencer, CommSettings, Plan } from '../types';
import { YampiBackend } from './yampiService';

const STORAGE_KEY = 'conexx_enterprise_db_v3';

const getDB = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  return {
    users: [
      { id: 'ADM-01', tenantId: 'CONEXX', email: 'admin@conexx.corp', role: UserRole.CONEXX_ADMIN, name: 'CEO Conexx', password: 'admin' }
    ],
    tenants: [],
    domains: [],
    plans: [
      { id: 'p_basic', name: 'Starter', price: 97, interval: 'monthly', recommended: false, active: true, features: ['Até 1.000 pedidos/mês', 'Suporte via E-mail', '1 Domínio Personalizado'] },
      { id: 'p_pro', name: 'Professional', price: 297, interval: 'monthly', recommended: true, active: true, features: ['Pedidos Ilimitados', 'Suporte WhatsApp 24h', 'Gestão de Influenciadores', 'Recuperação de Carrinhos'] },
      { id: 'p_enterprise', name: 'Enterprise', price: 997, interval: 'monthly', recommended: false, active: true, features: ['Multi-lojas', 'Gerente de Contas', 'API Customizada', 'Dashboards White-label'] }
    ],
    coupons: [],
    influencers: [],
    commSettings: { emailProvider: 'Yampi Native', smsProvider: 'Yampi Native', activeTriggers: [] }
  };
};

const saveDB = (db: any) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

export const YampiService = {
  async syncAllData(tenant: Tenant) {
    // if (!tenant.yampiProxyUrl) throw new Error("URL do Proxy Externo não configurada.");
    const proxyUrl = tenant.yampiProxyUrl || ''; // Fallback to local Vite proxy
    try {
      const raw = await YampiBackend.getAllMetrics({
        token: tenant.yampiToken || '',
        secret: tenant.yampiSecret || '',
        alias: tenant.yampiAlias || '',
        proxyBaseUrl: proxyUrl
      });
      const orders: Order[] = (raw.orders || []).map((yo: any) => ({
        id: `#${yo.number}`,
        tenantId: tenant.id,
        externalId: yo.id.toString(),
        client: `${yo.customer?.data?.first_name || 'Cliente'} ${yo.customer?.data?.last_name || ''}`.trim(),
        email: yo.customer?.data?.email || '',
        product: yo.items?.data?.[0]?.product_name || 'Produto',
        date: yo.created_at?.date || new Date().toISOString(),
        status: (yo.status === 'paid' || yo.status === 'shipping' || yo.status === 'delivered') ? OrderStatus.APROVADO : OrderStatus.AGUARDANDO,
        paymentMethod: (() => {
          const method = yo.payment_method || yo.payments?.data?.[0]?.payment_method_id || 'unknown';
          if (method.includes('pix')) return 'PIX';
          if (method.includes('card') || method.includes('credit')) return 'Cartão';
          if (method.includes('billet') || method.includes('boleto')) return 'Boleto';
          return 'Outros';
        })(),
        value: parseFloat(yo.total || '0'),
        initials: (yo.customer?.data?.first_name?.[0] || 'C').toUpperCase(),
        couponCode: yo.promotions?.data?.[0]?.code || undefined
      }));
      const abandoned: AbandonedCheckout[] = (raw.abandoned || []).map((ya: any) => ({
        id: ya.id.toString(),
        clientName: `${ya.customer?.data?.first_name || 'Interessado'} ${ya.customer?.data?.last_name || ''}`.trim(),
        email: ya.customer?.data?.email || '',
        phone: ya.customer?.data?.phone || '',
        value: parseFloat(ya.total || '0'),
        date: ya.created_at?.date || new Date().toISOString(),
        items: ya.items?.data?.map((i: any) => i.product_name).join(', ') || 'Carrinho sem itens',
        recovered: false
      }));
      return { orders, abandoned };
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
    return { ...coupon, id: coupon.id || 'YCP-' + Date.now(), usageCount: coupon.usageCount || 0 } as Coupon;
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
