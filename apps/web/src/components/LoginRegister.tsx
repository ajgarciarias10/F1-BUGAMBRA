import React, { useRef, useState } from "react";
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
import { authFeedback } from "../utils/authFeedback";
import { useSingleFlight } from "../hooks/useSingleFlight";
import { Button, Card, Notice, buttonClass } from "./ui";

const FIELD_CLASS = "min-h-12 w-full rounded-lg border border-line-strong bg-surface/90 px-3.5 text-base text-ink shadow-fluent-1 transition-colors placeholder:text-ink-muted/80 hover:border-info/60 focus:border-info focus-visible:outline-2 focus-visible:outline-offset-2 read-only:opacity-70 md:text-sm";

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
  const [showPassword, setShowPassword] = useState(false);
  const [operation, setOperation] = useState<"email" | "google" | "reset" | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  const { run: runOnce } = useSingleFlight();
  const changeMode = (login: boolean) => {
    if (loading) return;
    setIsLogin(login);
    setError(""); setSuccess(""); setPendingGoogleLink(null);
    setShowPassword(false);
  };

  if (user && userData && !(loading && pendingGoogleLink)) {
    if (userData.rol === "admin") return <Navigate to="/admin" replace />;
    if (userData.rol === "jeque") return <Navigate to="/jeque" replace />;
    if (userData.rol === "piloto") return <Navigate to="/piloto" replace />;
    return <Navigate to="/usuario" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    return runOnce(async () => {
    e.preventDefault();
    if (loading) return;
    setOperation("email");
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
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
        const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
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
      setError(authFeedback(err));
    } finally {
      setLoading(false);
      setOperation(null);
    }
    });
  };

  const handleGoogleAuth = async () => {
    return runOnce(async () => {
    if (loading) return;
    setOperation("google");
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
        setError("No se ha podido vincular Google con tu cuenta. Accede con correo y contraseña o solicita ayuda a la administración de la liga.");
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
      if (err.code !== "auth/popup-closed-by-user") {
        if (auth.currentUser) await auth.signOut();
        setError(authFeedback(err));
      } else {
        setSuccess(authFeedback(err));
      }
    } finally {
      setLoading(false);
      setOperation(null);
    }
    });
  };

  const handleForgotPassword = async () => {
    return runOnce(async () => {
    if (loading) return;
    setError(""); setSuccess("");
    if (!email.trim() || !emailInput.current?.checkValidity()) {
      setError("Introduce un correo válido en el campo Correo para recuperar la contraseña.");
      emailInput.current?.focus();
      return;
    }
    setOperation("reset");
    setLoading(true); setError(""); setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSuccess("Solicitud enviada. Si el correo tiene una cuenta, recibirás un enlace de recuperación. Revisa también la carpeta de spam.");
    } catch (err: any) {
      setError(authFeedback(err));
    } finally {
      setLoading(false);
      setOperation(null);
    }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-bg flex font-sans text-ink">
      {/* Left — Editorial */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-line bg-surface-2/50 bg-[image:var(--grad-info)] p-16 lg:flex">
        <Link to="/" className="flex min-h-11 items-center gap-3 self-start rounded-lg">
          <span aria-hidden="true" className="h-7 w-1 rounded-full bg-brand" />
          <span className="text-ink font-extrabold tracking-tight text-lg">F1 Bugambra</span>
        </Link>

        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-ink-muted uppercase mb-6">Liga Virtual · Temporada Activa</p>
          <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight text-ink">
            El Paddock<br />
            <span className="text-brand">te espera.</span>
          </h1>
          <p className="mt-8 text-base text-ink-muted leading-relaxed max-w-sm">
            Gestiona tu escudería, ficha a los mejores pilotos y compite en el campeonato más exigente de la liga virtual.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-ink-muted">
          <span>F1 Bugambra</span>
          <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
          <span>Liga Privada</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="safe-top safe-bottom flex flex-1 flex-col items-center justify-center px-5 py-8 lg:p-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:mb-12 lg:hidden">
          <span aria-hidden="true" className="h-6 w-1 rounded-full bg-brand" />
          <span className="text-ink font-extrabold tracking-tight">F1 Bugambra</span>
        </div>

        <Card as="section" aria-label="Acceso a F1 Bugambra" pad="lg" className="w-full max-w-md">
          {/* Tab toggle */}
          <div className="mb-8 grid grid-cols-2 border-b border-line lg:mb-10 lg:flex">
            <button
              onClick={() => changeMode(true)}
              disabled={loading}
              aria-pressed={isLogin}
              className={`-mb-px min-h-12 rounded-t-lg border-b-2 px-3 text-sm font-semibold transition-colors lg:mr-4 ${isLogin ? "border-brand text-ink" : "border-transparent text-ink-muted hover:bg-info/10 hover:text-ink"}`}
            >
              Acceder
            </button>
            <button
              onClick={() => changeMode(false)}
              disabled={loading}
              aria-pressed={!isLogin}
              className={`-mb-px min-h-12 rounded-t-lg border-b-2 px-3 text-sm font-semibold transition-colors ${!isLogin ? "border-brand text-ink" : "border-transparent text-ink-muted hover:bg-info/10 hover:text-ink"}`}
            >
              Registrarse
            </button>
          </div>

          {success && (
            <Notice tone="ok" className="mb-6">{success}</Notice>
          )}
          {error && (
            <Notice tone="danger" className="mb-6">{error}</Notice>
          )}

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className={buttonClass({ block: true }) + " min-h-12 gap-3"}
          >
            {operation === "google" ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[12px] font-bold normal-case text-info">G</span>
            )}
            {operation === "google" ? "Conectando con Google…" : "Continuar con Google"}
          </button>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-sm text-ink-muted">o con correo</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleAuth} aria-busy={loading} className="space-y-6">
            <div>
              <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-ink-2">Correo</label>
              <input
                ref={emailInput}
                id="auth-email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                readOnly={loading}
                required
                type="email"
                className={FIELD_CLASS}
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (pendingGoogleLink) setPendingGoogleLink(null);
                }}
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-2 block text-sm font-semibold text-ink-2">Contraseña</label>
              <input
                id="auth-password"
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 6}
                aria-describedby={!isLogin ? "password-help" : undefined}
                readOnly={loading}
                type={showPassword ? "text" : "password"}
                className={FIELD_CLASS}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {!isLogin && <p id="password-help" className="mt-2 text-sm text-ink-2">Usa al menos 6 caracteres. Una contraseña larga protege mejor tu cuenta.</p>}
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword} className="mr-4 mt-1 inline-flex min-h-11 items-center rounded-md text-sm text-ink-2 underline underline-offset-4 hover:text-ink">
                {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              </button>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="mt-1 inline-flex min-h-11 items-center rounded-md text-sm text-ink-muted transition-colors hover:text-brand disabled:opacity-50"
                >
                  {operation === "reset" ? "Enviando recuperación…" : "¿Olvidaste tu contraseña?"}
                </button>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="auth-confirm" className="mb-2 block text-sm font-semibold text-ink-2">Confirmar contraseña</label>
                <input
                  id="auth-confirm"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={6}
                  readOnly={loading}
                  required
                  type={showPassword ? "text" : "password"}
                  className={FIELD_CLASS}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              block
              disabled={loading}
              className="mt-4 min-h-12"
            >
              {operation === "email" ? <><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> {isLogin ? "Accediendo…" : "Creando cuenta…"}</> : pendingGoogleLink && isLogin ? "Entrar y vincular Google" : (isLogin ? "Entrar" : "Crear cuenta")}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-line">
            <Link
              to="/"
              className="flex min-h-12 items-center justify-center rounded-lg text-center text-sm text-ink-muted transition-colors hover:text-ink"
            >
              ← Ver clasificación pública
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
