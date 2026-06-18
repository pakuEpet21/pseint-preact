import { useMemo } from "preact/hooks"
import {
  generateFlowchart,
  type FlowNode,
  type FlowArrow,
  COLORS,
} from "@/lib/pseint/flowchart"

interface Props {
  code: string
}

function renderNode(node: FlowNode, idx: number): any {
  const { kind, text, x, y, width, height, color } = node

  switch (kind) {
    case "start":
    case "end": {
      const fill = color || COLORS.startEnd
      return (
        <g key={`node-${idx}`}>
          <ellipse
            cx={x}
            cy={y}
            rx={width / 2}
            ry={height / 2}
            fill={fill}
            stroke={fill}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={13}
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            {text}
          </text>
        </g>
      )
    }
    case "process": {
      const stroke = color || COLORS.processStroke
      return (
        <g key={`node-${idx}`}>
          <rect
            x={x - width / 2}
            y={y - height / 2}
            width={width}
            height={height}
            rx={4}
            fill="var(--card, #1e293b)"
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={COLORS.text}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    }
    case "io": {
      const skew = 12
      const stroke = color || COLORS.ioStroke
      return (
        <g key={`node-${idx}`}>
          <path
            d={`M${x - width / 2 + skew},${y - height / 2} L${x + width / 2},${y - height / 2} L${x + width / 2 - skew},${y + height / 2} L${x - width / 2},${y + height / 2} Z`}
            fill="var(--card, #1e293b)"
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={COLORS.text}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    }
    case "decision": {
      const stroke = color || COLORS.decisionStroke
      return (
        <g key={`node-${idx}`}>
          <path
            d={`M${x},${y - height / 2} L${x + width / 2},${y} L${x},${y + height / 2} L${x - width / 2},${y} Z`}
            fill="var(--card, #1e293b)"
            stroke={stroke}
            strokeWidth={2}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={COLORS.text}
            fontSize={12}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        </g>
      )
    }
    case "merge": {
      return (
        <circle
          key={`node-${idx}`}
          cx={x}
          cy={y}
          r={width / 2}
          fill="var(--border, #475569)"
        />
      )
    }
    default:
      return null
  }
}

function renderArrow(arrow: FlowArrow, idx: number): any {
  const { fromX, fromY, toX, toY, color, dashed, via, label } = arrow
  const stroke = color || COLORS.arrowNormal

  let d: string
  if (via && via.length > 0) {
    const points = [{ x: fromX, y: fromY }, ...via, { x: toX, y: toY }]
    d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  } else {
    d = `M${fromX},${fromY} L${toX},${toY}`
  }

  const labelX = via && via.length ? via[Math.floor(via.length / 2)].x : (fromX + toX) / 2
  const labelY = via && via.length ? via[Math.floor(via.length / 2)].y - 8 : (fromY + toY) / 2 - 8

  return (
    <g key={`arrow-${idx}`}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd="url(#arrowhead)"
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill={stroke}
          fontSize={11}
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
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

  const vb = result.viewBox

  return (
    <div className="h-full w-full overflow-auto bg-background">
      <svg
        width="100%"
        height="100%"
        viewBox={`${vb.minX} ${vb.minY} ${vb.maxX - vb.minX} ${vb.maxY - vb.minY}`}
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
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--border, #475569)" />
          </marker>
        </defs>
        {result.arrows.map((a, i) => renderArrow(a, i))}
        {result.nodes.map((n, i) => renderNode(n, i))}
      </svg>
    </div>
  )
}
