import { tokenize, type Token, KEYWORDS } from "./lexer"

export interface RunResult {
  output: ConsoleLine[]
  error?: string
}

export interface ConsoleLine {
  type: "out" | "in" | "error" | "info" | "warning"
  text: string
  hint?: string
  line?: number
  variable?: string
  sourceLine?: number
}

export interface VarSnapshot {
  name: string
  type: string
  value: string
}

export interface RunOptions {
  // Called when the program needs input. Returns the user's typed value.
  requestInput: (prompt: string) => Promise<string>
  // Called each time the program writes a line.
  onOutput: (line: ConsoleLine) => void
  // Abort signal to stop runaway loops.
  signal?: { aborted: boolean }
  // Called once the program finishes with the final global variables.
  onVariables?: (vars: VarSnapshot[]) => void
  // When true, the parser requires Algoritmo/FinAlgoritmo and
  // the runtime requires variables to be declared before use.
  strictMode?: boolean
}

type Value = number | string | boolean | Value[]

interface Variable {
  value: Value
  // declared data type (entero, real, logico, caracter...) when known
  declaredType?: string
  // for arrays
  dims?: number[]
}

class PseintError extends Error {
  line: number
  hint?: string
  constructor(message: string, line: number, hint?: string) {
    super(message)
    this.line = line
    this.hint = hint
  }
}

// ---------- Parser ----------
// We build a lightweight AST then walk it.

type Node = any

class Parser {
  tokens: Token[]
  pos = 0
  functions: Record<string, Node> = {}
  errors: PseintError[] = []
  strictMode: boolean

  constructor(tokens: Token[], strictMode = false) {
    // Filter nothing; keep newlines as statement separators
    this.tokens = tokens
    this.strictMode = strictMode
  }

  reportError(message: string, line: number, hint?: string) {
    this.errors.push(new PseintError(message, line, hint))
  }

  recoverToNextStatement() {
    const syncKeywords = new Set([
      "algoritmo", "proceso", "finalgoritmo", "finproceso",
      "funcion", "subproceso", "subalgoritmo", "finfuncion", "finsubproceso",
      "escribir", "imprimir", "mostrar", "leer", "definir", "dimension", "dimensionar",
      "si", "mientras", "repetir", "para", "segun", "limpiar", "esperar",
    ])
    while (this.peek().type !== "eof") {
      if (this.peek().type === "newline") {
        this.next()
        if (this.peek().type === "keyword" && syncKeywords.has(this.peek().value.toLowerCase())) {
          return
        }
      } else {
        this.next()
      }
    }
  }

  peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]
  }
  next(): Token {
    return this.tokens[this.pos++]
  }
  isKw(v: string): boolean {
    const t = this.peek()
    return t.type === "keyword" && t.value.toLowerCase() === v
  }
  isOp(v: string): boolean {
    const t = this.peek()
    return t.type === "op" && t.value === v
  }
  skipNewlines() {
    while (this.peek().type === "newline") this.next()
  }
  expectKw(v: string) {
    if (!this.isKw(v))
      throw new PseintError(
        `Se esperaba "${v}" pero se encontró "${this.peek().value || "fin"}"`,
        this.peek().line,
        buildKeywordHint(v, this.peek()),
      )
    this.next()
  }

  parseProgram(): Node {
    const body: Node[] = []
    this.skipNewlines()
    // Optional: Algoritmo/Proceso <name> ... wrapper, and function defs
    let hasAlgorithm = false
    while (this.peek().type !== "eof") {
      this.skipNewlines()
      if (this.peek().type === "eof") break

      try {
        if (
          this.isKw("funcion") ||
          this.isKw("subproceso") ||
          this.isKw("subalgoritmo")
        ) {
          const fn = this.parseFunction()
          this.functions[fn.name.toLowerCase()] = fn
          this.skipNewlines()
          continue
        }

        if (this.isKw("algoritmo") || this.isKw("proceso")) {
          hasAlgorithm = true
          this.next() // keyword
          // name (ident or keyword-ish) until newline
          while (this.peek().type !== "newline" && this.peek().type !== "eof")
            this.next()
          const stmts = this.parseBlock(["finalgoritmo", "finproceso"])
          if (this.isKw("finalgoritmo") || this.isKw("finproceso")) this.next()
          body.push(...stmts)
          this.skipNewlines()
          continue
        }

        // Bare statements
        body.push(this.parseStatement())
      } catch (e: any) {
        if (e instanceof PseintError) {
          this.errors.push(e)
          this.recoverToNextStatement()
        } else {
          throw e
        }
      }
      this.skipNewlines()
    }
    if (this.strictMode && !hasAlgorithm) {
      this.reportError(
        'En modo estricto el programa debe comenzar con "Algoritmo" y terminar con "FinAlgoritmo".',
        this.peek().line,
        'Agregá "Algoritmo Nombre" al inicio y "FinAlgoritmo" al final del programa.',
      )
    }
    return { type: "Program", body, functions: this.functions }
  }

  parseFunction(): Node {
    this.next() // funcion / subproceso
    // Syntax forms:
    //  Funcion resultado <- nombre ( args )
    //  Funcion nombre ( args )
    let returnVar: string | null = null
    let name = ""
    // peek for "ident <-"
    if (this.peek().type === "ident" && this.peek(1).value === "<-") {
      returnVar = this.next().value
      this.next() // <-
    }
    name = this.next().value
    const params: string[] = []
    if (this.isOp("(")) {
      this.next()
      while (!this.isOp(")") && this.peek().type !== "eof") {
        if (this.peek().type === "ident") params.push(this.next().value)
        if (this.isOp(",")) this.next()
        else break
      }
      if (this.isOp(")")) this.next()
    }
    const body = this.parseBlock(["finfuncion", "finsubproceso"])
    if (this.isKw("finfuncion") || this.isKw("finsubproceso")) this.next()
    return { type: "Function", name, params, returnVar, body }
  }

  parseBlock(terminators: string[]): Node[] {
    const stmts: Node[] = []
    this.skipNewlines()
    while (this.peek().type !== "eof") {
      if (
        this.peek().type === "keyword" &&
        terminators.includes(this.peek().value.toLowerCase())
      )
        break
      stmts.push(this.parseStatement())
      this.skipNewlines()
    }
    return stmts
  }

  parseStatement(): Node {
    const t = this.peek()
    const line = t.line

    if (t.type === "keyword") {
      const kw = t.value.toLowerCase()
      switch (kw) {
        case "escribir":
        case "imprimir":
        case "mostrar":
          return this.parseEscribir()
        case "leer":
          return this.parseLeer()
        case "definir":
          return this.parseDefinir()
        case "dimension":
        case "dimensionar":
          return this.parseDimension()
        case "si":
          return this.parseSi()
        case "mientras":
          return this.parseMientras()
        case "repetir":
          return this.parseRepetir()
        case "para":
          return this.parsePara()
        case "segun":
          return this.parseSegun()
        case "limpiar":
          this.next()
          // optional "Pantalla"
          if (this.isKw("pantalla")) this.next()
          return { type: "Clear", line }
        case "esperar":
          // Esperar Tecla / Esperar <n> Segundos -> ignore
          while (this.peek().type !== "newline" && this.peek().type !== "eof")
            this.next()
          return { type: "Noop", line }
        case "finalgoritmo":
        case "finproceso":
        case "finsi":
        case "finmientras":
        case "finpara":
        case "finsegun":
        case "finfuncion":
        case "finsubproceso":
          this.next()
          this.reportError(
            `Palabra clave de cierre inesperada: "${kw}". ¿Falta abrir un bloque o está mal ubicada?`,
            line,
            `Verificá que "${kw}" tenga su correspondiente apertura (Si, Mientras, Para, etc.) y que esté correctamente anidada.`,
          )
          return { type: "Noop", line }
      }
    }

    // Assignment: ident [indices] (<- | = | :=) expr
    if (t.type === "ident") {
      // lookahead to detect assignment vs function call statement
      const save = this.pos
      const target = this.parseLValue()
      if (this.isOp("<-") || this.isOp("=") || this.isOp(":=")) {
        this.next()
        const expr = this.parseExpr()
        return { type: "Assign", target, expr, line }
      }
      // Otherwise treat as a call statement
      this.pos = save
      const call = this.parseExpr()
      return { type: "ExprStmt", expr: call, line }
    }

    const hint = buildStatementHint(t)
    this.reportError(
      `Instrucción no reconocida: "${t.value || "fin de archivo"}"`,
      line,
      hint,
    )
    while (this.peek().type !== "newline" && this.peek().type !== "eof")
      this.next()
    return { type: "Noop", line }
  }

  parseLValue(): Node {
    const name = this.next().value
    const indices: Node[] = []
    while (this.isOp("[")) {
      this.next()
      indices.push(this.parseExpr())
      while (this.isOp(",")) {
        this.next()
        indices.push(this.parseExpr())
      }
      if (this.isOp("]")) this.next()
    }
    return { type: "LValue", name, indices }
  }

  parseEscribir(): Node {
    const line = this.peek().line
    this.next()
    const args: Node[] = []
    let noNewline = false
    if (this.peek().type !== "newline" && this.peek().type !== "eof") {
      args.push(this.parseExpr())
      while (this.isOp(",")) {
        this.next()
        args.push(this.parseExpr())
      }
    }
    // "Sin Saltar" support is uncommon; skip trailing idents
    return { type: "Escribir", args, noNewline, line }
  }

  parseLeer(): Node {
    const line = this.peek().line
    this.next()
    const targets: Node[] = []
    targets.push(this.parseLValue())
    while (this.isOp(",")) {
      this.next()
      targets.push(this.parseLValue())
    }
    return { type: "Leer", targets, line }
  }

  parseDefinir(): Node {
    const line = this.peek().line
    this.next()
    const names: string[] = []
    names.push(this.next().value)
    while (this.isOp(",")) {
      this.next()
      names.push(this.next().value)
    }
    // Como <tipo>
    let varType = "real"
    if (this.isKw("como")) {
      this.next()
      varType = this.next().value.toLowerCase()
    }
    return { type: "Definir", names, varType, line }
  }

  parseDimension(): Node {
    const line = this.peek().line
    this.next()
    const decls: { name: string; dims: Node[] }[] = []
    const readOne = () => {
      const name = this.next().value
      const dims: Node[] = []
      if (this.isOp("[")) {
        this.next()
        dims.push(this.parseExpr())
        while (this.isOp(",")) {
          this.next()
          dims.push(this.parseExpr())
        }
        if (this.isOp("]")) this.next()
      } else if (this.isOp("(")) {
        this.next()
        dims.push(this.parseExpr())
        while (this.isOp(",")) {
          this.next()
          dims.push(this.parseExpr())
        }
        if (this.isOp(")")) this.next()
      }
      decls.push({ name, dims })
    }
    readOne()
    while (this.isOp(",")) {
      this.next()
      readOne()
    }
    return { type: "Dimension", decls, line }
  }

  parseSi(): Node {
    const line = this.peek().line
    this.next() // Si
    const cond = this.parseExpr()
    if (this.isKw("entonces")) this.next()
    const thenBody = this.parseBlock(["sino", "finsi"])
    let elseBody: Node[] = []
    if (this.isKw("sino")) {
      this.next()
      elseBody = this.parseBlock(["finsi"])
    }
    this.expectKw("finsi")
    return { type: "If", cond, thenBody, elseBody, line }
  }

  parseMientras(): Node {
    const line = this.peek().line
    this.next()
    const cond = this.parseExpr()
    if (this.isKw("hacer")) this.next()
    const body = this.parseBlock(["finmientras"])
    this.expectKw("finmientras")
    return { type: "While", cond, body, line }
  }

  parseRepetir(): Node {
    const line = this.peek().line
    this.next()
    const body = this.parseBlock(["hasta", "que"])
    // Hasta Que <cond>
    if (this.isKw("hasta")) this.next()
    if (this.isKw("que")) this.next()
    const cond = this.parseExpr()
    return { type: "Repeat", body, cond, line }
  }

  parsePara(): Node {
    const line = this.peek().line
    this.next() // Para
    const varName = this.next().value
    if (this.isOp("<-") || this.isOp("=") || this.isOp(":=")) this.next()
    const from = this.parseExpr()
    this.expectKw("hasta")
    const to = this.parseExpr()
    let step: Node | null = null
    if (this.isKw("con")) {
      this.next()
      if (this.isKw("paso")) this.next()
      step = this.parseExpr()
    } else if (this.isKw("paso")) {
      this.next()
      step = this.parseExpr()
    }
    if (this.isKw("hacer")) this.next()
    const body = this.parseBlock(["finpara"])
    this.expectKw("finpara")
    return { type: "For", varName, from, to, step, body, line }
  }

  parseSegun(): Node {
    const line = this.peek().line
    this.next() // Segun
    const expr = this.parseExpr()
    if (this.isKw("hacer")) this.next()
    this.skipNewlines()
    const cases: { values: Node[]; body: Node[] }[] = []
    let defaultBody: Node[] = []
    while (!this.isKw("finsegun") && this.peek().type !== "eof") {
      this.skipNewlines()
      if (this.isKw("finsegun")) break
      // "De Otro Modo:" default
      if (this.isKw("de")) {
        this.next()
        if (this.isKw("otro")) this.next()
        if (this.isKw("modo")) this.next()
        if (this.isOp(":")) this.next()
        defaultBody = this.parseCaseBody()
        continue
      }
      // value list : body
      const values: Node[] = [this.parseExpr()]
      while (this.isOp(",")) {
        this.next()
        values.push(this.parseExpr())
      }
      if (this.isOp(":")) this.next()
      const body = this.parseCaseBody()
      cases.push({ values, body })
    }
    this.expectKw("finsegun")
    return { type: "Switch", expr, cases, defaultBody, line }
  }

  parseCaseBody(): Node[] {
    const stmts: Node[] = []
    this.skipNewlines()
    // Read statements until next case label or finsegun.
    // A case label is: <expr> ":"  or "De Otro Modo"
    while (this.peek().type !== "eof" && !this.isKw("finsegun")) {
      if (this.isKw("de")) break
      // Detect "value :" by scanning current line for a top-level colon start
      // Heuristic: if line starts with number/string/ident followed eventually by ":" before newline AND it's a label.
      // Simpler: a label is a literal/ident immediately followed by ":".
      const t = this.peek()
      if (
        (t.type === "number" || t.type === "string" || t.type === "ident") &&
        this.peekAfterValueIsColon()
      ) {
        break
      }
      stmts.push(this.parseStatement())
      this.skipNewlines()
    }
    return stmts
  }

  peekAfterValueIsColon(): boolean {
    // look ahead: value (, value)* then ":" before a newline
    let p = this.pos
    const at = (o: number) => this.tokens[Math.min(p + o, this.tokens.length - 1)]
    let k = 0
    // first token is value
    if (!["number", "string", "ident"].includes(at(0).type)) return false
    k = 1
    while (true) {
      const tk = at(k)
      if (tk.type === "op" && tk.value === ":") return true
      if (tk.type === "op" && tk.value === ",") {
        k++
        if (!["number", "string", "ident"].includes(at(k).type)) return false
        k++
        continue
      }
      return false
    }
  }

  // ---- Expressions (precedence climbing) ----
  parseExpr(): Node {
    return this.parseOr()
  }
  parseOr(): Node {
    let left = this.parseAnd()
    while (this.isKw("o")) {
      this.next()
      const right = this.parseAnd()
      left = { type: "Logical", op: "o", left, right }
    }
    return left
  }
  parseAnd(): Node {
    let left = this.parseNot()
    while (this.isKw("y")) {
      this.next()
      const right = this.parseNot()
      left = { type: "Logical", op: "y", left, right }
    }
    return left
  }
  parseNot(): Node {
    if (this.isKw("no")) {
      this.next()
      const expr = this.parseNot()
      return { type: "Unary", op: "no", expr }
    }
    return this.parseComparison()
  }
  parseComparison(): Node {
    let left = this.parseAdd()
    while (
      this.isOp("=") ||
      this.isOp("==") ||
      this.isOp("<>") ||
      this.isOp("<") ||
      this.isOp(">") ||
      this.isOp("<=") ||
      this.isOp(">=")
    ) {
      const op = this.next().value
      const right = this.parseAdd()
      left = { type: "Binary", op, left, right }
    }
    return left
  }
  parseAdd(): Node {
    let left = this.parseMul()
    while (this.isOp("+") || this.isOp("-") || this.isOp("&")) {
      const op = this.next().value
      const right = this.parseMul()
      left = { type: "Binary", op, left, right }
    }
    return left
  }
  parseMul(): Node {
    let left = this.parseUnary()
    while (
      this.isOp("*") ||
      this.isOp("/") ||
      this.isOp("%") ||
      this.isKw("mod") ||
      this.isKw("div")
    ) {
      const op = this.next().value.toLowerCase()
      const right = this.parseUnary()
      left = { type: "Binary", op, left, right }
    }
    return left
  }
  parseUnary(): Node {
    if (this.isOp("-")) {
      this.next()
      return { type: "Unary", op: "-", expr: this.parseUnary() }
    }
    if (this.isOp("+")) {
      this.next()
      return this.parseUnary()
    }
    return this.parsePower()
  }
  parsePower(): Node {
    let left = this.parsePrimary()
    if (this.isOp("^")) {
      this.next()
      const right = this.parseUnary()
      left = { type: "Binary", op: "^", left, right }
    }
    return left
  }
  parsePrimary(): Node {
    const t = this.peek()
    if (t.type === "number") {
      this.next()
      return { type: "Number", value: Number.parseFloat(t.value) }
    }
    if (t.type === "string") {
      this.next()
      return { type: "String", value: t.value }
    }
    if (t.type === "keyword") {
      const kw = t.value.toLowerCase()
      if (kw === "verdadero") {
        this.next()
        return { type: "Bool", value: true }
      }
      if (kw === "falso") {
        this.next()
        return { type: "Bool", value: false }
      }
    }
    if (this.isOp("(")) {
      this.next()
      const e = this.parseExpr()
      if (this.isOp(")")) this.next()
      return e
    }
    if (t.type === "ident") {
      const name = this.next().value
      // function call
      if (this.isOp("(")) {
        this.next()
        const args: Node[] = []
        if (!this.isOp(")")) {
          args.push(this.parseExpr())
          while (this.isOp(",")) {
            this.next()
            args.push(this.parseExpr())
          }
        }
        if (this.isOp(")")) this.next()
        return { type: "Call", name, args }
      }
      // array access
      const indices: Node[] = []
      while (this.isOp("[")) {
        this.next()
        indices.push(this.parseExpr())
        while (this.isOp(",")) {
          this.next()
          indices.push(this.parseExpr())
        }
        if (this.isOp("]")) this.next()
      }
      return { type: "Var", name, indices }
    }
    throw new PseintError(
      `Expresión no válida cerca de "${t.value || "fin"}"`,
      t.line,
    )
  }
}

// ---------- Interpreter ----------

class Scope {
  vars: Record<string, Variable> = {}
  parent: Scope | null
  constructor(parent: Scope | null = null) {
    this.parent = parent
  }
  get(name: string): Variable | undefined {
    const k = name.toLowerCase()
    if (k in this.vars) return this.vars[k]
    return this.parent?.get(name)
  }
  set(name: string, v: Variable) {
    const k = name.toLowerCase()
    // assign in the scope where it exists, else current
    let s: Scope | null = this
    while (s) {
      if (k in s.vars) {
        s.vars[k] = v
        return
      }
      s = s.parent
    }
    this.vars[k] = v
  }
  declare(name: string, v: Variable) {
    this.vars[name.toLowerCase()] = v
  }
}

class Interpreter {
  program: Node
  opts: RunOptions
  steps = 0
  maxSteps = 1_000_000
  strictMode: boolean

  constructor(program: Node, opts: RunOptions) {
    this.program = program
    this.opts = opts
    this.strictMode = opts.strictMode ?? false
  }

  async run() {
    const global = new Scope()
    try {
      await this.execBlock(this.program.body, global)
    } finally {
      this.emitVariables(global)
    }
  }

  emitVariables(scope: Scope) {
    if (!this.opts.onVariables) return
    const snapshot: VarSnapshot[] = Object.entries(scope.vars).map(
      ([name, v]) => {
        let type: string
        if (Array.isArray(v.value)) {
          type = v.dims ? `Arreglo[${v.dims.join(", ")}]` : "Arreglo"
        } else if (typeof v.value === "number") {
          type = Number.isInteger(v.value) ? "Entero" : "Real"
        } else if (typeof v.value === "boolean") {
          type = "Lógico"
        } else {
          type = "Cadena"
        }
        return { name, type, value: formatValue(v.value) }
      },
    )
    this.opts.onVariables(snapshot)
  }

  tick(line: number) {
    this.steps++
    if (this.steps > this.maxSteps)
      throw new PseintError(
        "Se excedió el límite de ejecución (posible bucle infinito)",
        line,
      )
    if (this.opts.signal?.aborted)
      throw new PseintError("Ejecución detenida por el usuario", line)
  }

  async execBlock(stmts: Node[], scope: Scope) {
    for (const s of stmts) {
      const r = await this.execStmt(s, scope)
      if (r && r.kind === "return") return r
    }
    return null
  }

  async execStmt(node: Node, scope: Scope): Promise<any> {
    this.tick(node.line || 0)
    switch (node.type) {
      case "Noop":
        return
      case "Clear":
        this.opts.onOutput({ type: "info", text: "\u0001CLEAR\u0001" })
        return
      case "Definir":
        for (const n of node.names) {
          if (scope.get(n)) {
            throw new PseintError(
              `La variable "${n}" ya fue definida`,
              node.line || 0,
            )
          }
          scope.declare(n, {
            value: defaultFor(node.varType),
            declaredType: normalizeType(node.varType),
          })
        }
        return
      case "Dimension":
        for (const d of node.decls) {
          const dims = d.dims.map((e: Node) => Math.floor(this.toNum(this.eval(e, scope))))
          scope.declare(d.name, { value: makeArray(dims), dims })
        }
        return
      case "Assign": {
        const val = await this.evalAsync(node.expr, scope)
        this.assign(node.target, val, scope)
        return
      }
      case "Escribir": {
        const parts: string[] = []
        for (const a of node.args) {
          parts.push(formatValue(await this.evalAsync(a, scope)))
        }
        let variable: string | undefined
        if (node.args.length === 1 && node.args[0].type === "Var") {
          variable = formatLValue(node.args[0])
        }
        this.opts.onOutput({ type: "out", text: parts.join(""), variable, sourceLine: node.line })
        return
      }
      case "Leer": {
        for (const target of node.targets) {
          if (this.strictMode && !scope.get(target.name)) {
            throw new PseintError(
              `En modo estricto la variable "${target.name}" debe estar definida antes de Leer`,
              node.line || 0,
              `Definí la variable antes con: Definir ${target.name} Como <Tipo>`,
            )
          }
          const raw = await this.opts.requestInput("")
          const existing = scope.get(target.name)
          const declared = existing?.declaredType
          let v: Value
          if (declared === "entero" || declared === "real") {
            const t = raw.trim()
            const n = Number(t)
            if (t === "" || Number.isNaN(n))
              throw new PseintError(
                `Se esperaba un número para "${target.name}" pero se ingresó "${raw}"`,
                node.line || 0,
              )
            v = n
          } else if (declared === "logico") {
            v = parseInput(raw)
          } else if (declared === "caracter") {
            v = raw
          } else {
            v = parseInput(raw)
          }
          this.assign(target, v, scope)
          this.opts.onOutput({ type: "in", text: String(raw), variable: formatLValue(target), sourceLine: node.line })
        }
        return
      }
      case "If": {
        const c = this.toBool(await this.evalAsync(node.cond, scope))
        return await this.execBlock(c ? node.thenBody : node.elseBody, scope)
      }
      case "While": {
        while (this.toBool(await this.evalAsync(node.cond, scope))) {
          this.tick(node.line)
          const r = await this.execBlock(node.body, scope)
          if (r && r.kind === "return") return r
        }
        return
      }
      case "Repeat": {
        do {
          this.tick(node.line)
          const r = await this.execBlock(node.body, scope)
          if (r && r.kind === "return") return r
        } while (!this.toBool(await this.evalAsync(node.cond, scope)))
        return
      }
      case "For": {
        let i = this.toNum(await this.evalAsync(node.from, scope))
        const to = this.toNum(await this.evalAsync(node.to, scope))
        const step = node.step ? this.toNum(await this.evalAsync(node.step, scope)) : 1
        scope.set(node.varName, { value: i })
        if (step >= 0) {
          for (; i <= to; i += step) {
            scope.set(node.varName, { value: i })
            this.tick(node.line)
            const r = await this.execBlock(node.body, scope)
            if (r && r.kind === "return") return r
            i = this.toNum(scope.get(node.varName)!.value)
          }
        } else {
          for (; i >= to; i += step) {
            scope.set(node.varName, { value: i })
            this.tick(node.line)
            const r = await this.execBlock(node.body, scope)
            if (r && r.kind === "return") return r
            i = this.toNum(scope.get(node.varName)!.value)
          }
        }
        return
      }
      case "Switch": {
        const v = await this.evalAsync(node.expr, scope)
        for (const c of node.cases) {
          for (const ve of c.values) {
            const cv = await this.evalAsync(ve, scope)
            if (looseEq(v, cv)) {
              return await this.execBlock(c.body, scope)
            }
          }
        }
        return await this.execBlock(node.defaultBody, scope)
      }
      case "ExprStmt":
        await this.evalAsync(node.expr, scope)
        return
      default:
        throw new PseintError(`Sentencia desconocida: ${node.type}`, node.line || 0)
    }
  }

  assign(target: Node, value: Value, scope: Scope) {
    if (target.indices && target.indices.length > 0) {
      const v = scope.get(target.name)
      if (!v)
        throw new PseintError(
          `La variable "${target.name}" no está definida`,
          target.line || 0,
        )
      if (!Array.isArray(v.value))
        throw new PseintError(`"${target.name}" no es un arreglo`, target.line || 0)
      const idx = target.indices.map((e: Node) => Math.floor(this.toNum(this.eval(e, scope))))
      const checked = this.coerceToType(value, v.declaredType, target.name, target.line || 0)
      let arr: any = v.value
      for (let k = 0; k < idx.length - 1; k++) {
        if (idx[k] < 1 || idx[k] > arr.length)
          throw new PseintError(
            `Índice fuera de rango en "${target.name}" (${idx[k]})`,
            target.line || 0,
          )
        arr = arr[idx[k] - 1]
      }
      const last = idx[idx.length - 1]
      if (!Array.isArray(arr) || last < 1 || last > arr.length)
        throw new PseintError(
          `Índice fuera de rango en "${target.name}" (${last})`,
          target.line || 0,
        )
      arr[last - 1] = checked
    } else {
      const existing = scope.get(target.name)
      const declared = existing?.declaredType
      const checked = this.coerceToType(value, declared, target.name, target.line || 0)
      if (existing) {
        scope.set(target.name, {
          value: checked,
          declaredType: declared,
          dims: existing.dims,
        })
      } else {
        scope.set(target.name, { value: checked })
      }
    }
  }

  // Validate/convert a value against a declared PSeInt type.
  coerceToType(
    value: Value,
    declaredType: string | undefined,
    name: string,
    line: number,
  ): Value {
    if (!declaredType || Array.isArray(value)) return value
    switch (declaredType) {
      case "entero": {
        if (typeof value === "boolean")
          throw new PseintError(
            `No se puede asignar un valor lógico a la variable entera "${name}"`,
            line,
          )
        const n = typeof value === "number" ? value : Number(value)
        if (typeof value === "string" && (value.trim() === "" || Number.isNaN(n)))
          throw new PseintError(
            `No se puede asignar el texto "${value}" a la variable entera "${name}"`,
            line,
          )
        if (!Number.isInteger(n))
          throw new PseintError(
            `La variable "${name}" es de tipo Entero y no admite el valor decimal ${n}`,
            line,
          )
        return n
      }
      case "real": {
        if (typeof value === "boolean")
          throw new PseintError(
            `No se puede asignar un valor lógico a la variable real "${name}"`,
            line,
          )
        const n = typeof value === "number" ? value : Number(value)
        if (typeof value === "string" && (value.trim() === "" || Number.isNaN(n)))
          throw new PseintError(
            `No se puede asignar el texto "${value}" a la variable real "${name}"`,
            line,
          )
        return n
      }
      case "logico": {
        if (typeof value === "boolean") return value
        throw new PseintError(
          `La variable "${name}" es de tipo Lógico y solo admite Verdadero o Falso`,
          line,
        )
      }
      case "caracter": {
        if (typeof value === "string") return value
        return formatValue(value)
      }
      default:
        return value
    }
  }

  // Synchronous eval for simple index expressions (no calls with input)
  eval(node: Node, scope: Scope): Value {
    // delegate to async impl but only for pure expressions; calls cannot use input synchronously
    // Re-implement synchronously
    return this.evalSync(node, scope)
  }

  evalSync(node: Node, scope: Scope): Value {
    switch (node.type) {
      case "Number":
        return node.value
      case "String":
        return node.value
      case "Bool":
        return node.value
      case "Var":
        return this.readVar(node, scope, false) as Value
      case "Unary": {
        if (node.op === "-") return -this.toNum(this.evalSync(node.expr, scope))
        if (node.op === "no") return !this.toBool(this.evalSync(node.expr, scope))
        return this.evalSync(node.expr, scope)
      }
      case "Logical":
      case "Binary":
        return this.binary(node, this.evalSync(node.left, scope), this.evalSync(node.right, scope))
      case "Call":
        return this.callBuiltinSync(node, scope)
      default:
        return 0
    }
  }

  async evalAsync(node: Node, scope: Scope): Promise<Value> {
    switch (node.type) {
      case "Number":
        return node.value
      case "String":
        return node.value
      case "Bool":
        return node.value
      case "Var":
        return this.readVar(node, scope, false) as Value
      case "Unary": {
        if (node.op === "-") return -this.toNum(await this.evalAsync(node.expr, scope))
        if (node.op === "no") return !this.toBool(await this.evalAsync(node.expr, scope))
        return this.evalAsync(node.expr, scope)
      }
      case "Logical": {
        const l = this.toBool(await this.evalAsync(node.left, scope))
        if (node.op === "y" && !l) return false
        if (node.op === "o" && l) return true
        return this.toBool(await this.evalAsync(node.right, scope))
      }
      case "Binary":
        return this.binary(
          node,
          await this.evalAsync(node.left, scope),
          await this.evalAsync(node.right, scope),
        )
      case "Call":
        return await this.callFunction(node, scope)
      default:
        return 0
    }
  }

  readVar(node: Node, scope: Scope, _async: boolean): Value {
    const v = scope.get(node.name)
    if (!v)
      throw new PseintError(`La variable "${node.name}" no está definida`, node.line || 0)
    if (node.indices && node.indices.length > 0) {
      let arr: any = v.value
      for (const ie of node.indices) {
        const idx = Math.floor(this.toNum(this.evalSync(ie, scope)))
        if (!Array.isArray(arr) || arr[idx - 1] === undefined)
          throw new PseintError("Índice fuera de rango", node.line || 0)
        arr = arr[idx - 1]
      }
      return arr
    }
    return v.value
  }

  binary(node: Node, l: Value, r: Value): Value {
    const op = node.op
    switch (op) {
      case "+":
        if (typeof l === "string" || typeof r === "string")
          return formatValue(l) + formatValue(r)
        return this.toNum(l) + this.toNum(r)
      case "&":
        return formatValue(l) + formatValue(r)
      case "-":
        return this.toNum(l) - this.toNum(r)
      case "*":
        return this.toNum(l) * this.toNum(r)
      case "/": {
        const divisor = this.toNum(r)
        if (divisor === 0)
          throw new PseintError("División entre cero", node.line || 0)
        return this.toNum(l) / divisor
      }
      case "^":
        return Math.pow(this.toNum(l), this.toNum(r))
      case "%":
      case "mod": {
        const m = this.toNum(r)
        if (m === 0)
          throw new PseintError("Módulo entre cero (MOD)", node.line || 0)
        return this.toNum(l) % m
      }
      case "div": {
        const d = this.toNum(r)
        if (d === 0)
          throw new PseintError("División entera entre cero (DIV)", node.line || 0)
        return Math.floor(this.toNum(l) / d)
      }
      case "=":
      case "==":
        return looseEq(l, r)
      case "<>":
        return !looseEq(l, r)
      case "<":
        return this.cmp(l, r) < 0
      case ">":
        return this.cmp(l, r) > 0
      case "<=":
        return this.cmp(l, r) <= 0
      case ">=":
        return this.cmp(l, r) >= 0
      default:
        throw new PseintError(`Operador desconocido: ${op}`, node.line || 0)
    }
  }

  cmp(l: Value, r: Value): number {
    if (typeof l === "string" || typeof r === "string") {
      const a = formatValue(l)
      const b = formatValue(r)
      return a < b ? -1 : a > b ? 1 : 0
    }
    const a = this.toNum(l)
    const b = this.toNum(r)
    return a < b ? -1 : a > b ? 1 : 0
  }

  async callFunction(node: Node, scope: Scope): Promise<Value> {
    const name = node.name.toLowerCase()
    // user function?
    const fn = this.program.functions[name]
    if (fn) {
      const local = new Scope()
      for (let k = 0; k < fn.params.length; k++) {
        const arg = node.args[k] ? await this.evalAsync(node.args[k], scope) : 0
        local.declare(fn.params[k], { value: arg })
      }
      if (fn.returnVar) local.declare(fn.returnVar, { value: 0 })
      await this.execBlock(fn.body, local)
      if (fn.returnVar) return local.get(fn.returnVar)?.value ?? 0
      return 0
    }
    // builtin
    const args = await Promise.all(node.args.map((a: Node) => this.evalAsync(a, scope)))
    return this.builtin(name, args, node.line || 0)
  }

  callBuiltinSync(node: Node, scope: Scope): Value {
    const name = node.name.toLowerCase()
    const fn = this.program.functions[name]
    if (fn) {
      // limited: sync user fn (used inside index exprs)
      const local = new Scope()
      for (let k = 0; k < fn.params.length; k++) {
        const arg = node.args[k] ? this.evalSync(node.args[k], scope) : 0
        local.declare(fn.params[k], { value: arg })
      }
      if (fn.returnVar) local.declare(fn.returnVar, { value: 0 })
      // run synchronously (no input) - best effort
      void this.execBlock(fn.body, local)
      if (fn.returnVar) return local.get(fn.returnVar)?.value ?? 0
      return 0
    }
    const args = node.args.map((a: Node) => this.evalSync(a, scope))
    return this.builtin(name, args, node.line || 0)
  }

  builtin(name: string, args: Value[], line: number): Value {
    const n = (i: number) => this.toNum(args[i])
    const s = (i: number) => formatValue(args[i])
    switch (name) {
      case "raiz":
        return Math.sqrt(n(0))
      case "abs":
        return Math.abs(n(0))
      case "trunc":
        return Math.trunc(n(0))
      case "redon":
      case "redondear":
        return Math.round(n(0))
      case "sen":
      case "seno":
        return Math.sin((n(0) * Math.PI) / 180)
      case "cos":
      case "coseno":
        return Math.cos((n(0) * Math.PI) / 180)
      case "tan":
      case "tangente":
        return Math.tan((n(0) * Math.PI) / 180)
      case "asen":
        return (Math.asin(n(0)) * 180) / Math.PI
      case "acos":
        return (Math.acos(n(0)) * 180) / Math.PI
      case "atan":
        return (Math.atan(n(0)) * 180) / Math.PI
      case "exp":
        return Math.exp(n(0))
      case "ln":
        return Math.log(n(0))
      case "pi":
        return Math.PI
      case "azar":
        return Math.floor(Math.random() * n(0))
      case "aleatorio":
        return Math.floor(Math.random() * (n(1) - n(0) + 1)) + n(0)
      case "longitud":
        return s(0).length
      case "mayusculas":
        return s(0).toUpperCase()
      case "minusculas":
        return s(0).toLowerCase()
      case "subcadena": {
        // Subcadena(texto, desde, hasta) 0-indexed inclusive in PSeInt
        const str = s(0)
        const from = n(1)
        const to = n(2)
        return str.substring(from, to + 1)
      }
      case "concatenar":
        return s(0) + s(1)
      case "convertiratexto":
        return formatValue(args[0])
      case "convertiranumero":
        return Number.parseFloat(s(0)) || 0
      case "esnumero":
        return !Number.isNaN(Number.parseFloat(s(0)))
      default:
        throw new PseintError(`Función desconocida: "${name}"`, line)
    }
  }

  toNum(v: Value): number {
    if (typeof v === "number") return v
    if (typeof v === "boolean") return v ? 1 : 0
    const n = Number.parseFloat(v as string)
    if (Number.isNaN(n)) return 0
    return n
  }
  toBool(v: Value): boolean {
    if (typeof v === "boolean") return v
    if (typeof v === "number") return v !== 0
    const s = (v as string).toLowerCase()
    return s === "verdadero" || s === "true" || s === "1"
  }
}

// ---------- helpers ----------

function defaultFor(type: string): Value {
  if (["logico", "logicos"].includes(type)) return false
  if (["caracter", "caracteres", "texto", "cadena"].includes(type)) return ""
  return 0
}

// Map any PSeInt type spelling to a canonical kind used for validation.
function normalizeType(type: string): string | undefined {
  const t = (type || "").toLowerCase()
  if (["entero", "enteros"].includes(t)) return "entero"
  if (["real", "reales", "numero", "numerico"].includes(t)) return "real"
  if (["logico", "logicos"].includes(t)) return "logico"
  if (["caracter", "caracteres", "texto", "cadena"].includes(t)) return "caracter"
  return undefined
}

function makeArray(dims: number[]): Value {
  if (dims.length === 0) return 0
  const [first, ...rest] = dims
  const arr: Value[] = []
  for (let i = 0; i < first; i++) {
    arr.push(rest.length ? (makeArray(rest) as Value) : 0)
  }
  return arr
}

function parseInput(raw: string): Value {
  const t = raw.trim()
  if (t === "") return ""
  const lower = t.toLowerCase()
  if (lower === "verdadero") return true
  if (lower === "falso") return false
  const n = Number(t)
  if (!Number.isNaN(n) && t !== "") return n
  return raw
}

function formatValue(v: Value): string {
  if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO"
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v)
    // Round away floating-point noise (e.g. 0.49999999999 -> 0.5)
    const rounded = Math.round(v * 1e10) / 1e10
    return String(rounded)
  }
  if (Array.isArray(v)) return "[" + v.map(formatValue).join(", ") + "]"
  return String(v)
}

function formatLValue(target: Node): string {
  let name = target.name
  if (target.indices && target.indices.length > 0) {
    const idxStr = target.indices
      .map((e: Node) => {
        if (e.type === "Number") return String(e.value)
        if (e.type === "Var") return e.name
        return "?"
      })
      .join(", ")
    name += `[${idxStr}]`
  }
  return name
}

function looseEq(a: Value, b: Value): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b)
  }
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b)
  }
  return formatValue(a) === formatValue(b)
}

function buildKeywordHint(expected: string, found: Token): string | undefined {
  const foundVal = found.value.toLowerCase()
  if ((expected === "hacer" || expected === "finmientras") && foundVal === "entonces") {
    return `La palabra clave "${expected}" se usa en bucles (Mientras, Para, Segun). "Entonces" solo se usa en condicionales (Si). Ejemplo: Mientras opcion <> 5 Hacer`
  }
  if (expected === "finmientras" && foundVal === "finsi") {
    return `El bloque Mientras ... Hacer se cierra con "FinMientras", no con "FinSi". Verificá que cada bloque esté correctamente anidado.`
  }
  if (expected === "finsi" && foundVal === "finmientras") {
    return `El bloque Si ... Entonces se cierra con "FinSi", no con "FinMientras". Verificá que cada bloque esté correctamente anidado.`
  }
  if (expected === "hacer" && found.type !== "keyword") {
    return `Después de la condición de un bucle o estructura Segun, debe ir la palabra clave "Hacer".`
  }
  if (expected === "finalgoritmo" || expected === "finproceso") {
    return `Cada Algoritmo/Proceso debe terminar con "FinAlgoritmo" / "FinProceso". Verificá que no falte el cierre.`
  }
  return undefined
}

function buildStatementHint(token: Token): string | undefined {
  const val = token.value.toLowerCase()
  if (val === "opcion" || val === "opccion" || val === "option") {
    return `"${token.value}" parece ser una variable. Asegurate de que esté dentro de una estructura válida (por ejemplo, Mientras, Si, Asignación).`
  }
  // Check for misspelled keywords
  const keywords = Array.from(KEYWORDS)
  const similar = keywords.find((k) => levenshteinDistance(k, val) <= 2)
  if (similar) {
    return `¿Quisiste escribir "${similar}"? La palabra "${token.value}" no está reconocida como instrucción válida.`
  }
  return undefined
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
            )
    }
  }
  return matrix[b.length][a.length]
}

function runtimeHint(message: string): string | undefined {
  if (message.includes("no está definida")) {
    return "Recordá definir las variables antes de usarlas con: Definir nombre Como Tipo"
  }
  if (message.includes("División entre cero")) {
    return "Verificá que el divisor no sea cero antes de dividir. Podés usar una condición (Si divisor <> 0 Entonces)."
  }
  if (message.includes("Módulo entre cero")) {
    return "El operador MOD no permite divisor cero. Verificá la condición antes de calcular el resto."
  }
  if (message.includes("División entera entre cero")) {
    return "El operador DIV no permite divisor cero. Verificá la condición antes de calcular la división entera."
  }
  if (message.includes("límite de ejecución")) {
    return "Revisá las condiciones de tus bucles (Mientras, Para, Repetir) para asegurarte de que terminen. ¿Falta actualizar la variable de control dentro del bucle?"
  }
  if (message.includes("Índice fuera de rango")) {
    return "Los arreglos en PSeInt empiezan en el índice 1. Verificá que el índice esté entre 1 y el tamaño declarado."
  }
  if (message.includes("ya fue definida")) {
    return "No podés definir la misma variable dos veces en el mismo alcance. Usá la variable directamente sin redefinirla."
  }
  if (message.includes("Se esperaba un número")) {
    return "Asegurate de ingresar solo números cuando el programa los solicita. Los textos deben ir entre comillas."
  }
  if (message.includes("Función desconocida")) {
    return "Verificá el nombre de la función. Las funciones disponibles incluyen: raiz, abs, trunc, redon, sen, cos, tan, ln, exp, longitud, mayusculas, minusculas, subcadena, concatenar, convertiratexto, convertiranumero, esnumero, azar, aleatorio."
  }
  return undefined
}

export function parsePseint(
  source: string,
  strictMode = false,
): {
  program: Node | null
  errors: { message: string; line?: number; hint?: string }[]
} {
  try {
    const tokens = tokenize(source)
    const parser = new Parser(tokens, strictMode)
    const program = parser.parseProgram()
    const errors = parser.errors.map((e) => ({
      message: e.message,
      line: e.line,
      hint: e.hint,
    }))
    return { program, errors }
  } catch (e: any) {
    const line = e instanceof PseintError ? e.line : undefined
    const hint = e instanceof PseintError ? e.hint : undefined
    return {
      program: null,
      errors: [{ message: e.message, line, hint }],
    }
  }
}

export async function runPseint(source: string, opts: RunOptions): Promise<void> {
  const { program, errors } = parsePseint(source, opts.strictMode)

  if (errors.length > 0) {
    for (const err of errors) {
      opts.onOutput({
        type: "error",
        text: `Error de sintaxis${err.line ? ` (línea ${err.line})` : ""}: ${err.message}`,
        hint: err.hint,
        line: err.line,
      })
    }
    return
  }

  if (!program) return

  try {
    const interp = new Interpreter(program, opts)
    await interp.run()
  } catch (e: any) {
    const line = e instanceof PseintError ? e.line : undefined
    const hint = e instanceof PseintError ? e.hint : runtimeHint(e.message)
    opts.onOutput({
      type: "error",
      text: `Error de ejecución${line ? ` (línea ${line})` : ""}: ${e.message}`,
      hint,
      line,
    })
  }
}
