import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  Sun, 
  CloudRain, 
  Cloud, 
  Wind, 
  Thermometer, 
  CloudSun, 
  Zap, 
  Sparkles,
  Droplets,
  Globe
} from "lucide-react";

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

// Map circuit names to actual real-world geographical coordinates for internet weather checks
function getCircuitCoordinates(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim();

  const circuitCoords: Record<string, { lat: number; lon: number; location: string }> = {
    "australia": { lat: -37.8497, lon: 144.968, location: "Melbourne, Australia" },
    "china": { lat: 31.3389, lon: 121.22, location: "Shanghai, China" },
    "japon": { lat: 34.8431, lon: 136.541, location: "Suzuka, Japón" },
    "arabia saudi": { lat: 21.6319, lon: 39.1044, location: "Jeddah, Arabia Saudí" },
    "miami": { lat: 25.9581, lon: -80.2389, location: "Miami, EE. UU." },
    "barein": { lat: 26.0325, lon: 50.5106, location: "Sakhir, Bahréin" },
    "bahrain": { lat: 26.0325, lon: 50.5106, location: "Sakhir, Bahréin" },
    "canada": { lat: 45.5005, lon: -73.5228, location: "Montreal, Canadá" },
    "monaco": { lat: 43.7347, lon: 7.4206, location: "Monte Carlo, Mónaco" },
    "barcelona": { lat: 41.57, lon: 2.2611, location: "Montmeló, España" },
    "austria": { lat: 47.2197, lon: 14.7647, location: "Spielberg, Austria" },
    "gran bretana": { lat: 52.0733, lon: -1.0147, location: "Silverstone, Reino Unido" },
    "silverstone": { lat: 52.0733, lon: -1.0147, location: "Silverstone, Reino Unido" },
    "belgica": { lat: 50.4372, lon: 5.9714, location: "Spa, Bélgica" },
    "hungria": { lat: 47.5819, lon: 19.2511, location: "Budapest, Hungría" },
    "paises bajos": { lat: 52.3888, lon: 4.5408, location: "Zandvoort, Países Bajos" },
    "italia": { lat: 45.6189, lon: 9.2811, location: "Monza, Italia" },
    "monza": { lat: 45.6189, lon: 9.2811, location: "Monza, Italia" },
    "espana": { lat: 41.57, lon: 2.2611, location: "Montmeló, España" },
    "azerbayan": { lat: 40.3725, lon: 49.8533, location: "Baku, Azerbaiyán" },
    "azerbaiyan": { lat: 40.3725, lon: 49.8533, location: "Baku, Azerbaiyán" },
    "singapur": { lat: 1.2914, lon: 103.864, location: "Marina Bay, Singapur" },
    "austin": { lat: 30.1344, lon: -97.6358, location: "Austin, EE. UU." },
    "mexico": { lat: 19.4042, lon: -99.0903, location: "Ciudad de México, México" },
    "brasil": { lat: -23.7036, lon: -46.6997, location: "São Paulo, Brasil" },
    "las vegas": { lat: 36.1147, lon: -115.1728, location: "Las Vegas, EE. UU." },
    "qatar": { lat: 25.49, lon: 51.4542, location: "Lusail, Catar" },
    "abu dhabi": { lat: 24.4672, lon: 54.6031, location: "Yas Island, Abu Dabi" },
    "abu dabi": { lat: 24.4672, lon: 54.6031, location: "Yas Island, Abu Dabi" }
  };

  for (const key of Object.keys(circuitCoords)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return circuitCoords[key];
    }
  }

  // Fallback default coordinates (Barcelona)
  return { lat: 41.57, lon: 2.2611, location: `${name}, F1 Circuit` };
}

// Map WMO Weather Codes to our local categories
function mapWmoToClimaType(code: number): string {
  if (code === 0) return "despejado";
  if ([1, 2, 3].includes(code)) return "nublado";
  if ([51, 53, 55, 61, 80].includes(code)) return "lluvia_ligera";
  if ([63, 65, 81, 82].includes(code)) return "lluvia_fuerte";
  if ([95, 96, 99].includes(code)) return "tormenta";
  if ([45, 48].includes(code)) return "nublado"; // fog
  return "despejado";
}

interface InternetWeatherState {
  location: string;
  currentTemp: number;
  currentCode: number;
  currentHumidity: number;
  currentWindSpeed: number;
  raceDay: {
    clima: string;
    temp: number;
    rain: number;
    viento: number;
  };
  saturday: {
    clima: string;
    temp: number;
    rain: number;
    viento: number;
  };
  friday: {
    clima: string;
    temp: number;
    rain: number;
    viento: number;
  };
}

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

  // Coordinates memo
  const coord = useMemo(() => {
    if (!nextCircuit) return null;
    return getCircuitCoordinates(nextCircuit.nombre);
  }, [nextCircuit]);

  // Weather state from live Open-Meteo fetch
  const [internetWeather, setInternetWeather] = useState<InternetWeatherState | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [errorWeather, setErrorWeather] = useState(false);

  // Fetch real internet weather
  useEffect(() => {
    if (!coord) return;
    
    let isMounted = true;
    setLoadingWeather(true);
    setErrorWeather(false);

    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Could not fetch from open-meteo");
        const data = await res.json();

        if (!isMounted) return;

        // By default, open-meteo returns a 7-day forecast array starting today.
        // Let's align Saturday & Friday as index 1, 0, and Sunday as index 2 if the date is close or not set.
        // If the admin has defined a specific date (e.g., "2026-06-14") and it lies in the daily.time array, let's use it!
        let targetIndex = 2; // Sunday default
        let satIndex = 1;    // Saturday default
        let friIndex = 0;    // Friday default

        if (nextCircuit?.fecha && data.daily?.time) {
          const matchingIndex = data.daily.time.indexOf(nextCircuit.fecha);
          if (matchingIndex !== -1) {
            targetIndex = matchingIndex;
            satIndex = Math.max(0, matchingIndex - 1);
            friIndex = Math.max(0, matchingIndex - 2);
          }
        }

        const extractDay = (index: number) => {
          const wCode = data.daily?.weather_code?.[index] ?? 0;
          return {
            clima: mapWmoToClimaType(wCode),
            temp: Math.round(data.daily?.temperature_2m_max?.[index] ?? 24),
            rain: Math.round(data.daily?.precipitation_probability_max?.[index] ?? 15),
            viento: Math.round(data.daily?.wind_speed_10m_max?.[index] ?? 12)
          };
        };

        const raceDay = extractDay(targetIndex);
        const saturday = extractDay(satIndex);
        const friday = extractDay(friIndex);

        setInternetWeather({
          location: coord.location,
          currentTemp: Math.round(data.current?.temperature_2m ?? raceDay.temp),
          currentCode: data.current?.weather_code ?? 0,
          currentHumidity: data.current?.relative_humidity_2m ?? 45,
          currentWindSpeed: Math.round(data.current?.wind_speed_10m ?? raceDay.viento),
          raceDay,
          saturday,
          friday
        });
      } catch (err) {
        console.warn("Failed to retrieve live telemetry weather:", err);
        if (isMounted) setErrorWeather(true);
      } finally {
        if (isMounted) setLoadingWeather(false);
      }
    };

    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, [coord, nextCircuit?.fecha]);

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

  // Weather variables: Fallback to admin setting or use internet data
  const weatherType = internetWeather ? internetWeather.raceDay.clima : (nextCircuit?.clima_tipo || "despejado");
  const temperature = internetWeather ? internetWeather.raceDay.temp : (nextCircuit?.clima_temp ?? 22);
  const rainProb = internetWeather ? internetWeather.raceDay.rain : (nextCircuit?.clima_prob_lluvia ?? 15);
  const windSpeed = internetWeather ? internetWeather.raceDay.viento : (nextCircuit?.clima_viento ?? 12);

  // Tyres Recommendation & weather descriptions
  const weatherMeta = (type: string) => {
    switch (type) {
      case "despejado":
        return {
          label: "Soleado y Seco",
          desc: "Condiciones de carrera ideales. Neumáticos de seco (Slicks). El asfalto estará muy caliente.",
          tyres: { dry: "C1 / C2 / C3 (Slicks)", wet: "No requeridos" },
          bg: "from-amber-600/10 via-amber-950/5 to-transparent",
          border: "border-amber-500/20",
          iconColor: "text-amber-400",
          icon: <Sun className="w-10 h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse" />
        };
      case "nublado":
        return {
          label: "Cielo Nublado",
          desc: "Bajas temperaturas en pista. Dificultad para calentar neumáticos. Neumáticos de seco blandos recomendados para Qualy.",
          tyres: { dry: "Slicks Blandos (C3/C4)", wet: "No requeridos" },
          bg: "from-blue-600/10 via-zinc-950/5 to-transparent",
          border: "border-sky-500/15",
          iconColor: "text-sky-300",
          icon: <Cloud className="w-10 h-10 text-sky-300 filter drop-shadow-[0_0_8px_rgba(125,211,252,0.2)]" />
        };
      case "lluvia_ligera":
        return {
          label: "Lluvia Ligera / Llovizna",
          desc: "Pista húmeda y zonas resbaladizas. Los pilotos querrán neumáticos Intermedios si la pista se encharca.",
          tyres: { dry: "Slicks (Cruce peligroso)", wet: "Intermedios (Verdes) 🟢" },
          bg: "from-teal-600/10 via-zinc-950/5 to-transparent",
          border: "border-teal-500/20",
          iconColor: "text-teal-400",
          icon: <CloudSun className="w-10 h-10 text-teal-400 filter drop-shadow-[0_0_8px_rgba(20,184,166,0.25)]" />
        };
      case "lluvia_fuerte":
        return {
          label: "Lluvia Intensa",
          desc: "Pista mojada, riesgo extremo de aquaplaning. Neumáticos de Lluvia Extrema (Wets) obligatorios.",
          tyres: { dry: "Prohibidos / Suicidio", wet: "Lluvia Extrema (Azules) 🔵" },
          bg: "from-indigo-600/15 via-zinc-950/5 to-transparent",
          border: "border-indigo-500/30",
          iconColor: "text-indigo-400",
          icon: <CloudRain className="w-10 h-10 text-indigo-400 filter drop-shadow-[0_0_12px_rgba(129,140,248,0.3)]" />
        };
      case "tormenta":
        return {
          label: "Tormenta Eléctrica",
          desc: "Peligro de bandera roja. Visibilidad nula y asfalto inundado. Máxima precaución.",
          tyres: { dry: "Inutilizables", wet: "Lluvia Extrema 🔵 / Safety Car" },
          bg: "from-red-600/10 via-zinc-950/5 to-transparent",
          border: "border-red-500/20",
          iconColor: "text-red-400",
          icon: <Zap className="w-10 h-10 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse" />
        };
      case "viento":
        return {
          label: "Viento Fuerte",
          desc: "Inestabilidad aerodinámica letal en curvas rápidas. Cambios drásticos de balance.",
          tyres: { dry: "Slicks Estándar", wet: "No requeridos" },
          bg: "from-emerald-600/10 via-zinc-950/5 to-transparent",
          border: "border-emerald-500/20",
          iconColor: "text-emerald-400",
          icon: <Wind className="w-10 h-10 text-emerald-400" />
        };
      default:
        return {
          label: "Soleado",
          desc: "Clima óptimo para carreras.",
          tyres: { dry: "Slicks", wet: "No requeridos" },
          bg: "from-zinc-900 via-zinc-950/5 to-transparent",
          border: "border-white/5",
          iconColor: "text-white/40",
          icon: <Sun className="w-10 h-10 text-white/50" />
        };
    }
  };

  const meta = weatherMeta(weatherType);

  // Dynamic Weekly Forecast mapping actual values from Open-Meteo
  const weekendForecast = useMemo(() => {
    if (internetWeather) {
      return [
        {
          day: "Sábado",
          event: "Entrenamientos Libres (FP1 / FP2)",
          clima: internetWeather.saturday.clima,
          temp: internetWeather.saturday.temp,
          rain: internetWeather.saturday.rain,
          icon: internetWeather.saturday.clima === "despejado" ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : internetWeather.saturday.clima === "lluvia_ligera" ? <CloudSun className="w-4 h-4 text-teal-450" /> : internetWeather.saturday.clima === "nublado" ? <Cloud className="w-4 h-4 text-sky-450" /> : <CloudRain className="w-4 h-4 text-blue-500" />
        },
        {
          day: "Domingo",
          event: "Clasificación oficial (QP)",
          clima: internetWeather.raceDay.clima,
          temp: Math.max(10, internetWeather.raceDay.temp - 1),
          rain: internetWeather.raceDay.rain,
          icon: internetWeather.raceDay.clima === "despejado" ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : internetWeather.raceDay.clima === "lluvia_ligera" ? <CloudSun className="w-4 h-4 text-teal-450" /> : internetWeather.raceDay.clima === "nublado" ? <Cloud className="w-4 h-4 text-sky-450" /> : <CloudRain className="w-4 h-4 text-blue-500" />
        },
        {
          day: "Domingo",
          event: "Carrera (Gran Premio Oficial)",
          clima: internetWeather.raceDay.clima,
          temp: internetWeather.raceDay.temp,
          rain: internetWeather.raceDay.rain,
          icon: internetWeather.raceDay.clima === "despejado" ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : internetWeather.raceDay.clima === "lluvia_ligera" ? <CloudSun className="w-4 h-4 text-teal-450" /> : internetWeather.raceDay.clima === "nublado" ? <Cloud className="w-4 h-4 text-sky-455" /> : <CloudRain className="w-4 h-4 text-blue-500" />
        }
      ];
    }

    // Static Fallback values compiled around admin specifications
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
  }, [internetWeather, weatherType, temperature, rainProb, meta]);

  if (!nextCircuit) {
    return (
      <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl text-center text-white/40 uppercase font-mono text-xs">
        No hay circuitos programados en este split.
      </div>
    );
  }

  return (
    <div className="p-0.5 rounded-2xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl overflow-hidden">
      <div className={`bg-gradient-to-br ${meta.bg} bg-black/80 rounded-[15px] p-6 lg:p-7 border ${meta.border} relative overflow-hidden transition-all duration-500`}>
        
        {/* Neon track strip visual decoration */}
        <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-[#e10600] to-[#e10600]/10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
          
          {/* LEFT COLUMN: RACE METADATA & TIMER */}
          <div className="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] uppercase tracking-[0.25em] font-black text-[#e10600] bg-[#e10600]/10 px-2 py-0.5 rounded">
                  {isCompleted ? "ÚLTIMA EVALUACIÓN" : "PRÓXIMO COMPROMISO"}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  {currentSplit?.nombre}
                </span>
              </div>
              
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase mt-1">
                GP DE {nextCircuit.nombre}
              </h2>

              {internetWeather && (
                <div className="mt-1 flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase font-black tracking-wider">
                  <Globe className="w-3.5 h-3.5 animate-pulse" />
                  <span>📍 {internetWeather.location}</span>
                </div>
              )}
              
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
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <div className="text-xl font-extrabold text-white tabular-nums">{timeLeft.days}</div>
                      <div className="text-[8px] font-mono uppercase text-white/40">Días</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <div className="text-xl font-extrabold text-white tabular-nums">{timeLeft.hours}</div>
                      <div className="text-[8px] font-mono uppercase text-white/40">Horas</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <div className="text-xl font-extrabold text-white tabular-nums">{timeLeft.minutes}</div>
                      <div className="text-[8px] font-mono uppercase text-white/40">Min</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <div className="text-xl font-extrabold text-white tabular-nums">{timeLeft.seconds}</div>
                      <div className="text-[8px] font-mono uppercase text-white/40">Seg</div>
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

          {/* CENTER COLUMN: LIVE RACE CLIMA & ENGINE REPORT */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase text-white/40 tracking-wider mb-3">
                <span>Previsión meteorológica oficial</span>
                {loadingWeather ? (
                  <span className="text-[8px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded animate-pulse font-extrabold">Sincronizando...</span>
                ) : internetWeather ? (
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-extrabold tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    SATÉLITE EN VIVO
                  </span>
                ) : (
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-extrabold">DATO LOCAL ADMIN</span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {meta.icon}
                <div>
                  <h4 className="text-lg font-bold text-white uppercase tracking-tight">{meta.label}</h4>
                  <p className="text-xs text-white/40 font-mono mt-0.5">
                    {internetWeather ? "Tiempo actual asfalto" : "Configurado en campeonato"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <Thermometer className="w-3.5 h-3.5 mx-auto text-orange-400 mb-1" />
                  <div className="text-[10px] font-mono font-bold text-white">{temperature}°C</div>
                  <div className="text-[7px] text-white/30 uppercase mt-0.5">Temperatura</div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <CloudRain className="w-3.5 h-3.5 mx-auto text-blue-400 mb-1" />
                  <div className="text-[10px] font-mono font-bold text-white">{rainProb}%</div>
                  <div className="text-[7px] text-white/30 uppercase mt-0.5">Prob. Lluvia</div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                  <Wind className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-1" />
                  <div className="text-[10px] font-mono font-bold text-white">{windSpeed} <span className="text-[7px] font-normal">km/h</span></div>
                  <div className="text-[7px] text-white/30 uppercase mt-0.5">Viento</div>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[10px]">
              <span className="font-extrabold text-[#e10600] uppercase block mb-1 font-mono tracking-wider">RECOMENDACIÓN DE NEUMÁTICOS:</span>
              <p className="text-white/60 leading-relaxed text-[10px]">{meta.desc}</p>
            </div>
          </div>

          {/* RIGHT COLUMN: WEEKLY WEEKEND WEEK WEATHER OUTLOOK */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-white/40 tracking-wider mb-3 flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#e10600]" /> Itinerario y Clima Semanal FP & QP
                </span>
                {internetWeather && <span className="text-[8px] text-white/30 lowercase italic">via open-meteo</span>}
              </div>
              
              <div className="space-y-2.5 font-sans">
                {weekendForecast.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      index === 2 
                        ? "bg-[#e10600]/5 border-[#e10600]/20" 
                        : "bg-white/[0.01] border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-black/40 rounded-lg">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[11px] text-white">{item.day}</span>
                          {index === 2 && <span className="text-[7px] bg-[#e10600] text-white px-1 font-black rounded uppercase font-mono animate-pulse">Race</span>}
                        </div>
                        <span className="text-[9px] text-white/40 font-mono block leading-tight truncate max-w-[150px] uppercase">
                          {item.event}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10px]">
                      <div className="font-black text-white">{item.temp}°C</div>
                      <div className="text-[8px] text-white/40">{item.rain}% Hum / Lluvia</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
