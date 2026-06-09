// Carta de piloto estilo F1 25 — usada en álbum público y en "Mi Equipo" (piloto/jeque)

interface PilotCardF1Props {
  pilot: any;
  team: any;
  getPilotPhoto: (id: string) => string;
  featured?: boolean;
  size?: "full" | "sm";        // full = álbum, sm = "Mi Equipo"
  showPrice?: boolean;          // mostrar mantener_actual (falso si congelado)
  footer?: React.ReactNode;     // acción opcional debajo de la card (e.g. botón despedir)
}

export function PilotCardF1({
  pilot,
  team,
  getPilotPhoto,
  featured = false,
  size = "full",
  showPrice = true,
  footer,
}: PilotCardF1Props) {
  const photo = getPilotPhoto(pilot.pilotoId ?? pilot.id ?? "");
  const rating = pilot.rating_piloto || 70;
  const mantener = pilot.mantener_actual || 0;
  const nameParts = (pilot.nombre || "").trim().split(" ");
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "";
  const firstName = nameParts.length > 1 ? nameParts[0] : "";

  const isSm = size === "sm";

  return (
    <div className="flex flex-col">
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-[#0a0a0a] select-none ${
          featured
            ? "border border-[#e10600]/50 shadow-xl shadow-[#e10600]/10"
            : "border border-white/[0.07] hover:border-white/[0.18] transition-colors"
        }`}
        style={{ aspectRatio: "2/3" }}
      >
        {/* Team logo — watermark fondo */}
        {team?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <img
              src={team.logo_url}
              className="w-[85%] object-contain opacity-[0.07]"
              style={{ filter: "blur(2px)" }}
            />
          </div>
        )}

        {/* Vignette base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] to-[#060606]" style={{ opacity: 0.55 }} />

        {/* Foto del piloto — máxima calidad, centrado en zona del rostro */}
        {photo ? (
          <img
            src={photo}
            referrerPolicy="no-referrer"
            alt={pilot.nombre}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center 15%", imageRendering: "auto" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black uppercase" style={{ fontSize: isSm ? 32 : 48, color: "rgba(255,255,255,0.04)" }}>
              {(pilot.nombre || "?").slice(0, 2)}
            </span>
          </div>
        )}

        {/* Gradiente inferior info */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "58%", background: "linear-gradient(to top, #0a0a0a 55%, transparent)" }}
        />

        {/* Barra roja izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#e10600]" />

        {/* RTG — arriba izquierda */}
        <div className="absolute z-10" style={{ top: isSm ? 6 : 10, left: isSm ? 7 : 12 }}>
          <p
            className="font-mono tracking-[0.3em] uppercase leading-none mb-0.5"
            style={{ fontSize: isSm ? 5 : 6.5, color: "rgba(255,255,255,0.35)" }}
          >
            RTG
          </p>
          <p
            className="font-black text-white leading-none tabular-nums"
            style={{ fontSize: isSm ? 18 : 26 }}
          >
            {rating}
          </p>
        </div>

        {/* Logo equipo — arriba derecha */}
        {team?.logo_url && (
          <img
            src={team.logo_url}
            className="absolute z-10 object-contain"
            style={{ top: isSm ? 5 : 8, right: isSm ? 6 : 8, width: isSm ? 18 : 26, height: isSm ? 18 : 26 }}
          />
        )}

        {/* Contenido inferior */}
        <div className="absolute bottom-0 inset-x-0 z-10" style={{ padding: isSm ? "0 8px 6px" : "0 10px 8px" }}>
          {/* Nombre */}
          <div style={{ marginBottom: isSm ? 3 : 4 }}>
            {firstName && (
              <p
                className="font-bold uppercase leading-none truncate"
                style={{ fontSize: isSm ? 6 : 8, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginBottom: 2 }}
              >
                {firstName}
              </p>
            )}
            <p
              className="font-black text-white uppercase leading-none truncate"
              style={{ fontSize: isSm ? 10 : 13, letterSpacing: "-0.01em" }}
            >
              {lastName || pilot.nombre}
            </p>
          </div>

          {/* Precio — oculto si congelado o showPrice=false */}
          {mantener > 0 && showPrice && !pilot.congelado && (
            <div className="flex items-baseline gap-1" style={{ marginBottom: isSm ? 4 : 6 }}>
              <span
                className="font-mono uppercase"
                style={{ fontSize: isSm ? 5 : 6.5, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}
              >
                Precio
              </span>
              <span
                className="font-black text-[#e10600] tabular-nums"
                style={{ fontSize: isSm ? 9 : 11 }}
              >
                {mantener}M
              </span>
            </div>
          )}

          {/* Stats */}
          <div
            className="grid grid-cols-4 border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)", paddingTop: isSm ? 4 : 6, paddingBottom: isSm ? 2 : 3 }}
          >
            {[
              { lbl: "PTS", val: pilot.puntos_piloto || 0 },
              { lbl: "VIC", val: pilot.victorias || 0 },
              { lbl: "POD", val: pilot.podios || 0 },
              { lbl: "POL", val: pilot.poles || 0 },
            ].map(s => (
              <div key={s.lbl} className="text-center">
                <p className="font-mono uppercase" style={{ fontSize: isSm ? 5 : 6, color: "rgba(255,255,255,0.2)" }}>{s.lbl}</p>
                <p className="font-black text-white tabular-nums" style={{ fontSize: isSm ? 8 : 10 }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Branding */}
          <p
            className="text-center font-mono uppercase tracking-[0.3em]"
            style={{ fontSize: isSm ? 4.5 : 5.5, color: "rgba(255,255,255,0.12)", marginTop: isSm ? 2 : 3 }}
          >
            F1 Bugambra
          </p>
        </div>
      </div>

      {/* ── Footer opcional (botón despedir, cláusula, etc.) ──────────────── */}
      {footer && (
        <div className="border-t-0 border border-white/[0.06] border-t-0" style={{ borderTop: "none" }}>
          {footer}
        </div>
      )}
    </div>
  );
}
