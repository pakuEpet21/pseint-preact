import { describe, it, expect } from "vitest";
import {
  challenges,
  getChallengeById,
  prependVariable,
  validateSingle,
} from "./challenges";

describe("challenge data integrity", () => {
  it("has exactly 6 challenges", () => {
    expect(challenges).toHaveLength(6);
  });

  it("each challenge has all required fields", () => {
    for (const c of challenges) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.instruction).toBeTruthy();
      expect(c.starterCode).toBeDefined();
      expect(c.hint).toBeTruthy();
      expect(c.hiddenVariable).toBeTruthy();
      expect(c.testCases).toBeTruthy();
      expect(c.testCases.length).toBeGreaterThan(0);
      expect(["contiene", "doble", "par-o-impar"]).toContain(c.validator);
    }
  });

  it("each test case has input and expectedOutput", () => {
    for (const c of challenges) {
      for (const tc of c.testCases) {
        expect(tc.input).toBeTruthy();
        expect(tc.expectedOutput).toBeTruthy();
      }
    }
  });
});

describe("getChallengeById", () => {
  it("returns the challenge with given id", () => {
    const c = getChallengeById("saludo-personalizado");
    expect(c).toBeTruthy();
    expect(c!.id).toBe("saludo-personalizado");
  });

  it("returns undefined for unknown id", () => {
    expect(getChallengeById("unknown-challenge")).toBeUndefined();
  });
});

describe("validateSingle", () => {
  describe('"contiene" validator', () => {
    it("returns true for exact match", () => {
      const result = validateSingle("contiene", "Hola, Ana", "Ana", "Hola, Ana");
      expect(result).toBe(true);
    });

    it("returns false for non-matching output", () => {
      const result = validateSingle("contiene", "Chau, Ana", "Ana", "Hola, Ana");
      expect(result).toBe(false);
    });

    it("is case sensitive", () => {
      const result = validateSingle("contiene", "hola, ana", "Ana", "Hola, Ana");
      expect(result).toBe(false);
    });
  });

  describe('"doble" validator', () => {
    it("returns true for correct doubling", () => {
      const result = validateSingle("doble", "14", "7", "14");
      expect(result).toBe(true);
    });

    it("returns false for incorrect result", () => {
      const result = validateSingle("doble", "15", "7", "14");
      expect(result).toBe(false);
    });

    it("handles negative numbers", () => {
      const result = validateSingle("doble", "-10", "-5", "-10");
      expect(result).toBe(true);
    });
  });

  describe('"par-o-impar" validator', () => {
    it("returns true for PAR with even number", () => {
      const result = validateSingle("par-o-impar", "PAR", "4", "PAR");
      expect(result).toBe(true);
    });

    it("returns true for IMPAR with odd number", () => {
      const result = validateSingle("par-o-impar", "IMPAR", "7", "IMPAR");
      expect(result).toBe(true);
    });

    it("returns false for wrong label", () => {
      const result = validateSingle("par-o-impar", "IMPAR", "4", "PAR");
      expect(result).toBe(false);
    });

    it("handles zero as PAR", () => {
      const result = validateSingle("par-o-impar", "PAR", "0", "PAR");
      expect(result).toBe(true);
    });
  });
});

describe("prependVariable", () => {
  it("injects hidden variable after Definir lines", () => {
    const code = `Algoritmo Test
Definir x Como Entero
Definir nombre Como Cadena
x <- 5
FinAlgoritmo`;
    const result = prependVariable(code, "nombre", "Ana");
    expect(result).toContain('nombre <- "Ana"');
    expect(result).toContain("x <- 5");
  });

  it("injects at beginning if no Definir found", () => {
    const code = `Algoritmo Test
Escribir "Hola"
FinAlgoritmo`;
    const result = prependVariable(code, "numero", "7");
    expect(result).toMatch(/^numero <- 7/);
  });

  it("wraps string input in quotes and number input without", () => {
    expect(prependVariable("", "nombre", "Ana")).toContain('nombre <- "Ana"');
    expect(prependVariable("", "numero", "7")).toContain("numero <- 7");
  });
});
