// Rivalidades manuales del admin: el documento que leen el acta y la economía. Puro, con pruebas.

/** Grupo manual tal y como lo guarda el admin: 2 o 3 pilotos por id de Firestore. */
export type Rivalidad = { id: string; pilotoIds: string[] };

/** Lo que hace falta del split para describir a cada miembro del grupo. */
export interface PlantillaSplit {
  equipos: { id: string; nombre: string }[];
  roster: { pilotoId: string; nombre?: string; equipoId?: string; rating_piloto?: number; puntos_piloto?: number; precio_compra?: number }[];
}

/** El documento `rivalries` que leen el acta y la economía, a partir de los grupos manuales. Puro. */
export function construirRivalidades(splitId: string, grupos: Rivalidad[], { equipos, roster }: PlantillaSplit) {
  const equipoNombre = Object.fromEntries(equipos.map(team => [team.id, team.nombre]));
  const groups = grupos.map(group => {
    const members = group.pilotoIds.map(pilotId => {
      const pilot = roster.find(item => item.pilotoId === pilotId);
      return { id: pilotId, nombre: pilot?.nombre || pilotId, equipoId: pilot?.equipoId || "", equipoNombre: equipoNombre[pilot?.equipoId || ""] || pilot?.equipoId || "", rating: pilot?.rating_piloto ?? 0, puntos_piloto: pilot?.puntos_piloto ?? 0, statusRank: 0, price: pilot?.precio_compra ?? 0 };
    });
    return { id: group.id, statusRank: 0, type: members.length === 2 ? "pair" : "triad", members, groupScore: members.reduce((sum, member) => sum + member.rating, 0) / Math.max(1, members.length) };
  });
  return { splitId, totalPilotos: roster.length, pairCount: grupos.filter(group => group.pilotoIds.length === 2).length, coeficiente: 1, rivalidades: [], groups, soloPilots: [] };
}
