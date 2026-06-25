import type { ConsoleLine } from "./interpreter";
import type { ChallengeState, ChallengeStore } from "./storage";

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface ChallengeData {
  id: string;
  title: string;
  description: string;
  instruction: string;
  starterCode: string;
  hint: string;
  hiddenVariable: string;
  testCases: TestCase[];
  validator: "par-o-impar" | "doble" | "contiene";
}

export type { ChallengeState, ChallengeStore };

export const challenges: ChallengeData[] = [
  {
    id: "saludo-personalizado",
    title: "Saludo Personalizado",
    description: "Pedile al usuario su nombre y mostrale un saludo personalizado.",
    instruction: 'Usá la variable "nombre" para mostrar un saludo personalizado: "Hola, [nombre]"',
    starterCode: "",
    hint: 'Puedes unir el saludo y el nombre usando la concatenación +',
    hiddenVariable: "nombre",
    testCases: [
      { input: "Ana", expectedOutput: "Hola, Ana" },
      { input: "Carlos", expectedOutput: "Hola, Carlos" },
      { input: "María", expectedOutput: "Hola, María" },
    ],
    validator: "contiene",
  },
  {
    id: "doble-de-un-numero",
    title: "Doble de un Número",
    description: "Pedile al usuario un número y mostrale el doble.",
    instruction: 'Usá la variable "numero" para calcular y mostrár el doble.',
    starterCode: "",
    hint: "El doble de numero es: numero * 2",
    hiddenVariable: "numero",
    testCases: [
      { input: "7", expectedOutput: "14" },
      { input: "3", expectedOutput: "6" },
      { input: "0", expectedOutput: "0" },
      { input: "-5", expectedOutput: "-10" },
    ],
    validator: "doble",
  },
  {
    id: "par-o-impar",
    title: "¿Par o Impar?",
    description: "Indicá si el número es par o impar.",
    instruction: 'Usá la variable "parimpar" que contiene el número. Mostrá "PAR" o "IMPAR" según corresponda.',
    starterCode: "",
    hint: "Si parimpar MOD 2 = 0 entonces es PAR, sino IMPAR",
    hiddenVariable: "parimpar",
    testCases: [
      { input: "4", expectedOutput: "PAR" },
      { input: "7", expectedOutput: "IMPAR" },
      { input: "0", expectedOutput: "PAR" },
      { input: "9", expectedOutput: "IMPAR" },
    ],
    validator: "par-o-impar",
  },
];

export function getChallengeById(id: string): ChallengeData | undefined {
  return challenges.find((c) => c.id === id);
}

/** Inject hidden variable AFTER the user's Definir lines so type is set first. */
export function prependVariable(
  code: string,
  hiddenVariable: string,
  input: string,
): string {
  const needsQuotes = isNaN(Number(input));
  const value = needsQuotes ? `"${input}"` : input;

  const stripped = code
    .replace(/^\s*Algoritmo\s*\S*\s*(\r?\n)?/i, "")
    .replace(/\s*FinAlgoritmo\s*$/i, "")
    .trim();

  const lines = stripped.split(/\r?\n/);
  const injectAfterIndex = lines.findLastIndex((line) =>
    /^\s*Definir\s+\S+\s+Como\s+/i.test(line),
  );

  if (injectAfterIndex >= 0) {
    const beforeLines = lines.slice(0, injectAfterIndex + 1);
    const afterLines = lines.slice(injectAfterIndex + 1);
    return [...beforeLines, `${hiddenVariable} <- ${value}`, ...afterLines].join("\n");
  }

  return `${hiddenVariable} <- ${value}\n${stripped}`;
}

async function runWithInput(
  code: string,
  hiddenVariable: string,
  input: string,
  onOutput: (line: ConsoleLine) => void,
): Promise<void> {
  const { runPseint } = await import("./interpreter");
  const wrappedCode = prependVariable(code, hiddenVariable, input);
  await runPseint(wrappedCode, {
    onOutput,
    requestInput: async () => "",
    signal: { aborted: false } as unknown as AbortSignal,
    onVariables: () => {},
    strictMode: false,
    strongTyping: false,
    debug: false,
    onStep: () => Promise.resolve(),
  });
}

export function validateSingle(
  validator: ChallengeData["validator"],
  outputText: string,
  input: string,
  expectedOutput: string,
): boolean {
  const trimmed = outputText.trim();

  if (validator === "contiene") {
    return trimmed.toLowerCase().includes(expectedOutput.toLowerCase());
  }

  if (validator === "doble") {
    const expected = parseInt(expectedOutput, 10);
    const actual = parseInt(trimmed, 10);
    return !isNaN(actual) && actual === expected;
  }

  if (validator === "par-o-impar") {
    const upper = trimmed.toUpperCase();
    const num = parseInt(input, 10);
    // Check IMPAR first since "IMPAR".includes("PAR") is true
    if (upper.includes("IMPAR")) return num % 2 !== 0;
    if (upper.includes("PAR")) return num % 2 === 0;
    return false;
  }

  return false;
}

export interface ValidationResult {
  total: number;
  passed: number;
  failed: number;
  results: { input: string; passed: boolean; output: string }[];
}

export async function validateChallenge(
  challenge: ChallengeData,
  userCode: string,
): Promise<ValidationResult> {
  const results: ValidationResult["results"] = [];
  let passed = 0;

  for (const testCase of challenge.testCases) {
    const outputs: ConsoleLine[] = [];
    const captureOutput = (line: ConsoleLine) => {
      if (line.type === "out") outputs.push(line);
    };

    await runWithInput(
      userCode,
      challenge.hiddenVariable,
      testCase.input,
      captureOutput,
    );

    const outputText = outputs.map((l) => l.text).join("").trim();
    const ok = validateSingle(
      challenge.validator,
      outputText,
      testCase.input,
      testCase.expectedOutput,
    );
    results.push({ input: testCase.input, passed: ok, output: outputText });
    if (ok) passed++;
  }

  const total = challenge.testCases.length;
  return { total, passed, failed: total - passed, results };
}
