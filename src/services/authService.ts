import type { User, AuthSession, UserRole } from '../types';
import { storageService, STORE_KEYS } from './storageService';
import { auditService } from './auditService';
import { hashPassword } from './seedService';

const OTP_STORE_KEY = 'agriflow_otp_store';

interface OtpEntry { otp: string; expires: number; }

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^0/, '+234');
}

function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone).replace('+', '')}@sms.agriflow.local`;
}

function generateId(role: UserRole): string {
  const prefix = role === 'buyer' ? 'USR-BUY' : role === 'supplier' ? 'USR-SUP' : role === 'logistics' ? 'USR-LOG' : 'USR-ADM';
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

export const authService = {
  async register(params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organizationName?: string;
    phone?: string;
    location?: string;
  }): Promise<AuthSession> {
    await delay(300);
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    if (users.find((u) => u.email.toLowerCase() === params.email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const user: User = {
      id: generateId(params.role),
      email: params.email,
      passwordHash: hashPassword(params.password),
      name: params.name,
      role: params.role,
      organizationName: params.organizationName || params.name,
      phone: params.phone,
      location: params.location,
      verified: true,
      profileComplete: true,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    storageService.set(STORE_KEYS.USERS, users);

    auditService.log({
      action: 'user_registered',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityId: user.id,
      entityType: 'User',
      detail: `${user.name} registered as ${user.role}.`,
    });

    const session: AuthSession = { userId: user.id, role: user.role, name: user.name, email: user.email };
    storageService.set(STORE_KEYS.SESSION, session);
    return session;
  },

  async login(email: string, password: string): Promise<AuthSession> {
    await delay(250);
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid email or password. Please verify your credentials.');
    }
    const session: AuthSession = { userId: user.id, role: user.role, name: user.name, email: user.email };
    storageService.set(STORE_KEYS.SESSION, session);
    return session;
  },

  logout(): void {
    storageService.remove(STORE_KEYS.SESSION);
  },

  getSession(): AuthSession | null {
    return storageService.get<AuthSession>(STORE_KEYS.SESSION);
  },

  getCurrentUser(): User | null {
    const session = this.getSession();
    if (!session) return null;
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    return users.find((u) => u.id === session.userId) ?? null;
  },

  requestOtp(phone: string): string {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const store = storageService.get<Record<string, OtpEntry>>(OTP_STORE_KEY) ?? {};
    store[normalizePhone(phone)] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    storageService.set(OTP_STORE_KEY, store);
    return otp;
  },

  async registerWithPhone(params: {
    phone: string; name: string; role: UserRole; otp: string;
    organizationName?: string; location?: string;
  }): Promise<AuthSession> {
    await delay(300);
    const normalized = normalizePhone(params.phone);
    const store = storageService.get<Record<string, OtpEntry>>(OTP_STORE_KEY) ?? {};
    const entry = store[normalized];
    if (!entry || entry.otp !== params.otp || Date.now() > entry.expires) {
      throw new Error('Invalid or expired OTP. Please request a new code.');
    }
    const email = phoneToEmail(params.phone);
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    if (users.find((u) => u.email === email)) {
      throw new Error('An account with this phone number already exists.');
    }
    const user: User = {
      id: generateId(params.role),
      email,
      passwordHash: hashPassword('OTP_AUTH_' + normalized),
      name: params.name,
      role: params.role,
      organizationName: params.organizationName || params.name,
      phone: normalized,
      location: params.location,
      verified: true,
      profileComplete: true,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    storageService.set(STORE_KEYS.USERS, users);
    delete store[normalized];
    storageService.set(OTP_STORE_KEY, store);
    auditService.log({
      action: 'user_registered', actorId: user.id, actorName: user.name,
      actorRole: user.role, entityId: user.id, entityType: 'User',
      detail: `${user.name} registered via phone (${normalized}).`,
    });
    const session: AuthSession = { userId: user.id, role: user.role, name: user.name, email: user.email };
    storageService.set(STORE_KEYS.SESSION, session);
    return session;
  },

  async loginWithPhone(phone: string, otp: string): Promise<AuthSession> {
    await delay(250);
    const normalized = normalizePhone(phone);
    const store = storageService.get<Record<string, OtpEntry>>(OTP_STORE_KEY) ?? {};
    const entry = store[normalized];
    if (!entry || entry.otp !== otp || Date.now() > entry.expires) {
      throw new Error('Invalid or expired OTP. Please request a new code.');
    }
    const email = phoneToEmail(phone);
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    const user = users.find((u) => u.email === email);
    if (!user) throw new Error('No account found for this phone number. Please register first.');
    delete store[normalized];
    storageService.set(OTP_STORE_KEY, store);
    const session: AuthSession = { userId: user.id, role: user.role, name: user.name, email: user.email };
    storageService.set(STORE_KEYS.SESSION, session);
    return session;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    await delay(300);
    const users = storageService.get<User[]>(STORE_KEYS.USERS) ?? [];
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error('User not found.');
    const updated = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    users[idx] = updated;
    storageService.set(STORE_KEYS.USERS, users);
    return updated;
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
