import { parsePseint } from "./interpreter";

export interface FlowNode {
  kind: "start" | "end" | "process" | "io" | "decision" | "merge";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  /** True for Definir nodes that can be hidden via toggle. */
  isDeclaration?: boolean;
}

export interface FlowArrow {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  label?: string;
  dashed?: boolean;
  via?: { x: number; y: number }[];
}

export interface FlowchartResult {
  nodes: FlowNode[];
  arrows: FlowArrow[];
  errors: string[];
  viewBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export const COLORS = {
  startEnd: "#0f9b6c",
  processStroke: "var(--border, #475569)",
  ioStroke: "#3b82f6",
  decisionStroke: "#f59e0b",
  arrowTrue: "#22c55e",
  arrowFalse: "#ef4444",
  arrowLoop: "#a855f7",
  arrowNormal: "var(--border, #64748b)",
  text: "var(--foreground, #e2e8f0)",
};

const ROW_H = 80;
const BRANCH_OFFSET_X = 150;
const PROC_W = 180;
const PROC_H = 36;
const IO_W = 180;
const IO_H = 36;
const DEC_W = 150;
const DEC_H = 52;
const START_W = 120;
const START_H = 36;
const MERGE_R = 5;

function exprToString(node: any): string {
  if (!node) return "?";
  switch (node.type) {
    case "Number":
      return String(node.value);
    case "String":
      return `"${node.value}"`;
    case "Bool":
      return node.value ? "Verdadero" : "Falso";
    case "Var":
      return node.indices?.length
        ? `${node.name}[${node.indices.map(exprToString).join(", ")}]`
        : node.name;
    case "LValue":
      return node.indices?.length
        ? `${node.name}[${node.indices.map(exprToString).join(", ")}]`
        : node.name;
    case "Call":
      return `${node.name}(${node.args.map(exprToString).join(", ")})`;
    case "Unary":
      return `${node.op} ${exprToString(node.expr)}`;
    case "Binary":
    case "Logical":
      return `${exprToString(node.left)} ${node.op} ${exprToString(node.right)}`;
    default:
      return "?";
  }
}

function stmtToLabel(stmt: any): string {
  switch (stmt.type) {
    case "Escribir":
      return `Escribir ${stmt.args.map(exprToString).join(", ")}`;
    case "Leer":
      return `Leer ${stmt.targets.map((t: any) => exprToString(t)).join(", ")}`;
    case "Assign":
      return `${exprToString(stmt.target)} <- ${exprToString(stmt.expr)}`;
    case "Definir":
      return `Definir ${stmt.names.join(", ")}`;
    case "Dimension":
      return `Dimensionar ${stmt.decls.map((d: any) => d.name).join(", ")}`;
    case "ExprStmt":
      return exprToString(stmt.expr);
    case "Clear":
      return "Limpiar Pantalla";
    case "If":
      return exprToString(stmt.cond);
    case "While":
      return exprToString(stmt.cond);
    case "For":
      return `${stmt.varName} = ${exprToString(stmt.from)} .. ${exprToString(stmt.to)}`;
    case "Repeat":
      return exprToString(stmt.cond);
    case "Switch":
      return `Según ${exprToString(stmt.expr)}`;
    case "Function":
      return `Función ${stmt.name}`;
    case "Noop":
      return "";
    default:
      return stmt.type;
  }
}

interface LayoutResult {
  nodes: FlowNode[];
  arrows: FlowArrow[];
  height: number;
  firstNode: FlowNode | null;
  lastNode: FlowNode | null;
}

function connectNodes(a: FlowNode, b: FlowNode, color?: string): FlowArrow {
  return {
    fromX: a.x,
    fromY: a.y + a.height / 2,
    toX: b.x,
    toY: b.y - b.height / 2,
    color: color || COLORS.arrowNormal,
  };
}

function layoutBlock(
  stmts: any[],
  startX: number,
  startY: number,
  prevNode?: FlowNode,
): LayoutResult {
  const nodes: FlowNode[] = [];
  const arrows: FlowArrow[] = [];
  let y = startY;
  let lastNode: FlowNode | null = prevNode || null;

  function addNode(node: FlowNode) {
    nodes.push(node);
  }

  function connectTo(node: FlowNode, color?: string) {
    if (lastNode) {
      arrows.push(connectNodes(lastNode, node, color));
    }
  }

  for (const stmt of stmts) {
    if (!stmt || stmt.type === "Noop") continue;

    switch (stmt.type) {
      case "Escribir":
      case "Leer": {
        const node: FlowNode = {
          kind: "io",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: IO_W,
          height: IO_H,
          color: COLORS.ioStroke,
        };
        connectTo(node);
        addNode(node);
        lastNode = node;
        y += ROW_H;
        break;
      }

      case "Definir": {
        const text = stmtToLabel(stmt);
        if (text) {
          const node: FlowNode = {
            kind: "process",
            text,
            x: startX,
            y,
            width: PROC_W,
            height: PROC_H,
            isDeclaration: true,
          };
          connectTo(node);
          addNode(node);
          lastNode = node;
          y += ROW_H;
        }
        break;
      }

      case "Assign":
      case "Dimension":
      case "ExprStmt":
      case "Clear": {
        const text = stmtToLabel(stmt);
        if (text) {
          const node: FlowNode = {
            kind: "process",
            text,
            x: startX,
            y,
            width: PROC_W,
            height: PROC_H,
          };
          connectTo(node);
          addNode(node);
          lastNode = node;
          y += ROW_H;
        }
        break;
      }

      case "If": {
        const decNode: FlowNode = {
          kind: "decision",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: DEC_W,
          height: DEC_H,
          color: COLORS.decisionStroke,
        };
        connectTo(decNode);
        addNode(decNode);
        y += ROW_H;

        const leftX = startX - BRANCH_OFFSET_X;
        const rightX = startX + BRANCH_OFFSET_X;
        const branchStartY = y;

        const leftRes = layoutBlock(stmt.thenBody || [], leftX, branchStartY);
        if (leftRes.nodes.length > 0) {
          nodes.push(...leftRes.nodes);
          arrows.push(...leftRes.arrows);
          arrows.push({
            fromX: decNode.x,
            fromY: decNode.y + decNode.height / 2,
            toX: leftRes.firstNode!.x,
            toY: leftRes.firstNode!.y - leftRes.firstNode!.height / 2,
            color: COLORS.arrowTrue,
            label: "Sí",
          });
        }

        const rightRes = layoutBlock(stmt.elseBody || [], rightX, branchStartY);
        if (rightRes.nodes.length > 0) {
          nodes.push(...rightRes.nodes);
          arrows.push(...rightRes.arrows);
          arrows.push({
            fromX: decNode.x,
            fromY: decNode.y + decNode.height / 2,
            toX: rightRes.firstNode!.x,
            toY: rightRes.firstNode!.y - rightRes.firstNode!.height / 2,
            color: COLORS.arrowFalse,
            label: "No",
          });
        }

        const maxBranchHeight = Math.max(leftRes.height, rightRes.height);
        const mergeY = branchStartY + maxBranchHeight + ROW_H / 2;

        const mergeNode: FlowNode = {
          kind: "merge",
          text: "",
          x: startX,
          y: mergeY,
          width: MERGE_R * 2,
          height: MERGE_R * 2,
        };
        addNode(mergeNode);

        if (leftRes.lastNode) {
          arrows.push({
            fromX: leftRes.lastNode.x,
            fromY: leftRes.lastNode.y + leftRes.lastNode.height / 2,
            toX: mergeNode.x,
            toY: mergeNode.y - MERGE_R,
            color: COLORS.arrowTrue,
          });
        }
        if (rightRes.lastNode) {
          arrows.push({
            fromX: rightRes.lastNode.x,
            fromY: rightRes.lastNode.y + rightRes.lastNode.height / 2,
            toX: mergeNode.x,
            toY: mergeNode.y - MERGE_R,
            color: COLORS.arrowFalse,
          });
        }

        lastNode = mergeNode;
        y = mergeY + ROW_H / 2;
        break;
      }

      case "While": {
        const decNode: FlowNode = {
          kind: "decision",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: DEC_W,
          height: DEC_H,
          color: COLORS.decisionStroke,
        };
        connectTo(decNode);
        addNode(decNode);
        y += ROW_H;

        const bodyRes = layoutBlock(stmt.body || [], startX, y);
        if (bodyRes.nodes.length > 0) {
          nodes.push(...bodyRes.nodes);
          arrows.push(...bodyRes.arrows);

          arrows.push({
            fromX: decNode.x,
            fromY: decNode.y + decNode.height / 2,
            toX: bodyRes.firstNode!.x,
            toY: bodyRes.firstNode!.y - bodyRes.firstNode!.height / 2,
            color: COLORS.arrowTrue,
            label: "Sí",
          });

          const lastBody = bodyRes.lastNode!;
          const viaX = startX + BRANCH_OFFSET_X + 30;
          arrows.push({
            fromX: lastBody.x,
            fromY: lastBody.y + lastBody.height / 2,
            toX: decNode.x + decNode.width / 2 + 3,
            toY: decNode.y,
            color: COLORS.arrowLoop,
            dashed: true,
            via: [
              { x: viaX, y: lastBody.y + lastBody.height / 2 },
              { x: viaX, y: decNode.y },
            ],
          });
        }

        const exitY = y + bodyRes.height + ROW_H / 2;
        const exitNode: FlowNode = {
          kind: "merge",
          text: "",
          x: startX,
          y: exitY,
          width: MERGE_R * 2,
          height: MERGE_R * 2,
        };
        addNode(exitNode);
        arrows.push({
          fromX: decNode.x - decNode.width / 2,
          fromY: decNode.y,
          toX: exitNode.x - MERGE_R,
          toY: exitNode.y - MERGE_R,
          color: COLORS.arrowFalse,
          label: "No",
        });

        lastNode = exitNode;
        y = exitY + ROW_H / 2;
        break;
      }

      case "For": {
        const initNode: FlowNode = {
          kind: "process",
          text: `${stmt.varName} <- ${exprToString(stmt.from)}`,
          x: startX,
          y,
          width: PROC_W,
          height: PROC_H,
        };
        connectTo(initNode);
        addNode(initNode);
        lastNode = initNode;
        y += ROW_H;

        const decNode: FlowNode = {
          kind: "decision",
          text: `${stmt.varName} <= ${exprToString(stmt.to)}`,
          x: startX,
          y,
          width: DEC_W,
          height: DEC_H,
          color: COLORS.decisionStroke,
        };
        arrows.push(connectNodes(initNode, decNode));
        addNode(decNode);
        y += ROW_H;

        const bodyRes = layoutBlock(stmt.body || [], startX, y);
        if (bodyRes.nodes.length > 0) {
          nodes.push(...bodyRes.nodes);
          arrows.push(...bodyRes.arrows);

          arrows.push({
            fromX: decNode.x,
            fromY: decNode.y + decNode.height / 2,
            toX: bodyRes.firstNode!.x,
            toY: bodyRes.firstNode!.y - bodyRes.firstNode!.height / 2,
            color: COLORS.arrowTrue,
            label: "Sí",
          });

          const lastBody = bodyRes.lastNode!;
          const viaX = startX + BRANCH_OFFSET_X + 30;
          arrows.push({
            fromX: lastBody.x,
            fromY: lastBody.y + lastBody.height / 2,
            toX: decNode.x + decNode.width / 2 + 3,
            toY: decNode.y,
            color: COLORS.arrowLoop,
            dashed: true,
            via: [
              { x: viaX, y: lastBody.y + lastBody.height / 2 },
              { x: viaX, y: decNode.y },
            ],
          });
        }

        const exitY = y + bodyRes.height + ROW_H / 2;
        const exitNode: FlowNode = {
          kind: "merge",
          text: "",
          x: startX,
          y: exitY,
          width: MERGE_R * 2,
          height: MERGE_R * 2,
        };
        addNode(exitNode);
        arrows.push({
          fromX: decNode.x - decNode.width / 2,
          fromY: decNode.y,
          toX: exitNode.x - MERGE_R,
          toY: exitNode.y - MERGE_R,
          color: COLORS.arrowFalse,
          label: "No",
        });

        lastNode = exitNode;
        y = exitY + ROW_H / 2;
        break;
      }

      case "Repeat": {
        const bodyRes = layoutBlock(stmt.body || [], startX, y);
        if (bodyRes.nodes.length > 0) {
          nodes.push(...bodyRes.nodes);
          arrows.push(...bodyRes.arrows);
          if (bodyRes.lastNode) lastNode = bodyRes.lastNode;
        }
        y += bodyRes.height;

        const decNode: FlowNode = {
          kind: "decision",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: DEC_W,
          height: DEC_H,
          color: COLORS.decisionStroke,
        };
        connectTo(decNode);
        addNode(decNode);
        y += ROW_H;

        const viaX = startX + BRANCH_OFFSET_X + 30;
        if (bodyRes.firstNode) {
          arrows.push({
            fromX: decNode.x + decNode.width / 2,
            fromY: decNode.y,
            toX: bodyRes.firstNode.x + bodyRes.firstNode.width / 2 + 3,
            toY: bodyRes.firstNode.y,
            color: COLORS.arrowFalse,
            label: "No",
            dashed: true,
            via: [
              { x: viaX, y: decNode.y },
              { x: viaX, y: bodyRes.firstNode.y },
            ],
          });
        }

        const exitY = y + ROW_H / 2;
        const exitNode: FlowNode = {
          kind: "merge",
          text: "",
          x: startX,
          y: exitY,
          width: MERGE_R * 2,
          height: MERGE_R * 2,
        };
        addNode(exitNode);
        arrows.push({
          fromX: decNode.x - decNode.width / 2,
          fromY: decNode.y,
          toX: exitNode.x - MERGE_R,
          toY: exitNode.y - MERGE_R,
          color: COLORS.arrowTrue,
          label: "Sí",
        });

        lastNode = exitNode;
        y = exitY + ROW_H / 2;
        break;
      }

      case "Switch": {
        const decNode: FlowNode = {
          kind: "decision",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: DEC_W,
          height: DEC_H,
          color: COLORS.decisionStroke,
        };
        connectTo(decNode);
        addNode(decNode);
        y += ROW_H;

        let currentY = y;
        const caseColors = [
          COLORS.arrowTrue,
          COLORS.arrowFalse,
          COLORS.arrowLoop,
          "#f59e0b",
          "#3b82f6",
        ];
        const branchResults: LayoutResult[] = [];

        for (let i = 0; i < (stmt.cases || []).length; i++) {
          const c = stmt.cases[i];
          const caseX = startX + (i % 2 === 0 ? -1 : 1) * BRANCH_OFFSET_X;
          const caseRes = layoutBlock(c.body || [], caseX, currentY);
          if (caseRes.nodes.length > 0) {
            nodes.push(...caseRes.nodes);
            arrows.push(...caseRes.arrows);
            arrows.push({
              fromX: decNode.x,
              fromY: decNode.y + decNode.height / 2,
              toX: caseRes.firstNode!.x,
              toY: caseRes.firstNode!.y - caseRes.firstNode!.height / 2,
              color: caseColors[i % caseColors.length],
            });
            branchResults.push(caseRes);
          }
        }

        if (stmt.defaultBody?.length) {
          const defX =
            startX +
            ((stmt.cases || []).length % 2 === 0 ? -1 : 1) * BRANCH_OFFSET_X;
          const defRes = layoutBlock(stmt.defaultBody, defX, currentY);
          if (defRes.nodes.length > 0) {
            nodes.push(...defRes.nodes);
            arrows.push(...defRes.arrows);
            arrows.push({
              fromX: decNode.x,
              fromY: decNode.y + decNode.height / 2,
              toX: defRes.firstNode!.x,
              toY: defRes.firstNode!.y - defRes.firstNode!.height / 2,
              color: "#94a3b8",
              label: "Otro",
            });
            branchResults.push(defRes);
          }
        }

        const maxBranchHeight = Math.max(
          ...branchResults.map((r) => r.height),
          0,
        );
        const mergeY = currentY + maxBranchHeight + ROW_H / 2;
        const mergeNode: FlowNode = {
          kind: "merge",
          text: "",
          x: startX,
          y: mergeY,
          width: MERGE_R * 2,
          height: MERGE_R * 2,
        };
        addNode(mergeNode);

        for (const res of branchResults) {
          if (res.lastNode) {
            arrows.push({
              fromX: res.lastNode.x,
              fromY: res.lastNode.y + res.lastNode.height / 2,
              toX: mergeNode.x,
              toY: mergeNode.y - MERGE_R,
              color: COLORS.arrowNormal,
            });
          }
        }

        lastNode = mergeNode;
        y = mergeY + ROW_H / 2;
        break;
      }

      case "Function": {
        const node: FlowNode = {
          kind: "process",
          text: stmtToLabel(stmt),
          x: startX,
          y,
          width: PROC_W,
          height: PROC_H,
        };
        connectTo(node);
        addNode(node);
        lastNode = node;
        y += ROW_H;

        const bodyRes = layoutBlock(stmt.body || [], startX, y, node);
        if (bodyRes.nodes.length > 0) {
          nodes.push(...bodyRes.nodes);
          arrows.push(...bodyRes.arrows);
          if (bodyRes.lastNode) lastNode = bodyRes.lastNode;
        }
        y += bodyRes.height;

        const retNode: FlowNode = {
          kind: "process",
          text: "Retornar",
          x: startX,
          y,
          width: PROC_W,
          height: PROC_H,
        };
        if (lastNode) arrows.push(connectNodes(lastNode, retNode));
        addNode(retNode);
        lastNode = retNode;
        y += ROW_H;
        break;
      }

      default:
        break;
    }
  }

  return {
    nodes,
    arrows,
    height: y - startY,
    firstNode: nodes[0] || null,
    lastNode,
  };
}

function computeViewBox(
  nodes: FlowNode[],
  arrows: FlowArrow[],
  padding: number,
) {
  const xs: number[] = [];
  const ys: number[] = [];

  nodes.forEach((n) => {
    xs.push(n.x - n.width / 2, n.x + n.width / 2);
    ys.push(n.y - n.height / 2, n.y + n.height / 2);
  });

  arrows.forEach((a) => {
    xs.push(a.fromX, a.toX);
    ys.push(a.fromY, a.toY);
    if (a.via)
      a.via.forEach((v) => {
        xs.push(v.x);
        ys.push(v.y);
      });
  });

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const diagramWidth = maxX - minX;
  const targetWidth = Math.max(diagramWidth + padding * 2, 500);
  const offsetX = (targetWidth - diagramWidth) / 2 - minX;

  return {
    offsetX,
    minX: 0,
    minY: minY - padding,
    maxX: targetWidth,
    maxY: maxY + padding,
  };
}

export function generateFlowchart(source: string): FlowchartResult {
  const { program, errors } = parsePseint(source);
  if (errors.length || !program) {
    return {
      nodes: [],
      arrows: [],
      errors: errors.map((e) => `Línea ${e.line ?? "?"}: ${e.message}`),
      viewBox: { minX: 0, minY: 0, maxX: 500, maxY: 300 },
    };
  }

  const startNode: FlowNode = {
    kind: "start",
    text: "Inicio",
    x: 0,
    y: 0,
    width: START_W,
    height: START_H,
    color: COLORS.startEnd,
  };

  const bodyRes = layoutBlock(program.body || [], 0, ROW_H, startNode);
  const allNodes = [startNode, ...bodyRes.nodes];
  const allArrows = [...bodyRes.arrows];

  const endNode: FlowNode = {
    kind: "end",
    text: "Fin",
    x: 0,
    y: 0,
    width: START_W,
    height: START_H,
    color: COLORS.startEnd,
  };

  if (bodyRes.lastNode) {
    endNode.x = bodyRes.lastNode.x;
    endNode.y = bodyRes.lastNode.y + ROW_H;
    allArrows.push(connectNodes(bodyRes.lastNode, endNode));
  } else {
    endNode.x = startNode.x;
    endNode.y = startNode.y + ROW_H;
    allArrows.push(connectNodes(startNode, endNode));
  }
  allNodes.push(endNode);

  const padding = 30;
  const vb = computeViewBox(allNodes, allArrows, padding);

  allNodes.forEach((n) => {
    n.x += vb.offsetX;
  });
  allArrows.forEach((a) => {
    a.fromX += vb.offsetX;
    a.toX += vb.offsetX;
    if (a.via)
      a.via.forEach((v) => {
        v.x += vb.offsetX;
      });
  });

  return {
    nodes: allNodes,
    arrows: allArrows,
    errors: [],
    viewBox: { minX: vb.minX, minY: vb.minY, maxX: vb.maxX, maxY: vb.maxY },
  };
}
