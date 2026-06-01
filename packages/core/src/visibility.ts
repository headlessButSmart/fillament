// A tiny, safe expression evaluator for `visibleWhen` strings.
// Supports: identifiers (dot paths), literals (string, number, boolean, null, undefined),
// operators === !== == != > >= < <= && || !, parentheses.
// Intentionally NOT a general-purpose JS parser. No member calls, no arithmetic.

import { getValueAtPath } from "./path.js";

type Token =
  | { type: "ident"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "bool"; value: boolean }
  | { type: "null" }
  | { type: "undefined" }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let str = "";
      while (j < input.length && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < input.length) {
          str += input[j + 1];
          j += 2;
        } else {
          str += input[j];
          j++;
        }
      }
      if (j >= input.length) throw new Error("Unterminated string literal");
      tokens.push({ type: "string", value: str });
      i = j + 1;
      continue;
    }
    // operators
    const two = input.slice(i, i + 3);
    const twoCh = input.slice(i, i + 2);
    if (two === "===" || two === "!==") {
      tokens.push({ type: "op", value: two });
      i += 3;
      continue;
    }
    if (
      twoCh === "==" ||
      twoCh === "!=" ||
      twoCh === ">=" ||
      twoCh === "<=" ||
      twoCh === "&&" ||
      twoCh === "||"
    ) {
      tokens.push({ type: "op", value: twoCh });
      i += 2;
      continue;
    }
    if (ch === ">" || ch === "<" || ch === "!") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    // number
    if ((ch >= "0" && ch <= "9") || (ch === "-" && /[0-9]/.test(input[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < input.length && /[0-9.]/.test(input[j]!)) j++;
      tokens.push({ type: "number", value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }
    // identifier / keyword
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_$.]/.test(input[j]!)) j++;
      const word = input.slice(i, j);
      if (word === "true" || word === "false") {
        tokens.push({ type: "bool", value: word === "true" });
      } else if (word === "null") {
        tokens.push({ type: "null" });
      } else if (word === "undefined") {
        tokens.push({ type: "undefined" });
      } else {
        tokens.push({ type: "ident", value: word });
      }
      i = j;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in expression`);
  }
  return tokens;
}

type Node =
  | { kind: "literal"; value: unknown }
  | { kind: "ident"; path: string }
  | { kind: "unary"; op: "!"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private take(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): Node {
    const node = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new Error("Unexpected trailing tokens in expression");
    }
    return node;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.peek()?.type === "op" && (this.peek() as any).value === "||") {
      this.take();
      const right = this.parseAnd();
      left = { kind: "binary", op: "||", left, right };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseEquality();
    while (this.peek()?.type === "op" && (this.peek() as any).value === "&&") {
      this.take();
      const right = this.parseEquality();
      left = { kind: "binary", op: "&&", left, right };
    }
    return left;
  }

  private parseEquality(): Node {
    let left = this.parseComparison();
    while (
      this.peek()?.type === "op" &&
      ["===", "!==", "==", "!="].includes((this.peek() as any).value)
    ) {
      const op = (this.take() as any).value as string;
      const right = this.parseComparison();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseComparison(): Node {
    let left = this.parseUnary();
    while (
      this.peek()?.type === "op" &&
      [">", ">=", "<", "<="].includes((this.peek() as any).value)
    ) {
      const op = (this.take() as any).value as string;
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.peek()?.type === "op" && (this.peek() as any).value === "!") {
      this.take();
      return { kind: "unary", op: "!", arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const tok = this.take();
    if (!tok) throw new Error("Unexpected end of expression");
    switch (tok.type) {
      case "lparen": {
        const node = this.parseOr();
        const close = this.take();
        if (!close || close.type !== "rparen") throw new Error("Missing )");
        return node;
      }
      case "string":
      case "number":
      case "bool":
        return { kind: "literal", value: (tok as any).value };
      case "null":
        return { kind: "literal", value: null };
      case "undefined":
        return { kind: "literal", value: undefined };
      case "ident":
        return { kind: "ident", path: tok.value };
      default:
        throw new Error(`Unexpected token in expression`);
    }
  }
}

function evalNode(node: Node, values: unknown): unknown {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "ident":
      return getValueAtPath(values, node.path);
    case "unary":
      return !evalNode(node.arg, values);
    case "binary": {
      // short-circuit logical operators
      if (node.op === "&&") {
        const l = evalNode(node.left, values);
        return l ? evalNode(node.right, values) : l;
      }
      if (node.op === "||") {
        const l = evalNode(node.left, values);
        return l ? l : evalNode(node.right, values);
      }
      const l = evalNode(node.left, values);
      const r = evalNode(node.right, values);
      switch (node.op) {
        case "===":
          return l === r;
        case "!==":
          return l !== r;
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case ">":
          return (l as any) > (r as any);
        case ">=":
          return (l as any) >= (r as any);
        case "<":
          return (l as any) < (r as any);
        case "<=":
          return (l as any) <= (r as any);
      }
      throw new Error(`Unknown operator ${node.op}`);
    }
  }
}

const cache = new Map<string, Node>();

export function compileVisibilityExpression(expr: string): (values: unknown) => boolean {
  let node = cache.get(expr);
  if (!node) {
    node = new Parser(tokenize(expr)).parse();
    cache.set(expr, node);
  }
  return (values: unknown) => Boolean(evalNode(node!, values));
}

export type VisibilityPredicate<TValues> =
  | string
  | ((ctx: { values: TValues }) => boolean);

export function resolveVisibility<TValues>(
  predicate: VisibilityPredicate<TValues> | undefined,
  values: TValues
): boolean {
  if (predicate == null) return true;
  if (typeof predicate === "string") {
    try {
      return compileVisibilityExpression(predicate)(values);
    } catch {
      return true;
    }
  }
  return predicate({ values });
}
