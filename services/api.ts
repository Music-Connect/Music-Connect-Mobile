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

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  id_autor: string;
  conteudo: string;
  tipo: "post" | "disponibilidade" | "buscando";
  visibilidade: string;
  imagens: string[];
  video_url?: string | null;
  tags: string[];
  cidade?: string | null;
  estado?: string | null;
  curtidas_count: number;
  comentarios_count: number;
  created_at: string;
  curtiu?: boolean;
  autor: {
    id: string;
    name: string;
    image: string | null;
    tipo_usuario: string;
    genero_musical?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
}

export interface Comentario {
  id: string;
  id_autor: string;
  id_post: string;
  id_comentario_pai?: string | null;
  conteudo: string;
  created_at: string;
  autor: { id: string; name: string; image: string | null; tipo_usuario: string };
  respostas?: Comentario[];
}

export interface StoryData {
  id: string;
  midia_url: string;
  tipo_midia: "imagem" | "video";
  duracao: number;
  views_count: number;
  created_at: string;
  expira_em: string;
  visto?: boolean;
}

export interface StoryGroup {
  user: { id: string; name: string; image: string | null; tipo_usuario: string };
  stories: StoryData[];
  hasUnseen: boolean;
}

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

async function getFeed(params?: {
  cursor?: string;
  limit?: number;
  tipo?: string;
}): Promise<{ posts: Post[]; meta: CursorMeta }> {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.append("cursor", params.cursor);
  if (params?.limit) qs.append("limit", String(params.limit));
  if (params?.tipo) qs.append("tipo", params.tipo);

  const data = await request<{ data: Post[]; meta: CursorMeta }>(
    `/api/posts?${qs}`,
    {},
    false,
  );
  return { posts: data.data ?? [], meta: data.meta };
}

async function getFeedRecomendado(params?: {
  cursor?: string;
  limit?: number;
}): Promise<{ posts: Post[]; meta: CursorMeta }> {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.append("cursor", params.cursor);
  if (params?.limit) qs.append("limit", String(params.limit));

  const data = await request<{ data: Post[]; meta: CursorMeta }>(
    `/api/posts/feed/recomendados?${qs}`,
  );
  return { posts: data.data ?? [], meta: data.meta };
}

async function createPost(payload: {
  conteudo: string;
  tipo?: string;
  imagens?: string[];
  video_url?: string;
  tags?: string[];
}): Promise<Post> {
  const data = await request<ApiResponse<Post>>("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data!;
}

async function deletePost(id: string): Promise<void> {
  await request(`/api/posts/${id}`, { method: "DELETE" });
}

async function curtirPost(id: string): Promise<void> {
  await request(`/api/posts/${id}/curtir`, { method: "POST" });
}

async function descurtirPost(id: string): Promise<void> {
  await request(`/api/posts/${id}/curtir`, { method: "DELETE" });
}

async function getComentarios(
  postId: string,
  cursor?: string,
): Promise<{ comentarios: Comentario[]; meta: CursorMeta }> {
  const qs = new URLSearchParams();
  if (cursor) qs.append("cursor", cursor);

  const data = await request<{ data: Comentario[]; meta: CursorMeta }>(
    `/api/posts/${postId}/comentarios?${qs}`,
    {},
    false,
  );
  return { comentarios: data.data ?? [], meta: data.meta };
}

async function createComentario(
  postId: string,
  payload: { conteudo: string; id_comentario_pai?: string },
): Promise<Comentario> {
  const data = await request<ApiResponse<Comentario>>(
    `/api/posts/${postId}/comentarios`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return data.data!;
}

async function deleteComentario(postId: string, comentarioId: string): Promise<void> {
  await request(`/api/posts/${postId}/comentarios/${comentarioId}`, {
    method: "DELETE",
  });
}

// ─── Stories ─────────────────────────────────────────────────────────────────

async function getStories(): Promise<StoryGroup[]> {
  const data = await request<{ data: StoryGroup[] }>("/api/stories");
  return data.data ?? [];
}

async function createStory(payload: {
  midia_url: string;
  tipo_midia?: string;
  duracao?: number;
}): Promise<StoryData> {
  const data = await request<ApiResponse<StoryData>>("/api/stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.data!;
}

async function deleteStory(id: string): Promise<void> {
  await request(`/api/stories/${id}`, { method: "DELETE" });
}

async function visualizarStory(id: string): Promise<void> {
  await request(`/api/stories/${id}/visualizar`, { method: "POST" });
}

// ─── Recomendações ───────────────────────────────────────────────────────────

export interface ArtistaRecomendado {
  id: string;
  name: string;
  image: string | null;
  genero_musical?: string | null;
  cidade?: string | null;
  estado?: string | null;
  media_avaliacoes: number;
  total_avaliacoes: number;
}

async function getRecomendacoesArtistas(
  params?: { page?: number; limit?: number },
): Promise<ArtistaRecomendado[]> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append("page", String(params.page));
  if (params?.limit) qs.append("limit", String(params.limit));

  const data = await request<{ data: ArtistaRecomendado[] }>(
    `/api/recomendacoes/artistas?${qs}`,
    {},
    false,
  );
  return data.data ?? [];
}

// ─── Uploads ─────────────────────────────────────────────────────────────────

async function uploadAvatar(imageUri: string): Promise<string> {
  const cookie = await getSessionCookie();
  if (!cookie) throw new Error("Sessão expirada. Faça login novamente.");

  const filename = imageUri.split("/").pop() ?? "avatar.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formData,
    });
  } catch {
    throw new Error(
      `Erro de rede. Verifique se o servidor está acessível em ${API_BASE_URL}`,
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data.url as string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return API_BASE_URL;
}

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
  // config
  getBaseUrl,
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
  uploadAvatar,
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
  // feed / posts
  getFeed,
  getFeedRecomendado,
  createPost,
  deletePost,
  curtirPost,
  descurtirPost,
  getComentarios,
  createComentario,
  deleteComentario,
  // stories
  getStories,
  createStory,
  deleteStory,
  visualizarStory,
  // recomendacoes
  getRecomendacoesArtistas,
};

export default mobileAPI;
