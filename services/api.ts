/**
 * Mobile API Service
 * Communicates directly with the Fastify backend (port 3001)
 * Authentication via Better Auth session cookies stored in AsyncStorage
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getDefaultBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  const host = hostUri?.split(":")?.[0];

  if (host) {
    return `http://${host}:3001`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001";
  }

  return "http://localhost:3001";
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl();

const SESSION_COOKIE_KEY = "@music-connect:session-cookie";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  tipo_usuario: "artista" | "contratante";
  telefone?: string;
  cidade?: string;
  estado?: string;
  genero_musical?: string;
  descricao?: string;
}

export interface Usuario {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  tipo_usuario: "artista" | "contratante";
  descricao?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  genero_musical?: string | null;
  preco_minimo?: number | null;
  preco_maximo?: number | null;
  createdAt?: string;
}

export interface Artista extends Usuario {
  tipo_usuario: "artista";
}

export interface Proposta {
  id_proposta: number;
  id_contratante: string;
  id_artista: string;
  titulo?: string | null;
  descricao: string;
  local_evento: string;
  data_evento: string;
  hora_evento?: string | null;
  valor_oferecido: number;
  status: "pendente" | "aceita" | "recusada" | "cancelada";
  mensagem_resposta?: string | null;
  created_at: string;
  updated_at?: string | null;
  contratante?: { id: string; name: string; image: string | null };
  artista?: { id: string; name: string; image: string | null; genero_musical?: string | null };
}

export interface Avaliacao {
  id_avaliacao: number;
  id_avaliador: string;
  id_avaliado: string;
  nota: number;
  comentario: string;
  created_at: string;
  avaliador?: { name: string; image: string | null };
}

// ─── Session cookie helpers ───────────────────────────────────────────────────

async function saveSessionCookie(cookie: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_COOKIE_KEY, cookie);
}

async function getSessionCookie(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_COOKIE_KEY);
}

async function clearSessionCookie(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_COOKIE_KEY);
}

function extractSessionCookie(headers: Headers): string | null {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) return null;

  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!match) return null;

  return `better-auth.session_token=${match[1]}`;
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const cookie = await getSessionCookie();

  if (requireAuth && !cookie) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (cookie) {
    headers["Cookie"] = cookie;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      `Erro de rede. Verifique se o servidor está acessível em ${API_BASE_URL}`,
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function login(payload: LoginPayload): Promise<{ user: Usuario }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Credenciais inválidas");
  }

  const cookie = extractSessionCookie(response.headers);
  if (cookie) await saveSessionCookie(cookie);

  const data = await response.json();
  return { user: data.user as Usuario };
}

async function register(payload: RegisterPayload): Promise<{ user: Usuario }> {
  const { email, password, name, tipo_usuario, ...extra } = payload;

  const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, tipo_usuario, ...extra }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Erro ao cadastrar");
  }

  const cookie = extractSessionCookie(response.headers);
  if (cookie) await saveSessionCookie(cookie);

  const data = await response.json();
  return { user: data.user as Usuario };
}

async function logout(): Promise<void> {
  const cookie = await getSessionCookie();
  try {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : {},
    });
  } finally {
    await clearSessionCookie();
  }
}

async function forgotPassword(email: string, redirectTo?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forget-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      redirectTo: redirectTo || `${API_BASE_URL}/reset-password`,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Erro ao enviar email");
  }
}

async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Erro ao redefinir senha");
  }
}

async function getSession(): Promise<Usuario | null> {
  const cookie = await getSessionCookie();
  if (!cookie) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user as Usuario ?? null;
  } catch {
    return null;
  }
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

async function getMe(): Promise<Usuario> {
  const data = await request<ApiResponse<Usuario>>("/api/usuarios/me");
  return data.data!;
}

async function getUsuario(id: string): Promise<Usuario> {
  const data = await request<ApiResponse<Usuario>>(`/api/usuarios/${id}`, {}, false);
  return data.data!;
}

async function updateProfile(id: string, updates: Partial<Usuario>): Promise<Usuario> {
  const data = await request<ApiResponse<Usuario>>(`/api/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.data!;
}

// ─── Artistas ─────────────────────────────────────────────────────────────────

async function listarArtistas(filtros?: {
  genero?: string;
  local?: string;
  page?: number;
  limit?: number;
}): Promise<{ artistas: Artista[]; total: number }> {
  const query = new URLSearchParams();
  if (filtros?.genero) query.append("genero", filtros.genero);
  if (filtros?.local) query.append("local", filtros.local);
  if (filtros?.page) query.append("page", String(filtros.page));
  if (filtros?.limit) query.append("limit", String(filtros.limit));

  const qs = query.toString();
  const data = await request<ApiResponse<Artista[]> & { meta?: { total: number } }>(
    `/api/artistas${qs ? "?" + qs : ""}`,
    {},
    false,
  );

  return { artistas: data.data ?? [], total: (data as any).meta?.total ?? 0 };
}

async function getArtista(id: string): Promise<Artista> {
  const data = await request<ApiResponse<Artista>>(`/api/artistas/${id}`, {}, false);
  return data.data!;
}

// ─── Propostas ────────────────────────────────────────────────────────────────

async function getPropostasRecebidas(): Promise<Proposta[]> {
  const data = await request<ApiResponse<Proposta[]>>("/api/propostas/recebidas");
  return data.data ?? [];
}

async function getPropostasEnviadas(): Promise<Proposta[]> {
  const data = await request<ApiResponse<Proposta[]>>("/api/propostas/enviadas");
  return data.data ?? [];
}

async function getProposta(id: number): Promise<Proposta> {
  const data = await request<ApiResponse<Proposta>>(`/api/propostas/${id}`);
  return data.data!;
}

async function criarProposta(payload: {
  id_artista: string;
  descricao: string;
  local_evento: string;
  data_evento: string;
  hora_evento?: string;
  valor_oferecido: number;
  titulo?: string;
  duracao_horas?: number;
}): Promise<Proposta> {
  const data = await request<ApiResponse<Proposta>>("/api/propostas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data!;
}

async function atualizarStatusProposta(
  id: number,
  status: "aceita" | "recusada" | "cancelada",
): Promise<Proposta> {
  const data = await request<ApiResponse<Proposta>>(`/api/propostas/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return data.data!;
}

// ─── Avaliações ───────────────────────────────────────────────────────────────

async function getAvaliacoes(
  id_usuario: string,
): Promise<{ avaliacoes: Avaliacao[]; media: number }> {
  const [listData, mediaData] = await Promise.all([
    request<ApiResponse<Avaliacao[]>>(`/api/avaliacoes/usuario/${id_usuario}`, {}, false),
    request<ApiResponse<{ media_nota: number; total_avaliacoes: number }>>(
      `/api/avaliacoes/usuario/${id_usuario}/media`,
      {},
      false,
    ),
  ]);
  return {
    avaliacoes: listData.data ?? [],
    media: mediaData.data?.media_nota ?? 0,
  };
}

async function avaliarUsuario(payload: {
  id_avaliado: string;
  nota: number;
  comentario: string;
}): Promise<Avaliacao> {
  const data = await request<ApiResponse<Avaliacao>>("/api/avaliacoes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data!;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isAuthenticated(): Promise<boolean> {
  const cookie = await getSessionCookie();
  if (!cookie) return false;
  const user = await getSession();
  return !!user;
}

// ─── Export ───────────────────────────────────────────────────────────────────

// Check if there's a stored session cookie
async function hasToken(): Promise<boolean> {
  const cookie = await getSessionCookie();
  return !!cookie;
}

// Alias: home feed → received proposals for artist, sent for contractor
async function listarRecomendacoes(_filtros?: unknown): Promise<{ propostas: Proposta[]; total: number; hasMore: boolean }> {
  const cookie = await getSessionCookie();
  if (!cookie) return { propostas: [], total: 0, hasMore: false };
  const propostas = await getPropostasRecebidas();
  return { propostas, total: propostas.length, hasMore: false };
}

const mobileAPI = {
  // auth
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  getSession,
  isAuthenticated,
  hasToken,
  clearSession: clearSessionCookie,
  // usuarios
  getMe,
  getUsuario,
  updateProfile,
  // artistas
  listarArtistas,
  getArtista,
  // propostas
  getPropostasRecebidas,
  getPropostasEnviadas,
  getProposta,
  criarProposta,
  atualizarStatusProposta,
  // avaliacoes
  getAvaliacoes,
  avaliarUsuario,
  listarRecomendacoes,
};

export default mobileAPI;
