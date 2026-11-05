const FUNCTIONS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  sum: (a) => a.reduce((x, y) => x + y, 0),
  avg: (a) => a.reduce((x, y) => x + y, 0) / a.length,
  median: (a) => {
    const s = [...a].sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  },
  round: ([x, digits = 0]) => {
    const f = 10 ** digits;
    return Math.round(x * f) / f;
  },
  floor: ([x]) => Math.floor(x),
  ceil: ([x]) => Math.ceil(x),
  abs: ([x]) => Math.abs(x),
  sqrt: ([x]) => Math.sqrt(x),
};

export const CALCULATOR_FUNCTIONS = Object.keys(FUNCTIONS);

const TOKEN = /\s*(\d+(?:\.\d+)?|[a-z_]+|[-+*/%^(),])/y;

function tokenize(expression: string) {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < expression.length) {
    if (/^\s*$/.test(expression.slice(TOKEN.lastIndex))) break;
    const at = TOKEN.lastIndex;
    const match = TOKEN.exec(expression);
    if (!match) {
      throw new Error(`Unexpected "${expression.slice(at).trim()[0]}".`);
    }
    tokens.push(match[1]);
  }
  return tokens;
}

// A small recursive-descent parser instead of eval, so the model can only
// do arithmetic.
export function calculate(expression: string) {
  const tokens = tokenize(expression.toLowerCase());
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (expected?: string) => {
    const token = tokens[pos++];
    if (expected && token !== expected) {
      throw new Error(`Expected "${expected}" but got "${token ?? "end"}".`);
    }
    return token;
  };

  function expr(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      value = take() === "+" ? value + term() : value - term();
    }
    return value;
  }

  function term(): number {
    let value = unary();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = take();
      const right = unary();
      value =
        op === "*" ? value * right : op === "/" ? value / right : value % right;
    }
    return value;
  }

  function unary(): number {
    if (peek() === "-") {
      take();
      return -unary();
    }
    if (peek() === "+") {
      take();
      return unary();
    }
    return power();
  }

  function power(): number {
    const base = primary();
    if (peek() !== "^") return base;
    take();
    return base ** unary();
  }

  function primary(): number {
    const token = take();
    if (token === undefined) throw new Error("The expression ended early.");
    if (token === "(") {
      const value = expr();
      take(")");
      return value;
    }
    if (/^\d/.test(token)) return Number(token);
    const fn = FUNCTIONS[token];
    if (!fn) {
      throw new Error(
        `Unknown name "${token}". Functions: ${CALCULATOR_FUNCTIONS.join(", ")}.`,
      );
    }
    take("(");
    const args = [expr()];
    while (peek() === ",") {
      take();
      args.push(expr());
    }
    take(")");
    return fn(args);
  }

  const value = expr();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]}".`);
  if (!Number.isFinite(value)) {
    throw new Error("The result isn't a finite number.");
  }
  return Math.round(value * 1e10) / 1e10;
}
