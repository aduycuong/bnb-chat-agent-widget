import { init } from './widget/init';
import { bootFromScript } from './widget/script-boot';

export { init };
export type {
  BnbChatHandle,
  BnbChatIcons,
  BnbChatNotificationPayload,
  BnbChatOptions,
  BnbChatPosition,
  BnbChatTheme,
} from './widget/types';

bootFromScript(init);
