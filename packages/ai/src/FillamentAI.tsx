import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FormApi } from "@fillament/core";
import { useAIAssist, type UseAIAssistResult } from "./useAIAssist.js";
import { injectStyles } from "./styles.js";
import type { AIAssistOptions, AISuggestion } from "./types.js";

export type FillamentAIProps<TValues = any> = AIAssistOptions & {
  form: FormApi<TValues>;
  position?: "bottom-right" | "bottom-left" | "top-right";
  triggerLabel?: string;
  panelTitle?: string;
  placeholder?: string;
  preloadOnMount?: boolean;
};

const SPARK = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0l1.5 4.5L14 6l-4.5 1.5L8 12l-1.5-4.5L2 6l4.5-1.5L8 0zm5 9l.8 2.2L16 12l-2.2.8L13 15l-.8-2.2L10 12l2.2-.8L13 9zM3 10l.6 1.4L5 12l-1.4.6L3 14l-.6-1.4L1 12l1.4-.6L3 10z"/>
  </svg>
);

export function FillamentAI<TValues = any>(props: FillamentAIProps<TValues>) {
  const {
    form,
    position = "bottom-right",
    triggerLabel = "AI assist",
    panelTitle = "Fill with AI",
    placeholder = "Describe the answers you'd like. e.g. 'I'm a 28-year-old developer in Madrid, married, vegetarian.'",
    preloadOnMount = false,
    enabled = true,
    ...assistOptions
  } = props;

  if (!enabled) return null;

  injectStyles();
  const assist = useAIAssist(form, { ...assistOptions, enabled });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (preloadOnMount) void assist.preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadOnMount]);

  const statusKind = assist.status.kind;
  const triggerStatus =
    statusKind === "loading" || statusKind === "thinking"
      ? "loading"
      : statusKind === "ready"
        ? "ready"
        : statusKind === "error"
          ? "error"
          : "idle";

  return (
    <>
      <button
        type="button"
        className="fl-ai-fab"
        data-pos={position}
        data-status={triggerStatus}
        onClick={() => {
          setOpen(true);
          void assist.preload();
        }}
        aria-label={triggerLabel}
      >
        <span className="dot" aria-hidden="true" />
        {SPARK}
        <span>{triggerLabel}</span>
      </button>
      {open ? (
        <Panel
          title={panelTitle}
          placeholder={placeholder}
          assist={assist}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Panel({
  title,
  placeholder,
  assist,
  onClose,
}: {
  title: string;
  placeholder: string;
  assist: UseAIAssistResult;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = assist.status.kind;
  const busy = status === "loading" || status === "thinking";

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await assist.request(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const suggestion = assist.lastSuggestion;
  const entries = suggestion ? Object.entries(suggestion.changes) : [];

  return (
    <div className="fl-ai-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fl-ai-panel" role="dialog" aria-label={title}>
        <div className="fl-ai-head">
          <h3>{title}</h3>
          <span className="badge">{assist.modelId.split("-").slice(0, 3).join("-")}</span>
          <button type="button" className="fl-ai-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="fl-ai-body">
          {(status === "loading" && assist.progress) ? (
            <div className="fl-ai-progress">
              <div className="fl-ai-progress-bar">
                <div style={{ width: `${Math.max(2, Math.round((assist.progress.progress ?? 0) * 100))}%` }} />
              </div>
              <div className="fl-ai-progress-text">{assist.progress.text || "Loading model…"}</div>
            </div>
          ) : null}

          {status === "thinking" ? (
            <div className="fl-ai-progress-text" style={{ marginBottom: 8 }}>
              Thinking…
            </div>
          ) : null}

          {assist.error ? (
            <div className="fl-ai-error">{assist.error}</div>
          ) : null}

          {suggestion ? (
            <div className="fl-ai-suggest">
              <div className="fl-ai-suggest-head">
                <span>Proposed changes · {entries.length}</span>
                <span>{new Date(suggestion.at).toLocaleTimeString()}</span>
              </div>
              {entries.length === 0 ? (
                <div className="fl-ai-suggest-empty">
                  The model didn’t suggest any changes. Try rephrasing your request.
                </div>
              ) : (
                <>
                  <div className="fl-ai-suggest-rows">
                    {entries.map(([path, value]) => (
                      <Row key={path} path={path} value={value} />
                    ))}
                  </div>
                  <div className="fl-ai-suggest-actions">
                    <button type="button" className="fl-ai-btn fl-ai-btn-ghost" onClick={assist.reset}>
                      Discard
                    </button>
                    <button
                      type="button"
                      className="fl-ai-btn fl-ai-btn-primary"
                      onClick={() => {
                        assist.apply(suggestion);
                        onClose();
                      }}
                    >
                      Apply {entries.length} change{entries.length === 1 ? "" : "s"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {!suggestion && status !== "loading" && status !== "thinking" ? (
            <ExampleHints />
          ) : null}
        </div>

        <div className="fl-ai-foot">
          <textarea
            ref={inputRef}
            className="fl-ai-input"
            value={input}
            placeholder={placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
          />
          <div className="fl-ai-input-actions">
            <span className="fl-ai-input-hint">⌘ + Enter to submit · model runs locally</span>
            <button
              type="button"
              className="fl-ai-btn fl-ai-btn-primary"
              onClick={submit}
              disabled={busy || !input.trim()}
            >
              {busy ? "Working…" : "Suggest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ path, value }: { path: string; value: unknown }): ReactNode {
  let display: string;
  if (value == null) display = String(value);
  else if (typeof value === "object") display = JSON.stringify(value);
  else display = String(value);
  return (
    <>
      <div>{path}</div>
      <div>{display}</div>
    </>
  );
}

function ExampleHints() {
  return (
    <div style={{ color: "#71717a", fontSize: 12.5 }}>
      <strong style={{ color: "#3f3f46" }}>Tips</strong>
      <ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>
        <li>Describe the user in plain language — name, age, role, preferences.</li>
        <li>Or paste data: e.g. an email signature, a LinkedIn line, a CSV row.</li>
        <li>The model never touches password / token / payment fields.</li>
        <li>You'll preview each change before it's applied.</li>
      </ul>
    </div>
  );
}
