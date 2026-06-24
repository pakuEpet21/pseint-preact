import { Trash } from "lucide-react";

interface CloseConfirmDialogProps {
  tab: { name: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CloseConfirmDialog = ({ tab, onConfirm, onCancel }: CloseConfirmDialogProps) => {
  if (!tab) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-file-title"
        aria-describedby="close-file-description"
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
            <Trash className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="close-file-title" className="text-base font-semibold">
              Eliminar
            </h2>
            <p
              id="close-file-description"
              className="mt-1 text-sm text-muted-foreground"
            >
              Vas a eliminar{" "}
              <span className="font-medium text-foreground">
                {tab.name}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Si continuás, no podras recuperar el archivo.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Cerrar archivo
          </button>
        </div>
      </div>
    </div>
  );
};
