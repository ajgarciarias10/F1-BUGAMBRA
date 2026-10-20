import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useSplits } from "../hooks/useData";
import { StorageImageUpload } from "./StorageImageUpload";
import { UploadCloud, Link as LinkIcon, Camera, User, BadgeAlert, ImageIcon } from "lucide-react";
import { Badge, Button, Card, EmptyState, Notice } from "./ui";

const FIELD = "min-h-12 w-full rounded-lg border border-line-strong bg-surface/90 px-4 text-base text-ink shadow-fluent-1 transition-colors placeholder:text-ink-muted/80 hover:border-info/60 focus:border-info md:min-h-11 md:text-sm";
const LABEL = "block text-sm font-semibold text-ink-2";
import { useSingleFlight } from "../hooks/useSingleFlight";

export function ProfileView() {
  const { user, userData } = useAuth();
  const { splits } = useSplits();
  const [nombre, setNombre] = useState(userData?.nombre || "");
  const [fotoUrl, setFotoUrl] = useState(userData?.foto_url || "");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [logoUrlInputs, setLogoUrlInputs] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);
  const [logoMsg, setLogoMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isJeque = userData?.rol === "jeque";
  const escuderiaId = userData?.escuderia_id;

  const mySplits = (splits || []).filter(
    (s: any) => s.id !== "global" && s.activo && (s.equipos || []).some((e: any) => e.id === escuderiaId)
  );

  const career = useMemo(() => {
    if (!userData) return [];
    const pilotId = userData.piloto_id || (userData.rol === "piloto" ? userData.uid : "");
    if (!pilotId) return [];

    return (splits || [])
      .filter((split: any) => split.id !== "global")
      .map((split: any) => {
        const entry = (split.roster || []).find((pilot: any) => pilot.pilotoId === pilotId);
        if (!entry) return null;
        const team = (split.equipos || []).find((candidate: any) => candidate.id === entry.equipoId);
        return {
          splitId: split.id,
          splitName: split.nombre,
          order: split.orden,
          teamName: split.tipo === "individual" ? "Competición individual" : team?.nombre || entry.equipoId || "Sin escudería",
          teamLogo: team?.logo_url || "",
          // Origins también puntúa: para parte de la parrilla es su debut, y la trayectoria
          // arranca ahí. Solo se oculta el OVR si esa temporada no llegó a calcularlo.
          rating: Number(entry.rating_piloto) > 0 ? Number(entry.rating_piloto) : null,
          // El OVR con el que arrancó el split: la diferencia con el de cierre es lo que
          // el piloto ganó o perdió en ese bloque.
          ratingBase: Number(entry.rating_base) > 0 ? Number(entry.rating_base) : null,
          points: entry.puntos_piloto ?? 0,
          rookie: !!entry.rookie,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.order - b.order);
  }, [splits, userData]);

  // La trayectoria encadenada: cada split parte del OVR con el que cerró el anterior, así
  // que la variación se mide contra ese valor y no contra un 70 fijo.
  const careerWithProgress = useMemo(() => {
    let previousRating: number | null = null;
    return career.map((season: any) => {
      const from = season.ratingBase ?? previousRating;
      const change = season.rating != null && from != null ? season.rating - from : null;
      if (season.rating != null) previousRating = season.rating;
      return { ...season, ratingFrom: from, ratingChange: change };
    });
  }, [career]);

  const careerPeak = useMemo(() => {
    const ratings = career.map((season: any) => season.rating).filter((r: any) => r != null);
    return ratings.length ? Math.max(...ratings) : null;
  }, [career]);

  const currentParticipation = useMemo(() => {
    if (!userData) return null;
    const pilotId = userData.piloto_id || (userData.rol === "piloto" ? userData.uid : "");
    const activeSplit = (splits || []).find((split: any) => split.activo);
    if (!pilotId || !activeSplit) return null;
    const entry = (activeSplit.roster || []).find((pilot: any) =>
      pilot.pilotoId === pilotId && pilot.participa_hasta == null
    );
    if (!entry) return null;
    const team = (activeSplit.equipos || []).find((candidate: any) => candidate.id === entry.equipoId);
    return { splitName: activeSplit.nombre, teamName: team?.nombre || "Competición individual" };
  }, [splits, userData]);

  const pilotStatus = useMemo(() => {
    const pilotId = userData?.piloto_id || (userData?.rol === "piloto" ? userData.uid : "");
    if (!pilotId) return null;
    const activeSplit = (splits || []).find((split: any) => split.activo);
    const lastSeason = [...career].sort((a: any, b: any) => b.order - a.order)[0];
    return {
      activeSeasonName: activeSplit?.nombre || "temporada activa",
      lastSeasonName: lastSeason?.splitName || "Sin temporada registrada",
      isFormerPilot: !currentParticipation,
    };
  }, [career, currentParticipation, splits, userData]);

  const { run: runOnce } = useSingleFlight();
  async function saveTeamLogo(splitId: string, logoUrl: string) {
    return runOnce(async () => {
    if (!escuderiaId) return;
    setSavingLogo(splitId);
    try {
      await updateDoc(doc(db, `splits/${splitId}/equipos`, escuderiaId), { logo_url: logoUrl || null });
      setLogoMsg("Logo guardado.");
      setTimeout(() => setLogoMsg(""), 2500);
    } catch (err: any) {
      setLogoMsg("Error: " + err.message);
    } finally {
      setSavingLogo(null);
    }
    });
  }

  useEffect(() => {
    if (userData) {
      setNombre(userData.nombre || "");
      setFotoUrl(userData.foto_url || "");
    }
  }, [userData]);

  if (!user || !userData) {
    return (
      <EmptyState icon={User} title="Inicia sesión para ver tu perfil" description="Tu foto, nombre y trayectoria aparecen aquí cuando accedes." />
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processImageFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("El archivo seleccionado debe ser una imagen.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // Compress to ideal size (max 256x256, highly compressed jpeg)
      const base64Img = await compressAndConvertImage(file, 256, 256, 0.75);
      setFotoUrl(base64Img);
      setSuccessMsg("¡Foto procesada correctamente! No olvides guardar los cambios.");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la imagen de perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setFotoUrl(urlInput.trim());
    setUrlInput("");
    setSuccessMsg("¡URL de foto aplicada! Recuerda guardar para persistir los cambios.");
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    return runOnce(async () => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const userRef = doc(db, "usuarios", user.uid);
      await updateDoc(userRef, {
        nombre: nombre.trim(),
        foto_url: fotoUrl
      });
      setSuccessMsg("¡Tu perfil ha sido actualizado con éxito!");
    } catch (err: any) {
      setErrorMsg("Error al guardar cambios: " + (err.message || err));
    } finally {
      setLoading(false);
    }
    });
  };

  const currentLogoForSplit = (splitId: string) => {
    const s = (splits || []).find((s: any) => s.id === splitId);
    const eq = (s?.equipos || []).find((e: any) => e.id === escuderiaId);
    return eq?.logo_url || "";
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
      {/* Columna izquierda: ficha visual */}
      <div className="lg:col-span-1">
        <Card as="section" aria-label="Tu perfil" accent="var(--c-brand)" pad="lg" className="flex flex-col items-center text-center lg:sticky lg:top-24">
          <div className="relative mb-5 mt-2">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={nombre}
                referrerPolicy="no-referrer"
                className="h-32 w-32 rounded-full border-2 border-brand object-cover shadow-fluent-2"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-line bg-surface-3 text-ink-muted">
                <User aria-hidden="true" className="h-16 w-16" />
              </div>
            )}
            <button
              type="button"
              aria-label="Cambiar foto de perfil"
              onClick={() => fileInputRef.current?.click()}
              className="fluent-press btn-primary-fluent absolute -bottom-1 -right-1 grid h-11 w-11 place-items-center rounded-full border-2 border-surface bg-brand text-brand-ink"
            >
              <Camera aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <Badge tone="brand" className="mb-2">Sesión: {userData.rol}</Badge>
          <h2 className="text-xl font-semibold tracking-tight">{nombre || "Usuario F1"}</h2>
          <p className="mt-1 max-w-full truncate text-sm text-ink-muted">{user.email}</p>

          <div className="my-6 grid w-full grid-cols-2 gap-3 border-t border-line pt-5 text-left">
            <div className="min-w-0 rounded-lg border border-line bg-surface-2/70 p-3">
              <span className="mb-1 block text-xs text-ink-muted">Estado actual</span>
              <span className="block max-w-full truncate text-sm font-semibold text-ink">
                {userData.rol === "admin" && !pilotStatus ? "Administrador" : currentParticipation?.teamName || (pilotStatus?.isFormerPilot ? "Ex piloto F1" : "Espectador")}
              </span>
              {pilotStatus?.isFormerPilot && (
                <span className="mt-1 block text-xs text-ink-muted">
                  No compite en {pilotStatus.activeSeasonName} · Última: {pilotStatus.lastSeasonName}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center rounded-lg border border-line bg-surface-2/70 p-3">
              <span className="mb-1 block text-xs text-ink-muted">Id de registro</span>
              <span className="block max-w-full truncate text-xs tabular-nums text-ink-2">{user.uid.substring(0, 10)}…</span>
            </div>
          </div>

          <Notice tone="info" className="w-full text-left text-xs">
            Tus fotos y datos de perfil se actualizan en todas las tablas de clasificación de la plataforma de manera inmediata.
          </Notice>
        </Card>
      </div>

      {/* Columna derecha: edición */}
      <div className="space-y-6 lg:col-span-2">
        <Card as="section" pad="lg">
        <form onSubmit={handleSaveChanges} aria-busy={loading} className="space-y-6">
          <div className="border-b border-line pb-4">
            <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span aria-hidden="true" className="h-5 w-1 rounded-full bg-brand" />
              Editar tus datos
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Actualiza tu fotografía o tu álias en los marcadores de la liga.
            </p>
          </div>

          {successMsg && <Notice tone="ok">{successMsg}</Notice>}
          {errorMsg && <Notice tone="danger">{errorMsg}</Notice>}

          <div className="space-y-2">
            <label htmlFor="profile-nombre" className={LABEL}>Nombre o álias piloto/jeque</label>
            <input
              id="profile-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={FIELD}
              placeholder="Ej: Marotez Al-Rafah"
            />
          </div>

          <div className="space-y-2">
            <span className={LABEL}>Foto de perfil personalizada</span>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Subir imagen de perfil"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? "border-brand bg-brand-soft"
                  : "border-line-strong bg-surface-2/60 hover:border-info/60 hover:bg-info/5"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <UploadCloud aria-hidden="true" className={`mb-2 h-10 w-10 ${dragActive ? "text-brand" : "text-ink-muted"}`} />
              <p className="text-sm font-semibold text-ink">
                Arrastra tu imagen aquí o haz clic para subir
              </p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Se redimensiona automáticamente y se ve en toda la app.
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-5">
            <label htmlFor="profile-url" className={LABEL}>O introduce una dirección URL de imagen</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="profile-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className={`${FIELD} pl-10`}
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
              </div>
              <Button onClick={handleApplyUrl} className="min-h-12 shrink-0 md:min-h-11">
                Aplicar URL
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-line pt-6">
            <Button type="submit" variant="primary" loading={loading} className="min-h-12 w-full px-8 sm:w-auto">
              {loading ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </form>
        </Card>

        {career.length > 0 && (
          <Card as="section" pad="none" className="overflow-hidden">
            <div className="border-b border-line p-5 md:p-6">
              <p className="text-xs font-semibold text-brand">Archivo del piloto</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">Trayectoria por temporadas</h3>
              <p className="mt-1 text-sm text-ink-muted">Tus equipos y resultados se conservan aunque no participes en el split vigente.</p>
              {careerPeak != null && (
                <p className="mt-2 text-sm text-ink-muted">
                  Techo de carrera <span className="font-semibold text-warn">{careerPeak} OVR</span>
                  <span> · el overall se arrastra de un split al siguiente</span>
                </p>
              )}
            </div>
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {careerWithProgress.map((season: any) => (
                <li key={season.splitId} className="flex items-center gap-4 bg-surface p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 p-1.5">
                    {season.teamLogo
                      ? <img src={season.teamLogo} alt={season.teamName} className="h-full w-full object-contain" />
                      : <span className="text-xs font-semibold text-ink-muted">{season.teamName.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">{season.splitName}</span>
                      {season.rookie && <Badge tone="info">Rookie</Badge>}
                    </div>
                    <p className="mt-1 truncate font-semibold">{season.teamName}</p>
                    <span className="text-xs tabular-nums text-ink-muted">{season.points} pts</span>
                  </div>
                  {season.rating != null && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="grid h-14 w-14 place-items-center rounded-lg border border-brand/30 bg-brand-soft text-center">
                        <div><strong className="block text-xl leading-none tabular-nums">{season.rating}</strong><span className="text-[11px] text-ink-muted">OVR</span></div>
                      </div>
                      {season.ratingChange != null && (
                        <span className={`text-[11px] font-semibold tabular-nums ${
                          season.ratingChange > 0 ? "text-ok"
                          : season.ratingChange < 0 ? "text-danger"
                          : "text-ink-muted"
                        }`}>
                          {season.ratingChange > 0 ? "▲" : season.ratingChange < 0 ? "▼" : "="}
                          {season.ratingChange !== 0 && Math.abs(season.ratingChange)}
                          <span className="font-normal text-ink-muted"> de {season.ratingFrom}</span>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Logo de equipo: solo para jeques */}
        {isJeque && escuderiaId && mySplits.length > 0 && (
          <Card as="section" pad="lg" className="space-y-5">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              <span aria-hidden="true" className="h-5 w-1 rounded-full bg-brand" />
              <div>
                <h3 className="text-base font-semibold tracking-tight">Logo de tu escudería</h3>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Sube el escudo de tu escudería por temporada
                </p>
              </div>
            </div>

            {logoMsg && <Notice tone={logoMsg.startsWith("Error") ? "danger" : "ok"}>{logoMsg}</Notice>}

            <div className="space-y-5">
              {mySplits.map((split: any) => {
                const currentLogo = currentLogoForSplit(split.id);
                const localUrl = logoUrlInputs[split.id] ?? currentLogo;
                return (
                  <div key={split.id} className="space-y-3">
                    <p className="text-sm font-semibold text-ink-2">
                      Temporada · {split.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                        {currentLogo ? (
                          <img src={currentLogo} alt="" className="h-full w-full object-contain p-1" />
                        ) : (
                          <ImageIcon aria-hidden="true" className="h-5 w-5 text-ink-muted" />
                        )}
                      </div>
                      <StorageImageUpload
                        storagePath={`logos/${split.id}/${escuderiaId}`}
                        currentUrl={currentLogo || undefined}
                        onUpload={url => saveTeamLogo(split.id, url)}
                        size="sm"
                        className="shrink-0"
                      />
                      <input
                        type="url"
                        aria-label={`URL del logo para ${split.nombre}`}
                        value={localUrl}
                        onChange={e => setLogoUrlInputs(prev => ({ ...prev, [split.id]: e.target.value }))}
                        placeholder="o pega URL aquí"
                        className={`${FIELD} min-w-[12rem] flex-1`}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingLogo === split.id}
                        onClick={() => saveTeamLogo(split.id, localUrl)}
                        className="shrink-0"
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
