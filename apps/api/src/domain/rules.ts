export interface PointsRules {
  byPosition: number[];
  poleBonus: number;
  fastestLapBonus: number;
  dnfReceivesPositionPoints: boolean;
}

export interface RatingRules {
  minimum: number;
  maximum: number;
  racePositionDelta: Record<number, number>;
  racePositionFallback: number;
  ownErrorDnfDelta: number;
  qualifyingPositionDelta: Record<number, number>;
  qualifyingPositionFallback: number;
  cleanRaceBonus: number;
  fastestLapBonus: number;
  mvpBonus: number;
  driverOfTheDayBonus: number;
  overtakesBonus: number;
}

export interface EconomyRules {
  enabled: boolean;
  polePrize: number;
  fastestLapPrize: number;
  cleanTeamPrize: number;
  participationPrize: number;
  moneyPerPoint: number;
  constructorPrizeByPosition: number[];
}

export interface RivalryRules {
  qualifyingPrizeByRank: number[];
  racePrizeByRank: number[];
  stagePrizeByRank: number[];
  duoQualifyingPrizeByRank: number[];
  duoRacePrizeByRank: number[];
  duoStagePrizeByRank: number[];
  soloDriverParticipationPrize: number;
  statusOrderedByPurchasePrice: boolean;
}

export interface MarketRules {
  initialTeamBudget: number;
  positivePurchaseMaintainMultiplier: number;
  positivePurchaseClauseMultiplier: number;
  positivePurchaseClauseDecayRate: number;
  negativePurchaseMaintainDivisor: number;
  negativePurchaseClauseDivisor: number;
  negativePurchaseGrowthRate: number;
  positiveDecayApplicationsPerStage: number;
  positiveMaintainTracksDecayedClause: boolean;
  preserveNegativePrices: boolean;
  negativeMaintainTracksDecayedClause: boolean;
  marketResetsEveryStage: boolean;
  budgetCapAfterAuction: number;
}

export interface SeasonRules {
  points: PointsRules;
  rating: RatingRules;
  economy: EconomyRules;
  rivalries: RivalryRules;
  market: MarketRules;
}

export const currentSeasonRules: SeasonRules = {
  points: {
    byPosition: [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    poleBonus: 2,
    fastestLapBonus: 0,
    dnfReceivesPositionPoints: false,
  },
  rating: {
    minimum: 50,
    maximum: 99,
    racePositionDelta: {
      1: 6,
      2: 5,
      3: 4,
      4: 3,
      5: 2,
      6: 1,
      7: 1,
      8: 0,
      9: 0,
      10: -1,
      11: -1,
      12: -2,
    },
    racePositionFallback: -2,
    ownErrorDnfDelta: -4,
    qualifyingPositionDelta: {
      1: 4,
      2: 3,
      3: 2,
      4: 1,
      5: 1,
      6: 1,
      7: 0,
      8: 0,
      9: 0,
    },
    qualifyingPositionFallback: -1,
    cleanRaceBonus: 2,
    fastestLapBonus: 2,
    mvpBonus: 3,
    driverOfTheDayBonus: 1,
    overtakesBonus: 1,
  },
  economy: {
    enabled: true,
    polePrize: 2,
    fastestLapPrize: 1,
    cleanTeamPrize: 3,
    participationPrize: 4,
    moneyPerPoint: 0.1,
    constructorPrizeByPosition: [20, 15, 10],
  },
  rivalries: {
    qualifyingPrizeByRank: [1, 0.5, 0],
    racePrizeByRank: [2, 1, 0],
    stagePrizeByRank: [6, 3, 0],
    duoQualifyingPrizeByRank: [1, 0],
    duoRacePrizeByRank: [2, 0],
    duoStagePrizeByRank: [4, 2],
    soloDriverParticipationPrize: 1.5,
    statusOrderedByPurchasePrice: true,
  },
  market: {
    initialTeamBudget: 100,
    positivePurchaseMaintainMultiplier: 3,
    positivePurchaseClauseMultiplier: 2,
    positivePurchaseClauseDecayRate: 0.2,
    negativePurchaseMaintainDivisor: 3,
    negativePurchaseClauseDivisor: 2,
    negativePurchaseGrowthRate: 0.2,
    positiveDecayApplicationsPerStage: 1,
    positiveMaintainTracksDecayedClause: false,
    preserveNegativePrices: true,
    negativeMaintainTracksDecayedClause: true,
    marketResetsEveryStage: true,
    budgetCapAfterAuction: 50,
  },
};

export function parseSeasonRules(input: unknown): SeasonRules {
  const root = readObject(input, "ruleset");
  const points = readObject(root.points, "points");
  const rating = readObject(root.rating, "rating");
  const economy = readObject(root.economy, "economy");
  const rivalries = readObject(root.rivalries, "rivalries");
  const market = readObject(root.market, "market");

  const rules: SeasonRules = {
    points: {
      byPosition: readNumberArray(points.byPosition, "points.byPosition"),
      poleBonus: readFiniteNumber(points.poleBonus, "points.poleBonus"),
      fastestLapBonus: readFiniteNumber(points.fastestLapBonus, "points.fastestLapBonus"),
      dnfReceivesPositionPoints: readBoolean(points.dnfReceivesPositionPoints, "points.dnfReceivesPositionPoints"),
    },
    rating: {
      minimum: readFiniteNumber(rating.minimum, "rating.minimum"),
      maximum: readFiniteNumber(rating.maximum, "rating.maximum"),
      racePositionDelta: readDeltaMap(rating.racePositionDelta, "rating.racePositionDelta"),
      racePositionFallback: readFiniteNumber(rating.racePositionFallback, "rating.racePositionFallback"),
      ownErrorDnfDelta: readFiniteNumber(rating.ownErrorDnfDelta, "rating.ownErrorDnfDelta"),
      qualifyingPositionDelta: readDeltaMap(rating.qualifyingPositionDelta, "rating.qualifyingPositionDelta"),
      qualifyingPositionFallback: readFiniteNumber(rating.qualifyingPositionFallback, "rating.qualifyingPositionFallback"),
      cleanRaceBonus: readFiniteNumber(rating.cleanRaceBonus, "rating.cleanRaceBonus"),
      fastestLapBonus: readFiniteNumber(rating.fastestLapBonus, "rating.fastestLapBonus"),
      mvpBonus: readFiniteNumber(rating.mvpBonus, "rating.mvpBonus"),
      driverOfTheDayBonus: readFiniteNumber(rating.driverOfTheDayBonus, "rating.driverOfTheDayBonus"),
      overtakesBonus: readFiniteNumber(rating.overtakesBonus, "rating.overtakesBonus"),
    },
    economy: {
      enabled: readBoolean(economy.enabled, "economy.enabled"),
      polePrize: readFiniteNumber(economy.polePrize, "economy.polePrize"),
      fastestLapPrize: readFiniteNumber(economy.fastestLapPrize, "economy.fastestLapPrize"),
      cleanTeamPrize: readFiniteNumber(economy.cleanTeamPrize, "economy.cleanTeamPrize"),
      participationPrize: readFiniteNumber(economy.participationPrize, "economy.participationPrize"),
      moneyPerPoint: readFiniteNumber(economy.moneyPerPoint, "economy.moneyPerPoint"),
      constructorPrizeByPosition: readNumberArray(economy.constructorPrizeByPosition, "economy.constructorPrizeByPosition"),
    },
    rivalries: {
      qualifyingPrizeByRank: readNumberArray(rivalries.qualifyingPrizeByRank, "rivalries.qualifyingPrizeByRank"),
      racePrizeByRank: readNumberArray(rivalries.racePrizeByRank, "rivalries.racePrizeByRank"),
      stagePrizeByRank: readNumberArray(rivalries.stagePrizeByRank, "rivalries.stagePrizeByRank"),
      duoQualifyingPrizeByRank: readNumberArray(rivalries.duoQualifyingPrizeByRank, "rivalries.duoQualifyingPrizeByRank"),
      duoRacePrizeByRank: readNumberArray(rivalries.duoRacePrizeByRank, "rivalries.duoRacePrizeByRank"),
      duoStagePrizeByRank: readNumberArray(rivalries.duoStagePrizeByRank, "rivalries.duoStagePrizeByRank"),
      soloDriverParticipationPrize: readFiniteNumber(rivalries.soloDriverParticipationPrize, "rivalries.soloDriverParticipationPrize"),
      statusOrderedByPurchasePrice: readBoolean(rivalries.statusOrderedByPurchasePrice, "rivalries.statusOrderedByPurchasePrice"),
    },
    market: {
      initialTeamBudget: readFiniteNumber(market.initialTeamBudget, "market.initialTeamBudget"),
      positivePurchaseMaintainMultiplier: readFiniteNumber(market.positivePurchaseMaintainMultiplier, "market.positivePurchaseMaintainMultiplier"),
      positivePurchaseClauseMultiplier: readFiniteNumber(market.positivePurchaseClauseMultiplier, "market.positivePurchaseClauseMultiplier"),
      positivePurchaseClauseDecayRate: readFiniteNumber(market.positivePurchaseClauseDecayRate, "market.positivePurchaseClauseDecayRate"),
      negativePurchaseMaintainDivisor: readFiniteNumber(market.negativePurchaseMaintainDivisor, "market.negativePurchaseMaintainDivisor"),
      negativePurchaseClauseDivisor: readFiniteNumber(market.negativePurchaseClauseDivisor, "market.negativePurchaseClauseDivisor"),
      negativePurchaseGrowthRate: readFiniteNumber(market.negativePurchaseGrowthRate, "market.negativePurchaseGrowthRate"),
      positiveDecayApplicationsPerStage: readPositiveInteger(market.positiveDecayApplicationsPerStage, "market.positiveDecayApplicationsPerStage"),
      positiveMaintainTracksDecayedClause: readBoolean(market.positiveMaintainTracksDecayedClause, "market.positiveMaintainTracksDecayedClause"),
      preserveNegativePrices: readBoolean(market.preserveNegativePrices, "market.preserveNegativePrices"),
      negativeMaintainTracksDecayedClause: readBoolean(market.negativeMaintainTracksDecayedClause, "market.negativeMaintainTracksDecayedClause"),
      marketResetsEveryStage: readBoolean(market.marketResetsEveryStage, "market.marketResetsEveryStage"),
      budgetCapAfterAuction: readFiniteNumber(market.budgetCapAfterAuction, "market.budgetCapAfterAuction"),
    },
  };
  const errors = validateSeasonRules(rules);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return rules;
}

export function validateSeasonRules(rules: SeasonRules): string[] {
  const errors: string[] = [];

  if (rules.points.byPosition.length === 0) {
    errors.push("Debe existir al menos una posición puntuable.");
  }
  if (rules.points.byPosition.some((points) => points < 0)) {
    errors.push("Los puntos por posición no pueden ser negativos.");
  }
  if (rules.rating.minimum >= rules.rating.maximum) {
    errors.push("El rating mínimo debe ser menor que el máximo.");
  }

  const economicValues = [
    ...rules.economy.constructorPrizeByPosition,
    rules.economy.polePrize,
    rules.economy.fastestLapPrize,
    rules.economy.cleanTeamPrize,
    rules.economy.participationPrize,
    rules.economy.moneyPerPoint,
    ...rules.rivalries.qualifyingPrizeByRank,
    ...rules.rivalries.racePrizeByRank,
    ...rules.rivalries.stagePrizeByRank,
    ...rules.rivalries.duoQualifyingPrizeByRank,
    ...rules.rivalries.duoRacePrizeByRank,
    ...rules.rivalries.duoStagePrizeByRank,
    rules.rivalries.soloDriverParticipationPrize,
  ];
  if (economicValues.some((value) => value < 0)) {
    errors.push("Los premios económicos no pueden ser negativos.");
  }

  const marketValues = [
    rules.market.initialTeamBudget,
    rules.market.positivePurchaseMaintainMultiplier,
    rules.market.positivePurchaseClauseMultiplier,
    rules.market.positivePurchaseClauseDecayRate,
    rules.market.negativePurchaseMaintainDivisor,
    rules.market.negativePurchaseClauseDivisor,
    rules.market.negativePurchaseGrowthRate,
    rules.market.positiveDecayApplicationsPerStage,
    rules.market.budgetCapAfterAuction,
  ];
  if (marketValues.some((value) => !Number.isFinite(value) || value < 0)) {
    errors.push("Los parámetros de mercado deben ser números no negativos.");
  }
  if (rules.market.negativePurchaseMaintainDivisor === 0
    || rules.market.negativePurchaseClauseDivisor === 0) {
    errors.push("Los divisores de valoración de pilotos no pueden ser cero.");
  }

  return errors;
}

function readObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function readFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} debe ser un número finito.`);
  }
  return value;
}

function readPositiveInteger(value: unknown, field: string): number {
  const parsed = readFiniteNumber(value, field);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${field} debe ser un entero no negativo.`);
  return parsed;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} debe ser booleano.`);
  return value;
}

function readNumberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) throw new Error(`${field} debe ser una lista.`);
  return value.map((entry, index) => readFiniteNumber(entry, `${field}[${index}]`));
}

function readDeltaMap(value: unknown, field: string): Record<number, number> {
  const source = readObject(value, field);
  const result: Record<number, number> = {};
  for (const [position, delta] of Object.entries(source)) {
    const numericPosition = Number(position);
    if (!Number.isSafeInteger(numericPosition) || numericPosition < 1) {
      throw new Error(`${field} contiene una posición no válida.`);
    }
    result[numericPosition] = readFiniteNumber(delta, `${field}.${position}`);
  }
  return result;
}
