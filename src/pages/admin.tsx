import { useState } from "preact/hooks";
import { Link2, Copy, Check, ArrowLeft } from "lucide-react";
import { buildExamUrl } from "@/lib/pseint/share";

export function AdminPage() {
  const [consigna, setConsigna] = useState("");
  const [keyword, setKeyword] = useState("EXAMEN");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleGenerarLink = async () => {
    if (!consigna.trim()) {
      setError("Por favor, escribe la consigna del examen.");
      return;
    }
    if (!keyword.trim()) {
      setError("Por favor, escribe una palabra clave.");
      return;
    }
    setError("");
    try {
      const url = await buildExamUrl(consigna, keyword);
      setGeneratedUrl(url);
    } catch {
      setError("Error al generar el enlace. Intenta de nuevo.");
    }
  };

  const handleCopiarLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Link2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Modo Examen — Admin</h1>
            <p className="text-sm text-muted-foreground">
              Genera un enlace para un examen
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="consigna"
              className="mb-1.5 block text-sm font-medium"
            >
              Consigna del examen (puedes usar Markdown)
            </label>
            <textarea
              id="consigna"
              value={consigna}
              onChange={(e) => setConsigna(e.currentTarget.value)}
              placeholder={"Escribí la consigna del examen aquí...\n\nPodés usar **negrita**, *cursiva*, listas, etc."}
              className="min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="keyword" className="mb-1.5 block text-sm font-medium">
              Palabra clave
            </label>
            <input
              id="keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.currentTarget.value)}
              placeholder="EXAMEN"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Esta palabra clave identificará el enlace del examen.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {generatedUrl && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-2 text-sm font-medium">Enlace generado:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerarLink}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Generar link
            </button>
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Volver al IDE
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
