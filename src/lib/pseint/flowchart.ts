import { parsePseint } from "./interpreter"

export interface FlowNode {
  kind: "start" | "end" | "process" | "io" | "decision" | "loopback" | "label"
  text: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  fromX?: number
  fromY?: number
  toX?: number
  toY?: number
}

interface LayoutResult {
  nodes: FlowNode[]
  height: number
}

const CX = 250
const ROW_H = 70
const PROC_W = 200
const PROC_H = 40
const IO_W = 200
const IO_H = 40
const DEC_W = 160
const DEC_H = 60
const START_W = 140
const START_H = 40

function exprToString(node: any): string {
  if (!node) return "?"
  switch (node.type) {
    case "Number":
      return String(node.value)
    case "String":
      return `"${node.value}"`
    case "Bool":
      return node.value ? "Verdadero" : "Falso"
    case "Var":
      if (node.indices?.length) {
        return `${node.name}[${node.indices.map(exprToString).join(", ")}]`
      }
      return node.name
    case "LValue":
      if (node.indices?.length) {
        return `${node.name}[${node.indices.map(exprToString).join(", ")}]`
      }
      return node.name
    case "Call":
      return `${node.name}(${node.args.map(exprToString).join(", ")})`
    case "Unary":
      return `${node.op} ${exprToString(node.expr)}`
    case "Binary":
    case "Logical":
      return `${exprToString(node.left)} ${node.op} ${exprToString(node.right)}`
    default:
      return "?"
  }
}

function stmtToLabel(stmt: any): string {
  switch (stmt.type) {
    case "Escribir":
      return `Escribir ${stmt.args.map(exprToString).join(", ")}`
    case "Leer":
      return `Leer ${stmt.targets.map((t: any) => exprToString(t)).join(", ")}`
    case "Assign":
      return `${exprToString(stmt.target)} <- ${exprToString(stmt.expr)}`
    case "Definir":
      return `Definir ${stmt.names.join(", ")}`
    case "Dimension":
      return `Dimensionar ${stmt.decls.map((d: any) => d.name).join(", ")}`
    case "ExprStmt":
      return exprToString(stmt.expr)
    case "Clear":
      return "Limpiar Pantalla"
    case "If":
      return exprToString(stmt.cond)
    case "While":
      return exprToString(stmt.cond)
    case "For":
      return `${stmt.varName} = ${exprToString(stmt.from)} .. ${exprToString(stmt.to)}`
    case "Repeat":
      return exprToString(stmt.cond)
    case "Switch":
      return `Según ${exprToString(stmt.expr)}`
    case "Function":
      return `Función ${stmt.name}`
    case "Noop":
      return ""
    default:
      return stmt.type
  }
}

function layoutBlock(stmts: any[], startY: number): LayoutResult {
  const nodes: FlowNode[] = []
  let y = startY

  for (const stmt of stmts) {
    if (!stmt || stmt.type === "Noop") continue

    switch (stmt.type) {
      case "Escribir":
      case "Leer": {
        nodes.push({
          kind: "io",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: IO_W,
          height: IO_H,
        })
        y += ROW_H
        break
      }
      case "Assign":
      case "Definir":
      case "Dimension":
      case "ExprStmt":
      case "Clear": {
        const text = stmtToLabel(stmt)
        if (text) {
          nodes.push({
            kind: "process",
            text,
            x: CX,
            y,
            width: PROC_W,
            height: PROC_H,
          })
          y += ROW_H
        }
        break
      }
      case "If": {
        nodes.push({
          kind: "decision",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: DEC_W,
          height: DEC_H,
        })
        y += ROW_H
        const thenStart = y
        nodes.push({
          kind: "label",
          text: "Sí",
          x: CX - 80,
          y: y - ROW_H / 2,
          width: 0,
          height: 0,
          label: "Sí",
        })
        const thenRes = layoutBlock(stmt.thenBody || [], y)
        nodes.push(...thenRes.nodes)
        y += thenRes.height
        if (stmt.elseBody?.length) {
          nodes.push({
            kind: "label",
            text: "No",
            x: CX + 80,
            y: thenStart - ROW_H / 2,
            width: 0,
            height: 0,
            label: "No",
          })
          const elseRes = layoutBlock(stmt.elseBody, y)
          nodes.push(...elseRes.nodes)
          y += elseRes.height
        }
        break
      }
      case "While": {
        const loopY = y
        nodes.push({
          kind: "decision",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: DEC_W,
          height: DEC_H,
        })
        y += ROW_H
        const bodyRes = layoutBlock(stmt.body || [], y)
        nodes.push(...bodyRes.nodes)
        y += bodyRes.height
        nodes.push({
          kind: "loopback",
          text: "",
          x: CX + 120,
          y: y - ROW_H / 2,
          width: 0,
          height: 0,
          fromX: CX + 120,
          fromY: y - ROW_H / 2,
          toX: CX + 120,
          toY: loopY + DEC_H / 2,
        })
        break
      }
      case "For": {
        nodes.push({
          kind: "process",
          text: `${stmt.varName} <- ${exprToString(stmt.from)}`,
          x: CX,
          y,
          width: PROC_W,
          height: PROC_H,
        })
        y += ROW_H
        const loopY = y
        nodes.push({
          kind: "decision",
          text: `${stmt.varName} <= ${exprToString(stmt.to)}`,
          x: CX,
          y,
          width: DEC_W,
          height: DEC_H,
        })
        y += ROW_H
        const bodyRes = layoutBlock(stmt.body || [], y)
        nodes.push(...bodyRes.nodes)
        y += bodyRes.height
        nodes.push({
          kind: "loopback",
          text: "",
          x: CX + 120,
          y: y - ROW_H / 2,
          width: 0,
          height: 0,
          fromX: CX + 120,
          fromY: y - ROW_H / 2,
          toX: CX + 120,
          toY: loopY + DEC_H / 2,
        })
        break
      }
      case "Repeat": {
        const loopY = y
        const bodyRes = layoutBlock(stmt.body || [], y)
        nodes.push(...bodyRes.nodes)
        y += bodyRes.height
        nodes.push({
          kind: "decision",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: DEC_W,
          height: DEC_H,
        })
        y += ROW_H
        nodes.push({
          kind: "loopback",
          text: "",
          x: CX + 120,
          y: y - ROW_H / 2,
          width: 0,
          height: 0,
          fromX: CX + 120,
          fromY: y - ROW_H / 2,
          toX: CX + 120,
          toY: loopY + DEC_H / 2,
        })
        break
      }
      case "Switch": {
        nodes.push({
          kind: "decision",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: DEC_W,
          height: DEC_H,
        })
        y += ROW_H
        for (const c of stmt.cases || []) {
          const caseRes = layoutBlock(c.body || [], y)
          nodes.push(...caseRes.nodes)
          y += caseRes.height
        }
        if (stmt.defaultBody?.length) {
          const defRes = layoutBlock(stmt.defaultBody, y)
          nodes.push(...defRes.nodes)
          y += defRes.height
        }
        break
      }
      case "Function": {
        nodes.push({
          kind: "process",
          text: stmtToLabel(stmt),
          x: CX,
          y,
          width: PROC_W,
          height: PROC_H,
        })
        y += ROW_H
        const bodyRes = layoutBlock(stmt.body || [], y)
        nodes.push(...bodyRes.nodes)
        y += bodyRes.height
        nodes.push({
          kind: "process",
          text: "Retornar",
          x: CX,
          y,
          width: PROC_W,
          height: PROC_H,
        })
        y += ROW_H
        break
      }
      default:
        break
    }
  }

  return { nodes, height: y - startY }
}

export function generateFlowchart(source: string): {
  nodes: FlowNode[]
  errors: string[]
  viewHeight: number
} {
  const { program, errors } = parsePseint(source)
  if (errors.length || !program) {
    return {
      nodes: [],
      errors: errors.map((e) => `Línea ${e.line ?? "?"}: ${e.message}`),
      viewHeight: 100,
    }
  }

  const nodes: FlowNode[] = []
  let y = 40
  nodes.push({
    kind: "start",
    text: "Inicio",
    x: CX,
    y,
    width: START_W,
    height: START_H,
  })
  y += ROW_H

  const bodyRes = layoutBlock(program.body || [], y)
  nodes.push(...bodyRes.nodes)
  y += bodyRes.height

  nodes.push({
    kind: "end",
    text: "Fin",
    x: CX,
    y,
    width: START_W,
    height: START_H,
  })

  return {
    nodes,
    errors: [],
    viewHeight: y + 60,
  }
}
