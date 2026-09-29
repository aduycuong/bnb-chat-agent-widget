export type BnbChatPosition = 'bottom-right' | 'bottom-left';

export type BnbChatLayout = 'launcher' | 'inline';

/** Màu CSS an toàn (#rgb, #rrggbb, rgb(), hsl()). Bỏ qua thì dùng mặc định trong stylesheet. */
export type BnbChatTheme = {
  primary?: string;
  onPrimary?: string;
  headerBackground?: string;
  headerText?: string;
  headerMuted?: string;
  bodyBackground?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
  bubbleBackground?: string;
  bubbleText?: string;
  userBubbleBackground?: string;
  userBubbleText?: string;
  composerBackground?: string;
  inputBackground?: string;
  online?: string;
  dayBackground?: string;
  dayText?: string;
  accentSoft?: string;
  danger?: string;
  dangerBackground?: string;
  /** box-shadow của bong bóng trợ lý. */
  shadow?: string;
};

/**
 * SVG thay icon mặc định. Chuỗi là phần bên trong `<svg>` (path, circle, …)
 * hoặc cả thẻ `<svg>`. Màu nên dùng currentColor.
 */
export type BnbChatIcons = {
  launcher?: string;
  close?: string;
  send?: string;
  image?: string;
  menu?: string;
  scrollDown?: string;
  clearChat?: string;
};

export type BnbChatOptions = {
  /** Public key của kênh embed. */
  publicKey: string;
  /** Origin của API, ví dụ https://dev.boxx.vn. Path bị bỏ. */
  baseUrl: string;
  /** Phần tử hoặc selector. Có giá trị thì widget nằm inline trong đó. */
  container?: HTMLElement | string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  /** Lời chào đầu. Truyền chuỗi rỗng để bỏ. */
  greeting?: string;
  /** Màu nhấn #rrggbb. Nút nổi, nút gửi và bong bóng của khách. */
  primaryColor?: string;
  /** Đè từng màu. `primary` thắng `primaryColor` nếu có cả hai. */
  theme?: BnbChatTheme;
  icons?: BnbChatIcons;
  position?: BnbChatPosition;
  zIndex?: number;
  /**
   * Gợi ý bấm được. Bỏ qua thì lấy `conversationStarters` từ bootstrap.
   * Truyền mảng rỗng để ẩn.
   */
  suggestions?: string[];
};

export type BnbChatHandle = {
  open(): void;
  close(): void;
  destroy(): void;
};

export type ResolvedOptions = {
  layout: BnbChatLayout;
  parent: HTMLElement;
  publicKey: string;
  baseUrl: string;
  title: string;
  subtitle: string;
  placeholder: string;
  greeting: string;
  primaryColor: string;
  onPrimary: string;
  themeVars: Record<string, string>;
  icons: BnbChatIcons;
  position: BnbChatPosition;
  zIndex: number;
  suggestions: string[];
  /** False khi không truyền suggestions — widget lấy câu gợi ý từ bootstrap. */
  suggestionsFromUser: boolean;
  /** False khi không truyền title — widget lấy tên agent từ session. */
  titleFromUser: boolean;
};
