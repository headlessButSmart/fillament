// Inline CSS keeps the package zero-config. Mounted once on first use.

const STYLE_ID = "fillament-devtools-styles";

export function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

const css = `
.fl-devtools {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 420px;
  max-height: 70vh;
  background: #0e1116;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.fl-devtools.collapsed {
  height: 36px;
  min-height: 36px;
}
.fl-devtools__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  cursor: pointer;
  user-select: none;
}
.fl-devtools__title {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #58a6ff;
  flex: 1;
}
.fl-devtools__badge {
  background: #1f6feb;
  color: white;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 10px;
}
.fl-devtools__close {
  background: none; border: none; color: #8b949e; cursor: pointer; font-size: 16px;
}
.fl-devtools__tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  flex-wrap: wrap;
}
.fl-devtools__tab {
  background: transparent;
  color: #8b949e;
  border: 1px solid transparent;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}
.fl-devtools__tab.active {
  background: #21262d;
  color: #e6edf3;
  border-color: #30363d;
}
.fl-devtools__body {
  overflow: auto;
  padding: 10px 12px;
}
.fl-devtools__row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #21262d;
}
.fl-devtools__row:last-child { border-bottom: none; }
.fl-devtools__key { color: #8b949e; }
.fl-devtools__value { color: #e6edf3; }
.fl-devtools__pre {
  background: #161b22;
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #79c0ff;
  font-size: 11px;
}
.fl-devtools__chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: #21262d;
  color: #8b949e;
  margin: 0 4px 4px 0;
  font-size: 10px;
}
.fl-devtools__chip.error { background: #4d1f1f; color: #ffabab; }
.fl-devtools__chip.touched { background: #1f4d2f; color: #abffc1; }
.fl-devtools__chip.dirty { background: #4d401f; color: #ffe3ab; }
.fl-devtools__event {
  padding: 4px 6px;
  border-bottom: 1px dashed #21262d;
  display: flex;
  gap: 6px;
}
.fl-devtools__event-type {
  color: #79c0ff;
  flex: 0 0 auto;
  font-weight: 600;
}
.fl-devtools__event-payload {
  color: #8b949e;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fl-devtools__empty {
  color: #6e7681;
  padding: 12px;
  text-align: center;
  font-style: italic;
}
.fl-devtools__actions {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  flex-wrap: wrap;
}
.fl-devtools__action {
  background: #21262d;
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}
.fl-devtools__action:hover {
  border-color: #58a6ff;
  color: #58a6ff;
}
`;
