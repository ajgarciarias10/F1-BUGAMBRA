import { useEffect, useState } from "react";

/**
 * ¿Está el canal de la liga en directo? Misma consulta que hace hoy la portada
 * (PublicHome): uptime público del canal, cada minuto. El ticket 20 la cambiará
 * por la API oficial de Twitch desde apps/api. Ante cualquier error, apagado.
 */
export function textoIndicaDirecto(texto: string): boolean {
  // Apagado responde «tonicotitular is offline»; en directo, la duración
  // («1 hour, 5 minutes»). Solo una duración cuenta como directo.
  const t = texto.trim().toLowerCase();
  return !t.includes("offline") && /\d+\s*(second|minute|hour|day)/.test(t);
}

export function useDirecto(): boolean {
  const [enDirecto, setEnDirecto] = useState(false);

  useEffect(() => {
    let montado = true;
    const comprobar = async () => {
      try {
        const respuesta = await fetch("https://decapi.me/twitch/uptime/tonicotitular");
        const texto = await respuesta.text();
        if (montado) setEnDirecto(respuesta.ok && textoIndicaDirecto(texto));
      } catch {
        if (montado) setEnDirecto(false);
      }
    };
    void comprobar();
    const intervalo = window.setInterval(comprobar, 60000);
    return () => { montado = false; window.clearInterval(intervalo); };
  }, []);

  return enDirecto;
}
