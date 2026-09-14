import type { Hole, Part } from "./types";
import { envelopeOf, parseBeniPragma } from "./solid-spec";

type Tok =
  | { k: "num"; v: number }
  | { k: "id"; v: string }
  | { k: "op"; v: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Tok[] = [];
  const re = /([A-Za-z_][\w]*)|(\d+\.?\d*|\.\d+)|([+\-*/()[\]{},;=])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1]) out.push({ k: "id", v: m[1] });
    else if (m[2]) out.push({ k: "num", v: Number(m[2]) });
    else out.push({ k: "op", v: m[3] });
  }
  return out;
}

class Parser {
  i = 0;
  vars: Record<string, number> = { PI: Math.PI };
  holes: Hole[] = [];
  width = 80;
  height = 60;
  thick = 6;
  constructor(readonly toks: Tok[]) {}
  peek() {
    return this.toks[this.i];
  }
  eat() {
    return this.toks[this.i++];
  }
  matchOp(v: string) {
    const t = this.peek();
    if (t?.k === "op" && t.v === v) {
      this.i++;
      return true;
    }
    return false;
  }
  expr(): number {
    let v = this.term();
    while (this.peek()?.k === "op" && (this.peek()!.v === "+" || this.peek()!.v === "-")) {
      const op = this.eat().v;
      const r = this.term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  term(): number {
    let v = this.unary();
    while (this.peek()?.k === "op" && (this.peek()!.v === "*" || this.peek()!.v === "/")) {
      const op = this.eat().v;
      const r = this.unary();
      v = op === "*" ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  }
  unary(): number {
    if (this.matchOp("-")) return -this.unary();
    if (this.matchOp("+")) return this.unary();
    if (this.matchOp("(")) {
      const v = this.expr();
      this.matchOp(")");
      return v;
    }
    const t = this.eat();
    if (!t) return 0;
    if (t.k === "num") return t.v;
    if (t.k === "id") return this.vars[t.v] ?? 0;
    return 0;
  }
  vec(): number[] {
    const a: number[] = [];
    this.matchOp("[");
    if (!this.matchOp("]")) {
      a.push(this.expr());
      while (this.matchOp(",")) a.push(this.expr());
      this.matchOp("]");
    }
    return a;
  }
  namedArgs(): Record<string, number | boolean | number[]> {
    const o: Record<string, number | boolean | number[]> = {};
    this.matchOp("(");
    if (this.matchOp(")")) return o;
    do {
      const t = this.peek();
      if (t?.k === "id" && this.toks[this.i + 1]?.k === "op" && this.toks[this.i + 1].v === "=") {
        const name = this.eat().v;
        this.matchOp("=");
        if (this.peek()?.k === "op" && this.peek()!.v === "[") o[name] = this.vec();
        else if (this.peek()?.k === "id" && (this.peek()!.v === "true" || this.peek()!.v === "false"))
          o[name] = this.eat().v === "true";
        else o[name] = this.expr();
      } else if (this.peek()?.k === "op" && this.peek()!.v === "[") {
        o._ = this.vec();
      } else {
        o._n = this.expr();
      }
    } while (this.matchOp(","));
    this.matchOp(")");
    return o;
  }
  skipBlock() {
    if (!this.matchOp("{")) {
      this.stmt();
      return;
    }
    let depth = 1;
    while (this.peek() && depth) {
      const t = this.eat();
      if (t.k === "op" && t.v === "{") depth++;
      if (t.k === "op" && t.v === "}") depth--;
    }
  }
  stmt(tx = 0, ty = 0, tz = 0) {
    const t = this.peek();
    if (!t) return;
    if (t.k === "id" && this.toks[this.i + 1]?.k === "op" && this.toks[this.i + 1].v === "=") {
      const name = this.eat().v;
      this.matchOp("=");
      this.vars[name] = this.expr();
      this.matchOp(";");
      if (name === "w") this.width = this.vars[name];
      if (name === "h") this.height = this.vars[name];
      if (name === "t") this.thick = this.vars[name];
      return;
    }
    if (t.k !== "id") {
      this.eat();
      return;
    }
    const id = this.eat().v;
    if (id === "module") {
      this.eat();
      this.namedArgs();
      this.skipBlock();
      return;
    }
    if (id === "translate") {
      const a = this.namedArgs();
      const v = (a._ as number[]) || [0, 0, 0];
      this.child(tx + (v[0] ?? 0), ty + (v[1] ?? 0), tz + (v[2] ?? 0));
      return;
    }
    if (id === "rotate" || id === "color" || id === "scale" || id === "mirror") {
      this.namedArgs();
      this.child(tx, ty, tz);
      return;
    }
    if (id === "difference" || id === "union" || id === "hull" || id === "intersection") {
      this.namedArgs();
      this.matchOp("{");
      while (this.peek() && !(this.peek()?.k === "op" && this.peek()!.v === "}")) this.stmt(tx, ty, tz);
      this.matchOp("}");
      return;
    }
    if (id === "cube") {
      const a = this.namedArgs();
      const size = (a._ as number[]) || [Number(a.size) || this.width, this.height, this.thick];
      if (Array.isArray(size) && size.length >= 3) {
        this.width = size[0];
        this.height = size[1];
        this.thick = size[2];
      }
      this.matchOp(";");
      return;
    }
    if (id === "cylinder") {
      const a = this.namedArgs();
      const d = Number(a.d ?? (a.r != null ? 2 * Number(a.r) : a._n ?? 6.6));
      this.holes.push({ x: tx, y: ty, d });
      this.matchOp(";");
      return;
    }
    if (id === "sphere") {
      this.namedArgs();
      this.matchOp(";");
      return;
    }
    this.namedArgs();
    if (this.peek()?.k === "op" && this.peek()!.v === "{") this.skipBlock();
    else this.matchOp(";");
  }
  child(tx: number, ty: number, tz: number) {
    if (this.peek()?.k === "op" && this.peek()!.v === "{") {
      this.matchOp("{");
      while (this.peek() && !(this.peek()?.k === "op" && this.peek()!.v === "}")) this.stmt(tx, ty, tz);
      this.matchOp("}");
    } else this.stmt(tx, ty, tz);
  }
  run() {
    while (this.peek()) this.stmt();
  }
}

export function compileScad(src: string, name = "part"): Part {
  const p = new Parser(tokenize(src));
  try {
    p.run();
  } catch {
    /* keep whatever we parsed */
  }
  const holes = p.holes.filter((h) => h.d > 0.2 && Number.isFinite(h.x));
  const solid = parseBeniPragma(src);
  const env = solid ? envelopeOf(solid) : null;
  return {
    name,
    width: env?.width ?? Math.max(1, p.width),
    height: env?.height ?? Math.max(1, p.height),
    thick: env?.thick ?? Math.max(0.4, p.thick),
    holes,
    tiles: null,
    ask: "from OpenSCAD",
    notes: solid
      ? [`${solid.kind} from script`]
      : holes.length
        ? [`${holes.length} hole(s) from script`]
        : ["script compiled"],
    solid: solid ?? null,
  };
}
