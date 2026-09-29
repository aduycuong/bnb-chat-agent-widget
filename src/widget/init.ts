import {
  DEFAULT_GREETING,
  DEFAULT_PLACEHOLDER,
  DEFAULT_POSITION,
  DEFAULT_PRIMARY,
  DEFAULT_SUBTITLE,
  DEFAULT_TITLE,
  DEFAULT_Z_INDEX,
} from './defaults';
import { createWidget } from './create-widget';
import type {
  BnbChatHandle,
  BnbChatIcons,
  BnbChatNotificationPayload,
  BnbChatOptions,
  BnbChatPosition,
  BnbChatTheme,
  ResolvedOptions,
} from './types';

export type {
  BnbChatHandle,
  BnbChatIcons,
  BnbChatNotificationPayload,
  BnbChatOptions,
  BnbChatPosition,
  BnbChatTheme,
};

export function init(options: BnbChatOptions): BnbChatHandle {
  return createWidget(resolveOptions(options));
}

const THEME_VARS: Record<keyof BnbChatTheme, string> = {
  primary: '--bnb-primary',
  onPrimary: '--bnb-on-primary',
  headerBackground: '--bnb-header-bg',
  headerText: '--bnb-header-text',
  headerMuted: '--bnb-header-muted',
  bodyBackground: '--bnb-body-bg',
  surface: '--bnb-surface',
  text: '--bnb-text',
  muted: '--bnb-muted',
  border: '--bnb-border',
  bubbleBackground: '--bnb-bubble-bg',
  bubbleText: '--bnb-bubble-text',
  userBubbleBackground: '--bnb-user-bubble-bg',
  userBubbleText: '--bnb-user-bubble-text',
  composerBackground: '--bnb-composer-bg',
  inputBackground: '--bnb-input-bg',
  online: '--bnb-online',
  dayBackground: '--bnb-day-bg',
  dayText: '--bnb-day-text',
  accentSoft: '--bnb-accent-soft',
  danger: '--bnb-danger',
  dangerBackground: '--bnb-danger-bg',
  shadow: '--bnb-bubble-shadow',
};

function resolveOptions(options: BnbChatOptions): ResolvedOptions {
  const theme = resolveTheme(options);

  return {
    layout: options.container ? 'inline' : 'launcher',
    parent: options.container ? resolveParent(options.container) : requireBody(),
    publicKey: requirePublicKey(options.publicKey),
    baseUrl: normalizeBaseUrl(options.baseUrl),
    title: clean(options.title) ?? DEFAULT_TITLE,
    subtitle: clean(options.subtitle) ?? DEFAULT_SUBTITLE,
    placeholder: clean(options.placeholder) ?? DEFAULT_PLACEHOLDER,
    greeting: options.greeting === undefined ? DEFAULT_GREETING : options.greeting.trim(),
    primaryColor: theme.primary,
    onPrimary: theme.onPrimary,
    themeVars: theme.vars,
    icons: sanitizeIcons(options.icons),
    position: options.position === 'bottom-left' ? 'bottom-left' : DEFAULT_POSITION,
    zIndex:
      typeof options.zIndex === 'number' && Number.isFinite(options.zIndex)
        ? options.zIndex
        : DEFAULT_Z_INDEX,
    suggestions: (options.suggestions ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
    suggestionsFromUser: options.suggestions !== undefined,
    titleFromUser: clean(options.title) !== null,
    onNotification:
      typeof options.onNotification === 'function' ? options.onNotification : undefined,
  };
}

function requireBody(): HTMLElement {
  if (!document.body) {
    throw new Error('BNB Chat: gọi BnbChat.init() khi document.body đã có.');
  }
  return document.body;
}

function resolveParent(container: HTMLElement | string): HTMLElement {
  if (typeof container !== 'string') return container;
  const found = document.querySelector(container);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`BNB Chat: không tìm thấy phần tử "${container}".`);
  }
  return found;
}

function requirePublicKey(value: string | undefined): string {
  const key = value?.trim() ?? '';
  if (!key) throw new Error('BNB Chat: publicKey là bắt buộc.');
  if (key.length > 200 || /[\s"'<>]/.test(key)) {
    throw new Error('BNB Chat: publicKey không hợp lệ.');
  }
  return key;
}

function normalizeBaseUrl(value: string | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) throw new Error('BNB Chat: baseUrl là bắt buộc.');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('BNB Chat: baseUrl không phải URL hợp lệ.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('BNB Chat: baseUrl phải bắt đầu bằng http:// hoặc https://.');
  }
  return url.origin;
}

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function resolveTheme(options: BnbChatOptions): {
  primary: string;
  onPrimary: string;
  vars: Record<string, string>;
} {
  const theme = options.theme ?? {};
  const primary = sanitizeColor(theme.primary) ?? normalizeColor(options.primaryColor) ?? DEFAULT_PRIMARY;
  const onPrimary = sanitizeColor(theme.onPrimary) ?? contrastFor(primary);
  const vars: Record<string, string> = {
    '--bnb-primary': primary,
    '--bnb-on-primary': onPrimary,
  };

  for (const key of Object.keys(THEME_VARS) as (keyof BnbChatTheme)[]) {
    if (key === 'primary' || key === 'onPrimary') continue;
    const cssVar = THEME_VARS[key];
    const raw = theme[key];
    const value = key === 'shadow' ? sanitizeShadow(raw) : sanitizeColor(raw);
    if (value) vars[cssVar] = value;
  }

  return { primary, onPrimary, vars };
}

function sanitizeIcons(icons: BnbChatIcons | undefined): BnbChatIcons {
  if (!icons) return {};
  const next: BnbChatIcons = {};
  for (const key of Object.keys(icons) as (keyof BnbChatIcons)[]) {
    const value = sanitizeIcon(icons[key]);
    if (value) next[key] = value;
  }
  return next;
}

function sanitizeIcon(value: string | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  if (!next || next.length > 4000) return null;
  if (/<script|on\w+\s*=|javascript:/i.test(next)) return null;
  return next;
}

function normalizeColor(value: string | undefined): string | null {
  if (!value) return null;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

function sanitizeColor(value: string | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(next)) return next;
  if (/^(?:rgb|hsl)a?\(\s*[0-9.%\s,/]+\)$/.test(next) && next.length < 80) return next;
  return null;
}

function sanitizeShadow(value: string | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  if (!next || next.length > 240 || /[;{}<>]/.test(next)) return null;
  return next;
}

function contrastFor(color: string): string {
  const hex = color.startsWith('#') ? expandHex(color) : null;
  if (!hex) return '#ffffff';
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000;
  return yiq >= 160 ? '#18181b' : '#ffffff';
}

function expandHex(hex: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) return hex.slice(0, 7);
  return null;
}
