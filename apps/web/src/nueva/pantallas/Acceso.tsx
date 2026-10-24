import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { GoogleAuthProvider, createUserWithEmailAndPassword, linkWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, type AuthCredential } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../services/auth";
import { perfilGoogleExistente, provisionProfile } from "../../services/perfilService";
import { authFeedback } from "../../utils/authFeedback";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { rutaDe } from "../shell/secciones";

export function validarRegistro(password: string, confirmPassword: string): string | null {
  if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (password !== confirmPassword) return "Las contraseñas no coinciden.";
  return null;
}

export function Acceso() {
  const { user, userData } = useAuth();
  const { run } = useSingleFlight();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingGoogleLink, setPendingGoogleLink] = useState<AuthCredential | null>(null);
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<"email" | "google" | "reset" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);

  if (user && userData && !(loading && pendingGoogleLink)) return <Navigate to={rutaDe("inicio")} replace />;

  function changeMode(login: boolean) {
    if (loading) return;
    setIsLogin(login); setError(""); setSuccess(""); setPendingGoogleLink(null); setShowPassword(false);
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (loading) return;
      setOperation("email"); setLoading(true); setError(""); setSuccess("");
      try {
        const normalizedEmail = email.trim().toLowerCase();
        if (isLogin) {
          const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          if (pendingGoogleLink) {
            try { await provisionProfile(credential.user, normalizedEmail); await linkWithCredential(credential.user, pendingGoogleLink); }
            catch (linkError) { await auth.signOut(); throw linkError; }
            setPendingGoogleLink(null); setSuccess("Google se ha vinculado a tu cuenta existente.");
          } else await provisionProfile(credential.user, normalizedEmail);
        } else {
          const validationError = validarRegistro(password, confirmPassword);
          if (validationError) throw new Error(validationError);
          const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          try {
            await provisionProfile(credential.user, normalizedEmail);
            await auth.signOut(); setIsLogin(true);
            setSuccess("Registro completado. Un administrador podrá inscribirte como piloto en una temporada.");
            setPassword(""); setConfirmPassword("");
          } catch (registrationError) {
            await credential.user.delete().catch(() => auth.signOut());
            throw registrationError;
          }
        }
      } catch (authError) {
        if (isLogin && auth.currentUser) await auth.signOut();
        setError(authFeedback(authError));
      } finally { setLoading(false); setOperation(null); }
    });
  }

  async function handleGoogleAuth() {
    await run(async () => {
      if (loading) return;
      setOperation("google"); setLoading(true); setError(""); setSuccess("");
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const result = await signInWithPopup(auth, provider);
        const normalizedEmail = result.user.email?.trim().toLowerCase();
        if (!normalizedEmail) throw new Error("Google no devolvió un correo válido.");
        if (await perfilGoogleExistente(result.user.uid, normalizedEmail)) {
          await auth.signOut();
          setError("No se ha podido vincular Google con tu cuenta. Accede con correo y contraseña o solicita ayuda a la administración de la liga.");
          return;
        }
        await provisionProfile(result.user, normalizedEmail);
      } catch (googleError: any) {
        if (googleError.code === "auth/account-exists-with-different-credential") {
          const credential = GoogleAuthProvider.credentialFromError(googleError);
          const existingEmail = String(googleError.customData?.email || "").trim().toLowerCase();
          if (credential && existingEmail) {
            setPendingGoogleLink(credential); setEmail(existingEmail); setPassword(""); setIsLogin(true);
            setError("Este Gmail ya tiene cuenta. Introduce su contraseña y pulsa Entrar para vincular Google sin perder tus datos.");
            return;
          }
        }
        if (googleError.code !== "auth/popup-closed-by-user") {
          if (auth.currentUser) await auth.signOut();
          setError(authFeedback(googleError));
        } else setSuccess(authFeedback(googleError));
      } finally { setLoading(false); setOperation(null); }
    });
  }

  async function handleForgotPassword() {
    await run(async () => {
      if (loading) return;
      setError(""); setSuccess("");
      if (!email.trim() || !emailInput.current?.checkValidity()) {
        setError("Introduce un correo válido en el campo Correo para recuperar la contraseña.");
        emailInput.current?.focus(); return;
      }
      setOperation("reset"); setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        setSuccess("Solicitud enviada. Si el correo tiene una cuenta, recibirás un enlace de recuperación. Revisa también la carpeta de spam.");
      } catch (resetError) { setError(authFeedback(resetError)); }
      finally { setLoading(false); setOperation(null); }
    });
  }

  const field = "mt-2 block min-h-12 w-full rounded border px-4 py-3 text-base";
  const fieldStyle = { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-main)" };
  return <div className="mx-auto grid min-h-[70dvh] max-w-5xl items-center gap-10 text-[color:var(--text-main)] lg:grid-cols-2">
    <div className="space-y-6"><span className="nui-eyebrow">Liga privada · F1 Bugambra</span><h1 className="text-4xl font-bold leading-tight lg:text-6xl">Entra en la<br/><span style={{ color: "var(--accent-f1)" }}>parrilla.</span></h1><p className="nui-muted max-w-md">Sigue el campeonato, tu piloto y tu escudería desde cualquier dispositivo.</p><Link className="nui-button inline-flex" to={rutaDe("portada")}>Ver clasificación pública</Link></div>
    <section className="space-y-6" aria-label="Acceso a F1 Bugambra"><div className="flex gap-3 border-b pb-3" style={{ borderColor: "var(--border-color)" }}><button className="nui-button" aria-pressed={isLogin} disabled={loading} onClick={() => changeMode(true)}>Acceder</button><button className="nui-button" aria-pressed={!isLogin} disabled={loading} onClick={() => changeMode(false)}>Registrarse</button></div>
      {error && <p role="alert" className="border-l-4 p-3" style={{ borderColor: "var(--accent-f1)" }}>{error}</p>}{success && <p role="status" className="border-l-4 p-3" style={{ borderColor: "var(--accent-ok)" }}>{success}</p>}
      <button type="button" className="nui-button w-full" onClick={() => void handleGoogleAuth()} disabled={loading}>{operation === "google" ? "Conectando con Google…" : "Continuar con Google"}</button>
      <p className="nui-muted text-center">o con correo</p>
      <form onSubmit={handleAuth} aria-busy={loading} className="space-y-5"><label className="block font-semibold">Correo<input ref={emailInput} type="email" autoComplete="email" autoCapitalize="none" required readOnly={loading} value={email} onChange={e => { setEmail(e.target.value); if (pendingGoogleLink) setPendingGoogleLink(null); }} className={field} style={fieldStyle} /></label>
        <label className="block font-semibold">Contraseña<input type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? undefined : 6} required readOnly={loading} value={password} onChange={e => setPassword(e.target.value)} className={field} style={fieldStyle} /></label>
        <div className="flex flex-wrap justify-between gap-2"><button type="button" className="nui-button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</button>{isLogin && <button type="button" className="nui-button" disabled={loading} onClick={() => void handleForgotPassword()}>{operation === "reset" ? "Enviando…" : "¿Olvidaste tu contraseña?"}</button>}</div>
        {!isLogin && <label className="block font-semibold">Confirmar contraseña<input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required readOnly={loading} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={field} style={fieldStyle} /></label>}
        <button type="submit" disabled={loading} className="nui-button nui-button--primary w-full">{operation === "email" ? (isLogin ? "Accediendo…" : "Creando cuenta…") : pendingGoogleLink && isLogin ? "Entrar y vincular Google" : isLogin ? "Entrar" : "Crear cuenta"}</button>
      </form>
    </section>
  </div>;
}

export default Acceso;
