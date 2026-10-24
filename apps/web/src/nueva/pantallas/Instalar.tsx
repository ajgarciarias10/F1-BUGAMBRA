import { useState } from "react";
import { Link } from "react-router";
import { usePWAInstall, type InstallPlatform } from "../../hooks/usePWAInstall";
import { ControlSegmentado } from "../ui/ControlSegmentado";
import { rutaDe } from "../shell/secciones";

const GUIAS: Record<InstallPlatform, string[]> = {
  ios: ["Abre F1 Bugambra en Safari.", "Toca Compartir en la barra inferior.", "Pulsa «Añadir a pantalla de inicio» y confirma."],
  android: ["Abre F1 Bugambra en Chrome.", "Toca el menú de tres puntos.", "Pulsa «Instalar aplicación» o «Añadir a pantalla de inicio»."],
  desktop: ["Abre F1 Bugambra en Chrome o Edge.", "Pulsa el icono de instalar en la barra de direcciones.", "Confirma para abrirla en su propia ventana."],
};
export function pasosInstalacion(plataforma: InstallPlatform): string[] { return GUIAS[plataforma]; }

export function Instalar() {
  const { canInstall, installed, platform, install } = usePWAInstall();
  const [seleccion, setSeleccion] = useState<InstallPlatform>(platform);
  const [mensaje, setMensaje] = useState("");
  async function instalarAhora() {
    const resultado = await install();
    if (resultado === "unavailable") setMensaje("Tu navegador no ofrece instalación automática. Sigue los pasos de tu dispositivo.");
    if (resultado === "dismissed") setMensaje("Instalación cancelada. Puedes intentarlo de nuevo.");
  }
  return <section className="mx-auto max-w-2xl space-y-6 text-[color:var(--text-main)]">
    <div><span className="nui-eyebrow">Móvil y ordenador</span><h1 className="text-3xl font-bold">Instalar F1 Bugambra</h1></div>
    <p className="nui-muted">Accede a la liga desde tu pantalla de inicio. La app se actualiza al abrirla con conexión.</p>
    {installed ? <p role="status">Ya estás usando la app instalada.</p> : <>
      {canInstall && <button className="nui-button nui-button--primary" onClick={() => void instalarAhora()}>Instalar ahora</button>}
      {mensaje && <p role="status">{mensaje}</p>}
      <ControlSegmentado<InstallPlatform> opciones={[{ valor: "ios", etiqueta: "iPhone" }, { valor: "android", etiqueta: "Android" }, { valor: "desktop", etiqueta: "Ordenador" }]} valor={seleccion} onCambiar={setSeleccion} etiqueta="Dispositivo" />
      <ol className="space-y-0">{pasosInstalacion(seleccion).map((paso, i) => <li key={paso} className="flex items-center gap-4 border-b py-5" style={{ borderColor: "var(--border-color)" }}><strong className="text-xl" style={{ color: "var(--accent-f1)" }}>{String(i + 1).padStart(2, "0")}</strong><span>{paso}</span></li>)}</ol>
    </>}
    <Link className="nui-button" to={rutaDe("portada")}>Volver a la liga</Link>
  </section>;
}

export default Instalar;
