import { init, type BnbChatHandle, type BnbChatPosition } from './widget/init';

const PUBLIC_KEY = 'HfcVbu7VBNew-3JJd4xPSLNWaNGCpJaw';
const BASE_URL = 'https://dev.boxx.vn';

const colorInput = document.querySelector<HTMLInputElement>('#color');
const positionInput = document.querySelector<HTMLSelectElement>('#position');
const inlineRoot = document.querySelector<HTMLElement>('#inline-root');
const openButton = document.querySelector<HTMLButtonElement>('#open');
const closeButton = document.querySelector<HTMLButtonElement>('#close');

if (!colorInput || !positionInput || !inlineRoot || !openButton || !closeButton) {
  throw new Error('Trang thử thiếu control của widget.');
}

const color = colorInput;
const positionSelect = positionInput;
const inlineHost = inlineRoot;

let launcher: BnbChatHandle | null = null;
let inline: BnbChatHandle | null = null;

function readPosition(value: string): BnbChatPosition {
  return value === 'bottom-left' ? 'bottom-left' : 'bottom-right';
}

function mount(): void {
  launcher?.destroy();
  inline?.destroy();
  const primaryColor = color.value;
  const position = readPosition(positionSelect.value);
  launcher = init({ publicKey: PUBLIC_KEY, baseUrl: BASE_URL, primaryColor, position });
  inline = init({
    publicKey: PUBLIC_KEY,
    baseUrl: BASE_URL,
    container: inlineHost,
    primaryColor,
    position,
  });
}

color.addEventListener('change', mount);
positionSelect.addEventListener('change', mount);
openButton.addEventListener('click', () => launcher?.open());
closeButton.addEventListener('click', () => launcher?.close());
mount();
