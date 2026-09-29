export const widgetCss = `
:host {
  all: initial;
  display: block;
  color-scheme: light;
  font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: #1c1c1f;
  --bnb-primary: #18181b;
  --bnb-on-primary: #ffffff;
  --bnb-header-bg: #ffffff;
  --bnb-header-text: #1c1c1f;
  --bnb-header-muted: #8b8b96;
  --bnb-body-bg: #f3f4f6;
  --bnb-surface: #ffffff;
  --bnb-text: #1c1c1f;
  --bnb-muted: #8b8b96;
  --bnb-border: #e6e6ea;
  --bnb-bubble-bg: #ffffff;
  --bnb-bubble-text: #1c1c1f;
  --bnb-user-bubble-bg: var(--bnb-primary);
  --bnb-user-bubble-text: var(--bnb-on-primary);
  --bnb-composer-bg: var(--bnb-body-bg);
  --bnb-input-bg: #ffffff;
  --bnb-online: #22c55e;
  --bnb-day-bg: #e4e5e9;
  --bnb-day-text: #6b6b76;
  --bnb-accent-soft: color-mix(in srgb, var(--bnb-primary) 14%, #ffffff);
  --bnb-danger: #9f1239;
  --bnb-danger-bg: #fff1f2;
  --bnb-danger-border: #fecdd3;
  --bnb-bubble-shadow: 0 1px 1px rgba(16, 24, 40, 0.04), 0 6px 16px rgba(16, 24, 40, 0.07);
  --bnb-soft: var(--bnb-body-bg);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

button,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

.root {
  position: relative;
  width: 100%;
  height: 100%;
}

.panel {
  position: absolute;
  bottom: 68px;
  display: flex;
  flex-direction: column;
  width: min(380px, calc(100vw - 32px));
  height: min(600px, calc(100vh - 120px));
  background: var(--bnb-body-bg);
  color: var(--bnb-text);
  border: 1px solid rgba(24, 24, 27, 0.06);
  border-radius: 22px;
  box-shadow: 0 18px 48px rgba(24, 24, 27, 0.16);
  overflow: hidden;
  transform-origin: bottom right;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
}

:host([data-position="bottom-right"]) .panel {
  right: 0;
}

:host([data-position="bottom-left"]) .panel {
  left: 0;
  transform-origin: bottom left;
}

.root:not([data-open="true"]) .panel {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(8px) scale(0.98);
}

.header {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  padding: 14px 12px 14px 16px;
  background: var(--bnb-header-bg);
  color: var(--bnb-header-text);
  box-shadow: 0 1px 0 rgba(24, 24, 27, 0.04), 0 1px 4px rgba(16, 24, 40, 0.06);
}

.mark-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  flex: none;
}

.mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bnb-accent-soft);
  color: var(--bnb-primary);
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
}

.mark.photo {
  place-items: stretch;
  background: #fff;
}

.online {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bnb-online);
  border: 2px solid var(--bnb-header-bg);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--bnb-online) 45%, transparent);
  animation: bnb-online 2.4s ease-out infinite;
}

.online[data-state="busy"] {
  background: #f59e0b;
  animation: none;
  box-shadow: none;
}

.online[data-state="offline"] {
  background: #a1a1aa;
  animation: none;
  box-shadow: none;
}

.titles {
  min-width: 0;
  flex: 1;
}

.title,
.subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.subtitle {
  margin-top: 1px;
  font-size: 12px;
  color: var(--bnb-header-muted);
}

.menu {
  position: relative;
  flex: none;
  z-index: 4;
}

.menu-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--bnb-accent-soft);
  color: var(--bnb-primary);
  transition: background 160ms ease, transform 160ms ease;
}

.menu-toggle:hover {
  background: color-mix(in srgb, var(--bnb-primary) 22%, #ffffff);
}

.menu-toggle:active {
  transform: scale(0.96);
}

.menu-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 210px;
  padding: 4px 0;
  background: var(--bnb-surface);
  color: var(--bnb-text);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(24, 24, 27, 0.14);
  transform-origin: top right;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px) scale(0.98);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms;
}

.menu[data-open="true"] .menu-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  color: var(--bnb-text);
  text-align: left;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: background 140ms ease;
}

.menu-item + .menu-item {
  box-shadow: inset 0 1px 0 var(--bnb-border);
}

.menu-item svg {
  flex: none;
  color: var(--bnb-muted);
}

.menu-item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--bnb-text) 5%, transparent);
}

.menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}

:host([data-layout="inline"]) .menu-item[data-action="close"] {
  display: none;
}

:host([data-layout="inline"]) .menu-item + .menu-item {
  box-shadow: none;
}

.thread {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px 12px;
  background: var(--bnb-body-bg);
}

.messages::-webkit-scrollbar {
  width: 8px;
}

.messages::-webkit-scrollbar-thumb {
  background: #d4d4d8;
  border-radius: 99px;
}

.scroll-end {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--bnb-surface);
  color: var(--bnb-text);
  box-shadow: 0 4px 14px rgba(24, 24, 27, 0.16);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(6px);
  transition: opacity 160ms ease, transform 160ms ease, background 160ms ease;
}

.scroll-end[data-show="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.scroll-end:hover {
  background: var(--bnb-accent-soft);
}

.day {
  display: flex;
  justify-content: center;
  margin: 14px 0 10px;
  animation: bnb-in 180ms ease;
}

.day span {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--bnb-day-bg);
  color: var(--bnb-day-text);
  font-size: 12px;
  font-weight: 600;
}

.msg {
  margin: 12px 8px 24px;
  animation: bnb-in 180ms ease;
}

.msg.assistant {
  position: relative;
  margin-left: 10px;
  margin-right: 12px;
}

.msg.user {
  display: flex;
  justify-content: flex-end;
  margin-left: 36px;
  animation: bnb-user-in 340ms cubic-bezier(0.22, 0.9, 0.28, 1);
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: var(--bnb-accent-soft);
  color: var(--bnb-primary);
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
}

.msg.assistant .avatar {
  position: absolute;
  left: 0;
  top: 6px;
  z-index: 1;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
}

.avatar.photo {
  place-items: stretch;
  background: #fff;
}

.mark.photo img,
.avatar.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bubble {
  position: relative;
  width: fit-content;
  max-width: min(88%, 292px);
  padding: 12px 12px 12px;
  color: var(--bnb-bubble-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.msg.assistant .bubble {
  margin-left: 18px;
  padding: 12px 12px 12px 20px;
  background: var(--bnb-bubble-bg);
  border-radius: 16px;
  box-shadow: var(--bnb-bubble-shadow);
}

.bubble-name {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bubble-main {
  display: block;
}

.bubble-content {
  display: flow-root;
  min-width: 0;
}

.stamp {
  float: right;
  position: relative;
  top: 4px;
  margin-left: 8px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--bnb-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.msg.assistant .bubble.error {
  color: var(--bnb-danger);
  background: var(--bnb-danger-bg);
  border: 1px solid var(--bnb-danger-border);
  box-shadow: none;
}

.bubble.error .stamp {
  color: color-mix(in srgb, var(--bnb-danger) 65%, transparent);
}

.bubble.has-media,
.bubble:has(.media-frame) {
  width: min(88%, 260px);
}

.media-frame {
  position: relative;
  display: block;
  width: 100%;
  min-width: 168px;
  aspect-ratio: 4 / 3;
  max-height: 240px;
  margin-top: 8px;
  border-radius: 12px;
  overflow: hidden;
  background: #e7e7ec;
  color: inherit;
  text-decoration: none;
}

.bubble-content > .media-frame:first-child {
  margin-top: 0;
}

.media-frame[data-kind="video"],
.media-frame[data-kind="chart"] {
  aspect-ratio: 16 / 9;
}

.media-frame img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: cover;
  opacity: 0;
  transition: opacity 180ms ease;
}

.media-frame[data-state="ready"] img {
  opacity: 1;
}

.media-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, #e6e6eb 20%, #f6f6f8 42%, #e6e6eb 64%);
  background-size: 220% 100%;
  animation: bnb-shimmer 1.25s ease-in-out infinite;
}

.media-frame[data-state="ready"] .media-skeleton,
.media-frame[data-state="error"] .media-skeleton {
  display: none;
}

.media-frame[data-state="error"] {
  display: grid;
  place-items: center;
  aspect-ratio: auto;
  height: 72px;
  color: var(--bnb-muted);
  font-size: 12px;
}

.media-frame[data-state="error"]::after {
  content: "Không tải được";
}

.media-frame[data-state="error"] img {
  display: none;
}

.rich {
  white-space: normal;
}

.rich.live {
  white-space: pre-wrap;
}

.rich p,
.rich ul,
.rich ol {
  margin: 0;
  padding: 0;
}

.rich ul,
.rich ol {
  padding-inline-start: 1.25em;
}

.rich li + li {
  margin-top: 2px;
}

.rich p + p,
.rich p + ul,
.rich p + ol,
.rich ul + p,
.rich ol + p,
.rich ul + ul,
.rich ol + ol,
.rich ul + ol,
.rich ol + ul {
  margin-top: 8px;
}

.rich a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rich a.image-link,
a.media-frame {
  text-decoration: none;
}

.msg.user .bubble {
  background: var(--bnb-user-bubble-bg);
  color: var(--bnb-user-bubble-text);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08), 0 6px 16px rgba(16, 24, 40, 0.1);
}

.msg.user .stamp {
  color: color-mix(in srgb, currentColor 68%, transparent);
}

.bubble.typing {
  box-sizing: border-box;
  align-items: center;
  min-height: 48px;
  padding: 8px 16px 8px 20px;
  min-width: 72px;
}

.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 36px;
  min-height: 16px;
}

.typing span {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: #a1a1aa;
  animation: bnb-dot 1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 14px 4px;
  background: transparent;
}

.suggestions[hidden] {
  display: none;
}

.suggestions button {
  border: 0;
  border-radius: 999px;
  padding: 7px 13px;
  background: var(--bnb-surface);
  color: var(--bnb-text);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  transition: color 140ms ease, background 140ms ease, transform 140ms ease;
}

.suggestions button:hover {
  background: var(--bnb-accent-soft);
  color: var(--bnb-primary);
}

.suggestions button:active {
  transform: scale(0.98);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
  padding: 12px 14px 16px;
  background: var(--bnb-composer-bg);
}

.attachments {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.attachments[hidden] {
  display: none;
}

.attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  max-width: 220px;
  min-height: 48px;
  padding: 4px;
  border: 1px solid var(--bnb-border);
  border-radius: 12px;
  background: var(--bnb-surface);
}

.attachment[data-state="error"] {
  border-color: var(--bnb-danger-border);
  background: var(--bnb-danger-bg);
}

.attachment img {
  width: 40px;
  height: 40px;
  flex: none;
  object-fit: cover;
  border-radius: 8px;
  background: #fff;
}

.attachment-meta {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.attachment-name,
.attachment-status {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-name {
  font-size: 12px;
  font-weight: 600;
}

.attachment-status {
  font-size: 11px;
  color: var(--bnb-muted);
}

.attachment[data-state="error"] .attachment-status {
  color: var(--bnb-danger);
}

.attachment-remove {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--bnb-muted);
}

.attachment-remove:hover {
  background: rgba(24, 24, 27, 0.06);
  color: var(--bnb-text);
}

.composer-field {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 6px;
  border-radius: 999px;
  background: var(--bnb-input-bg);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 20px rgba(16, 24, 40, 0.06);
  transition: box-shadow 160ms ease;
}

.composer-field.multiline {
  border-radius: 18px;
}

.composer-field:focus-within {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--bnb-primary) 16%, transparent),
    0 8px 20px rgba(16, 24, 40, 0.06);
}

.attach,
.send {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.attach {
  color: var(--bnb-muted);
}

.attach:hover:not(:disabled) {
  background: var(--bnb-body-bg);
  color: var(--bnb-primary);
}

.attach:disabled,
.send:disabled {
  opacity: 0.4;
  cursor: default;
}

.composer textarea {
  flex: 1;
  min-height: 36px;
  max-height: 96px;
  resize: none;
  border: 0;
  border-radius: 0;
  padding: 8px 4px;
  background: transparent;
  color: var(--bnb-text);
  line-height: 1.4;
}

.composer textarea::placeholder {
  color: var(--bnb-muted);
}

.composer textarea:focus {
  outline: none;
  box-shadow: none;
}

.send {
  color: var(--bnb-primary);
}

.send:hover:not(:disabled) {
  background: var(--bnb-accent-soft);
}

.send:active:not(:disabled),
.launcher:active,
.scroll-end:active {
  transform: scale(0.96);
}

.scroll-end:active {
  transform: translateX(-50%) scale(0.96);
}

.launcher {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 50%;
  background: var(--bnb-primary);
  color: var(--bnb-on-primary);
  box-shadow: 0 10px 28px rgba(24, 24, 27, 0.22);
  transition: transform 140ms ease, filter 140ms ease;
}

.launcher:hover {
  filter: brightness(1.06);
}

.launcher .icon-close,
.root[data-open="true"] .launcher .icon-chat {
  display: none;
}

.root[data-open="true"] .launcher .icon-close {
  display: block;
}

:host([data-layout="inline"]) .panel {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  box-shadow: none;
  border-radius: 0;
  border: 0;
}

:host([data-layout="inline"]) .launcher {
  display: none;
}

button:focus-visible {
  outline: 2px solid var(--bnb-primary);
  outline-offset: 2px;
}

.composer textarea:focus-visible {
  outline: none;
}

.launcher:focus-visible {
  outline-color: var(--bnb-on-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .typing span,
  .launcher,
  .send,
  .msg,
  .day,
  .menu-panel,
  .menu-toggle,
  .scroll-end,
  .media-frame img,
  .media-skeleton,
  .online {
    transition: none;
    animation: none;
  }
}

@keyframes bnb-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@keyframes bnb-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes bnb-user-in {
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  62% {
    opacity: 1;
    transform: translateY(-3px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bnb-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}

@keyframes bnb-online {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--bnb-online) 42%, transparent);
  }
  70%,
  100% {
    box-shadow: 0 0 0 6px transparent;
  }
}
`;
