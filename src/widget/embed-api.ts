export type EmbedRtdb = {
  streamUrl: string;
  authToken: string;
  expiresAt: string;
};

export type EmbedBootstrap = {
  token: string;
  expiresAt: string;
  avatarUrl: string | null;
  conversationStarters: string[];
};

export type EmbedHistoryImage = {
  url: string;
  key?: string;
  mimeType?: string;
  fileName?: string;
};

export type EmbedOutgoingImage = {
  url: string;
  key: string;
  mimeType: string;
  fileName: string;
};

export type EmbedHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
  images?: EmbedHistoryImage[];
  /**
   * Thời điểm tin được tạo. ISO 8601 hoặc epoch (giây hoặc millisecond).
   * Không có, hoặc không đọc được, thì widget dùng ngày hiện tại.
   */
  createdAt?: string | number;
};

export type EmbedSession = {
  agentName: string;
  firstMessage: string | null;
  sessionId: string | null;
  messages: EmbedHistoryMessage[];
  notification: EmbedRtdb | null;
};

type EmbedStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'token'; content: string }
  | { type: 'done'; sessionId: string; message: string }
  | { type: 'error'; message: string };

const ERROR_COPY: Record<string, string> = {
  ERR_INVALID_INPUT: 'Tin nhắn không hợp lệ.',
  ERR_EMBED_TOKEN_INVALID: 'Phiên chat không hợp lệ.',
  ERR_EMBED_TOKEN_EXPIRED: 'Phiên chat đã hết hạn.',
  ERR_EMBED_NOT_FOUND: 'Trang này chưa được phép mở chat.',
  ERR_EMBED_AGENT_REQUIRED: 'Kênh chat chưa được gán agent.',
  ERR_EMBED_RATE_LIMIT: 'Bạn gửi hơi nhanh. Thử lại sau một lát.',
  ERR_INTERNAL: 'Máy chủ gặp lỗi.',
  ERR_EMBED_RTDB_UNAVAILABLE: 'Không mở được kênh cập nhật.',
  ERR_EMBED_IMAGE_INVALID: 'Ảnh không thuộc phiên chat này.',
  ERR_UPLOAD_MIME: 'Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.',
  ERR_UPLOAD_SIZE: 'Ảnh lớn hơn 15 MB.',
  ERR_NOT_CONFIGURED: 'Chưa bật tải ảnh.',
  ERR_UPLOAD: 'Không tải được ảnh.',
};

export class EmbedRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'EmbedRequestError';
    this.code = code;
    this.status = status;
  }
}

/** Visitor theo publicKey và name. name rỗng được coi là "default". */
export function readVisitorId(publicKey: string, name: string): string {
  const key = `bnb-chat-visitor:${publicKey}:${name || 'default'}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing && isUuid(existing)) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function isEmbedTokenExpired(error: unknown): boolean {
  return error instanceof EmbedRequestError && error.code === 'ERR_EMBED_TOKEN_EXPIRED';
}

export function embedErrorText(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return '';
  if (error instanceof TypeError) {
    return 'Không gọi được máy chủ chat. Origin của trang này cần được phép trên kênh.';
  }
  if (error instanceof EmbedRequestError) {
    return ERROR_COPY[error.code] ?? error.message;
  }
  return 'Không kết nối được với trợ lý.';
}

export async function bootstrapEmbed(params: {
  publicKey: string;
  baseUrl: string;
  visitorId: string;
  signal?: AbortSignal;
}): Promise<EmbedBootstrap> {
  const response = await fetch(endpoint(params.baseUrl, '/api/embed/bootstrap'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: params.publicKey, visitorId: params.visitorId }),
    signal: params.signal,
  });
  if (!response.ok) throw await readError(response);
  return readBootstrap(await response.json());
}

export async function loadEmbedSession(
  token: string,
  visitorId: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<EmbedSession> {
  const url = new URL('/api/embed/session', baseUrl);
  url.searchParams.set('visitorId', visitorId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as EmbedSession;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const IMAGE_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function embedImageContentType(file: File): string | null {
  const raw = file.type.split(';')[0]?.trim().toLowerCase() ?? '';
  const normalized = raw === 'image/jpg' || raw === 'image/pjpeg' ? 'image/jpeg' : raw;
  if (IMAGE_TYPES.has(normalized)) return normalized;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXT[ext] ?? null;
}

export async function uploadEmbedImage(params: {
  baseUrl: string;
  token: string;
  visitorId: string;
  file: Blob;
  contentType: string;
  signal?: AbortSignal;
}): Promise<{ url: string; key: string }> {
  const response = await fetch(endpoint(params.baseUrl, '/api/embed/images'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: params.token,
      visitorId: params.visitorId,
      contentType: params.contentType,
      contentLength: params.file.size,
    }),
    signal: params.signal,
  });
  if (!response.ok) throw await readError(response);
  const ticket = (await response.json()) as {
    uploadUrl?: unknown;
    key?: unknown;
    publicUrl?: unknown;
  };
  if (
    typeof ticket.uploadUrl !== 'string' ||
    typeof ticket.key !== 'string' ||
    typeof ticket.publicUrl !== 'string'
  ) {
    throw new EmbedRequestError('ERR_INTERNAL', 'Upload response was incomplete.', response.status);
  }

  let uploaded: Response;
  try {
    uploaded = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': params.contentType },
      body: params.file,
      signal: params.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new EmbedRequestError('ERR_UPLOAD', 'Không tải được ảnh.', 0);
  }
  if (!uploaded.ok) {
    throw new EmbedRequestError('ERR_UPLOAD', 'Không tải được ảnh.', uploaded.status);
  }
  return { url: ticket.publicUrl, key: ticket.key };
}

export type ClearEmbedMessagesResult = {
  cleared: true;
  sessionId: string | null;
};

export async function clearEmbedMessages(params: {
  baseUrl: string;
  token: string;
  visitorId: string;
  signal?: AbortSignal;
}): Promise<ClearEmbedMessagesResult> {
  const response = await fetch(endpoint(params.baseUrl, '/api/embed/messages/clear'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: params.token, visitorId: params.visitorId }),
    signal: params.signal,
  });
  if (!response.ok) throw await readError(response);
  const body = (await response.json()) as { sessionId?: unknown };
  return {
    cleared: true,
    sessionId: typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null,
  };
}

export async function streamEmbedMessage(params: {
  baseUrl: string;
  token: string;
  visitorId: string;
  message: string;
  images?: EmbedOutgoingImage[];
  signal?: AbortSignal;
  onToken: (content: string) => void;
  onSession?: (sessionId: string) => void;
}): Promise<string> {
  const response = await fetch(endpoint(params.baseUrl, '/api/embed/messages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: params.token,
      visitorId: params.visitorId,
      message: params.message,
      ...(params.images && params.images.length > 0 ? { images: params.images } : {}),
    }),
    signal: params.signal,
  });
  if (!response.ok) throw await readError(response);
  if (!response.body) {
    throw new EmbedRequestError('ERR_INTERNAL', 'Empty response.', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalMessage = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as EmbedStreamEvent;
      if (event.type === 'session' && event.sessionId) params.onSession?.(event.sessionId);
      if (event.type === 'token') params.onToken(event.content);
      if (event.type === 'error') {
        throw new EmbedRequestError('ERR_STREAM', event.message, 200);
      }
      if (event.type === 'done') finalMessage = event.message;
    }
  }

  if (!finalMessage) {
    throw new EmbedRequestError('ERR_STREAM', 'The reply ended early.', 200);
  }
  return finalMessage;
}

export function openNotificationStream(
  notification: EmbedRtdb,
  handlers: {
    onMessage: (message: string) => void;
    onPayload?: (payload: Record<string, unknown>) => void;
    onAuthRevoked: () => void;
  },
): EventSource {
  const source = openAuthedStream(notification);
  let sawSnapshot = false;
  let appliedAt = 0;

  source.addEventListener('put', (event) => {
    const record = readNotificationPut((event as MessageEvent<string>).data);
    if (!record) return;
    if (!sawSnapshot) {
      sawSnapshot = true;
      appliedAt = record.updatedAt;
      if (record.payload) handlers.onPayload?.(record.payload);
      return;
    }
    if (record.updatedAt <= appliedAt) return;
    appliedAt = record.updatedAt;
    if (record.payload) handlers.onPayload?.(record.payload);
    if (!record.message) return;
    handlers.onMessage(record.message);
  });
  source.addEventListener('auth_revoked', () => {
    handlers.onAuthRevoked();
  });

  return source;
}

function openAuthedStream(stream: EmbedRtdb): EventSource {
  const url = new URL(stream.streamUrl);
  url.searchParams.set('auth', stream.authToken);
  return new EventSource(url.toString());
}

function readNotificationPut(raw: string): {
  updatedAt: number;
  message: string | null;
  payload: Record<string, unknown> | null;
} | null {
  try {
    const body = JSON.parse(raw) as {
      path?: unknown;
      data?: {
        updatedAt?: unknown;
        payload?: unknown;
      } | null;
    };
    if (body.path !== '/') return null;
    const rawPayload = body.data?.payload;
    const payload = isPlainObject(rawPayload) ? rawPayload : null;
    const text = payload?.message;
    const message = payload?.role === 'assistant' && typeof text === 'string' ? text.trim() : '';
    return {
      updatedAt: typeof body.data?.updatedAt === 'number' ? body.data.updatedAt : 0,
      message: message || null,
      payload,
    };
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const STARTER_MAX_COUNT = 6;
const STARTER_MAX_LENGTH = 120;

function readBootstrap(value: unknown): EmbedBootstrap {
  const body = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  if (typeof body.token !== 'string' || !body.token || typeof body.expiresAt !== 'string') {
    throw new EmbedRequestError('ERR_INTERNAL', 'Bootstrap response was incomplete.', 200);
  }
  const avatar = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
  return {
    token: body.token,
    expiresAt: body.expiresAt,
    avatarUrl: avatar || null,
    conversationStarters: readConversationStarters(body.conversationStarters),
  };
}

function readConversationStarters(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const starters: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim().slice(0, STARTER_MAX_LENGTH);
    if (!text) continue;
    starters.push(text);
    if (starters.length >= STARTER_MAX_COUNT) break;
  }
  return starters;
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

async function readError(response: Response): Promise<EmbedRequestError> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
  } | null;
  const code = typeof body?.error === 'string' ? body.error : 'ERR_INTERNAL';
  const message = typeof body?.message === 'string' ? body.message : 'Something went wrong.';
  return new EmbedRequestError(code, message, response.status);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
