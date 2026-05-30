import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  Sun, 
  CloudRain, 
  Cloud, 
  Wind, 
  CloudSun, 
  Zap, 
  Sparkles,
  Loader2
} from "lucide-react";
import { widgetStyles as s } from "./widgetStyles";

interface CircuitConfig {
  id: string;
  nombre: string;
  completado: boolean;
  fecha?: string;
  hora?: string;
  clima_tipo?: string;
  clima_temp?: number;
  clima_prob_lluvia?: number;
  clima_viento?: number;
  [key: string]: any;
}

interface NextRaceWidgetProps {
  currentSplit: {
    nombre: string;
    circuitos?: CircuitConfig[];
  } | null;
}

interface TyreStrategyAdvice {
  stop1: string;
  stop2: string;
  undercut: string;
  deg: string;
  gap: string;
  advice: string;
}

type StrategyDict = Record<string, TyreStrategyAdvice>;

export function NextRaceWidget({ currentSplit }: NextRaceWidgetProps) {
  // Find the upcoming race (closest date in the calendar)
  const nextCircuit = useMemo(() => {
    if (!currentSplit || !currentSplit.circuitos || currentSplit.circuitos.length === 0) return null;
    const pendingCircuits = currentSplit.circuitos.filter((c: CircuitConfig) => !c.completado);
    if (pendingCircuits.length > 0) {
      const now = new Date();
      let bestCircuit = pendingCircuits[0];
      let minDiff = Infinity;

      for (const c of pendingCircuits) {
        if (c.fecha) {
          const dateStr = c.fecha + (c.hora ? `T${c.hora}` : "T00:00:00");
          const circuitDate = new Date(dateStr);
          if (!isNaN(circuitDate.getTime())) {
            const diff = Math.abs(circuitDate.getTime() - now.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              bestCircuit = c;
            }
          }
        }
      }
      return { ...bestCircuit, status: "pending" as const };
    }
    const last = currentSplit.circuitos[currentSplit.circuitos.length - 1];
    if (last) return { ...last, status: "completed" as const };
    return null;
  }, [currentSplit]);

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false
  });

  useEffect(() => {
    if (!nextCircuit || !nextCircuit.fecha) return;

    const timerId = setInterval(() => {
      const raceDateTimeStr = `${nextCircuit.fecha}T${nextCircuit.hora || "00:00"}:00`;
      const targetTime = new Date(raceDateTimeStr).getTime();
      const currentTime = new Date().getTime();
      const difference = targetTime - currentTime;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        clearInterval(timerId);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isOver: false });
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [nextCircuit]);

  const hasSchedule = nextCircuit ? !!nextCircuit.fecha : false;
  const isCompleted = nextCircuit ? nextCircuit.status === "completed" : false;

  // Tabs and Dictionary for Dynamic Weather
  const weatherTypesList = ["despejado", "nublado", "lluvia_ligera", "lluvia_fuerte", "tormenta", "viento"];
  const [selectedWeatherTab, setSelectedWeatherTab] = useState<string>("despejado");
  
  const weatherType = nextCircuit?.clima_tipo || "despejado";
  const temperature = nextCircuit?.clima_temp || 22;
  const rainProb = nextCircuit?.clima_prob_lluvia || 0;

  // AI Tyre Strategy State
  const [aiTyreAdvice, setAiTyreAdvice] = useState<StrategyDict | null>(null);
  const [isGeneratingAiTyre, setIsGeneratingAiTyre] = useState(false);

  useEffect(() => {
    if (!nextCircuit) return;
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return;

    const fetchAiAdvice = async () => {
      setIsGeneratingAiTyre(true);
      try {
        const prompt = `Eres el estratega jefe de neumáticos en la Fórmula 1. 
Circuito: ${nextCircuit.nombre}. Distancia de la carrera: 35%. 1 parada obligatoria para cambiar compuesto.

El clima de la partida será aleatorio. Genera datos técnicos hiper-realistas para este circuito en CADA UNO de los 6 climas posibles.

Devuelve SOLO un JSON EXACTO con esta estructura:
{
  "despejado": {"stop1": "Medio 🟡 ➔ Duro ⚪", "stop2": "Blando 🔴 ➔ Medio 🟡 ➔ Blando 🔴", "undercut": "Fuerte (V9)", "deg": "0.14s/v", "gap": "+3.0s", "advice": "max 20 palabras"},
  "nublado": {"stop1": "...", "stop2": "...", "undercut": "...", "deg": "...", "gap": "...", "advice": "..."},
  "lluvia_ligera": {"stop1": "...", "stop2": "...", "undercut": "...", "deg": "...", "gap": "...", "advice": "..."},
  "lluvia_fuerte": {"stop1": "...", "stop2": "...", "undercut": "...", "deg": "...", "gap": "...", "advice": "..."},
  "tormenta": {"stop1": "...", "stop2": "...", "undercut": "...", "deg": "...", "gap": "...", "advice": "..."},
  "viento": {"stop1": "...", "stop2": "...", "undercut": "...", "deg": "...", "gap": "...", "advice": "..."}
}`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }], temperature: 0.6 })
        });
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        setAiTyreAdvice(parsed);
      } catch (e) {
        console.error("Error OpenAI Neumaticos:", e);
      } finally {
        setIsGeneratingAiTyre(false);
      }
    };

    const timer = setTimeout(() => { fetchAiAdvice(); }, 1500);
    return () => clearTimeout(timer);
  }, [nextCircuit?.nombre]);

  // Tyres Recommendation & weather descriptions
  const weatherMeta = (type: string) => {
    switch (type) {
      case "despejado":
        return {
          label: "Soleado y Seco",
          desc: "Condiciones ideales. El asfalto caliente incrementa el desgaste térmico.",
          defaultAdvice: {
            stop1: "Medio 🟡 ➔ Duro ⚪",
            stop2: "Blando 🔴 ➔ Medio 🟡 ➔ Medio 🟡",
            undercut: "Viable (V12)",
            deg: "0.15s / vuelta",
            gap: "+2.5s antes de box",
            advice: "Controla la degradación térmica. Intenta 1 parada, pero si rompes alerón temprano salta a 2 paradas agresivas."
          },
          icon: <Sun className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse" />,
          iconSmall: <Sun className="w-4 h-4 text-amber-400" />
        };
      case "nublado":
        return {
          label: "Cielo Nublado",
          desc: "Bajas temperaturas. Dificultad para calentar gomas, riesgo de graining.",
          defaultAdvice: {
            stop1: "Blando 🔴 ➔ Medio 🟡",
            stop2: "Blando 🔴 ➔ Blando 🔴 ➔ Medio 🟡",
            undercut: "Poderoso (V8)",
            deg: "0.08s / vuelta",
            gap: "+1.8s antes de box",
            advice: "Sal con blando para traccionar. Lanza un undercut agresivo si estás atascado en tráfico."
          },
          icon: <Cloud className="w-8 h-8 text-sky-300 filter drop-shadow-[0_0_8px_rgba(125,211,252,0.2)]" />,
          iconSmall: <Cloud className="w-4 h-4 text-sky-300" />
        };
      case "lluvia_ligera":
        return {
          label: "Lluvia Ligera / Llovizna",
          desc: "Pista húmeda resbaladiza. Asfalto no drena, secos inútiles.",
          defaultAdvice: {
            stop1: "Inter 🟢 ➔ Inter 🟢",
            stop2: "Inter 🟢 ➔ Inter 🟢 ➔ Inter 🟢",
            undercut: "Peligroso",
            deg: "0.22s / vuelta",
            gap: "+4.0s de seguridad",
            advice: "Degradación extrema del intermedio al 35%. Para a mitad de carrera para no reventar la goma."
          },
          icon: <CloudSun className="w-8 h-8 text-teal-400 filter drop-shadow-[0_0_8px_rgba(20,184,166,0.25)]" />,
          iconSmall: <CloudSun className="w-4 h-4 text-teal-400" />
        };
      case "lluvia_fuerte":
        return {
          label: "Lluvia Intensa",
          desc: "Riesgo extremo de aquaplaning. Neumáticos Wets obligatorios.",
          defaultAdvice: {
            stop1: "Extremo 🔵 ➔ Extremo 🔵",
            stop2: "Poco viable",
            undercut: "No aplica",
            deg: "0.10s / vuelta",
            gap: "+5.0s visibilidad",
            advice: "Busca aire limpio para tener visibilidad. Si rompes el alerón, adelanta tu única parada."
          },
          icon: <CloudRain className="w-8 h-8 text-indigo-400 filter drop-shadow-[0_0_12px_rgba(129,140,248,0.3)]" />,
          iconSmall: <CloudRain className="w-4 h-4 text-indigo-400" />
        };
      case "tormenta":
        return {
          label: "Tormenta Eléctrica",
          desc: "Visibilidad nula. Riesgo inminente de bandera roja.",
          defaultAdvice: {
            stop1: "Extremo 🔵 ➔ Extremo 🔵",
            stop2: "Si hay Safety Car",
            undercut: "Depende SC",
            deg: "0.12s / vuelta",
            gap: "Mantén distancia",
            advice: "Sobrevive. Entra a boxes gratis si sale un Safety Car por accidente múltiple."
          },
          icon: <Zap className="w-8 h-8 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse" />,
          iconSmall: <Zap className="w-4 h-4 text-red-500" />
        };
      case "viento":
        return {
          label: "Viento Fuerte",
          desc: "Inestabilidad letal en curvas rápidas. El coche deslizará.",
          defaultAdvice: {
            stop1: "Medio 🟡 ➔ Duro ⚪",
            stop2: "Medio 🟡 ➔ Medio 🟡 ➔ Blando 🔴",
            undercut: "Vital (V11)",
            deg: "0.20s / vuelta",
            gap: "+2.0s estable",
            advice: "El coche deslizará quemando el neumático. Cúbrete con un undercut temprano al Duro."
          },
          bg: "from-emerald-600/10 via-zinc-950/5 to-transparent",
          border: "border-emerald-500/20",
          iconColor: "text-emerald-400",
          icon: <Wind className="w-10 h-10 text-emerald-400" />
        };
      default:
        return {
          label: "Soleado",
          desc: "Clima óptimo para carreras.",
          defaultAdvice: {
            stop1: "Medio 🟡 ➔ Duro ⚪",
            stop2: "Blando 🔴 ➔ Medio 🟡 ➔ Medio 🟡",
            undercut: "Moderado (V13)",
            deg: "0.11s / vuelta",
            gap: "+2.2s",
            advice: "Mucha flexibilidad táctica. Usa 2 paradas solo si el coche de seguridad agrupa el pelotón."
          },
          bg: "from-zinc-900 via-zinc-950/5 to-transparent",
          border: "border-white/5",
          iconColor: "text-white/40",
          icon: <Sun className="w-10 h-10 text-white/50" />
        };
    }
  };

  const meta = weatherMeta(weatherType);

  // Forecast sintético basado en el tiempo configurado por el Administrador
  const weekendForecast = useMemo(() => {
    const fp1Temp = Math.round(temperature - 2);
    const qpTemp = Math.round(temperature - 1);

    let fpClima = "despejado";
    let qpClima = "nublado";
    let fpRain = Math.max(0, Math.round(rainProb - 10));
    let qpRain = Math.max(0, Math.round(rainProb - 5));

    if (weatherType === "lluvia_fuerte" || weatherType === "tormenta") {
      fpClima = "lluvia_ligera";
      qpClima = "lluvia_fuerte";
      fpRain = Math.max(40, rainProb - 20);
      qpRain = Math.max(60, rainProb - 5);
    } else if (weatherType === "lluvia_ligera") {
      fpClima = "nublado";
      qpClima = "lluvia_ligera";
      fpRain = 20;
      qpRain = 40;
    } else if (weatherType === "despejado") {
      fpClima = "despejado";
      qpClima = "despejado";
      fpRain = 5;
      qpRain = 5;
    }

    return [
      {
        day: "Sábado",
        event: "Entrenamientos Libres (FP1 / FP2)",
        clima: fpClima,
        temp: fp1Temp,
        rain: fpRain,
        icon: fpClima === "despejado" ? <Sun className="w-4 h-4 text-amber-400" /> : fpClima === "lluvia_ligera" ? <CloudRain className="w-4 h-4 text-teal-400" /> : <Cloud className="w-4 h-4 text-sky-400" />
      },
      {
        day: "Domingo",
        event: "Clasificación oficial (QP)",
        clima: qpClima,
        temp: qpTemp,
        rain: qpRain,
        icon: qpClima === "lluvia_fuerte" ? <CloudRain className="w-4 h-4 text-indigo-400" /> : qpClima === "lluvia_ligera" ? <CloudRain className="w-4 h-4 text-teal-450" /> : qpClima === "despejado" ? <Sun className="w-4 h-4 text-amber-400" /> : <Cloud className="w-4 h-4 text-sky-400" />
      },
      {
        day: "Domingo",
        event: "Carrera (Gran Premio Oficial)",
        clima: weatherType,
        temp: temperature,
        rain: rainProb,
        icon: meta.icon
      }
    ];
  }, [weatherType, temperature, rainProb, meta]);

  if (!nextCircuit) {
    return (
      <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl text-center text-white/40 uppercase font-mono text-xs">
        No hay circuitos programados en este split.
      </div>
    );
  }

  return (
    <div className={s.wrapper}>
      <div className={`bg-black/90 border border-white/5 ${s.innerBase}`}>
        
        <div className={s.neonStrip} />

        <div className={s.grid}>
          
          {/* LEFT COLUMN: RACE METADATA & TIMER */}
          <div className={s.colLeft}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={s.tagRed}>
                  {isCompleted ? "ÚLTIMA EVALUACIÓN" : "PRÓXIMO COMPROMISO"}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  {currentSplit?.nombre}
                </span>
              </div>
              
              <h2 className={s.circuitName}>
                GP DE {nextCircuit.nombre}
              </h2>

              {hasSchedule ? (
                <div className="space-y-2 mt-4 text-xs font-mono text-white/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#e10600]" />
                    <span>{new Date(nextCircuit.fecha!).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  {nextCircuit.hora && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#e10600]" />
                      <span>{nextCircuit.hora} H (Hora Local Paddock)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-3 text-xs text-white/50 font-mono italic mt-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Carrera sin programar por el Administrador.</span>
                </div>
              )}
            </div>

            {hasSchedule && !isCompleted && (
              <div className="mt-6 lg:mt-0">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#e10600] font-bold mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 animate-pulse" /> Cuenta atrás oficiales
                </p>
                {timeLeft.isOver ? (
                  <div className="text-sm font-black text-emerald-400 font-mono uppercase animate-pulse">
                    🟢 GP en proceso / Resultados pendientes
                  </div>
                ) : (
                <div className={s.timerGrid}>
                  <div className={s.timerBox}>
                    <div className={s.timerVal}>{timeLeft.days}</div>
                    <div className={s.timerLabel}>Días</div>
                    </div>
                  <div className={s.timerBox}>
                    <div className={s.timerVal}>{timeLeft.hours}</div>
                    <div className={s.timerLabel}>Horas</div>
                    </div>
                  <div className={s.timerBox}>
                    <div className={s.timerVal}>{timeLeft.minutes}</div>
                    <div className={s.timerLabel}>Min</div>
                    </div>
                  <div className={s.timerBox}>
                    <div className={s.timerVal}>{timeLeft.seconds}</div>
                    <div className={s.timerLabel}>Seg</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isCompleted && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl font-mono text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Split finalizado o GP completado con éxito.</span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMNS (8 cols): DYNAMIC WEATHER STRATEGIES */}
          <div className="lg:col-span-8 flex flex-col h-full">
            <div className={s.sectionTitle}>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#e10600]" />
                TELEMETRÍA Y ESTRATEGIA (CLIMA DINÁMICO)
              </span>
              {isGeneratingAiTyre && <Loader2 className="w-3.5 h-3.5 text-[#e10600] animate-spin" />}
            </div>

            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Tabs */}
              <div className="w-full md:w-1/3 flex flex-col gap-2">
                {weatherTypesList.map(type => {
                  const wMeta = weatherMeta(type);
                  const isSelected = selectedWeatherTab === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedWeatherTab(type)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${isSelected ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                    >
                      {wMeta.iconSmall}
                      <span className={`font-bold text-[10px] uppercase tracking-tight ${isSelected ? 'text-white' : 'text-white/60'}`}>
                        {wMeta.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Strategy Details */}
              <div className="w-full md:w-2/3 bg-gradient-to-br from-black/60 to-black/40 border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col">
                {(() => {
                  const activeMeta = weatherMeta(selectedWeatherTab);
                  const advice = aiTyreAdvice?.[selectedWeatherTab] || activeMeta.defaultAdvice;

                  return (
                    <>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#e10600]/5 blur-3xl pointer-events-none" />
                      
                      <div className="mb-4 relative z-10 flex items-center gap-3 border-b border-white/5 pb-3">
                        {activeMeta.icon}
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{activeMeta.label}</h4>
                          <p className="text-[9px] text-white/50 uppercase tracking-widest">{activeMeta.desc}</p>
                        </div>
                      </div>

                      <div className={s.aiGrid}>
                        <div className={s.aiBox}>
                          <span className={s.aiBoxLabel}>Óptima 1 Parada</span>
                          <span className={s.aiBoxVal}>{advice.stop1}</span>
                        </div>
                        <div className={s.aiBox}>
                          <span className={s.aiBoxLabel}>Plan 2 Paradas</span>
                          <span className={s.aiBoxVal}>{advice.stop2}</span>
                        </div>
                      </div>
                      
                      <div className={s.techGrid}>
                        <div className={s.techBox}>
                          <span className={s.techLabel}>Undercut</span>
                          <span className={s.techVal}>{advice.undercut}</span>
                        </div>
                        <div className={s.techBox}>
                          <span className={s.techLabel}>Desgaste</span>
                          <span className={s.techVal}>{advice.deg}</span>
                        </div>
                        <div className={s.techBox}>
                          <span className={s.techLabel}>Mejor Gap</span>
                          <span className={s.techVal}>{advice.gap}</span>
                        </div>
                      </div>

                      <p className={`mt-auto relative z-10 ${s.aiTextWrapper}`}>
                        <strong className={s.aiTextHighlight}>Engineer:</strong> "{advice.advice}"
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
