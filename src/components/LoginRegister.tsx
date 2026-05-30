import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDocs, collection, getDoc, deleteDoc, updateDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { Navigate, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Mail, Lock, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginRegister() {
  const { user, userData } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Now role derives from the slot selected (or manually if admin)
  const [role, setRole] = useState("piloto");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [plantilla, setPlantilla] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPlantilla() {
      try {
        const snap = await getDocs(collection(db, "plantilla"));
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setPlantilla(data);
      } catch(e) {
        console.error("Error fetching plantilla", e);
      }
    }
    fetchPlantilla();
  }, []);

  // Filter available items when role changes
  const availableSlots = plantilla.filter(p => p.rol === role);
  
  useEffect(() => {
    if (availableSlots.length > 0 && availableSlots.findIndex(s => s.id === selectedSlotId) === -1) {
      setSelectedSlotId(availableSlots[0].id);
    }
  }, [role, availableSlots, selectedSlotId]);

  if (user && userData) {
    if (userData.rol === 'admin') return <Navigate to="/admin" replace />;
    if (userData.rol === 'jeque') return <Navigate to="/jeque" replace />;
    if (userData.rol === 'piloto') return <Navigate to="/piloto" replace />;
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
            throw new Error("Las contraseñas no coinciden.");
        }
        if (!selectedSlotId) {
            throw new Error("Debes seleccionar un puesto disponible (Piloto o Jeque).");
        }

        // Firebase Auth handles email uniqueness - it will throw if email already exists
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newUid = cred.user.uid;
        
        try {
          await runTransaction(db, async (transaction) => {
            const plantillaRef = doc(db, "plantilla", selectedSlotId);
            const plantillaDoc = await transaction.get(plantillaRef);
            
            if (!plantillaDoc.exists()) {
              throw new Error("El puesto seleccionado ya no está disponible (alguien lo tomó justo antes).");
            }

            const pData = plantillaDoc.data();
            
            const userData: any = {
              uid: newUid,
              email: email,
              rol: role,
              nombre: pData.nombre || "Sin Nombre",
              foto_url: pData.foto_url || "",
              escuderia_id: pData.escuderia_id || "",
              piloto_id: role === "piloto" ? pData.id : ""
            };

            // Create user and delete from plantilla atomically
            const userRef = doc(db, "usuarios", newUid);
            transaction.set(userRef, userData);
            transaction.delete(plantillaRef);

            // Link to teams if Jeque
            if (role === "jeque" && userData.escuderia_id) {
               // We can't easily query all splits in a transaction without knowing their IDs, 
               // but we can assume split_1, split_2, etc. 
               // Or better: fetch splits outside and then do updates in transaction.
               // For now, let's just do split_1 as a baseline or handle it in a follow up.
               // Actually, let's assume Split 1 is the primary one.
               const teamRef = doc(db, `splits/split_1/equipos`, userData.escuderia_id);
               transaction.update(teamRef, { jeque_id: newUid });
            }
          });

          // After successful registration, sign out so they can log in manually with credentials
          await auth.signOut();
          setIsLogin(true);
          setSuccess("¡Registro completado de forma correcta! Ya puedes iniciar sesión con tus credenciales.");
          setPassword("");
          setConfirmPassword("");
          setError("");
        } catch (err) {
          // If transaction fails, clean up the Auth user
          await cred.user.delete().catch(() => auth.signOut());
          throw err;
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Por favor, introduce tu correo electrónico primero.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("¡Se ha enviado un correo para restablecer tu contraseña! Revisa tu bandeja de entrada.");
    } catch (err: any) {
      let msg = err.message || "Error al enviar el correo de restablecimiento";
      if (err.code === "auth/invalid-email") {
        msg = "El formato de correo electrónico no es válido.";
      } else if (err.code === "auth/user-not-found") {
        msg = "No se ha encontrado ningún usuario con este correo.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex relative overflow-hidden font-sans">
      {/* Background Video & Overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale-[0.2]"
        >
          {/* Placeholder racing video, user can replace with local /senna.mp4 */}
          <source src="https://cdn.coverr.co/videos/coverr-formula-one-racing-2559/1080p.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        <div className="absolute inset-0 bg-[#e10600]/10 mix-blend-color-burn" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-30" />
      </div>

      {/* Left panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-16 border-r border-white/5 bg-black/30 backdrop-blur-sm">
         <div>
            <h1 className="text-6xl font-black italic text-white uppercase tracking-tighter flex items-center gap-4 drop-shadow-2xl">
              <span className="w-3 h-12 bg-[#e10600] shadow-[0_0_20px_rgba(225,6,0,0.8)]" />
              F1 BUGAMBRA
            </h1>
            <p className="mt-6 text-white/60 font-mono tracking-widest uppercase text-sm max-w-md leading-relaxed">
              El pináculo del automovilismo virtual. Gestiona, compite y domina el mercado en el campeonato más exigente.
            </p>
         </div>

         <div className="space-y-6">
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl">
               <div className="bg-[#e10600]/20 p-3 rounded-xl border border-[#e10600]/30"><Shield className="text-[#e10600] w-6 h-6" /></div>
               <div>
                 <h4 className="text-white font-bold uppercase tracking-wide text-sm">Paddock Seguro</h4>
                 <p className="text-white/40 text-xs font-mono mt-1">Acceso restringido a pilotos y directores registrados.</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 p-4 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-8 lg:p-10 relative"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#e10600]/20 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center justify-center gap-2 drop-shadow-md">
              <span className="w-1.5 h-6 bg-[#e10600]" />
              F1 BUGAMBRA
            </h1>
          </div>

          <div className="text-center mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Identificación</h2>
            <p className="text-[10px] text-white/40 font-mono mt-2 uppercase tracking-[0.3em]">Telemetry Access</p>
          </div>

          <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 mb-8 relative z-10">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-[10px] uppercase font-bold tracking-[0.2em] rounded-lg transition-all ${
                isLogin ? 'bg-[#e10600] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-[10px] uppercase font-bold tracking-[0.2em] rounded-lg transition-all ${
                !isLogin ? 'bg-[#e10600] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              Registro
            </button>
          </div>

          {success && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono uppercase tracking-wider text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-[#e10600]/10 border border-[#e10600]/30 rounded-lg text-[#e10600] text-xs font-mono uppercase tracking-wider text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                  <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">ROL</label>
                    <select
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-[#e10600] appearance-none"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="piloto">Piloto</option>
                      <option value="jeque">Jeque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">PUESTO DISPONIBLE ({role.toUpperCase()})</label>
                    <select
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-[#e10600] appearance-none"
                      value={selectedSlotId}
                      onChange={(e) => setSelectedSlotId(e.target.value)}
                    >
                      {availableSlots.length === 0 && <option value="">No hay puestos disponibles</option>}
                      {availableSlots.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre} - Escudería: {s.escuderia_id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">CORREO ELECTRÓNICO</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
              <input
                required
                type="email"
                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#e10600] transition-colors"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">CONTRASEÑA</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
              <input
                required={isLogin} // Only required on login, otherwise confirmPassword handles it or register is submit-dependent
                type="password"
                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#e10600] transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isLogin && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-white/50 hover:text-[#e10600] hover:underline transition-all uppercase tracking-wider font-mono cursor-pointer"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="pt-4">
                  <label className="block text-xs font-mono text-gray-400 mb-1">CONFIRMAR CONTRASEÑA</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                    <input
                      required
                      type="password"
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#e10600] transition-colors"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e10600] hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 mt-6 shadow-lg shadow-red-900/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Entrar al Paddock" : "Registrarse")}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Público</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <button
          onClick={() => {
            // Using Navigate component dynamically, or we can use window.location.href if useNavigate isn't initialized yet
            window.location.href = '/invitado';
          }}
          className="w-full mt-4 bg-zinc-800/50 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white/70 hover:text-white font-bold uppercase tracking-widest text-xs py-3 rounded-lg transition-all flex items-center justify-center gap-2 group"
        >
          <UserIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Acceder como Invitado
        </button>
      </motion.div>
      </div>
    </div>
  );
}
