import api from "./api";

const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/login", { email, password });
  setToken(data.access_token);
  return data;
}

export async function signup(name: string, email: string, password: string) {
  const { data } = await api.post("/signup", { name, email, password });
  setToken(data.access_token);
  return data;
}

export function logout() {
  removeToken();
}

export async function getUser() {
  const { data } = await api.get("/me");
  return data;
}
