/** Inner SVG markup. Màu lấy từ currentColor để theme đổi được. */
export const ICON_PATHS = {
  launcher:
    '<path fill="currentColor" d="M12 4c4.4 0 8 3.1 8 7s-3.6 7-8 7c-.7 0-1.4-.1-2-.3L6 19.2l.9-2.4C5.1 15.6 4 13.4 4 11c0-3.9 3.6-7 8-7Z"/>',
  close:
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>',
  send:
    '<path fill="currentColor" d="M6.2 4.7a1.2 1.2 0 0 0-1.8 1v12.6a1.2 1.2 0 0 0 1.8 1l11.2-6.3a1.2 1.2 0 0 0 0-2.1L6.2 4.7Z"/>',
  image:
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.2A2.2 2.2 0 0 1 6.7 5h10.6a2.2 2.2 0 0 1 2.2 2.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.7a2.2 2.2 0 0 1-2.2-2.2V7.2Z"/><circle cx="9" cy="9.6" r="1.25" fill="currentColor" stroke="none"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m19.5 14.8-3.7-3.6a1.4 1.4 0 0 0-2 0L8 16.8"/>',
  menu:
    '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M5 9h14M5 15h14"/>',
  scrollDown:
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>',
  newSession:
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 6v12M6 12h12"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;
