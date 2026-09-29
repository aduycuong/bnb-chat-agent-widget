import type { BnbChatHandle, BnbChatOptions, BnbChatPosition } from './types';

const SCRIPT_ATTRS = [
  'publicKey',
  'baseUrl',
  'mode',
  'target',
  'primaryColor',
  'position',
] as const;

type Init = (options: BnbChatOptions) => BnbChatHandle;

export function bootFromScript(init: Init): void {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return;
  if (script.dataset.bnbBooted === 'true') return;
  if (!SCRIPT_ATTRS.some((name) => script.dataset[name])) return;
  script.dataset.bnbBooted = 'true';

  const run = () => {
    try {
      init(optionsFromScript(script));
    } catch (error) {
      console.error(error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

function optionsFromScript(script: HTMLScriptElement): BnbChatOptions {
  const primaryColor = script.dataset.primaryColor?.trim();
  const options: BnbChatOptions = {
    publicKey: script.dataset.publicKey?.trim() ?? '',
    baseUrl: script.dataset.baseUrl?.trim() ?? '',
    ...(primaryColor ? { primaryColor } : {}),
  };
  const mode = (script.dataset.mode || 'popup').toLowerCase();

  if (mode === 'popup' || mode === 'launcher') {
    const position = readPosition(script.dataset.position);
    if (position) options.position = position;
    return options;
  }

  if (mode !== 'inline') {
    throw new Error(`BNB Chat: data-mode "${mode}" không hỗ trợ. Dùng "popup" hoặc "inline".`);
  }

  const target = script.dataset.target?.trim();
  if (!target) {
    throw new Error('BNB Chat: data-target là bắt buộc khi data-mode="inline".');
  }
  options.container = selectorFor(target);
  return options;
}

function readPosition(value: string | undefined): BnbChatPosition | undefined {
  const next = value?.trim().toLowerCase();
  if (!next) return undefined;
  if (next === 'bottom-left' || next === 'bottom-right') return next;
  throw new Error('BNB Chat: data-position chỉ nhận "bottom-right" hoặc "bottom-left".');
}

function selectorFor(target: string): string {
  if (target.startsWith('#') || target.startsWith('.') || target.startsWith('[')) return target;
  return `#${CSS.escape(target)}`;
}
