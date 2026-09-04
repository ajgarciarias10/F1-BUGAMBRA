import React, { useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";
import { auth } from "../services/auth";
import { Navigate, Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface PendingGoogleLink {
  credential: AuthCredential;
}

function emailClaimId(email: string) {
  return email;
}

async function provisionProfile(firebaseUser: User, normalizedEmail: string) {
  const authEmail = firebaseUser.email || normalizedEmail;
  const profileRef = doc(db, "usuarios", firebaseUser.uid);
  const claimRef = doc(db, "auth_emails", emailClaimId(authEmail));
  await runTransaction(db, async transaction => {
    const [profileSnap, claimSnap] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(claimRef),
    ]);
    if (claimSnap.exists() && claimSnap.data().uid !== firebaseUser.uid) {
      throw new Error("Ya existe una cuenta registrada con este correo.");
    }
    if (!profileSnap.exists()) {
      transaction.set(profileRef, {
        uid: firebaseUser.uid,
        email: authEmail,
        auth_email: authEmail,
        rol: normalizedEmail === "ajgarciarias@gmail.com" ? "admin" : "usuario",
        nombre: firebaseUser.displayName?.trim() || normalizedEmail.split("@")[0] || "Usuario",
        foto_url: firebaseUser.photoURL || "",
        escuderia_id: "",
        piloto_id: "",
      });
    }
    transaction.set(claimRef, {
      uid: firebaseUser.uid,
      email: authEmail,
      auth_email: authEmail,
    });
  });
}

export function LoginRegister() {
  const { user, userData } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingGoogleLink, setPendingGoogleLink] = useState<PendingGoogleLink | null>(null);

  if (user && userData && !(loading && pendingGoogleLink)) {
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
        const normalizedEmail = email.trim().toLowerCase();
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        if (pendingGoogleLink) {
          try {
            await provisionProfile(credential.user, normalizedEmail);
            await linkWithCredential(credential.user, pendingGoogleLink.credential);
          } catch (linkError) {
            await auth.signOut();
            throw linkError;
          }
          setPendingGoogleLink(null);
          setSuccess("Google se ha vinculado a tu cuenta existente.");
        } else {
          await provisionProfile(credential.user, normalizedEmail);
        }
      } else {
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        try {
          const normalizedEmail = email.trim().toLowerCase();
          await provisionProfile(cred.user, normalizedEmail);
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
      if (isLogin && auth.currentUser) await auth.signOut();
      setError(err.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const normalizedEmail = result.user.email?.trim().toLowerCase();
      if (!normalizedEmail) throw new Error("Google no devolvió un correo válido.");

      const ownProfile = await getDoc(doc(db, "usuarios", result.user.uid));
      if (ownProfile.exists()) {
        await provisionProfile(result.user, normalizedEmail);
        return;
      }

      const existingProfiles = await getDocs(collection(db, "usuarios"));
      const existingProfile = existingProfiles.docs.find(profile =>
        String(profile.data().email || "").trim().toLowerCase() === normalizedEmail
      );

      if (existingProfile && existingProfile.id !== result.user.uid) {
        await auth.signOut();
        setError("Firebase ha creado dos identidades para el mismo correo. Activa el modo de una cuenta por email o solicita al administrador que las unifique.");
        return;
      }

      await provisionProfile(result.user, normalizedEmail);
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        const googleCredential = GoogleAuthProvider.credentialFromError(err);
        const existingEmail = String(err.customData?.email || "").trim().toLowerCase();
        if (googleCredential && existingEmail) {
          setPendingGoogleLink({ credential: googleCredential });
          setEmail(existingEmail);
          setPassword("");
          setIsLogin(true);
          setError("Este Gmail ya tiene cuenta. Introduce su contraseña y pulsa Entrar para vincular Google sin perder tus datos.");
          return;
        }
      }
      if (err.code === "auth/operation-not-allowed") {
        setError("El acceso con Google todavía no está habilitado en Firebase Authentication.");
        return;
      }
      if (err.code === "auth/unauthorized-domain") {
        setError("Este dominio debe añadirse a los dominios autorizados de Firebase Authentication.");
        return;
      }
      if (err.code !== "auth/popup-closed-by-user") {
        if (auth.currentUser) await auth.signOut();
        setError(err.message || "Error al acceder con Google");
      }
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
    <div className="dark min-h-[100dvh] bg-[#0a0a0a] flex font-sans">
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
      <div className="safe-top safe-bottom flex flex-1 flex-col items-center justify-center px-5 py-8 lg:p-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:mb-12 lg:hidden">
          <span className="w-0.5 h-6 bg-[#e10600]" />
          <span className="text-white font-black tracking-[0.15em] uppercase">F1 Bugambra</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Tab toggle */}
          <div className="mb-8 grid grid-cols-2 border-b border-white/10 lg:mb-10 lg:flex">
            <button
              onClick={() => setIsLogin(true)}
              className={`-mb-px min-h-12 border-b-2 text-sm font-bold uppercase tracking-[0.12em] transition-all lg:mr-8 lg:min-h-0 lg:pb-3 lg:text-xs lg:tracking-[0.25em] ${isLogin ? "border-[#e10600] text-white" : "border-transparent text-white/30 hover:text-white/60"}`}
            >
              Acceder
            </button>
            <button
              onClick={() => { setIsLogin(false); setPendingGoogleLink(null); }}
              className={`-mb-px min-h-12 border-b-2 text-sm font-bold uppercase tracking-[0.12em] transition-all lg:min-h-0 lg:pb-3 lg:text-xs lg:tracking-[0.25em] ${!isLogin ? "border-[#e10600] text-white" : "border-transparent text-white/30 hover:text-white/60"}`}
            >
              Registrarse
            </button>
          </div>

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-[13px] text-emerald-400 lg:rounded-none lg:font-mono lg:text-xs lg:uppercase lg:tracking-wider">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-xl border border-[#e10600]/20 bg-[#e10600]/5 p-4 text-[13px] text-[#e10600] lg:rounded-none lg:font-mono lg:text-xs lg:uppercase lg:tracking-wider">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-white/30 hover:bg-white/[0.08] disabled:opacity-40 lg:min-h-0 lg:rounded-none lg:py-3.5 lg:text-xs lg:tracking-[0.18em]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[12px] font-black normal-case text-[#4285f4]">G</span>
            )}
            Continuar con Google
          </button>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[12px] text-white/35 lg:font-mono lg:text-[9px] lg:uppercase lg:tracking-[0.25em] lg:text-white/20">o con correo</span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="mb-2 block text-[12px] font-semibold text-white/55 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.3em] lg:text-white/40">Correo</label>
              <input
                required
                type="email"
                className="min-h-13 w-full rounded-xl border border-white/20 bg-white/[0.03] px-3 text-white transition-colors placeholder:text-white/25 focus:border-[#e10600] focus:outline-none lg:min-h-0 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0 lg:py-2.5 lg:text-sm"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (pendingGoogleLink) setPendingGoogleLink(null);
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-semibold text-white/55 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.3em] lg:text-white/40">Contraseña</label>
              <input
                required={isLogin}
                type="password"
                className="min-h-13 w-full rounded-xl border border-white/20 bg-white/[0.03] px-3 text-white transition-colors placeholder:text-white/25 focus:border-[#e10600] focus:outline-none lg:min-h-0 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0 lg:py-2.5 lg:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 min-h-11 text-[13px] text-white/45 transition-colors hover:text-[#e10600] lg:min-h-0 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.2em]"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-white/55 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.3em] lg:text-white/40">Confirmar contraseña</label>
                <input
                  required
                  type="password"
                  className="min-h-13 w-full rounded-xl border border-white/20 bg-white/[0.03] px-3 text-white transition-colors placeholder:text-white/25 focus:border-[#e10600] focus:outline-none lg:min-h-0 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0 lg:py-2.5 lg:text-sm"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#e10600] text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:opacity-40 lg:min-h-0 lg:rounded-none lg:py-4 lg:text-xs lg:tracking-[0.3em]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : pendingGoogleLink && isLogin ? "Entrar y vincular Google" : (isLogin ? "Entrar" : "Crear cuenta")}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <Link
              to="/"
              className="flex min-h-12 items-center justify-center text-center text-[13px] text-white/40 transition-colors hover:text-white/70 lg:min-h-0 lg:font-mono lg:text-[10px] lg:uppercase lg:tracking-[0.3em] lg:text-white/25"
            >
              ← Ver clasificación pública
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
