import { useMemo } from "preact/hooks"
import { generateFlowchart, type FlowNode } from "@/lib/pseint/flowchart"

interface Props {
  code: string
}

function renderNode(node: FlowNode, idx: number): any {
  const { kind, text, x, y, width, height } = node
  const fill = "var(--card, #1e293b)"
  const stroke = "var(--border, #475569)"
  const textColor = "var(--foreground, #e2e8f0)"

  switch (kind) {
    case "start":
    case "end":
      return (
        <g key={`node-${idx}`}>
          <ellipse
            cx={x}
            cy={y}
            rx={width / 2}
            ry={height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={13}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    case "process":
      return (
        <g key={`node-${idx}`}>
          <rect
            x={x - width / 2}
            y={y - height / 2}
            width={width}
            height={height}
            rx={4}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    case "io": {
      const skew = 12
      return (
        <g key={`node-${idx}`}>
          <path
            d={`M${x - width / 2 + skew},${y - height / 2} L${x + width / 2},${y - height / 2} L${x + width / 2 - skew},${y + height / 2} L${x - width / 2},${y + height / 2} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    }
    case "decision":
      return (
        <g key={`node-${idx}`}>
          <path
            d={`M${x},${y - height / 2} L${x + width / 2},${y} L${x},${y + height / 2} L${x - width / 2},${y} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    case "label":
      return (
        <text
          key={`node-${idx}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={stroke}
          fontSize={11}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
      )
    case "loopback": {
      const { fromX, fromY, toX, toY } = node
      if (
        fromX == null ||
        fromY == null ||
        toX == null ||
        toY == null
      )
        return null
      return (
        <g key={`node-${idx}`}>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="4 3"
            markerEnd="url(#arrowhead)"
          />
        </g>
      )
    }
    default:
      return null
  }
}

function renderArrows(nodes: FlowNode[]): any[] {
  const arrows: any[] = []
  const stroke = "var(--border, #475569)"

  const seq = nodes.filter(
    (n) => !["loopback", "label"].includes(n.kind)
  )
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i]
    const b = seq[i + 1]
    arrows.push(
      <line
        key={`arrow-${i}`}
        x1={a.x}
        y1={a.y + a.height / 2}
        x2={b.x}
        y2={b.y - b.height / 2}
        stroke={stroke}
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
    )
  }
  return arrows
}

export function FlowchartPanel({ code }: Props) {
  const result = useMemo(() => generateFlowchart(code), [code])

  if (result.errors.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div>
          <p className="mb-2 font-medium text-foreground">
            No se puede generar el diagrama
          </p>
          <p>
            Corregí los errores de sintaxis para visualizar el diagrama de
            flujo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto bg-background">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 500 ${Math.max(result.viewHeight, 300)}`}
        preserveAspectRatio="xMidYMin meet"
        className="min-h-full"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="var(--border, #475569)"
            />
          </marker>
        </defs>
        {renderArrows(result.nodes)}
        {result.nodes.map((n, i) => renderNode(n, i))}
      </svg>
    </div>
  )
}
