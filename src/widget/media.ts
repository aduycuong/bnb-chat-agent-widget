/** Khung giữ chỗ cho ảnh. video/chart dùng cùng vỏ, rồi phát `bnb-media-settle` khi có kích thước. */

export type MediaKind = 'image' | 'video' | 'chart';

export type MediaFrameOptions = {
  kind?: MediaKind;
  src: string;
  alt?: string;
  onSettle?: () => void;
};

export function createMediaFrame(options: MediaFrameOptions): HTMLElement {
  const kind = options.kind ?? 'image';
  const frame = document.createElement(kind === 'image' ? 'a' : 'div');
  frame.className = 'media-frame';
  frame.dataset.kind = kind;
  frame.dataset.state = 'loading';

  const skeleton = document.createElement('span');
  skeleton.className = 'media-skeleton';
  skeleton.setAttribute('aria-hidden', 'true');
  frame.append(skeleton);

  const finish = (state: 'ready' | 'error'): void => {
    if (frame.dataset.state === state) return;
    frame.dataset.state = state;
    options.onSettle?.();
  };

  if (kind !== 'image') {
    frame.dataset.src = options.src;
    frame.addEventListener('bnb-media-settle', () => finish('ready'), { once: true });
    return frame;
  }

  if (frame instanceof HTMLAnchorElement) {
    frame.classList.add('image-link');
    frame.href = options.src;
    frame.target = '_blank';
    frame.rel = 'noopener noreferrer';
  }

  const picture = document.createElement('img');
  picture.alt = options.alt ?? '';
  picture.decoding = 'async';
  picture.referrerPolicy = 'no-referrer';
  picture.draggable = false;

  const onLoad = (): void => {
    const width = picture.naturalWidth;
    const height = picture.naturalHeight;
    if (width > 0 && height > 0) frame.style.aspectRatio = `${width} / ${height}`;
    finish('ready');
  };
  const onError = (): void => {
    frame.style.aspectRatio = 'auto';
    finish('error');
  };

  picture.addEventListener('load', onLoad);
  picture.addEventListener('error', onError);
  frame.append(picture);
  picture.src = options.src;
  if (picture.complete && picture.naturalWidth > 0) onLoad();
  else if (picture.complete && picture.naturalWidth === 0) onError();

  return frame;
}
