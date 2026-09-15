import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Confirmaciones y avisos dentro de la app.
 *
 * `window.confirm` y `window.alert` bloquean el hilo, no se pueden estilar y en la PWA
 * instalada salen con el dominio delante, que parece un aviso del navegador y no de la
 * liga. Estos usan `<dialog>` nativo, igual que la ficha de carrera, así que heredan
 * Escape, el atrapado de foco y el backdrop sin añadir ninguna dependencia.
 */

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "normal" | "peligro";
}

export function useConfirm() {
  const [pregunta, setPregunta] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setPregunta(options);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  const responder = useCallback((ok: boolean) => {
    setPregunta(null);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  // Si la vista se desmonta con la pregunta abierta, la promesa quedaría colgada y el
  // `await confirm(...)` de quien llamó no terminaría nunca.
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);

  return {
    confirm,
    confirmDialog: pregunta ? <ConfirmDialog {...pregunta} onResponder={responder} /> : null,
  };
}

function ConfirmDialog({
  title, body, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "normal", onResponder,
}: ConfirmOptions & { onResponder: (ok: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    // Una acción destructiva no debe tener el botón de confirmar bajo el dedo al abrirse.
    if (tone !== "peligro") confirmRef.current?.focus();
    return () => dialog?.close();
  }, [tone]);

  const peligro = tone === "peligro";

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      onCancel={event => { event.preventDefault(); onResponder(false); }}
      onClick={event => { if (event.target === event.currentTarget) onResponder(false); }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none place-items-center border-0 bg-transparent p-4 text-left backdrop:bg-black/70 open:grid"
    >
      <div className="w-full max-w-sm border border-white/10 bg-[#0d0d0d] shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 id="confirm-title" className="text-xs font-black uppercase tracking-widest text-white">{title}</h2>
          {body && <p className="mt-2 text-[11px] leading-relaxed text-white/50">{body}</p>}
        </div>
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={() => onResponder(false)}
            className="min-h-11 flex-1 border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onResponder(true)}
            className={`min-h-11 flex-1 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors ${
              peligro ? "bg-[#e10600] hover:bg-[#ff241c]" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/** Aviso en línea. `error` se anuncia como alerta; el resto, como estado. */
export function StatusBanner({
  message, tone = "info", onDismiss,
}: { message: string; tone?: "info" | "exito" | "error"; onDismiss?: () => void }) {
  if (!message) return null;
  const estilo = tone === "error"
    ? "border-[#e10600]/40 bg-[#e10600]/10 text-[#ff8a85]"
    : tone === "exito"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 border px-4 py-3 text-[11px] leading-relaxed ${estilo}`}>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Descartar aviso" className="shrink-0 text-current/60 transition-opacity hover:opacity-100">✕</button>
      )}
    </div>
  );
}
