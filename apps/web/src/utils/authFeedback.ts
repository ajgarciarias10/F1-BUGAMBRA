/** Mensajes orientados a la acción; los códigos del proveedor no ayudan a entrar. */
export function authFeedback(error: unknown): string {
  const { code, message } = (error || {}) as { code?: string; message?: string };
  const messages: Record<string, string> = {
    "auth/invalid-credential": "No hemos podido iniciar sesión. Revisa el correo y la contraseña o utiliza «¿Olvidaste tu contraseña?».",
    "auth/wrong-password": "No hemos podido iniciar sesión. Revisa el correo y la contraseña o utiliza «¿Olvidaste tu contraseña?».",
    "auth/user-not-found": "No hemos podido iniciar sesión. Revisa el correo y la contraseña o utiliza «¿Olvidaste tu contraseña?».",
    "auth/invalid-email": "Introduce un correo válido, por ejemplo nombre@dominio.com.",
    "auth/email-already-in-use": "Este correo ya tiene una cuenta. Pulsa «Acceder» o recupera tu contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres. Elige una más larga antes de continuar.",
    "auth/password-does-not-meet-requirements": "La contraseña no cumple los requisitos de la cuenta. Prueba una más larga con mayúsculas, minúsculas, números y símbolos.",
    "auth/network-request-failed": "No se ha podido conectar. Comprueba tu conexión y vuelve a intentarlo; conservamos lo que has escrito.",
    "auth/too-many-requests": "Se han realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
    "auth/popup-blocked": "El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta página o accede con correo.",
    "auth/popup-closed-by-user": "Has cerrado la ventana de Google. Puedes volver a abrirla o acceder con correo.",
    "auth/cancelled-popup-request": "Se ha cancelado el acceso con Google. Vuelve a intentarlo o accede con correo.",
    "auth/user-disabled": "Esta cuenta está deshabilitada. Contacta con la administración de la liga.",
    "auth/operation-not-allowed": "Este método de acceso no está disponible. Prueba otro método o contacta con la administración de la liga.",
    "auth/unauthorized-domain": "El acceso no está habilitado desde esta dirección. Contacta con la administración de la liga.",
    "permission-denied": "No se ha podido acceder al perfil. Vuelve a intentarlo; si continúa, contacta con la administración de la liga.",
    "unavailable": "El servicio no está disponible en este momento. Comprueba la conexión y vuelve a intentarlo.",
  };
  if (code) return messages[code] || "No se ha podido completar la operación. Vuelve a intentarlo; si continúa, contacta con la administración de la liga.";
  // Los errores de validación propios ya están escritos para el usuario.
  return message || "No se ha podido completar la operación. Vuelve a intentarlo.";
}
