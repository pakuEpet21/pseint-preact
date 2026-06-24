export type TokenType =
  | "number"
  | "string"
  | "ident"
  | "keyword"
  | "op"
  | "newline"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// PSeInt keywords (stored lowercase for case-insensitive matching)
export const KEYWORDS = new Set([
  "algoritmo",
  "finalgoritmo",
  "proceso",
  "finproceso",
  "escribir",
  "imprimir",
  "mostrar",
  "leer",
  "ingresar",
  "definir",
  "dimension",
  "dimensionar",
  "como",
  "entero",
  "enteros",
  "real",
  "reales",
  "numerico",
  "logico",
  "logicos",
  "caracter",
  "caracteres",
  "texto",
  "cadena",
  "si",
  "entonces",
  "sino",
  "finsi",
  "segun",
  "finsegun",
  "de",
  "otro",
  "modo",
  "mientras",
  "hacer",
  "finmientras",
  "repetir",
  "hasta",
  "que",
  "para",
  "con",
  "paso",
  "finpara",
  "funcion",
  "subproceso",
  "subalgoritmo",
  "finfuncion",
  "finsubproceso",
  "verdadero",
  "falso",
  "y",
  "o",
  "no",
  "mod",
  "div",
  "caso",
  "esperar",
  "tecla",
  "segundo",
  "segundos",
  "limpiar",
  "pantalla",
]);

const TWO_CHAR_OPS = ["<-", "<=", ">=", "<>", "==", ":="];

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type: TokenType, value: string) => {
    tokens.push({ type, value, line, col });
  };

  while (i < src.length) {
    const ch = src[i];

    // Newlines
    if (ch === "\n") {
      push("newline", "\n");
      i++;
      line++;
      col = 1;
      continue;
    }

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      col++;
      continue;
    }

    // Comments: //  or  #
    if ((ch === "/" && src[i + 1] === "/") || ch === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startCol = col;
      i++;
      col++;
      let str = "";
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\n") break;
        str += src[i];
        i++;
        col++;
      }
      i++; // closing quote
      col++;
      tokens.push({ type: "string", value: str, line, col: startCol });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      const startCol = col;
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i];
        i++;
        col++;
      }
      tokens.push({ type: "number", value: num, line, col: startCol });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ_]/.test(ch)) {
      const startCol = col;
      let id = "";
      while (i < src.length && /[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ_]/.test(src[i])) {
        id += src[i];
        i++;
        col++;
      }
      const lower = id.toLowerCase();
      tokens.push({
        type: KEYWORDS.has(lower) ? "keyword" : "ident",
        value: id,
        line,
        col: startCol,
      });
      continue;
    }

    // Two-char operators
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      push("op", two);
      i += 2;
      col += 2;
      continue;
    }

    // Single-char operators
    if ("+-*/^%=<>(),[]&".includes(ch)) {
      push("op", ch);
      i++;
      col++;
      continue;
    }

    // Unknown char - skip
    i++;
    col++;
  }

  push("eof", "");
  return tokens;
}
