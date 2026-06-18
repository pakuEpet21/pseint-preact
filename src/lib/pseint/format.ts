export function formatPseint(code: string): string {
  const lines = code.split("\n")
  const result: string[] = []
  let indent = 0
  const TAB = "    "

  for (const rawLine of lines) {
    const trimmedStart = rawLine.trimStart()

    // Preservar líneas vacías
    if (trimmedStart === "") {
      result.push("")
      continue
    }

    // Comentarios completos
    if (trimmedStart.startsWith("//") || trimmedStart.startsWith("#")) {
      result.push(TAB.repeat(indent) + trimmedStart)
      continue
    }

    // Obtener línea sin comentarios inline para análisis
    const lineForAnalysis = removeInlineComments(trimmedStart).toLowerCase()

    // Detectar cierre de bloque (reducir indent ANTES de escribir)
    const closingKeywords = [
      "finsi",
      "finmientras",
      "finpara",
      "finsegun",
      "finfuncion",
      "finsubproceso",
      "finsubalgoritmo",
    ]
    const isClosing = closingKeywords.some(
      (kw) => lineForAnalysis.startsWith(kw + " ") || lineForAnalysis === kw
    )
    const isHastaQue = lineForAnalysis.startsWith("hasta que")

    if (isClosing || isHastaQue) {
      indent = Math.max(0, indent - 1)
    }

    // Detectar sino / de otro modo (sin cambio de indent)
    const isMidBlock =
      lineForAnalysis.startsWith("sino") ||
      lineForAnalysis.startsWith("de otro modo")

    // Escribir la línea
    if (isMidBlock) {
      result.push(TAB.repeat(Math.max(0, indent)) + trimmedStart)
    } else {
      result.push(TAB.repeat(indent) + trimmedStart)
    }

    // Detectar apertura de bloque (aumentar indent DESPUÉS de escribir)
    const openingPatterns = [
      /^si\b.*\bentonces\b/,
      /^mientras\b.*\bhacer\b/,
      /^para\b.*\bhacer\b/,
      /^segun\b.*\bhacer\b/,
      /^repetir\b/,
      /^funcion\b/,
      /^subproceso\b/,
      /^subalgoritmo\b/,
    ]
    const isOpening = openingPatterns.some((pattern) =>
      pattern.test(lineForAnalysis)
    )

    if (isOpening) {
      indent++
    }
  }

  return result.join("\n")
}

function removeInlineComments(line: string): string {
  let result = ""
  let inString = false
  let stringChar = ""

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true
      stringChar = ch
      result += ch
      continue
    }

    if (inString && ch === stringChar) {
      inString = false
      result += ch
      continue
    }

    if (!inString) {
      if (ch === "/" && line[i + 1] === "/") break
      if (ch === "#") break
    }

    result += ch
  }

  return result
}
