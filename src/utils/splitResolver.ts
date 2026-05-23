/**
 * Helper to determine if a split is unlocked/visible.
 * - Split 1 is always unlocked.
 * - Any subsequent split is unlocked ONLY if the previous split was fully completed
 *   (i.e. ALL its circuits have completado === true, and there is at least 1 circuit).
 */
export const isSplitUnlocked = (splitId: string, allSplits: any[]): boolean => {
  const sorted = [...allSplits].sort((a, b) => a.id.localeCompare(b.id));
  const index = sorted.findIndex(s => s.id === splitId);
  if (index <= 0) return true; // split_1 is always unlocked
  const prevSplit = sorted[index - 1];
  const hasCircuits = prevSplit.circuitos && prevSplit.circuitos.length > 0;
  const allCompleted = hasCircuits && prevSplit.circuitos.every((c: any) => c.completado);
  return allCompleted;
};

/**
 * Helper to process and resolve all splits.
 * - "En mundial split 2 no puede haber puntos no hemos ni empezado. Ni en el split 3 tampoco ni en el 4."
 * - "Piensa que los equipos tampoco pueden estar hechos en esos splits por que tiene que basicamente mirar al split anterior y ser actualizados. Es como que cada split apunta al anterior en equipos y jugadores. Pero no en puntos de equipo ni puntos de piloto, ni rating cada split cada uno tiene el rating del split anterior que ira cambiando conforme se juegen circuitos."
 */
export function resolveAllSplits(rawSplits: any[]): any[] {
  // Sort splits alphabetically to get split_1, split_2, split_3, split_4
  const sorted = [...rawSplits].sort((a, b) => a.id.localeCompare(b.id));
  
  const resolved: any[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const isStarted = s.circuitos && s.circuitos.some((c: any) => c.completado);
    
    if (i === 0) {
      // Split 1 is the starting point. Keep whatever points and stats are registered in the DB.
      // If s.equipos is empty or missing, fallback to pre-seeding the teams based on Split 1 baseline stats.
      let equipos = s.equipos;
      if (!equipos || equipos.length === 0) {
        equipos = [
          {
            id: "roses",
            nombre: "Roses",
            presupuesto: 100,
            puntos_constructores: 185,
            jeque_id: "",
            pilotos: [
              { id: "piloto_fabi", nombre: "Fabi (I)", puntos_piloto: 67, victorias: 1, podios: 4, rating_piloto: 75, precio_compra_split: 38, clausula_actual: 76, mantener_actual: 114, precio_carrera_anterior: 68.4 },
              { id: "piloto_jota", nombre: "Jota", puntos_piloto: 70, victorias: 1, podios: 2, rating_piloto: 70, precio_compra_split: 28, clausula_actual: 56, mantener_actual: 84, precio_carrera_anterior: 47.1 },
              { id: "piloto_samu", nombre: "Samu", puntos_piloto: 22, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
              { id: "piloto_pabliyo", nombre: "Pabliyo", puntos_piloto: 26, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 0.5, clausula_actual: 1, mantener_actual: 1.5, precio_carrera_anterior: 1.5 }
            ]
          },
          {
            id: "alfa_romero",
            nombre: "Alfa Romero",
            presupuesto: 100,
            puntos_constructores: 132,
            jeque_id: "",
            pilotos: [
              { id: "piloto_mimic", nombre: "Mimic", puntos_piloto: 81, victorias: 1, podios: 6, rating_piloto: 81, precio_compra_split: 52, clausula_actual: 104, mantener_actual: 156, precio_carrera_anterior: 72.8 },
              { id: "piloto_toni", nombre: "Toni", puntos_piloto: 33, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
              { id: "piloto_pinilla", nombre: "Pinilla", puntos_piloto: 18, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
              { id: "vacante_alfaromero", nombre: "Vacante Alfa Romero", puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 }
            ]
          },
          {
            id: "zenith",
            nombre: "Zenith",
            presupuesto: 100,
            puntos_constructores: 130,
            jeque_id: "",
            pilotos: [
              { id: "piloto_jose", nombre: "Jose (I)", puntos_piloto: 87, victorias: 3, podios: 6, rating_piloto: 87, precio_compra_split: 40, clausula_actual: 80, mantener_actual: 120, precio_carrera_anterior: 96 },
              { id: "piloto_moles", nombre: "Moles", puntos_piloto: 43, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 25, clausula_actual: 50, mantener_actual: 75, precio_carrera_anterior: 30.5 },
              { id: "piloto_aparicio", nombre: "Aparicio", puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 },
              { id: "vacante_zenith", nombre: "Vacante Zenith", puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 }
            ]
          }
        ];
      } else {
        const defaultTeamPoints: Record<string, number> = {
          "roses": 185,
          "alfa_romero": 132,
          "zenith": 130
        };

        const defaultPilotStats: Record<string, { puntos_piloto: number, victorias: number, podios: number, rating_piloto?: number, precio_compra_split?: number, clausula_actual?: number, mantener_actual?: number, precio_carrera_anterior?: number }> = {
          "piloto_fabi": { puntos_piloto: 67, victorias: 1, podios: 4, rating_piloto: 75, precio_compra_split: 38, clausula_actual: 76, mantener_actual: 114, precio_carrera_anterior: 68.4 },
          "piloto_jota": { puntos_piloto: 70, victorias: 1, podios: 2, rating_piloto: 70, precio_compra_split: 28, clausula_actual: 56, mantener_actual: 84, precio_carrera_anterior: 47.1 },
          "piloto_samu": { puntos_piloto: 22, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
          "piloto_pabliyo": { puntos_piloto: 26, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 0.5, clausula_actual: 1, mantener_actual: 1.5, precio_carrera_anterior: 1.5 },
          "piloto_mimic": { puntos_piloto: 81, victorias: 1, podios: 6, rating_piloto: 81, precio_compra_split: 52, clausula_actual: 104, mantener_actual: 156, precio_carrera_anterior: 72.8 },
          "piloto_toni": { puntos_piloto: 33, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
          "piloto_pinilla": { puntos_piloto: 18, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 24, clausula_actual: 48, mantener_actual: 72, precio_carrera_anterior: 24 },
          "vacante_alfaromero": { puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 },
          "piloto_jose": { puntos_piloto: 87, victorias: 3, podios: 6, rating_piloto: 87, precio_compra_split: 40, clausula_actual: 80, mantener_actual: 120, precio_carrera_anterior: 96 },
          "piloto_moles": { puntos_piloto: 43, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 25, clausula_actual: 50, mantener_actual: 75, precio_carrera_anterior: 30.5 },
          "piloto_aparicio": { puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 },
          "vacante_zenith": { puntos_piloto: 0, victorias: 0, podios: 0, rating_piloto: 70, precio_compra_split: 10, clausula_actual: 15, mantener_actual: 15, precio_carrera_anterior: 10 }
        };

        equipos = s.equipos.map((eq: any) => {
          const defaultPts = defaultTeamPoints[eq.id.toLowerCase()] || 0;
          return {
            ...eq,
            puntos_constructores: eq.puntos_constructores || defaultPts,
            pilotos: (eq.pilotos || []).map((p: any) => {
              const defPilot: any = defaultPilotStats[p.id] || {};
              return {
                ...p,
                puntos_piloto: p.puntos_piloto || defPilot.puntos_piloto || 0,
                victorias: p.victorias || defPilot.victorias || 0,
                podios: p.podios || defPilot.podios || 0,
                rating_piloto: p.rating_piloto || defPilot.rating_piloto || 70,
                precio_compra_split: p.precio_compra_split || defPilot.precio_compra_split || 10,
                clausula_actual: p.clausula_actual || defPilot.clausula_actual || 15,
                mantener_actual: p.mantener_actual || defPilot.mantener_actual || 15,
                precio_carrera_anterior: p.precio_carrera_anterior || defPilot.precio_carrera_anterior || 10
              };
            })
          };
        });
      }

      resolved.push({
        ...s,
        equipos,
        isStarted: true
      });
    } else {
      // For split_2, split_3, split_4:
      if (!isStarted) {
        // NOT STARTED YET!
        // Inherit everything from the previous resolved split:
        // - Teams & Roster (which pilots are in which teams)
        // - Budgets
        // - Pilot properties (rating, split purchase price, buyout clause, previous race price, etc.)
        // But reset points to 0!
        const prevResolved = resolved[i - 1];
        
        let equipos = [];
        if (prevResolved && prevResolved.equipos) {
          equipos = prevResolved.equipos.map((prevEq: any) => {
            return {
              ...prevEq,
              presupuesto: prevEq.presupuesto ?? 100,
              puntos_constructores: 0, // always 0 for unstarted
              pilotos: (prevEq.pilotos || []).map((prevP: any) => {
                return {
                  ...prevP,
                  puntos_piloto: 0, // always 0 for unstarted
                  victorias: 0, // always 0 for unstarted
                  podios: 0, // always 0 for unstarted
                  rating_piloto: prevP.rating_piloto ?? 70,
                  precio_compra_split: prevP.precio_compra_split ?? 10,
                  clausula_actual: prevP.clausula_actual ?? 15,
                  mantener_actual: prevP.mantener_actual ?? 15,
                  precio_carrera_anterior: prevP.precio_carrera_anterior ?? 10
                };
              })
            };
          });
        } else {
          equipos = s.equipos.map((eq: any) => ({
            ...eq,
            puntos_constructores: 0,
            pilotos: (eq.pilotos || []).map((p: any) => ({
              ...p,
              puntos_piloto: 0,
              victorias: 0,
              podios: 0
            }))
          }));
        }
        
        resolved.push({
          ...s,
          equipos,
          isStarted: false
        });
      } else {
        // If it IS started, it has its own points & roster in DB. Keep it!
        resolved.push({
          ...s,
          isStarted: true
        });
      }
    }
  }
  
  return resolved;
}
