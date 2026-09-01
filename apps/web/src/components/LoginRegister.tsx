import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { Navigate, Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginRegister() {
  const { user, userData } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (user && userData) {
    if (userData.rol === "admin") return <Navigate to="/admin" replace />;
    if (userData.rol === "jeque") return <Navigate to="/jeque" replace />;
    if (userData.rol === "piloto") return <Navigate to="/piloto" replace />;
    return <Navigate to="/usuario" replace />;
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
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newUid = cred.user.uid;
        try {
          const normalizedEmail = email.trim().toLowerCase();
          await setDoc(doc(db, "usuarios", newUid), {
            uid: newUid,
            email: normalizedEmail,
            rol: normalizedEmail === "ajgarciarias@gmail.com" ? "admin" : "usuario",
            nombre: normalizedEmail.split("@")[0] || "Usuario",
            foto_url: "",
            escuderia_id: "",
            piloto_id: "",
          });
          await auth.signOut();
          setIsLogin(true);
          setSuccess("Registro completado. Un administrador podrá inscribirte como piloto en una temporada.");
          setPassword(""); setConfirmPassword("");
        } catch (err) {
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
    if (!email) { setError("Introduce tu correo primero."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Correo de recuperación enviado. Revisa tu bandeja.");
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans">
      {/* Left — Editorial */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 border-r border-white/[0.06]">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="w-0.5 h-7 bg-[#e10600]" />
          <span className="text-white font-black tracking-[0.15em] uppercase text-lg">F1 Bugambra</span>
        </Link>

        <div>
          <p className="text-[11px] font-mono tracking-[0.35em] text-white/30 uppercase mb-6">Liga Virtual · Temporada Activa</p>
          <h1 className="text-6xl font-black text-white leading-none tracking-tight uppercase">
            El Paddock<br />
            <span className="text-[#e10600]">te espera.</span>
          </h1>
          <p className="mt-8 text-sm text-white/40 leading-relaxed max-w-sm font-light">
            Gestiona tu escudería, ficha a los mejores pilotos y compite en el campeonato más exigente de la liga virtual.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[10px] font-mono tracking-[0.25em] text-white/20 uppercase">
          <span>© 2025 F1 Bugambra</span>
          <span className="w-px h-3 bg-white/20" />
          <span>Liga Privada</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-12 lg:hidden">
          <span className="w-0.5 h-6 bg-[#e10600]" />
          <span className="text-white font-black tracking-[0.15em] uppercase">F1 Bugambra</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Tab toggle */}
          <div className="flex border-b border-white/10 mb-10">
            <button
              onClick={() => setIsLogin(true)}
              className={`pb-3 mr-8 text-xs font-bold tracking-[0.25em] uppercase transition-all border-b-2 -mb-px ${isLogin ? "border-[#e10600] text-white" : "border-transparent text-white/30 hover:text-white/60"}`}
            >
              Acceder
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`pb-3 text-xs font-bold tracking-[0.25em] uppercase transition-all border-b-2 -mb-px ${!isLogin ? "border-[#e10600] text-white" : "border-transparent text-white/30 hover:text-white/60"}`}
            >
              Registrarse
            </button>
          </div>

          {success && (
            <div className="mb-6 p-4 border border-emerald-500/20 text-emerald-400 text-xs tracking-wider font-mono uppercase bg-emerald-500/5">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 border border-[#e10600]/20 text-[#e10600] text-xs tracking-wider font-mono uppercase bg-[#e10600]/5">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-2">Correo</label>
              <input
                required
                type="email"
                className="w-full bg-transparent border-b border-white/20 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e10600] transition-colors"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-2">Contraseña</label>
              <input
                required={isLogin}
                type="password"
                className="w-full bg-transparent border-b border-white/20 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e10600] transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 text-[10px] font-mono tracking-[0.2em] text-white/30 hover:text-[#e10600] uppercase transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-2">Confirmar contraseña</label>
                <input
                  required
                  type="password"
                  className="w-full bg-transparent border-b border-white/20 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e10600] transition-colors"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e10600] text-white text-xs font-bold tracking-[0.3em] uppercase py-4 mt-4 hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? "Entrar" : "Crear cuenta")}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <Link
              to="/"
              className="block text-center text-[10px] font-mono tracking-[0.3em] text-white/25 uppercase hover:text-white/50 transition-colors"
            >
              ← Ver clasificación pública
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
