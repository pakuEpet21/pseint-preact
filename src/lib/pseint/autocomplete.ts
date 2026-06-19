export interface AutocompleteItem {
  label: string
  snippet: string
  category: string
}

export const AUTOCOMPLETE_ITEMS: AutocompleteItem[] = [
  // Palabras clave
  { label: "Algoritmo", snippet: "Algoritmo ", category: "Estructura" },
  { label: "FinAlgoritmo", snippet: "FinAlgoritmo", category: "Estructura" },
  { label: "Proceso", snippet: "Proceso ", category: "Estructura" },
  { label: "FinProceso", snippet: "FinProceso", category: "Estructura" },

  // Entrada/Salida
  { label: "Escribir", snippet: 'Escribir ', category: "Entrada/Salida" },
  { label: "Mostrar", snippet: 'Mostrar ', category: "Entrada/Salida" },
  { label: "Imprimir", snippet: 'Imprimir ', category: "Entrada/Salida" },
  { label: "Leer", snippet: "Leer ", category: "Entrada/Salida" },
  { label: "Limpiar Pantalla", snippet: "Limpiar Pantalla", category: "Entrada/Salida" },

  // Definición de variables
  { label: "Definir", snippet: "Definir ", category: "Variables" },
  { label: "Dimension", snippet: "Dimension ", category: "Variables" },
  { label: "Dimensionar", snippet: "Dimensionar ", category: "Variables" },
  { label: "Como Entero", snippet: " Como Entero", category: "Tipos" },
  { label: "Como Real", snippet: " Como Real", category: "Tipos" },
  { label: "Como Logico", snippet: " Como Logico", category: "Tipos" },
  { label: "Como Caracter", snippet: " Como Caracter", category: "Tipos" },

  // Condicionales
  { label: "Si", snippet: "Si ", category: "Condicionales" },
  { label: "Si ... Entonces", snippet: "Si  Entonces\n\t\nFinSi", category: "Condicionales" },
  { label: "Si ... Sino ... FinSi", snippet: "Si  Entonces\n\t\nSino\n\t\nFinSi", category: "Condicionales" },
  { label: "Entonces", snippet: "Entonces", category: "Condicionales" },
  { label: "Sino", snippet: "Sino", category: "Condicionales" },
  { label: "FinSi", snippet: "FinSi", category: "Condicionales" },
  { label: "Segun", snippet: "Segun ", category: "Condicionales" },
  { label: "Segun ... Hacer", snippet: "Segun opcion Hacer\n\t1:\n\t\t\n\t2:\n\t\t\n\tDe Otro Modo:\n\t\t\nFinSegun", category: "Condicionales" },
  { label: "FinSegun", snippet: "FinSegun", category: "Condicionales" },
  { label: "De Otro Modo", snippet: "De Otro Modo:", category: "Condicionales" },
  { label: "Caso", snippet: "Caso ", category: "Condicionales" },

  // Bucles
  { label: "Para", snippet: "Para ", category: "Bucles" },
  { label: "Para ... Hasta ... Hacer", snippet: "Para i <- 1 Hasta 10 Con Paso 1 Hacer\n\t\nFinPara", category: "Bucles" },
  { label: "FinPara", snippet: "FinPara", category: "Bucles" },
  { label: "Mientras", snippet: "Mientras ", category: "Bucles" },
  { label: "Mientras ... Hacer", snippet: "Mientras condicion Hacer\n\t\nFinMientras", category: "Bucles" },
  { label: "FinMientras", snippet: "FinMientras", category: "Bucles" },
  { label: "Repetir", snippet: "Repetir", category: "Bucles" },
  { label: "Repetir ... Hasta Que", snippet: "Repetir\n\t\nHasta Que condicion", category: "Bucles" },
  { label: "Hasta Que", snippet: "Hasta Que ", category: "Bucles" },
  { label: "Hacer", snippet: "Hacer", category: "Bucles" },
  { label: "Con Paso", snippet: "Con Paso ", category: "Bucles" },

  // Funciones
  { label: "Funcion", snippet: "Funcion ", category: "Funciones" },
  { label: "Funcion ... FinFuncion", snippet: "Funcion resultado <- MiFuncion(parametro)\n\tresultado <- parametro\nFinFuncion", category: "Funciones" },
  { label: "FinFuncion", snippet: "FinFuncion", category: "Funciones" },
  { label: "SubProceso", snippet: "SubProceso ", category: "Funciones" },
  { label: "SubProceso ... FinSubProceso", snippet: "SubProceso MiProceso(parametro)\n\t\nFinSubProceso", category: "Funciones" },
  { label: "FinSubProceso", snippet: "FinSubProceso", category: "Funciones" },
  { label: "SubAlgoritmo", snippet: "SubAlgoritmo ", category: "Funciones" },
  { label: "FinSubAlgoritmo", snippet: "FinSubAlgoritmo", category: "Funciones" },
  { label: "Retornar", snippet: "Retornar ", category: "Funciones" },

  // Valores lógicos
  { label: "Verdadero", snippet: "Verdadero", category: "Valores" },
  { label: "Falso", snippet: "Falso", category: "Valores" },

  // Operadores lógicos
  { label: "Y", snippet: " Y ", category: "Operadores" },
  { label: "O", snippet: " O ", category: "Operadores" },
  { label: "No", snippet: "No ", category: "Operadores" },
  { label: "MOD", snippet: " MOD ", category: "Operadores" },
  { label: "DIV", snippet: " DIV ", category: "Operadores" },

  // Funciones matemáticas
  { label: "Raiz", snippet: "raiz()", category: "Matemáticas" },
  { label: "Abs", snippet: "abs()", category: "Matemáticas" },
  { label: "Trunc", snippet: "trunc()", category: "Matemáticas" },
  { label: "Redon", snippet: "redon()", category: "Matemáticas" },
  { label: "Redondear", snippet: "redondear()", category: "Matemáticas" },
  { label: "Sen", snippet: "sen()", category: "Matemáticas" },
  { label: "Seno", snippet: "seno()", category: "Matemáticas" },
  { label: "Cos", snippet: "cos()", category: "Matemáticas" },
  { label: "Coseno", snippet: "coseno()", category: "Matemáticas" },
  { label: "Tan", snippet: "tan()", category: "Matemáticas" },
  { label: "Tangente", snippet: "tangente()", category: "Matemáticas" },
  { label: "Asen", snippet: "asen()", category: "Matemáticas" },
  { label: "Acos", snippet: "acos()", category: "Matemáticas" },
  { label: "Atan", snippet: "atan()", category: "Matemáticas" },
  { label: "Exp", snippet: "exp()", category: "Matemáticas" },
  { label: "Ln", snippet: "ln()", category: "Matemáticas" },
  { label: "Pi", snippet: "pi()", category: "Matemáticas" },
  { label: "Azar", snippet: "azar()", category: "Matemáticas" },
  { label: "Aleatorio", snippet: "aleatorio()", category: "Matemáticas" },

  // Funciones de texto
  { label: "Longitud", snippet: "Longitud()", category: "Texto" },
  { label: "Mayusculas", snippet: "Mayusculas()", category: "Texto" },
  { label: "Minusculas", snippet: "Minusculas()", category: "Texto" },
  { label: "Subcadena", snippet: "Subcadena()", category: "Texto" },
  { label: "Concatenar", snippet: "Concatenar()", category: "Texto" },
  { label: "ConvertirATexto", snippet: "ConvertirATexto()", category: "Texto" },
  { label: "ConvertirANumero", snippet: "ConvertirANumero()", category: "Texto" },
  { label: "EsNumero", snippet: "EsNumero()", category: "Texto" },

  // Esperar
  { label: "Esperar", snippet: "Esperar ", category: "Control" },
  { label: "Esperar Tecla", snippet: "Esperar Tecla", category: "Control" },
  { label: "Esperar Segundos", snippet: "Esperar 1 Segundos", category: "Control" },
]

export function matchAutocomplete(prefix: string): AutocompleteItem[] {
  if (prefix.length < 2) return []
  const lower = prefix.toLowerCase()
  return AUTOCOMPLETE_ITEMS.filter((item) =>
    item.label.toLowerCase().startsWith(lower)
  )
}

function normalizeForPrefixMatch(s: string): string {
  return s.toLowerCase().replace(/[\s.]/g, "")
}

export function matchAutocompleteForWord(word: string): AutocompleteItem[] {
  const direct = matchAutocomplete(word)
  if (direct.length > 0) return direct

  const w = normalizeForPrefixMatch(word)
  let bestLabel = ""
  let bestLen = 0
  for (const item of AUTOCOMPLETE_ITEMS) {
    const p = normalizeForPrefixMatch(item.label)
    if (p.length < 2) continue
    if (w !== p) continue
    if (p.length > bestLen) {
      bestLabel = item.label
      bestLen = p.length
    }
  }
  if (!bestLabel) return []
  return matchAutocomplete(bestLabel)
}
