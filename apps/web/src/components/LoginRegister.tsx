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
import { auth, db } from "../services/firebase";
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
              onClick={() => { setIsLogin(false); setPendingGoogleLink(null); }}
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

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full border border-white/15 bg-white/[0.04] text-white text-xs font-bold tracking-[0.18em] uppercase py-3.5 hover:bg-white/[0.08] hover:border-white/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-3"
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
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/20">o con correo</span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-2">Correo</label>
              <input
                required
                type="email"
                className="w-full bg-transparent border-b border-white/20 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#e10600] transition-colors"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (pendingGoogleLink) setPendingGoogleLink(null);
                }}
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : pendingGoogleLink && isLogin ? "Entrar y vincular Google" : (isLogin ? "Entrar" : "Crear cuenta")}
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
