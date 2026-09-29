import {
  EMBED_IMAGE_ACCEPT,
  EMBED_IMAGE_MAX_BYTES,
  EMBED_IMAGE_MAX_COUNT,
  EMBED_MESSAGE_MAX_LENGTH,
} from './config';
import {
  bootstrapEmbed,
  clearEmbedMessages,
  embedErrorText,
  embedImageContentType,
  isEmbedTokenExpired,
  loadEmbedSession,
  openNotificationStream,
  readVisitorId,
  streamEmbedMessage,
  uploadEmbedImage,
  type EmbedHistoryImage,
  type EmbedHistoryMessage,
  type EmbedOutgoingImage,
  type EmbedBootstrap,
  type EmbedRtdb,
  type EmbedSession,
} from './embed-api';
import { appendLinkedImage, renderAssistantContent, safeHttpUrl, splitMessageImages } from './assistant-text';
import { ICON_PATHS, type IconName } from './icons';
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
  node.setAttribute('fill', 'none');
  node.setAttribute('aria-hidden', 'true');
  node.classList.add(className);
  node.innerHTML = markup;
  return node;
}

function iconNode(markup: string, className: string, size: number): SVGSVGElement {
  const trimmed = markup.trim();
  if (trimmed.startsWith('<svg')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = trimmed;
    const found = wrap.querySelector('svg');
    if (found) {
      found.setAttribute('width', String(size));
      found.setAttribute('height', String(size));
      found.setAttribute('aria-hidden', 'true');
      found.classList.add(className);
      return found;
    }
  }
  return svg(className, size, trimmed);
}

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
  for (const [name, value] of Object.entries(options.themeVars)) {
    host.style.setProperty(name, value);
  }

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

  function icon(name: IconName, className: string, size: number): SVGSVGElement {
    return iconNode(options.icons[name] ?? ICON_PATHS[name], className, size);
  }

  const header = el('header', 'header');
  const markWrap = el('div', 'mark-wrap');
  const mark = el('div', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'B';
  const online = el('span', 'online');
  online.dataset.state = 'busy';
  online.setAttribute('aria-hidden', 'true');
  markWrap.append(mark, online);
  const titles = el('div', 'titles');
  const title = el('div', 'title');
  title.id = 'bnb-title';
  title.textContent = options.title;
  const subtitle = el('div', 'subtitle');
  subtitle.textContent = options.subtitle;
  titles.append(title, subtitle);
  panel.setAttribute('aria-labelledby', title.id);

  const menu = el('div', 'menu');
  const menuToggle = el('button', 'menu-toggle');
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-label', 'Tùy chọn');
  menuToggle.setAttribute('aria-haspopup', 'menu');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-controls', 'bnb-menu');
  menuToggle.append(icon('menu', 'icon-menu', 20));
  const menuPanel = el('div', 'menu-panel');
  menuPanel.id = 'bnb-menu';
  menuPanel.setAttribute('role', 'menu');
  menuPanel.inert = true;
  const menuClose = el('button', 'menu-item');
  menuClose.type = 'button';
  menuClose.dataset.action = 'close';
  menuClose.setAttribute('role', 'menuitem');
  menuClose.append(icon('close', 'icon-x', 16), document.createTextNode('Đóng'));
  const menuNew = el('button', 'menu-item');
  menuNew.type = 'button';
  menuNew.dataset.action = 'new-session';
  menuNew.setAttribute('role', 'menuitem');
  menuNew.append(icon('clearChat', 'icon-clear', 16), document.createTextNode('Xóa chat'));
  menuPanel.append(menuClose, menuNew);
  menu.append(menuToggle, menuPanel);
  const headerClose = el('button', 'header-close');
  headerClose.type = 'button';
  headerClose.setAttribute('aria-label', 'Đóng trò chuyện');
  headerClose.append(icon('close', 'icon-x', 18));
  header.append(markWrap, titles, headerClose, menu);

  const thread = el('div', 'thread');
  const list = el('div', 'messages');
  list.setAttribute('role', 'log');
  list.setAttribute('aria-live', 'polite');
  list.setAttribute('aria-relevant', 'additions');
  const feed = el('div', 'messages-inner');
  list.append(feed);
  const scrollEnd = el('button', 'scroll-end');
  scrollEnd.type = 'button';
  scrollEnd.setAttribute('aria-label', 'Xuống cuối');
  scrollEnd.setAttribute('aria-hidden', 'true');
  scrollEnd.tabIndex = -1;
  scrollEnd.append(icon('scrollDown', 'icon-down', 18));
  thread.append(list, scrollEnd);

  const suggestions = el('div', 'suggestions');
  const form = el('form', 'composer');
  const attachments = el('div', 'attachments');
  attachments.hidden = true;
  attachments.setAttribute('role', 'list');
  attachments.setAttribute('aria-label', 'Ảnh đính kèm');
  const field = el('div', 'composer-field');
  const attach = el('button', 'attach');
  attach.type = 'button';
  attach.setAttribute('aria-label', 'Đính kèm ảnh');
  attach.append(icon('image', 'icon-image', 20));
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
  send.append(icon('send', 'icon-send', 16));
  field.append(attach, textarea, send);
  form.append(attachments, field, fileInput, label);

  const launcher = el('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Mở trò chuyện');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.append(icon('launcher', 'icon-chat', 26), icon('close', 'icon-close', 26));

  panel.append(header, thread, suggestions, form);
  root.append(panel, launcher);
  shadow.append(style, root);

  const visitorId = readVisitorId(options.publicKey);
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
  let restarting = false;
  let reconnecting = false;
  let isOpen = options.layout === 'inline';
  let connectTask: Promise<boolean> | null = null;
  let tokenRefresh: Promise<boolean> | null = null;

  const typing = el('div', 'msg assistant typing-row');
  typing.setAttribute('role', 'status');
  typing.setAttribute('aria-label', 'Đang trả lời');
  const typingAvatar = el('div', 'avatar');
  typingAvatar.setAttribute('aria-hidden', 'true');

  const AVATAR_MARK = 'B';
  let avatarSrc: string | null = null;
  let starterItems = options.suggestions;

  function repaintAvatars(): void {
    paintAvatar(mark);
    paintAvatar(typingAvatar);
    list.querySelectorAll('.avatar').forEach((node) => {
      if (node instanceof HTMLElement) paintAvatar(node);
    });
  }

  function paintAvatar(node: HTMLElement): void {
    node.replaceChildren();
    const src = avatarSrc;
    if (!src) {
      node.classList.remove('photo');
      node.textContent = AVATAR_MARK;
      return;
    }
    const image = el('img');
    image.alt = '';
    image.draggable = false;
    image.addEventListener('error', () => {
      if (!node.contains(image) || avatarSrc !== src) return;
      avatarSrc = null;
      repaintAvatars();
    });
    node.classList.add('photo');
    node.append(image);
    image.src = src;
  }

  function setAvatarUrl(url: string | null): void {
    avatarSrc = url ? safeHttpUrl(url) : null;
    repaintAvatars();
  }

  paintAvatar(mark);
  paintAvatar(typingAvatar);
  const typingBubble = el('div', 'bubble typing');
  typingBubble.append(el('span'), el('span'), el('span'));
  typing.append(typingAvatar, typingBubble);

  const STICK_GAP = 72;
  let stickToBottom = true;
  let scrollingByCode = false;
  let menuOpen = false;
  let lastDayKey = '';

  function distanceFromBottom(): number {
    return list.scrollHeight - list.scrollTop - list.clientHeight;
  }

  function syncScrollButton(): void {
    const show = distanceFromBottom() > STICK_GAP;
    scrollEnd.dataset.show = show ? 'true' : 'false';
    scrollEnd.setAttribute('aria-hidden', show ? 'false' : 'true');
    scrollEnd.tabIndex = show ? 0 : -1;
  }

  function jumpToBottom(): void {
    scrollingByCode = true;
    list.scrollTop = list.scrollHeight;
    scrollingByCode = false;
    syncScrollButton();
  }

  function scrollToEnd(): void {
    if (!stickToBottom) {
      syncScrollButton();
      return;
    }
    jumpToBottom();
  }

  function setPresence(state: 'online' | 'busy' | 'offline'): void {
    online.dataset.state = state;
  }

  function onDocPointer(event: Event): void {
    if (event.composedPath().includes(menu)) return;
    setMenuOpen(false);
  }

  function setMenuOpen(next: boolean): void {
    if (menuOpen === next) return;
    menuOpen = next;
    menu.dataset.open = next ? 'true' : 'false';
    menuToggle.setAttribute('aria-expanded', String(next));
    menuPanel.inert = !next;
    if (next) {
      document.addEventListener('pointerdown', onDocPointer, true);
      const item = [...menuPanel.querySelectorAll<HTMLButtonElement>('.menu-item')].find(
        (entry) => entry.offsetParent !== null,
      );
      item?.focus();
      return;
    }
    document.removeEventListener('pointerdown', onDocPointer, true);
  }

  let scrollFrame = 0;
  const contentObserver = new ResizeObserver(() => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      if (stickToBottom) jumpToBottom();
      else syncScrollButton();
    });
  });
  contentObserver.observe(feed);

  function syncSuggestions(): void {
    const visible = !restarting && !hasUser && starterItems.length > 0;
    suggestions.hidden = !visible;
  }

  function syncTyping(): void {
    typing.remove();
    if (pending > 0) feed.append(typing);
    scrollToEnd();
  }

  const assistantSource = new WeakMap<HTMLElement, string>();

  type MessageBody = {
    update(text: string): void;
    finish(text: string): void;
  };

  function appendImages(
    parent: HTMLElement,
    images: EmbedHistoryImage[] | undefined,
    seen: Set<string>,
  ): void {
    for (const image of images ?? []) {
      const src = safeHttpUrl(image.url);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      appendLinkedImage(parent, src, image.fileName?.trim() || '', scrollToEnd);
    }
  }

  function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function dayLabel(date: Date): string {
    const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
  }

  function ensureDay(at: number): void {
    const date = new Date(at);
    const key = String(startOfDay(date));
    if (key === lastDayKey) return;
    lastDayKey = key;
    const chip = el('div', 'day');
    const label = el('span');
    label.textContent = dayLabel(date);
    chip.append(label);
    feed.append(chip);
  }

  function stamp(at: number): HTMLTimeElement {
    const node = document.createElement('time');
    node.className = 'stamp';
    const date = new Date(at);
    node.dateTime = date.toISOString();
    node.textContent = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    return node;
  }

  function appendMessage(
    role: 'user' | 'assistant',
    text: string,
    extras?: { error?: boolean; images?: EmbedHistoryImage[]; live?: boolean; at?: number },
  ): MessageBody {
    const at = extras?.at ?? Date.now();
    ensureDay(at);
    const row = el('div', `msg ${role}`);
    if (role === 'assistant') {
      const avatar = el('div', 'avatar');
      avatar.setAttribute('aria-hidden', 'true');
      paintAvatar(avatar);
      row.append(avatar);
      const name = title.textContent?.trim();
      if (name) {
        const nameNode = el('div', 'bubble-name');
        nameNode.textContent = name;
        row.dataset.name = name;
      }
    }
    const parsed = role === 'user' ? splitMessageImages(text) : { text, images: [] as { src: string; alt: string }[] };
    const seen = new Set(parsed.images.map((image) => image.src));
    const bubble = el('div', extras?.error ? 'bubble error' : 'bubble');
    const hasMedia = seen.size > 0 || (extras?.images?.length ?? 0) > 0;
    if (hasMedia) bubble.classList.add('has-media');
    bubble.dir = 'auto';
    const who = el('span', 'sr-only');
    who.textContent = role === 'user' ? 'Bạn: ' : 'Trợ lý: ';
    const main = el('div', 'bubble-main');
    const content = el('div', 'bubble-content');
    const time = stamp(at);
    content.append(who);

    function placeStamp(): void {
      if (content.querySelector(':scope > .media-frame')) {
        content.append(time);
        return;
      }
      const rich = content.querySelector(':scope > .rich');
      if (!rich) {
        content.append(time);
        return;
      }
      let last: Element | null = rich.lastElementChild;
      if (last && (last.tagName === 'UL' || last.tagName === 'OL')) last = last.lastElementChild;
      if (last instanceof HTMLParagraphElement || last instanceof HTMLLIElement) {
        last.append(time);
        return;
      }
      rich.append(time);
    }

    main.append(content);
    if (role === 'assistant' && row.dataset.name) {
      const nameNode = el('div', 'bubble-name');
      nameNode.textContent = row.dataset.name;
      bubble.append(nameNode);
    }
    bubble.append(main);

    if (role === 'assistant' && !extras?.error) {
      const rich = el('div', 'rich');
      content.append(rich);
      appendImages(content, extras?.images, seen);
      row.append(bubble);
      feed.append(row);
      const showPlain = (next: string): void => {
        assistantSource.set(bubble, next);
        rich.classList.add('live');
        rich.replaceChildren(document.createTextNode(next));
        placeStamp();
      };
      const showRich = (next: string): void => {
        assistantSource.set(bubble, next);
        rich.classList.remove('live');
        rich.replaceChildren();
        renderAssistantContent(rich, next);
        placeStamp();
      };
      if (extras?.live) showPlain(text);
      else showRich(text);
      syncTyping();
      return { update: showPlain, finish: showRich };
    }

    const textNode = document.createTextNode(parsed.text);
    content.append(textNode);
    for (const image of parsed.images) appendLinkedImage(content, image.src, image.alt, scrollToEnd);
    appendImages(content, extras?.images, seen);
    placeStamp();
    row.append(bubble);
    feed.append(row);
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
    const busy = sending || restarting;
    send.disabled = !ready || busy || hasError || (!hasText && !hasDraft);
    textarea.disabled = !ready || busy;
    attach.disabled = !ready || busy || drafts.length >= EMBED_IMAGE_MAX_COUNT;
    fileInput.disabled = attach.disabled;
    menuNew.disabled = !ready || busy;
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
      onPayload(payload) {
        if (abort.signal.aborted || !options.onNotification) return;
        try {
          options.onNotification(payload);
        } catch (error) {
          console.error(error);
        }
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
      return await loadEmbedSession(token, visitorId, options.baseUrl, abort.signal);
    } catch (error) {
      if (!isEmbedTokenExpired(error) || abort.signal.aborted) throw error;
      const refreshed = await refreshSession(false);
      if (!refreshed || abort.signal.aborted) throw error;
      return loadEmbedSession(token, visitorId, options.baseUrl, abort.signal);
    }
  }

  async function refreshSession(reportError: boolean): Promise<boolean> {
    if (reconnecting || abort.signal.aborted) return false;
    reconnecting = true;
    try {
      const boot = await bootstrapEmbed({
        publicKey: options.publicKey,
        baseUrl: options.baseUrl,
        visitorId,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return false;
      adoptBootstrap(boot, true);
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

  function messageTime(message: EmbedHistoryMessage): number {
    const value = message.createdAt;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value < 1e12 ? value * 1000 : value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  }

  let greeting = '';

  function renderHistory(session: EmbedSession): void {
    greeting = session.firstMessage?.trim() ?? '';
    pending = 0;
    hasUser = false;
    lastDayKey = '';
    stickToBottom = true;
    feed.replaceChildren();
    if (session.messages.length > 0) {
      for (const message of session.messages) {
        appendMessage(message.role, message.content, {
          images: message.images,
          at: messageTime(message),
        });
      }
    } else if (greeting) {
      appendMessage('assistant', greeting);
    }
    sessionId = session.sessionId;
    bindNotification(session.notification ?? null);
    syncSuggestions();
    syncTyping();
    jumpToBottom();
  }

  function clearThread(): void {
    pending = 0;
    hasUser = false;
    lastDayKey = '';
    stickToBottom = true;
    notificationSource?.close();
    notificationSource = null;
    clearNotificationTimer();
    feed.replaceChildren();
    syncSuggestions();
    syncTyping();
  }

  function discardComposer(): void {
    dropDrafts();
    attachments.replaceChildren();
    attachments.hidden = true;
    textarea.value = '';
    resizeInput();
  }

  async function clearMessages(): Promise<void> {
    try {
      await clearEmbedMessages({
        baseUrl: options.baseUrl,
        token,
        visitorId,
        signal: abort.signal,
      });
    } catch (error) {
      if (!isEmbedTokenExpired(error) || abort.signal.aborted) throw error;
      const refreshed = await ensureFreshToken();
      if (!refreshed || abort.signal.aborted) throw error;
      await clearEmbedMessages({
        baseUrl: options.baseUrl,
        token,
        visitorId,
        signal: abort.signal,
      });
    }
  }

  async function restartChat(): Promise<void> {
    if (restarting || sending || !ready || abort.signal.aborted) return;
    restarting = true;
    syncSend();
    syncSuggestions();
    try {
      await clearMessages();
      if (abort.signal.aborted) return;
      discardComposer();
      clearThread();
      const session = await loadNotificationSession();
      if (abort.signal.aborted) return;
      renderHistory(session);
      host.dispatchEvent(new CustomEvent('bnb-chat:new-session', { bubbles: true, composed: true }));
    } catch (error) {
      if (!abort.signal.aborted) showError(error);
    } finally {
      restarting = false;
      syncSend();
      syncSuggestions();
      focusInput();
    }
  }

  async function openSession(): Promise<boolean> {
    subtitle.textContent = 'Đang kết nối...';
    setPresence('busy');
    syncSend();
    try {
      let boot = await bootstrapEmbed({
        publicKey: options.publicKey,
        baseUrl: options.baseUrl,
        visitorId,
        signal: abort.signal,
      });
      adoptBootstrap(boot, false);
      let session;
      try {
        session = await loadEmbedSession(token, visitorId, options.baseUrl, abort.signal);
      } catch (error) {
        if (!isEmbedTokenExpired(error)) throw error;
        boot = await bootstrapEmbed({
          publicKey: options.publicKey,
          baseUrl: options.baseUrl,
          visitorId,
          signal: abort.signal,
        });
        adoptBootstrap(boot, false);
        session = await loadEmbedSession(token, visitorId, options.baseUrl, abort.signal);
      }
      if (abort.signal.aborted) return false;
      if (!options.titleFromUser && session.agentName.trim()) {
        title.textContent = session.agentName.trim();
      }
      renderHistory(session);
      if (!options.suggestionsFromUser) setStarters(boot.conversationStarters);
      else syncSuggestions();
      ready = true;
      subtitle.textContent = options.subtitle;
      setPresence('online');
      return true;
    } catch (error) {
      if (!abort.signal.aborted) {
        subtitle.textContent = 'Chưa kết nối';
        setPresence('offline');
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
        baseUrl: options.baseUrl,
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
    remove.append(icon('close', 'icon-x', 14));
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
      baseUrl: options.baseUrl,
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
    const next = Math.min(textarea.scrollHeight, 96);
    textarea.style.height = `${next}px`;
    field.classList.toggle('multiline', next > 44);
  }

  async function postTurn(text: string, images: EmbedOutgoingImage[]): Promise<void> {
    stickToBottom = true;
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
    if (!text || sending || restarting) return;
    if (text.length > EMBED_MESSAGE_MAX_LENGTH) {
      appendMessage('assistant', `Tin nhắn dài quá ${EMBED_MESSAGE_MAX_LENGTH} ký tự.`, {
        error: true,
      });
      return;
    }

    const connected = await connect();
    if (!connected || sending || restarting || abort.signal.aborted) return;

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
    if (sending || restarting) return;
    if (!text && drafts.length === 0) return;
    if (text.length > EMBED_MESSAGE_MAX_LENGTH) {
      appendMessage('assistant', `Tin nhắn dài quá ${EMBED_MESSAGE_MAX_LENGTH} ký tự.`, {
        error: true,
      });
      return;
    }
    if (drafts.some((item) => item.state === 'error')) return;

    const connected = await connect();
    if (!connected || sending || restarting || abort.signal.aborted) return;

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

  const compactQuery = window.matchMedia(
    '(max-width: 640px), (max-height: 480px) and (pointer: coarse)',
  );
  let scrollLock: {
    htmlOverflow: string;
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyLeft: string;
    bodyRight: string;
    bodyWidth: string;
    scrollY: number;
  } | null = null;

  function isCompactPopup(): boolean {
    return options.layout === 'launcher' && compactQuery.matches;
  }

  function setPageScrollLocked(locked: boolean): void {
    if (locked) {
      if (scrollLock) return;
      const scrollY = window.scrollY;
      scrollLock = {
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyLeft: document.body.style.left,
        bodyRight: document.body.style.right,
        bodyWidth: document.body.style.width,
        scrollY,
      };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      return;
    }
    if (!scrollLock) return;
    const saved = scrollLock;
    scrollLock = null;
    document.documentElement.style.overflow = saved.htmlOverflow;
    document.body.style.overflow = saved.bodyOverflow;
    document.body.style.position = saved.bodyPosition;
    document.body.style.top = saved.bodyTop;
    document.body.style.left = saved.bodyLeft;
    document.body.style.right = saved.bodyRight;
    document.body.style.width = saved.bodyWidth;
    window.scrollTo(0, saved.scrollY);
  }

  function syncCompactFrame(): void {
    const active = isCompactPopup() && isOpen;
    panel.setAttribute('aria-modal', active ? 'true' : 'false');
    const viewport = window.visualViewport;
    if (!active || !viewport) {
      panel.style.removeProperty('--bnb-vv-top');
      panel.style.removeProperty('--bnb-vv-height');
    } else {
      panel.style.setProperty('--bnb-vv-top', `${viewport.offsetTop}px`);
      panel.style.setProperty('--bnb-vv-height', `${viewport.height}px`);
    }
    setPageScrollLocked(active);
  }

  function setOpen(next: boolean, focus: boolean): void {
    if (options.layout !== 'launcher') return;
    if (!next) setMenuOpen(false);
    isOpen = next;
    root.dataset.open = next ? 'true' : 'false';
    panel.inert = !next;
    panel.setAttribute('aria-hidden', next ? 'false' : 'true');
    launcher.setAttribute('aria-expanded', String(next));
    launcher.setAttribute('aria-label', next ? 'Đóng trò chuyện' : 'Mở trò chuyện');
    syncCompactFrame();
    if (next) {
      stickToBottom = true;
      requestAnimationFrame(() => jumpToBottom());
    }
    if (!focus) return;
    if (next) textarea.focus();
    else launcher.focus();
  }

  function adoptBootstrap(boot: EmbedBootstrap, paintStarters: boolean): void {
    token = boot.token;
    setAvatarUrl(boot.avatarUrl);
    if (paintStarters && !options.suggestionsFromUser) setStarters(boot.conversationStarters);
  }

  function setStarters(items: string[]): void {
    starterItems = items;
    suggestions.replaceChildren();
    for (const suggestion of items) {
      const chip = el('button');
      chip.type = 'button';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        if (options.layout === 'launcher' && !isOpen) setOpen(true, false);
        void sendText(suggestion);
        textarea.focus();
      });
      suggestions.append(chip);
    }
    syncSuggestions();
  }

  setStarters(options.suggestions);
  syncSend();
  void connect();

  if (options.layout === 'inline') {
    root.dataset.open = 'true';
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
  } else {
    setOpen(false, false);
  }

  compactQuery.addEventListener('change', syncCompactFrame);
  window.visualViewport?.addEventListener('resize', syncCompactFrame);
  window.visualViewport?.addEventListener('scroll', syncCompactFrame);

  launcher.addEventListener('click', () => setOpen(!isOpen, true));
  headerClose.addEventListener('click', () => setOpen(false, true));
  menuToggle.addEventListener('click', () => setMenuOpen(!menuOpen));
  menuClose.addEventListener('click', () => {
    setMenuOpen(false);
    setOpen(false, true);
  });
  menuNew.addEventListener('click', () => {
    setMenuOpen(false);
    menuToggle.focus();
    void restartChat();
  });
  let userMoved = false;
  const noteUserScroll = (): void => {
    userMoved = true;
    scrollingByCode = false;
  };
  list.addEventListener('wheel', noteUserScroll, { passive: true });
  list.addEventListener('touchmove', noteUserScroll, { passive: true });
  list.addEventListener('pointerdown', noteUserScroll);
  list.addEventListener(
    'scroll',
    () => {
      const distance = distanceFromBottom();
      if (userMoved) {
        stickToBottom = distance < STICK_GAP;
        userMoved = false;
      } else if (distance < STICK_GAP) {
        stickToBottom = true;
      }
      if (scrollingByCode && distance < 2) scrollingByCode = false;
      syncScrollButton();
    },
    { passive: true },
  );
  scrollEnd.addEventListener('click', () => {
    stickToBottom = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      jumpToBottom();
      return;
    }
    scrollingByCode = true;
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (menuOpen) {
      setMenuOpen(false);
      menuToggle.focus();
      return;
    }
    setOpen(false, true);
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
      contentObserver.disconnect();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      document.removeEventListener('pointerdown', onDocPointer, true);
      compactQuery.removeEventListener('change', syncCompactFrame);
      window.visualViewport?.removeEventListener('resize', syncCompactFrame);
      window.visualViewport?.removeEventListener('scroll', syncCompactFrame);
      setPageScrollLocked(false);
      host.remove();
    },
  };
}
