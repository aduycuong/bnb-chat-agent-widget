import {
  EMBED_IMAGE_ACCEPT,
  EMBED_IMAGE_MAX_BYTES,
  EMBED_IMAGE_MAX_COUNT,
  EMBED_MESSAGE_MAX_LENGTH,
} from './config';
import {
  bootstrapEmbed,
  embedErrorText,
  embedImageContentType,
  isEmbedTokenExpired,
  loadEmbedSession,
  openNotificationStream,
  readVisitorId,
  streamEmbedMessage,
  uploadEmbedImage,
  type EmbedHistoryImage,
  type EmbedOutgoingImage,
  type EmbedRtdb,
  type EmbedSession,
} from './embed-api';
import { appendLinkedImage, renderAssistantContent, safeHttpUrl, splitMessageImages } from './assistant-text';
import { widgetCss } from './styles';
import type { BnbChatHandle, ResolvedOptions } from './types';

const HOST_TAG = 'bnb-chat-host';

function ensureHostDefined(): void {
  if (customElements.get(HOST_TAG)) return;
  customElements.define(
    HOST_TAG,
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
      }
    },
  );
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function svg(className: string, size: number, markup: string): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('aria-hidden', 'true');
  node.classList.add(className);
  node.innerHTML = markup;
  return node;
}

const chatIcon = () =>
  svg(
    'icon-chat',
    26,
    '<path fill="currentColor" d="M12 4c4.4 0 8 3.1 8 7s-3.6 7-8 7c-.7 0-1.4-.1-2-.3L6 19.2l.9-2.4C5.1 15.6 4 13.4 4 11c0-3.9 3.6-7 8-7Z"/>',
  );

const closeIcon = (className: string, size: number) =>
  svg(
    className,
    size,
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>',
  );

const sendIcon = () =>
  svg(
    'icon-send',
    18,
    '<path fill="currentColor" d="m4.5 11.2 14.2-6.1c.7-.3 1.4.4 1.1 1.1l-4.8 13.2c-.3.8-1.4.8-1.7 0l-2.2-5.3-5.6-2c-.8-.3-.9-1.4-.1-1.9Z"/>',
  );

const clipIcon = () =>
  svg(
    'icon-clip',
    18,
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  );

function clipFileName(name: string): string {
  const trimmed = name.trim() || 'image';
  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
}

function applyHostChrome(host: HTMLElement, options: ResolvedOptions): void {
  host.setAttribute('data-layout', options.layout);
  host.setAttribute('data-position', options.position);
  host.setAttribute('translate', 'no');
  host.style.colorScheme = 'light';
  host.style.overflow = 'visible';
  host.style.display = 'block';
  host.style.zIndex = String(options.zIndex);
  host.style.setProperty('--bnb-primary', options.primaryColor);
  host.style.setProperty('--bnb-on-primary', options.onPrimary);

  if (options.layout === 'inline') {
    host.style.position = 'relative';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.inset = 'auto';
    return;
  }

  host.style.position = 'fixed';
  host.style.top = 'auto';
  host.style.bottom = '20px';
  host.style.width = '56px';
  host.style.height = '56px';
  if (options.position === 'bottom-left') {
    host.style.left = '20px';
    host.style.right = 'auto';
  } else {
    host.style.right = '20px';
    host.style.left = 'auto';
  }
}

export function createWidget(options: ResolvedOptions): BnbChatHandle {
  ensureHostDefined();

  const host = document.createElement(HOST_TAG);
  const shadow = host.shadowRoot;
  if (!shadow) {
    throw new Error('BNB Chat: không tạo được shadow root.');
  }

  applyHostChrome(host, options);

  const style = el('style');
  style.textContent = widgetCss;

  const root = el('div', 'root');
  const panel = el('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');

  const header = el('header', 'header');
  const mark = el('div', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'B';
  const titles = el('div', 'titles');
  const title = el('div', 'title');
  title.id = 'bnb-title';
  title.textContent = options.title;
  const subtitle = el('div', 'subtitle');
  subtitle.textContent = options.subtitle;
  titles.append(title, subtitle);
  panel.setAttribute('aria-labelledby', title.id);

  const close = el('button', 'close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Đóng trò chuyện');
  close.append(closeIcon('icon-x', 18));
  header.append(mark, titles, close);

  const list = el('div', 'messages');
  list.setAttribute('role', 'log');
  list.setAttribute('aria-live', 'polite');
  list.setAttribute('aria-relevant', 'additions');

  const suggestions = el('div', 'suggestions');
  const form = el('form', 'composer');
  const attachments = el('div', 'attachments');
  attachments.hidden = true;
  attachments.setAttribute('role', 'list');
  attachments.setAttribute('aria-label', 'Ảnh đính kèm');
  const row = el('div', 'composer-row');
  const attach = el('button', 'attach');
  attach.type = 'button';
  attach.setAttribute('aria-label', 'Đính kèm ảnh');
  attach.append(clipIcon());
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.className = 'sr-only';
  fileInput.accept = EMBED_IMAGE_ACCEPT;
  fileInput.multiple = true;
  fileInput.tabIndex = -1;
  fileInput.setAttribute('aria-hidden', 'true');
  const label = el('label', 'sr-only');
  label.textContent = 'Tin nhắn';
  label.htmlFor = 'bnb-input';
  const textarea = el('textarea');
  textarea.id = 'bnb-input';
  textarea.rows = 1;
  textarea.placeholder = options.placeholder;
  textarea.setAttribute('autocomplete', 'off');
  const send = el('button', 'send');
  send.type = 'submit';
  send.disabled = true;
  send.setAttribute('aria-label', 'Gửi');
  send.append(sendIcon());
  row.append(attach, fileInput, label, textarea, send);
  form.append(attachments, row);

  const launcher = el('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Mở trò chuyện');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.append(chatIcon(), closeIcon('icon-close', 26));

  panel.append(header, list, suggestions, form);
  root.append(panel, launcher);
  shadow.append(style, root);

  const visitorId = readVisitorId(options.layout);
  const abort = new AbortController();
  let notificationSource: EventSource | null = null;
  let notificationTimer: number | null = null;
  let notificationRefresh: Promise<void> | null = null;
  let sessionId: string | null = null;
  let token = '';
  let pending = 0;
  let hasUser = false;
  let ready = false;
  let sending = false;
  let reconnecting = false;
  let isOpen = options.layout === 'inline';
  let connectTask: Promise<boolean> | null = null;
  let tokenRefresh: Promise<boolean> | null = null;

  const typing = el('div', 'msg assistant');
  typing.setAttribute('role', 'status');
  typing.setAttribute('aria-label', 'Đang trả lời');
  const typingAvatar = el('div', 'avatar');
  typingAvatar.setAttribute('aria-hidden', 'true');
  typingAvatar.textContent = 'B';
  const typingBubble = el('div', 'bubble typing');
  typingBubble.append(el('span'), el('span'), el('span'));
  typing.append(typingAvatar, typingBubble);

  function scrollToEnd(): void {
    list.scrollTop = list.scrollHeight;
  }

  function syncSuggestions(): void {
    const visible = !hasUser && options.suggestions.length > 0;
    suggestions.hidden = !visible;
  }

  function syncTyping(): void {
    typing.remove();
    if (pending > 0) list.append(typing);
    scrollToEnd();
  }

  const assistantSource = new WeakMap<HTMLElement, string>();

  type MessageBody = {
    update(text: string): void;
    finish(text: string): void;
  };

  function appendImages(
    bubble: HTMLElement,
    images: EmbedHistoryImage[] | undefined,
    seen: Set<string>,
  ): void {
    for (const image of images ?? []) {
      const src = safeHttpUrl(image.url);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      appendLinkedImage(bubble, src, image.fileName?.trim() || '');
    }
  }

  function appendMessage(
    role: 'user' | 'assistant',
    text: string,
    extras?: { error?: boolean; images?: EmbedHistoryImage[]; live?: boolean },
  ): MessageBody {
    const row = el('div', `msg ${role}`);
    if (role === 'assistant') {
      const avatar = el('div', 'avatar');
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = 'B';
      row.append(avatar);
    }
    const parsed = role === 'user' ? splitMessageImages(text) : { text, images: [] as { src: string; alt: string }[] };
    const seen = new Set(parsed.images.map((image) => image.src));
    const bubble = el('div', extras?.error ? 'bubble error' : 'bubble');
    if (!parsed.text.trim() && (seen.size > 0 || (extras?.images?.length ?? 0) > 0)) bubble.classList.add('media');
    bubble.dir = 'auto';
    const who = el('span', 'sr-only');
    who.textContent = role === 'user' ? 'Bạn: ' : 'Trợ lý: ';

    if (role === 'assistant' && !extras?.error) {
      const rich = el('div', 'rich');
      bubble.append(who, rich);
      appendImages(bubble, extras?.images, seen);
      row.append(bubble);
      list.append(row);
      const showPlain = (next: string): void => {
        assistantSource.set(bubble, next);
        rich.classList.add('live');
        rich.replaceChildren(document.createTextNode(next));
      };
      const showRich = (next: string): void => {
        assistantSource.set(bubble, next);
        rich.classList.remove('live');
        rich.replaceChildren();
        renderAssistantContent(rich, next);
      };
      if (extras?.live) showPlain(text);
      else showRich(text);
      syncTyping();
      return { update: showPlain, finish: showRich };
    }

    const textNode = document.createTextNode(parsed.text);
    bubble.append(who, textNode);
    for (const image of parsed.images) appendLinkedImage(bubble, image.src, image.alt);
    appendImages(bubble, extras?.images, seen);
    row.append(bubble);
    list.append(row);
    if (role === 'user') hasUser = true;
    syncTyping();
    return {
      update(next) {
        textNode.textContent = next;
      },
      finish(next) {
        textNode.textContent = next;
      },
    };
  }

  function lastAssistantText(): string {
    const bubbles = list.querySelectorAll('.msg.assistant .bubble:not(.error):not(.typing)');
    const last = bubbles[bubbles.length - 1];
    if (!(last instanceof HTMLElement)) return '';
    return assistantSource.get(last) ?? '';
  }

  function showError(error: unknown): void {
    const text = embedErrorText(error);
    if (!text) return;
    appendMessage('assistant', text, { error: true });
  }

  function syncSend(): void {
    const hasText = textarea.value.trim().length > 0;
    const hasDraft = drafts.length > 0;
    const hasError = drafts.some((item) => item.state === 'error');
    send.disabled = !ready || sending || hasError || (!hasText && !hasDraft);
    textarea.disabled = !ready || sending;
    attach.disabled = !ready || sending || drafts.length >= EMBED_IMAGE_MAX_COUNT;
    fileInput.disabled = attach.disabled;
  }

  function focusInput(): void {
    if (options.layout === 'launcher' && !isOpen) return;
    textarea.focus();
  }

  function clearNotificationTimer(): void {
    if (notificationTimer === null) return;
    window.clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  function bindNotification(notification: EmbedRtdb | null): void {
    notificationSource?.close();
    notificationSource = null;
    clearNotificationTimer();
    if (!notification || abort.signal.aborted) return;
    notificationSource = openNotificationStream(notification, {
      onMessage(message) {
        if (abort.signal.aborted) return;
        if (lastAssistantText() === message) return;
        appendMessage('assistant', message);
        syncSuggestions();
      },
      onAuthRevoked() {
        void refreshNotification(true);
      },
    });
    const expires = Date.parse(notification.expiresAt);
    if (!Number.isFinite(expires)) return;
    const delay = Math.max(15_000, expires - Date.now() - 30_000);
    notificationTimer = window.setTimeout(() => {
      notificationTimer = null;
      void refreshNotification(false);
    }, delay);
  }

  function adoptSession(nextSessionId: string): void {
    if (!nextSessionId || nextSessionId === sessionId) return;
    sessionId = nextSessionId;
    void refreshNotification(false);
  }

  async function refreshNotification(reportError: boolean): Promise<void> {
    if (abort.signal.aborted || !token) return;
    if (notificationRefresh) return notificationRefresh;
    notificationRefresh = reloadNotification(reportError).finally(() => {
      notificationRefresh = null;
    });
    return notificationRefresh;
  }

  async function reloadNotification(reportError: boolean): Promise<void> {
    try {
      const session = await loadNotificationSession();
      if (abort.signal.aborted) return;
      if (session.sessionId) sessionId = session.sessionId;
      bindNotification(session.notification ?? null);
    } catch (error) {
      if (reportError && !abort.signal.aborted) showError(error);
    }
  }

  async function loadNotificationSession(): Promise<EmbedSession> {
    try {
      return await loadEmbedSession(token, visitorId, abort.signal);
    } catch (error) {
      if (!isEmbedTokenExpired(error) || abort.signal.aborted) throw error;
      const refreshed = await refreshSession(false);
      if (!refreshed || abort.signal.aborted) throw error;
      return loadEmbedSession(token, visitorId, abort.signal);
    }
  }

  async function refreshSession(reportError: boolean): Promise<boolean> {
    if (reconnecting || abort.signal.aborted) return false;
    reconnecting = true;
    try {
      const boot = await bootstrapEmbed(visitorId, abort.signal);
      if (abort.signal.aborted) return false;
      token = boot.token;
      return true;
    } catch (error) {
      if (reportError && !abort.signal.aborted) showError(error);
      return false;
    } finally {
      reconnecting = false;
    }
  }

  async function connect(): Promise<boolean> {
    if (ready && token) return true;
    if (!connectTask) connectTask = openSession().finally(() => {
      connectTask = null;
    });
    return connectTask;
  }

  async function openSession(): Promise<boolean> {
    subtitle.textContent = 'Đang kết nối...';
    syncSend();
    try {
      let boot = await bootstrapEmbed(visitorId, abort.signal);
      token = boot.token;
      let session;
      try {
        session = await loadEmbedSession(token, visitorId, abort.signal);
      } catch (error) {
        if (!isEmbedTokenExpired(error)) throw error;
        boot = await bootstrapEmbed(visitorId, abort.signal);
        token = boot.token;
        session = await loadEmbedSession(token, visitorId, abort.signal);
      }
      if (abort.signal.aborted) return false;
      list.querySelectorAll('.bubble.error').forEach((bubble) => {
        bubble.closest('.msg')?.remove();
      });
      if (!options.titleFromUser && session.agentName.trim()) {
        title.textContent = session.agentName.trim();
      }
      if (session.messages.length > 0) {
        for (const message of session.messages) {
          appendMessage(message.role, message.content, { images: message.images });
        }
      } else if (session.firstMessage?.trim()) {
        appendMessage('assistant', session.firstMessage.trim());
      }
      sessionId = session.sessionId;
      bindNotification(session.notification ?? null);
      syncSuggestions();
      ready = true;
      subtitle.textContent = options.subtitle;
      return true;
    } catch (error) {
      if (!abort.signal.aborted) {
        subtitle.textContent = 'Chưa kết nối';
        showError(error);
      }
      return false;
    } finally {
      syncSend();
    }
  }

  type DraftImage = {
    file: File;
    name: string;
    previewUrl: string;
    contentType: string;
    state: 'uploading' | 'ready' | 'error';
    url?: string;
    key?: string;
    error?: string;
    removed: boolean;
    controller: AbortController;
    done: Promise<void>;
    resolve: () => void;
    node: HTMLElement;
    status: HTMLElement;
  };

  const drafts: DraftImage[] = [];

  function paintDraft(item: DraftImage): void {
    item.node.dataset.state = item.state;
    if (item.state === 'error') {
      item.status.hidden = false;
      item.status.textContent = item.error || 'Không tải được';
      return;
    }
    if (item.state === 'uploading') {
      item.status.hidden = false;
      item.status.textContent = 'Đang tải';
      return;
    }
    item.status.hidden = true;
    item.status.textContent = '';
  }

  function removeDraft(item: DraftImage): void {
    if (sending || item.removed) return;
    item.removed = true;
    item.controller.abort();
    item.resolve();
    URL.revokeObjectURL(item.previewUrl);
    item.node.remove();
    const index = drafts.indexOf(item);
    if (index >= 0) drafts.splice(index, 1);
    attachments.hidden = drafts.length === 0;
    syncSend();
  }

  function clearDrafts(): void {
    for (const item of drafts) URL.revokeObjectURL(item.previewUrl);
    drafts.splice(0, drafts.length);
    attachments.replaceChildren();
    attachments.hidden = true;
  }

  function dropDrafts(): void {
    for (const item of drafts) {
      item.removed = true;
      item.controller.abort();
      item.resolve();
      URL.revokeObjectURL(item.previewUrl);
    }
    drafts.splice(0, drafts.length);
  }

  async function ensureFreshToken(): Promise<boolean> {
    if (!tokenRefresh) {
      tokenRefresh = refreshSession(false).finally(() => {
        tokenRefresh = null;
      });
    }
    return tokenRefresh;
  }

  async function uploadDraft(item: DraftImage): Promise<void> {
    const run = () =>
      uploadEmbedImage({
        token,
        visitorId,
        file: item.file,
        contentType: item.contentType,
        signal: item.controller.signal,
      });
    try {
      let uploaded: { url: string; key: string };
      try {
        uploaded = await run();
      } catch (error) {
        if (item.removed || item.controller.signal.aborted) return;
        if (!isEmbedTokenExpired(error)) throw error;
        const refreshed = await ensureFreshToken();
        if (!refreshed || item.removed || item.controller.signal.aborted) throw error;
        uploaded = await run();
      }
      if (item.removed) return;
      item.url = uploaded.url;
      item.key = uploaded.key;
      item.state = 'ready';
    } catch (error) {
      if (item.removed || item.controller.signal.aborted) return;
      item.state = 'error';
      item.error = embedErrorText(error) || 'Không tải được ảnh.';
    } finally {
      item.resolve();
      if (!item.removed) {
        paintDraft(item);
        syncSend();
      }
    }
  }

  function addDraft(file: File, contentType: string): void {
    let resolve: () => void = () => {};
    const done = new Promise<void>((doneResolve) => {
      resolve = doneResolve;
    });
    const item: DraftImage = {
      file,
      name: clipFileName(file.name),
      previewUrl: URL.createObjectURL(file),
      contentType,
      state: 'uploading',
      removed: false,
      controller: new AbortController(),
      done,
      resolve,
      node: el('div', 'attachment'),
      status: el('span', 'attachment-status'),
    };
    item.node.setAttribute('role', 'listitem');
    const picture = el('img');
    picture.src = item.previewUrl;
    picture.alt = '';
    const meta = el('span', 'attachment-meta');
    const name = el('span', 'attachment-name');
    name.textContent = item.name;
    name.title = item.name;
    meta.append(name, item.status);
    const remove = el('button', 'attachment-remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Bỏ ${item.name}`);
    remove.append(closeIcon('icon-x', 14));
    remove.addEventListener('click', () => removeDraft(item));
    item.node.append(picture, meta, remove);
    attachments.hidden = false;
    attachments.append(item.node);
    drafts.push(item);
    paintDraft(item);
    void uploadDraft(item);
  }

  function addFiles(files: File[]): void {
    const errors: string[] = [];
    for (const file of files) {
      if (drafts.length >= EMBED_IMAGE_MAX_COUNT) {
        errors.push(`Gửi tối đa ${EMBED_IMAGE_MAX_COUNT} ảnh mỗi lượt.`);
        break;
      }
      const contentType = embedImageContentType(file);
      if (!contentType) {
        errors.push('Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.');
        continue;
      }
      if (file.size <= 0) {
        errors.push('Ảnh trống.');
        continue;
      }
      if (file.size > EMBED_IMAGE_MAX_BYTES) {
        errors.push('Mỗi ảnh tối đa 15 MB.');
        continue;
      }
      addDraft(file, contentType);
    }
    for (const message of new Set(errors)) {
      appendMessage('assistant', message, { error: true });
    }
    syncSend();
  }

  async function deliver(text: string, images: EmbedOutgoingImage[]): Promise<void> {
    const draft = { text: '', body: null as MessageBody | null };
    const finalMessage = await streamEmbedMessage({
      token,
      visitorId,
      message: text,
      images,
      signal: abort.signal,
      onSession: adoptSession,
      onToken(chunk) {
        draft.text += chunk;
        if (!draft.body) {
          pending = 0;
          draft.body = appendMessage('assistant', draft.text, { live: true });
          return;
        }
        draft.body.update(draft.text);
        scrollToEnd();
      },
    });
    pending = 0;
    if (!draft.body) {
      appendMessage('assistant', finalMessage);
      return;
    }
    draft.body.finish(finalMessage);
    scrollToEnd();
  }

  function resizeInput(): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }

  async function postTurn(text: string, images: EmbedOutgoingImage[]): Promise<void> {
    hasUser = true;
    syncSuggestions();
    appendMessage('user', text, { images });
    pending = 1;
    syncTyping();
    focusInput();

    try {
      try {
        await deliver(text, images);
      } catch (error) {
        if (!isEmbedTokenExpired(error) || abort.signal.aborted) throw error;
        const refreshed = await refreshSession(false);
        if (!refreshed) throw error;
        await deliver(text, images);
      }
    } catch (error) {
      showError(error);
    } finally {
      pending = 0;
      syncTyping();
    }
  }

  async function sendText(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text || sending) return;
    if (text.length > EMBED_MESSAGE_MAX_LENGTH) {
      appendMessage('assistant', `Tin nhắn dài quá ${EMBED_MESSAGE_MAX_LENGTH} ký tự.`, {
        error: true,
      });
      return;
    }

    const connected = await connect();
    if (!connected || sending || abort.signal.aborted) return;

    sending = true;
    textarea.value = '';
    resizeInput();
    syncSend();
    try {
      await postTurn(text, []);
    } finally {
      sending = false;
      syncSend();
    }
  }

  async function sendComposer(): Promise<void> {
    const text = textarea.value.trim();
    if (sending) return;
    if (!text && drafts.length === 0) return;
    if (text.length > EMBED_MESSAGE_MAX_LENGTH) {
      appendMessage('assistant', `Tin nhắn dài quá ${EMBED_MESSAGE_MAX_LENGTH} ký tự.`, {
        error: true,
      });
      return;
    }
    if (drafts.some((item) => item.state === 'error')) return;

    const connected = await connect();
    if (!connected || sending || abort.signal.aborted) return;

    sending = true;
    const batch = drafts.slice();
    syncSend();

    try {
      await Promise.all(batch.map((item) => item.done));
      if (abort.signal.aborted) return;
      const images: EmbedOutgoingImage[] = [];
      for (const item of batch) {
        if (item.state !== 'ready' || !item.url || !item.key) {
          appendMessage('assistant', 'Không tải được ảnh. Bỏ ảnh lỗi rồi gửi lại.', {
            error: true,
          });
          return;
        }
        images.push({
          url: item.url,
          key: item.key,
          mimeType: item.contentType,
          fileName: item.name,
        });
      }
      clearDrafts();
      textarea.value = '';
      resizeInput();
      await postTurn(text, images);
    } finally {
      pending = 0;
      sending = false;
      syncTyping();
      syncSend();
      focusInput();
    }
  }

  function setOpen(next: boolean, focus: boolean): void {
    if (options.layout !== 'launcher') return;
    isOpen = next;
    root.dataset.open = next ? 'true' : 'false';
    panel.inert = !next;
    panel.setAttribute('aria-hidden', next ? 'false' : 'true');
    launcher.setAttribute('aria-expanded', String(next));
    launcher.setAttribute('aria-label', next ? 'Đóng trò chuyện' : 'Mở trò chuyện');
    if (!focus) return;
    if (next) textarea.focus();
    else launcher.focus();
  }

  for (const suggestion of options.suggestions) {
    const chip = el('button');
    chip.type = 'button';
    chip.textContent = suggestion;
    chip.addEventListener('click', () => {
      if (options.layout === 'launcher' && !isOpen) setOpen(true, false);
      sendText(suggestion);
      textarea.focus();
    });
    suggestions.append(chip);
  }

  syncSuggestions();
  syncSend();
  void connect();

  if (options.layout === 'inline') {
    root.dataset.open = 'true';
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
  } else {
    setOpen(false, false);
  }

  launcher.addEventListener('click', () => setOpen(!isOpen, true));
  close.addEventListener('click', () => setOpen(false, true));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false, true);
  });
  textarea.addEventListener('input', () => {
    resizeInput();
    syncSend();
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  attach.addEventListener('click', () => {
    if (attach.disabled) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files ?? []));
    fileInput.value = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void sendComposer();
  });

  options.parent.append(host);

  return {
    open() {
      setOpen(true, true);
    },
    close() {
      setOpen(false, true);
    },
    destroy() {
      abort.abort();
      dropDrafts();
      notificationSource?.close();
      notificationSource = null;
      clearNotificationTimer();
      host.remove();
    },
  };
}
