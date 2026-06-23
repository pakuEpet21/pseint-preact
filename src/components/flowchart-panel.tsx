import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "preact/hooks";
import { ZoomIn, ZoomOut, RotateCcw, EyeOff } from "lucide-react";
import {
  generateFlowchart,
  type FlowNode,
  type FlowArrow,
  COLORS,
} from "@/lib/pseint/flowchart";

interface Props {
  code: string;
}

function renderNode(node: FlowNode, idx: number): any {
  const { kind, text, x, y, width, height, color } = node;

  switch (kind) {
    case "start":
    case "end": {
      const fill = color || COLORS.startEnd;
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
      );
    }
    case "process": {
      const stroke = color || COLORS.processStroke;
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
      );
    }
    case "io": {
      const skew = 12;
      const stroke = color || COLORS.ioStroke;
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
      );
    }
    case "decision": {
      const stroke = color || COLORS.decisionStroke;
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
      );
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
      );
    }
    default:
      return null;
  }
}

function renderArrow(arrow: FlowArrow, idx: number): any {
  const { fromX, fromY, toX, toY, color, dashed, via, label } = arrow;
  const stroke = color || COLORS.arrowNormal;

  let d: string;
  if (via && via.length > 0) {
    const points = [{ x: fromX, y: fromY }, ...via, { x: toX, y: toY }];
    d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  } else {
    d = `M${fromX},${fromY} L${toX},${toY}`;
  }

  const labelX =
    via && via.length ? via[Math.floor(via.length / 2)].x : (fromX + toX) / 2;
  const labelY =
    via && via.length
      ? via[Math.floor(via.length / 2)].y - 8
      : (fromY + toY) / 2 - 8;

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
  );
}

export function FlowchartPanel({ code }: Props) {
  const result = useMemo(() => generateFlowchart(code), [code]);
  const svgRef = useRef<SVGSVGElement>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [panning, setPanning] = useState(false);
  const [hideDeclarations, setHideDeclarations] = useState(false);

  const transformRef = useRef({ scale: 1, tx: 0, ty: 0 });
  transformRef.current = { scale, tx, ty };

  const panStartRef = useRef({
    clientX: 0,
    clientY: 0,
    tx: 0,
    ty: 0,
  });

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }, []);

  // Zoom with wheel (native listener to allow preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const pt = toSvgPoint(e.clientX, e.clientY);
      const t = transformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      const newScale = Math.min(Math.max(t.scale * factor, 0.08), 6);
      setTx(pt.x - (pt.x - t.tx) * (newScale / t.scale));
      setTy(pt.y - (pt.y - t.ty) * (newScale / t.scale));
      setScale(newScale);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [toSvgPoint]);

  // Pan with mouse
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onDown = (e: MouseEvent) => {
      setPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        tx: transformRef.current.tx,
        ty: transformRef.current.ty,
      };
    };

    const onMove = (e: MouseEvent) => {
      if (!panning) return;
      const startPt = toSvgPoint(
        panStartRef.current.clientX,
        panStartRef.current.clientY,
      );
      const currPt = toSvgPoint(e.clientX, e.clientY);
      setTx(panStartRef.current.tx + (currPt.x - startPt.x));
      setTy(panStartRef.current.ty + (currPt.y - startPt.y));
    };

    const onUp = () => setPanning(false);

    svg.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      svg.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning, toSvgPoint]);

  // Pan with touch (one finger)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      setPanning(true);
      panStartRef.current = {
        clientX: t.clientX,
        clientY: t.clientY,
        tx: transformRef.current.tx,
        ty: transformRef.current.ty,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!panning || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      const startPt = toSvgPoint(
        panStartRef.current.clientX,
        panStartRef.current.clientY,
      );
      const currPt = toSvgPoint(t.clientX, t.clientY);
      setTx(panStartRef.current.tx + (currPt.x - startPt.x));
      setTy(panStartRef.current.ty + (currPt.y - startPt.y));
    };

    const onTouchEnd = () => setPanning(false);

    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd);
    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
  }, [panning, toSvgPoint]);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.25, 6));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s / 1.25, 0.08));
  }, []);

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
    );
  }

  const vb = result.viewBox;

  // Filter declarations when hidden
  const visibleNodes = hideDeclarations
    ? result.nodes.filter((n) => !n.isDeclaration)
    : result.nodes;

  // Also hide arrows whose target is a hidden declaration
  const hiddenNodeKeys = new Set(
    hideDeclarations
      ? result.nodes.filter((n) => n.isDeclaration).map((n) => `${n.x}:${n.y}`)
      : [],
  );
  const visibleArrows = hideDeclarations
    ? result.arrows.filter((a) => !hiddenNodeKeys.has(`${a.toX}:${a.toY}`))
    : result.arrows;

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-background">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${vb.minX} ${vb.minY} ${vb.maxX - vb.minX} ${
          vb.maxY - vb.minY
        }`}
        preserveAspectRatio="xMidYMin meet"
        className={panning ? "cursor-grabbing" : "cursor-grab"}
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
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>
          {visibleArrows.map((a, i) => renderArrow(a, i))}
          {visibleNodes.map((n, i) => renderNode(n, i))}
        </g>
      </svg>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-lg border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={zoomIn}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Acercar"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Alejar"
        >
          <ZoomOut className="size-4" />
        </button>
        <div className="mx-auto h-px w-5 bg-border" />
        <button
          type="button"
          onClick={reset}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Restablecer vista"
        >
          <RotateCcw className="size-4" />
        </button>
        <div className="mx-auto h-px w-5 bg-border" />
        <button
          type="button"
          onClick={() => setHideDeclarations((v) => !v)}
          className={`flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground ${
            hideDeclarations ? "text-primary" : "text-muted-foreground"
          }`}
          title={
            hideDeclarations ? "Mostrar definiciones" : "Ocultar definiciones"
          }
        >
          <EyeOff className="size-4" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-card/80 px-2 py-1 text-[11px] font-medium tabular-nums text-muted-foreground backdrop-blur-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
