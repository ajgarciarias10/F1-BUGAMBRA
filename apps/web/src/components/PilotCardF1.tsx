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
  const rating = Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70;
  const mantener = pilot.mantener_actual || 0;
  const nameParts = (pilot.nombre || "").trim().split(" ");
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "";
  const firstName = nameParts.length > 1 ? nameParts[0] : "";

  const isSm = size === "sm";
  const tier = rating >= 90
    ? { accent: "#f5c451", label: "ELITE" }
    : rating >= 85
      ? { accent: "#e10600", label: "PRO" }
      : rating >= 80
        ? { accent: "#38bdf8", label: "ADV" }
        : { accent: "#a1a1aa", label: "CORE" };

  return (
    <div className="flex flex-col">
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        className={`group relative overflow-hidden bg-[#090909] select-none ${
          featured
            ? "border border-white/30 shadow-xl shadow-black/40"
            : "border border-white/[0.12] hover:border-white/30 transition-colors"
        }`}
        style={{ aspectRatio: "2/3", boxShadow: featured ? `0 0 0 1px ${tier.accent}55` : undefined }}
      >
        {/* Team logo — watermark fondo */}
        {team?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none bg-[#111]">
            <img
              src={team.logo_url}
              alt=""
              className="w-[82%] object-contain opacity-[0.08]"
            />
          </div>
        )}

        {/* Foto del piloto — máxima calidad, centrado en zona del rostro */}
        {photo ? (
          <img
            src={photo}
            referrerPolicy="no-referrer"
            alt={pilot.nombre}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.02]"
            style={{ objectFit: "cover", objectPosition: "center 15%", imageRendering: "auto" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black uppercase" style={{ fontSize: isSm ? 32 : 48, color: "rgba(255,255,255,0.04)" }}>
              {(pilot.nombre || "?").slice(0, 2)}
            </span>
          </div>
        )}

        {/* Single readability scrim */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "64%", background: "linear-gradient(to top, #080808 60%, rgba(8,8,8,0.82) 76%, transparent)" }}
        />

        {/* Controlled tier accents */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: tier.accent }} />
        <div
          className="absolute top-0 right-0 h-1"
          style={{ width: isSm ? 34 : 52, backgroundColor: tier.accent }}
        />

        {/* OVR badge */}
        <div
          className="absolute z-20 bg-[#070707] border border-white/20 shadow-lg shadow-black/50"
          style={{ top: isSm ? 7 : 11, left: isSm ? 8 : 13, minWidth: isSm ? 43 : 58 }}
        >
          <div className="h-1" style={{ backgroundColor: tier.accent }} />
          <div className="flex flex-col items-center" style={{ padding: isSm ? "5px 6px 6px" : "6px 8px 8px" }}>
            <span
              className="font-black text-white leading-none tabular-nums"
              style={{ fontSize: isSm ? 22 : 31, letterSpacing: "-0.06em" }}
            >
              {rating}
            </span>
            <span
              className="font-mono font-bold uppercase leading-none tracking-[0.16em]"
              style={{ fontSize: isSm ? 7 : 8, color: tier.accent, marginTop: 3 }}
            >
              OVR
            </span>
          </div>
        </div>

        {/* Team and status marks */}
        <div
          className="absolute z-20 right-0 flex flex-col items-end gap-1.5"
          style={{ top: isSm ? 8 : 12, paddingRight: isSm ? 7 : 10 }}
        >
          {team?.logo_url && (
            <div
              className="flex items-center justify-center bg-black/90 border border-white/15"
              style={{ width: isSm ? 27 : 36, height: isSm ? 27 : 36, padding: isSm ? 4 : 5 }}
            >
              <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          {pilot.rookie && (
            <span
              className="bg-white text-black font-black uppercase leading-none tracking-[0.12em]"
              style={{ fontSize: isSm ? 7 : 8, padding: isSm ? "4px 5px" : "5px 7px" }}
            >
              Rookie
            </span>
          )}
        </div>

        {/* Contenido inferior */}
        <div className="absolute bottom-0 inset-x-0 z-10" style={{ padding: isSm ? "0 9px 7px 11px" : "0 13px 10px 16px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: isSm ? 5 : 7 }}>
            <span className="h-px flex-1" style={{ backgroundColor: tier.accent }} />
            <span
              className="font-mono font-bold uppercase tracking-[0.16em]"
              style={{ color: tier.accent, fontSize: isSm ? 7 : 8 }}
            >
              {tier.label}
            </span>
          </div>

          {/* Nombre */}
          <div style={{ marginBottom: isSm ? 6 : 8 }}>
            {firstName && (
              <p
                className="font-bold uppercase leading-none truncate text-white/65"
                style={{ fontSize: isSm ? 8 : 10, letterSpacing: "0.12em", marginBottom: isSm ? 3 : 4 }}
              >
                {firstName}
              </p>
            )}
            <p
              className="font-black text-white uppercase leading-none truncate"
              style={{ fontSize: isSm ? 13 : 18, letterSpacing: "-0.025em" }}
            >
              {lastName || pilot.nombre}
            </p>
          </div>

          {/* Precio — oculto si congelado o showPrice=false */}
          {mantener > 0 && showPrice && !pilot.congelado && (
            <div className="flex items-baseline justify-between border-t border-white/10" style={{ paddingTop: isSm ? 5 : 7, marginBottom: isSm ? 5 : 7 }}>
              <span
                className="font-mono font-bold uppercase text-white/50"
                style={{ fontSize: isSm ? 7 : 8, letterSpacing: "0.16em" }}
              >
                Precio
              </span>
              <span
                className="font-black tabular-nums"
                style={{ fontSize: isSm ? 11 : 14, color: tier.accent }}
              >
                {mantener}M
              </span>
            </div>
          )}

          {/* Stats */}
          <div
            className="grid grid-cols-4 bg-white/[0.06] border-y border-white/10"
            style={{ padding: isSm ? "5px 1px 4px" : "7px 2px 6px" }}
          >
            {[
              { lbl: "PTS", val: pilot.puntos_piloto || 0 },
              { lbl: "VIC", val: pilot.victorias || 0 },
              { lbl: "POD", val: pilot.podios || 0 },
              { lbl: "POL", val: pilot.poles || 0 },
            ].map(s => (
              <div key={s.lbl} className="text-center border-r border-white/10 last:border-r-0">
                <p className="font-mono font-bold uppercase text-white/45" style={{ fontSize: isSm ? 7 : 8 }}>{s.lbl}</p>
                <p className="font-black text-white tabular-nums leading-tight" style={{ fontSize: isSm ? 10 : 13 }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Branding */}
          <p
            className="text-center font-mono font-bold uppercase tracking-[0.22em] text-white/25"
            style={{ fontSize: isSm ? 6 : 7, marginTop: isSm ? 4 : 5 }}
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
