import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "farmer" | "user" | "manager";

export type Account = {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  location?: string;
  farmSize?: string;
};

export type SessionUser = Omit<Account, "password"> & {
  id: string;
  avatarUrl?: string;
};

const STORE = "agrisynapse-accounts";
const SESSION = "agrisynapse-session";

const SEED: Account[] = [
  { id: "usr_admin", name: "Admin Control", email: "admin@agrisynapse.in", password: "admin123", role: "admin", location: "Chennai, Tamil Nadu", phone: "+91 94444 00112" },
  { id: "usr_manager_karthik", name: "Karthik Manager", email: "manager@agrisynapse.in", password: "manager123", role: "manager", location: "Coimbatore, Tamil Nadu", phone: "+91 98765 43210" },
  { id: "usr_farmer_murugan", name: "Murugan Selvam", email: "farmer@agrisynapse.in", password: "farmer123", role: "farmer", location: "Erode, Tamil Nadu", farmSize: "4.2 ha", phone: "+91 98400 11223" },
  { id: "usr_priya", name: "Priya Raman", email: "user@agrisynapse.in", password: "user123", role: "user", location: "Coimbatore, Tamil Nadu", phone: "+91 98401 22334" },
];

export function readAccounts(): Account[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) {
      localStorage.setItem(STORE, JSON.stringify(SEED));
      return SEED;
    }
    const accounts = JSON.parse(raw) as Account[];
    let modified = false;
    // Filter out any obsolete agronomist accounts
    const filtered = accounts.filter(a => (a.role as string) !== "agronomist");
    if (filtered.length !== accounts.length) modified = true;

    const updated = filtered.map(a => {
      if (!a.id) {
        modified = true;
        return { ...a, id: `usr_${a.email.replace(/[^a-zA-Z0-9]/g, '_')}` };
      }
      return a;
    });
    if (modified) {
      localStorage.setItem(STORE, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return SEED;
  }
}

export function writeAccounts(accounts: Account[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE, JSON.stringify(accounts));
}

type Ctx = {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string, role: Role, remember: boolean) => SessionUser;
  register: (input: Account) => SessionUser;
  loginWithGoogle: (input: { name: string; email: string; role: Role; avatarUrl?: string }) => SessionUser;
  logout: () => void;
  update: (patch: Partial<SessionUser>) => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION) ?? sessionStorage.getItem(SESSION);
    if (raw) {
      try {
        const u = JSON.parse(raw) as SessionUser;
        if (!u.id && u.email) {
          u.id = `usr_${u.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        setUser(u);
      } catch {
        /* ignore */
      }
    }
    readAccounts();
    setReady(true);
  }, []);

  const persist = (u: SessionUser, remember = true) => {
    setUser(u);
    (remember ? localStorage : sessionStorage).setItem(SESSION, JSON.stringify(u));
  };

  const login: Ctx["login"] = (email, password, role, remember) => {
    const accounts = readAccounts();
    const found = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) throw new Error("No account found with that email");
    if (found.password !== password) throw new Error("Incorrect password");
    if (found.role !== role) throw new Error(`This account is registered as a ${found.role}`);
    const { password: _pw, ...session } = found;
    const userSession: SessionUser = {
      ...session,
      id: session.id || `usr_${session.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    };
    persist(userSession, remember);
    return userSession;
  };

  const register: Ctx["register"] = (input) => {
    const accounts = readAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error("An account with that email already exists");
    }
    const newAcc: Account = {
      ...input,
      id: input.id || `usr_${input.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
    };
    localStorage.setItem(STORE, JSON.stringify([...accounts, newAcc]));
    const { password: _pw, ...session } = newAcc;
    const userSession: SessionUser = {
      ...session,
      id: newAcc.id!,
    };
    persist(userSession, true);
    return userSession;
  };

  const loginWithGoogle: Ctx["loginWithGoogle"] = (input) => {
    const accounts = readAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === input.email.trim().toLowerCase());
    
    if (existing) {
      const { password: _pw, ...session } = existing;
      const updatedSession: SessionUser = {
        ...session,
        id: session.id || `usr_${session.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        avatarUrl: input.avatarUrl,
      };
      persist(updatedSession, true);
      return updatedSession;
    }

    // New user via Google
    const newAccount: Account = {
      id: `usr_${input.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      name: input.name,
      email: input.email,
      password: "", // No password for OAuth
      role: input.role,
    };
    localStorage.setItem(STORE, JSON.stringify([...accounts, newAccount]));
    const userSession: SessionUser = {
      ...newAccount,
      id: newAccount.id!,
      avatarUrl: input.avatarUrl,
    };
    persist(userSession, true);
    return userSession;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION);
    sessionStorage.removeItem(SESSION);
  };

  const update: Ctx["update"] = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      const accounts = readAccounts().map((a) => (a.email === prev.email ? { ...a, ...patch } : a));
      localStorage.setItem(STORE, JSON.stringify(accounts));
      const store = localStorage.getItem(SESSION) ? localStorage : sessionStorage;
      store.setItem(SESSION, JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, loginWithGoogle, logout, update }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}