const STYLE_ID = "fillament-ai-styles";

export function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

const css = `
.fl-ai-fab {
  position: fixed;
  z-index: 2147483646;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 10px 12px;
  border-radius: 999px;
  background: #09090b;
  color: #fafafa;
  font: 500 13px / 1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border: 1px solid #27272a;
  box-shadow: 0 6px 24px rgba(0,0,0,0.25);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.fl-ai-fab:hover { background: #18181b; transform: translateY(-1px); }
.fl-ai-fab[data-pos="bottom-right"] { right: 20px; bottom: 20px; }
.fl-ai-fab[data-pos="bottom-left"] { left: 20px; bottom: 20px; }
.fl-ai-fab[data-pos="top-right"] { right: 20px; top: 76px; }
.fl-ai-fab .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #2547ff;
  box-shadow: 0 0 8px rgba(37,71,255,0.8);
}
.fl-ai-fab[data-status="ready"] .dot { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.8); }
.fl-ai-fab[data-status="loading"] .dot, .fl-ai-fab[data-status="thinking"] .dot {
  background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.8);
  animation: fl-ai-pulse 1.2s infinite;
}
@keyframes fl-ai-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.fl-ai-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8,8,11,0.55);
  z-index: 2147483646;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24px;
  animation: fl-ai-fade 0.15s ease;
}
@keyframes fl-ai-fade { from { opacity: 0; } to { opacity: 1; } }

.fl-ai-panel {
  width: min(520px, 100%);
  max-height: min(640px, 88vh);
  background: #ffffff;
  color: #09090b;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  box-shadow: 0 20px 60px rgba(0,0,0,0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font: 14px / 1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  animation: fl-ai-slide 0.2s ease;
}
@keyframes fl-ai-slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.fl-ai-head {
  padding: 14px 18px;
  border-bottom: 1px solid #f0f0f1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fl-ai-head h3 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.01em; flex: 1; }
.fl-ai-head .badge {
  font: 500 10px ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  background: #f4f4f5;
  color: #3f3f46;
  padding: 3px 7px;
  border-radius: 4px;
}
.fl-ai-close {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #71717a;
  font-size: 18px;
  line-height: 1;
}
.fl-ai-close:hover { background: #f4f4f5; color: #09090b; }

.fl-ai-body {
  padding: 14px 18px 18px;
  overflow-y: auto;
  flex: 1;
}

.fl-ai-progress {
  margin: 6px 0 12px;
}
.fl-ai-progress-bar {
  height: 4px;
  background: #f4f4f5;
  border-radius: 999px;
  overflow: hidden;
}
.fl-ai-progress-bar > div {
  height: 100%;
  background: #2547ff;
  transition: width 0.3s ease;
}
.fl-ai-progress-text {
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #71717a;
  margin-top: 6px;
}

.fl-ai-suggest {
  margin: 12px 0;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
}
.fl-ai-suggest-head {
  padding: 8px 12px;
  background: #f4f4f5;
  font: 600 11px ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  color: #3f3f46;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
}
.fl-ai-suggest-rows {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 2fr;
  gap: 1px;
  background: #e4e4e7;
}
.fl-ai-suggest-rows > div {
  background: #ffffff;
  padding: 7px 10px;
  font-size: 12.5px;
}
.fl-ai-suggest-rows > div:first-child,
.fl-ai-suggest-rows > div:nth-child(odd) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #3f3f46;
}
.fl-ai-suggest-rows > div:nth-child(even) {
  color: #09090b;
  font-weight: 500;
  word-break: break-word;
}
.fl-ai-suggest-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-top: 1px solid #e4e4e7;
  justify-content: flex-end;
}
.fl-ai-suggest-empty {
  padding: 14px;
  font-size: 13px;
  color: #71717a;
  text-align: center;
}

.fl-ai-error {
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 12.5px;
  margin: 8px 0 12px;
}

.fl-ai-foot {
  border-top: 1px solid #f0f0f1;
  padding: 12px 18px 14px;
  background: #ffffff;
}
.fl-ai-input {
  width: 100%;
  resize: vertical;
  min-height: 70px;
  max-height: 200px;
  padding: 10px 12px;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  background: #ffffff;
  color: #09090b;
  box-sizing: border-box;
}
.fl-ai-input:focus {
  outline: none;
  border-color: #2547ff;
  box-shadow: 0 0 0 3px rgba(37,71,255,0.15);
}
.fl-ai-input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.fl-ai-input-hint {
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #a1a1aa;
  flex: 1;
}
.fl-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.fl-ai-btn-primary { background: #09090b; color: white; }
.fl-ai-btn-primary:hover { background: #2547ff; }
.fl-ai-btn-primary:disabled { background: #d4d4d8; color: #71717a; cursor: not-allowed; }
.fl-ai-btn-secondary { background: white; color: #09090b; border-color: #d4d4d8; }
.fl-ai-btn-secondary:hover { border-color: #09090b; }
.fl-ai-btn-ghost { background: transparent; color: #71717a; }
.fl-ai-btn-ghost:hover { color: #09090b; }
`;
