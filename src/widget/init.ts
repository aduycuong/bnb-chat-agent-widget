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
import type { BnbChatHandle, BnbChatOptions, BnbChatPosition, ResolvedOptions } from './types';

export type { BnbChatHandle, BnbChatOptions, BnbChatPosition };

export function init(options: BnbChatOptions = {}): BnbChatHandle {
  return createWidget(resolveOptions(options));
}

function resolveOptions(options: BnbChatOptions): ResolvedOptions {
  const primaryColor = normalizeColor(options.primaryColor) ?? DEFAULT_PRIMARY;

  return {
    layout: options.container ? 'inline' : 'launcher',
    parent: options.container ? resolveParent(options.container) : requireBody(),
    title: clean(options.title) ?? DEFAULT_TITLE,
    subtitle: clean(options.subtitle) ?? DEFAULT_SUBTITLE,
    placeholder: clean(options.placeholder) ?? DEFAULT_PLACEHOLDER,
    greeting: options.greeting === undefined ? DEFAULT_GREETING : options.greeting.trim(),
    primaryColor,
    onPrimary: contrastFor(primaryColor),
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

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function normalizeColor(value: string | undefined): string | null {
  if (!value) return null;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

function contrastFor(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000;
  return yiq >= 160 ? '#18181b' : '#ffffff';
}
