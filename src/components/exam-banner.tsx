import { marked } from "marked";
import { Download } from "lucide-react";

interface Props {
  consigna: string;
  onFinalizar?: () => void;
  onDownload?: () => void;
}

/** Non-dismissible banner that renders the exam consigna (prompt) and provides a Finalizar button. */
export function ExamBanner({ consigna, onFinalizar, onDownload }: Props) {
  const handleFinalizar = () => {
    onDownload?.();
    onFinalizar?.();
  };

  const parsed = marked.parse(consigna, { async: false }) as string;

  return (
    <div className="exam-banner border-b border-border bg-sidebar px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-start gap-4">
        <div
          className="exam-consigna flex-1 text-sm"
          dangerouslySetInnerHTML={{ __html: parsed }}
        />
        <button
          type="button"
          onClick={handleFinalizar}
          className="shrink-0 flex cursor-pointer items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Download className="size-4" />
          Finalizar examen
        </button>
      </div>
    </div>
  );
}
