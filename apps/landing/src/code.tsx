// Tiny, dependency-free TS/TSX syntax highlighter. Just enough for the landing page.

import { Fragment, type ReactNode } from "react";

const KEYWORDS = new Set([
  "import", "from", "const", "let", "var", "function", "return", "if", "else",
  "true", "false", "null", "undefined", "as", "type", "interface", "export",
  "default", "async", "await", "new", "for", "of", "in",
]);

type Token = { type: "ws" | "kw" | "str" | "num" | "comment" | "fn" | "ident" | "punct" | "tag" | "attr"; value: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;

    // line comment
    if (ch === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      out.push({ type: "comment", value: src.slice(i, j) });
      i = j;
      continue;
    }
    // string
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\") j += 2;
        else j++;
      }
      j = Math.min(j + 1, src.length);
      out.push({ type: "str", value: src.slice(i, j) });
      i = j;
      continue;
    }
    // number
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      out.push({ type: "num", value: src.slice(i, j) });
      i = j;
      continue;
    }
    // identifier / keyword
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j]!)) j++;
      const word = src.slice(i, j);
      // JSX-ish tags like <Field
      if (out.length > 0 && out[out.length - 1]!.value === "<") {
        out.push({ type: "tag", value: word });
      } else if (KEYWORDS.has(word)) {
        out.push({ type: "kw", value: word });
      } else if (src[j] === "(") {
        out.push({ type: "fn", value: word });
      } else {
        out.push({ type: "ident", value: word });
      }
      i = j;
      continue;
    }
    // whitespace
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j]!)) j++;
      out.push({ type: "ws", value: src.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ type: "punct", value: ch });
    i++;
  }
  return out;
}

const classFor: Record<Token["type"], string> = {
  ws: "",
  kw: "tk-keyword",
  str: "tk-string",
  num: "tk-num",
  comment: "tk-comment",
  fn: "tk-fn",
  ident: "",
  punct: "",
  tag: "tk-tag",
  attr: "tk-attr",
};

export function Highlight({ code }: { code: string }): ReactNode {
  const tokens = tokenize(code);
  return (
    <>
      {tokens.map((t, i) => {
        const cls = classFor[t.type];
        return cls ? (
          <span key={i} className={cls}>{t.value}</span>
        ) : (
          <Fragment key={i}>{t.value}</Fragment>
        );
      })}
    </>
  );
}
