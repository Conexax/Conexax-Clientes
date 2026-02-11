
export enum UserRole {
  CONEXX_ADMIN = 'CONEXX_ADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  CLIENT_USER = 'CLIENT_USER'
}

export enum OrderStatus {
  APROVADO = 'APROVADO',
  AGUARDANDO = 'AGUARDANDO',
  CANCELADO = 'CANCELADO',
  ABANDONADO = 'ABANDONADO'
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  recommended: boolean;
  active: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  name: string;
  password?: string;
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
  yampiToken?: string;
  yampiSecret?: string;
  yampiAlias?: string;
  yampiProxyUrl?: string;
  lastSync?: string;
  planId: string; // Referência ao ID do plano
  active: boolean;
  subscriptionStatus: 'active' | 'past_due' | 'canceled';
  nextBilling: string;
}

export interface Domain {
  id: string;
  tenantId: string;
  url: string;
  isMain: boolean;
  status: 'active' | 'pending' | 'error';
  ssl: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  usageCount: number;
  usageLimit?: number;
}

export interface Influencer {
  id: string;
  name: string;
  couponId: string;
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
}

export interface CommSettings {
  emailProvider: string;
  smsProvider: string;
  activeTriggers: string[];
}

export interface AbandonedCheckout {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  value: number;
  date: string;
  items: string;
  recovered: boolean;
}

export interface Order {
  id: string;
  tenantId: string;
  externalId: string;
  client: string;
  email: string;
  product: string;
  date: string;
  status: OrderStatus;
  paymentMethod: 'PIX' | 'Cartão' | 'Boleto';
  value: number;
  initials: string;
  couponCode?: string;
}

export interface AppSettings {
  companyName: string;
  supportEmail: string;
  description: string;
  darkMode: boolean;
  currency: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[]; // All users visible to the current user
  activeTenant: Tenant | null;
  orders: Order[];
  abandonedCheckouts: AbandonedCheckout[];
  tenants: Tenant[];
  domains: Domain[];
  plans: Plan[];
  coupons: Coupon[];
  influencers: Influencer[];
  commSettings: CommSettings;
  settings: AppSettings;
}
