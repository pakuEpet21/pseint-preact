export interface Snippet {
  label: string
  description: string
  code: string
}

export interface SnippetCategory {
  name: string
  icon: string // lucide icon name
  snippets: Snippet[]
}

export const SNIPPET_CATEGORIES: SnippetCategory[] = [
  {
    name: "Entrada/Salida",
    icon: "Terminal",
    snippets: [
      {
        label: "Escribir",
        description: "Mostrar texto en consola",
        code: 'Escribir "Hola Mundo"',
      },
      {
        label: "Mostrar",
        description: "Mostrar texto en consola",
        code: 'Mostrar "Hola Mundo"',
      },
      {
        label: "Leer",
        description: "Leer un valor del usuario",
        code: "Leer x",
      },
    ],
  },
  {
    name: "Condicionales",
    icon: "GitBranch",
    snippets: [
      {
        label: "Si / Entonces",
        description: "Condicional simple",
        code: "Si condicion Entonces\n\t\nFinSi",
      },
      {
        label: "Si / Sino",
        description: "Condicional con alternativa",
        code: "Si condicion Entonces\n\t\nSino\n\t\nFinSi",
      },
      {
        label: "Segun",
        description: "Selección múltiple",
        code: "Segun opcion Hacer\n\t1:\n\t\t\n\t2:\n\t\t\n\tDe Otro Modo:\n\t\t\nFinSegun",
      },
    ],
  },
  {
    name: "Bucles",
    icon: "Repeat",
    snippets: [
      {
        label: "Para",
        description: "Bucle con contador",
        code: "Para i <- 1 Hasta 10 Con Paso 1 Hacer\n\t\nFinPara",
      },
      {
        label: "Mientras",
        description: "Bucle con condición previa",
        code: "Mientras condicion Hacer\n\t\nFinMientras",
      },
      {
        label: "Repetir",
        description: "Bucle con condición posterior",
        code: "Repetir\n\t\nHasta Que condicion",
      },
    ],
  },
  {
    name: "Funciones",
    icon: "FunctionSquare",
    snippets: [
      {
        label: "Función",
        description: "Función que retorna un valor",
        code: "Funcion resultado <- MiFuncion(parametro)\n\tresultado <- parametro\nFinFuncion",
      },
      {
        label: "Subproceso",
        description: "Subproceso sin retorno",
        code: "SubProceso MiProceso(parametro)\n\t\nFinSubProceso",
      },
    ],
  },
  {
    name: "Operaciones",
    icon: "Calculator",
    snippets: [
      {
        label: "Asignación",
        description: "Asignar un valor",
        code: "x <- 0",
      },
      {
        label: "Raíz cuadrada",
        description: "Función raiz()",
        code: "resultado <- raiz(x)",
      },
      {
        label: "Potencia",
        description: "Elevar a una potencia",
        code: "resultado <- x ^ 2",
      },
      {
        label: "Valor absoluto",
        description: "Función abs()",
        code: "resultado <- abs(x)",
      },
      {
        label: "Redondear",
        description: "Redondear al entero más cercano",
        code: "resultado <- redon(x)",
      },
      {
        label: "Truncar",
        description: "Quitar la parte decimal",
        code: "resultado <- trunc(x)",
      },
      {
        label: "Resto (MOD)",
        description: "Resto de la división",
        code: "resto <- x MOD y",
      },
      {
        label: "Aleatorio",
        description: "Número aleatorio entre dos valores",
        code: "n <- aleatorio(1, 100)",
      },
    ],
  },
  {
    name: "Trigonometría (grados)",
    icon: "Calculator",
    snippets: [
      {
        label: "Seno",
        description: "Seno en grados: sen(grados)",
        code: "resultado <- sen(30)",
      },
      {
        label: "Coseno",
        description: "Coseno en grados: cos(grados)",
        code: "resultado <- cos(60)",
      },
      {
        label: "Tangente",
        description: "Tangente en grados: tan(grados)",
        code: "resultado <- tan(45)",
      },
      {
        label: "Arcoseno",
        description: "Arcoseno (devuelve grados)",
        code: "grados <- asen(x)",
      },
      {
        label: "Arcocoseno",
        description: "Arcocoseno (devuelve grados)",
        code: "grados <- acos(x)",
      },
      {
        label: "Arcotangente",
        description: "Arcotangente (devuelve grados)",
        code: "grados <- atan(x)",
      },
      {
        label: "Pi",
        description: "Constante π",
        code: "p <- pi()",
      },
    ],
  },
  {
    name: "Texto",
    icon: "Calculator",
    snippets: [
      {
        label: "Mayúsculas",
        description: "Convertir texto a mayúsculas",
        code: "texto <- Mayusculas(texto)",
      },
      {
        label: "Minúsculas",
        description: "Convertir texto a minúsculas",
        code: "texto <- Minusculas(texto)",
      },
      {
        label: "Longitud",
        description: "Cantidad de caracteres",
        code: "n <- Longitud(texto)",
      },
      {
        label: "Subcadena",
        description: "Extraer parte de un texto",
        code: "parte <- Subcadena(texto, 0, 3)",
      },
      {
        label: "Concatenar",
        description: "Unir dos textos",
        code: "texto <- Concatenar(a, b)",
      },
    ],
  },
]

export interface Example {
  name: string
  fileName: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    name: "Suma de dos números",
    fileName: "suma.psc",
    code: `Algoritmo NombreDelAlgoritmo

FinAlgoritmo`,
  },
  {
    name: "Tabla de multiplicar",
    fileName: "tabla.psc",
    code: `Algoritmo TablaDeMultiplicar
	Definir n, i Como Entero
	Escribir "Ingrese un numero:"
	Leer n
	Para i <- 1 Hasta 10 Con Paso 1 Hacer
		Escribir n, " x ", i, " = ", n * i
	FinPara
FinAlgoritmo`,
  },
  {
    name: "Número par o impar",
    fileName: "par_impar.psc",
    code: `Algoritmo ParOImpar
	Definir n Como Entero
	Escribir "Ingrese un numero entero:"
	Leer n
	Si n MOD 2 = 0 Entonces
		Escribir n, " es PAR"
	Sino
		Escribir n, " es IMPAR"
	FinSi
FinAlgoritmo`,
  },
  {
    name: "Factorial",
    fileName: "factorial.psc",
    code: `Algoritmo Factorial
	Definir n, i, fact Como Entero
	Escribir "Ingrese un numero:"
	Leer n
	fact <- 1
	Para i <- 1 Hasta n Con Paso 1 Hacer
		fact <- fact * i
	FinPara
	Escribir "El factorial de ", n, " es ", fact
FinAlgoritmo`,
  },
  {
    name: "Mayor de tres números",
    fileName: "mayor.psc",
    code: `Algoritmo MayorDeTres
	Definir a, b, c, mayor Como Entero
	Escribir "Ingrese tres numeros:"
	Leer a
	Leer b
	Leer c
	mayor <- a
	Si b > mayor Entonces
		mayor <- b
	FinSi
	Si c > mayor Entonces
		mayor <- c
	FinSi
	Escribir "El mayor es: ", mayor
FinAlgoritmo`,
  },
  {
    name: "Promedio con bucle",
    fileName: "promedio.psc",
    code: `Algoritmo Promedio
	Definir cantidad, i, valor Como Entero
	Definir suma, prom Como Real
	Escribir "Cuantos numeros desea promediar?"
	Leer cantidad
	suma <- 0
	Para i <- 1 Hasta cantidad Con Paso 1 Hacer
		Escribir "Ingrese el valor ", i, ":"
		Leer valor
		suma <- suma + valor
	FinPara
	prom <- suma / cantidad
	Escribir "El promedio es: ", prom
FinAlgoritmo`,
  },
]

export const STARTER_CODE = `Algoritmo NombreDelAlgoritmo
	
FinAlgoritmo`
