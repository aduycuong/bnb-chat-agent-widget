export type BnbChatPosition = 'bottom-right' | 'bottom-left';

export type BnbChatLayout = 'launcher' | 'inline';

export type BnbChatOptions = {
  /** Phần tử hoặc selector. Có giá trị thì widget nằm inline trong đó. */
  container?: HTMLElement | string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  /** Lời chào đầu. Truyền chuỗi rỗng để bỏ. */
  greeting?: string;
  /** Màu #rrggbb. Các nút, header và bong bóng của khách dùng màu này. */
  primaryColor?: string;
  position?: BnbChatPosition;
  zIndex?: number;
  /** Gợi ý bấm được. Truyền mảng rỗng để ẩn. */
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
  title: string;
  subtitle: string;
  placeholder: string;
  greeting: string;
  primaryColor: string;
  onPrimary: string;
  position: BnbChatPosition;
  zIndex: number;
  suggestions: string[];
  /** False khi không truyền title — widget lấy tên agent từ session. */
  titleFromUser: boolean;
};
