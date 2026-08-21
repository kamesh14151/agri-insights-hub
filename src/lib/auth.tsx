import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "farmer" | "user";

export type Account = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  location?: string;
  farmSize?: string;
};

export type SessionUser = Omit<Account, "password"> & {
  avatarUrl?: string;
};

const STORE = "agrisynapse-accounts";
const SESSION = "agrisynapse-session";

const SEED: Account[] = [
  { name: "Admin Control", email: "admin@agrisynapse.in", password: "admin123", role: "admin", location: "Chennai, Tamil Nadu" },
  { name: "Murugan Selvam", email: "farmer@agrisynapse.in", password: "farmer123", role: "farmer", location: "Erode, Tamil Nadu", farmSize: "4.2 ha", phone: "+91 98400 11223" },
  { name: "Priya Raman", email: "user@agrisynapse.in", password: "user123", role: "user", location: "Coimbatore, Tamil Nadu" },
];

function readAccounts(): Account[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) {
      localStorage.setItem(STORE, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Account[];
  } catch {
    return SEED;
  }
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
        setUser(JSON.parse(raw) as SessionUser);
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
    persist(session, remember);
    return session;
  };

  const register: Ctx["register"] = (input) => {
    const accounts = readAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error("An account with that email already exists");
    }
    localStorage.setItem(STORE, JSON.stringify([...accounts, input]));
    const { password: _pw, ...session } = input;
    persist(session, true);
    return session;
  };

  const loginWithGoogle: Ctx["loginWithGoogle"] = (input) => {
    const accounts = readAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === input.email.trim().toLowerCase());
    
    if (existing) {
      const { password: _pw, ...session } = existing;
      const updatedSession = { ...session, avatarUrl: input.avatarUrl };
      persist(updatedSession, true);
      return updatedSession;
    }

    // New user via Google
    const newAccount: Account = {
      name: input.name,
      email: input.email,
      password: "", // No password for OAuth
      role: input.role,
    };
    localStorage.setItem(STORE, JSON.stringify([...accounts, newAccount]));
    const session = { ...newAccount, avatarUrl: input.avatarUrl };
    persist(session, true);
    return session;
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