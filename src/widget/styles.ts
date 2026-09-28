export const widgetCss = `
:host {
  all: initial;
  display: block;
  color-scheme: light;
  font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: #18181b;
  --bnb-primary: #18181b;
  --bnb-on-primary: #ffffff;
  --bnb-text: #18181b;
  --bnb-muted: #71717a;
  --bnb-border: #e4e4e7;
  --bnb-soft: #fafafa;
  --bnb-surface: #ffffff;
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
  background: var(--bnb-surface);
  color: var(--bnb-text);
  border: 1px solid rgba(24, 24, 27, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(24, 24, 27, 0.18);
  overflow: hidden;
  transform-origin: bottom right;
  transition: opacity 160ms ease, transform 160ms ease, visibility 160ms;
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
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  padding: 14px 12px 14px 16px;
  background: var(--bnb-primary);
  color: var(--bnb-on-primary);
}

.mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 15px;
  font-weight: 700;
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
  letter-spacing: -0.01em;
}

.subtitle {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.82;
}

.close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.close:hover {
  background: rgba(255, 255, 255, 0.16);
}

.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 14px 8px;
  background: var(--bnb-soft);
}

.messages::-webkit-scrollbar {
  width: 8px;
}

.messages::-webkit-scrollbar-thumb {
  background: #d4d4d8;
  border-radius: 99px;
}

.msg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 10px;
}

.msg.user {
  justify-content: flex-end;
}

.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  background: var(--bnb-primary);
  color: var(--bnb-on-primary);
  font-size: 12px;
  font-weight: 700;
}

.bubble {
  position: relative;
  max-width: min(78%, 280px);
  padding: 10px 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.msg.assistant .bubble {
  background: var(--bnb-surface);
  border: 1px solid var(--bnb-border);
  border-radius: 14px 14px 14px 4px;
}

.msg.assistant .bubble.error {
  color: #9f1239;
  background: #fff1f2;
  border-color: #fecdd3;
}

.bubble a.image-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.bubble img {
  display: block;
  max-width: 100%;
  margin-top: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.bubble.media {
  padding: 6px;
}

.bubble.media img {
  margin-top: 0;
}

.bubble.media a.image-link + a.image-link img,
.bubble.media img + img {
  margin-top: 6px;
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

.rich a.image-link {
  text-decoration: none;
}

.msg.user .bubble {
  background: var(--bnb-primary);
  color: var(--bnb-on-primary);
  border-radius: 14px 14px 4px 14px;
}

.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 52px;
  min-height: 18px;
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
  padding: 4px 12px 0;
  background: var(--bnb-surface);
}

.suggestions[hidden] {
  display: none;
}

.suggestions button {
  border: 1px solid var(--bnb-border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--bnb-surface);
  color: var(--bnb-text);
  cursor: pointer;
}

.suggestions button:hover {
  border-color: var(--bnb-primary);
  color: var(--bnb-primary);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
  padding: 12px;
  border-top: 1px solid var(--bnb-border);
  background: var(--bnb-surface);
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
  background: var(--bnb-soft);
}

.attachment[data-state="error"] {
  border-color: #fecdd3;
  background: #fff1f2;
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
  color: #9f1239;
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
  cursor: pointer;
}

.attachment-remove:hover {
  background: rgba(24, 24, 27, 0.06);
  color: var(--bnb-text);
}

.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.attach {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border: 1px solid var(--bnb-border);
  border-radius: 12px;
  background: var(--bnb-surface);
  color: var(--bnb-text);
  cursor: pointer;
}

.attach:disabled {
  opacity: 0.4;
  cursor: default;
}

.composer textarea {
  flex: 1;
  min-height: 40px;
  max-height: 96px;
  resize: none;
  border: 1px solid var(--bnb-border);
  border-radius: 12px;
  padding: 9px 12px;
  background: var(--bnb-surface);
  color: var(--bnb-text);
}

.composer textarea::placeholder {
  color: var(--bnb-muted);
}

.composer textarea:focus {
  outline: none;
  border-color: var(--bnb-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bnb-primary) 18%, transparent);
}

.send {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border: 0;
  border-radius: 12px;
  background: var(--bnb-primary);
  color: var(--bnb-on-primary);
  cursor: pointer;
}

.send:disabled {
  opacity: 0.4;
  cursor: default;
}

.send:active:not(:disabled),
.launcher:active {
  transform: scale(0.97);
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
  cursor: pointer;
}

.launcher:hover,
.send:hover:not(:disabled),
.attach:hover:not(:disabled) {
  filter: brightness(1.08);
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

:host([data-layout="inline"]) .launcher,
:host([data-layout="inline"]) .close {
  display: none;
}

button:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--bnb-on-primary);
  outline-offset: 2px;
}

.attach:focus-visible,
.attachment-remove:focus-visible {
  outline: 2px solid var(--bnb-primary);
  outline-offset: 2px;
}

.composer textarea:focus-visible {
  outline: none;
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
  .send {
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
`;
