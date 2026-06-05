# Conectar Gmail + Calendar al CRM — Guía de configuración (Google Cloud)

Esto se hace **una sola vez**, por el dueño del CRM (Creativia). Cada agencia luego
solo hará clic en **"Conectar Gmail"** dentro del CRM; no necesitan tocar Google Cloud.

Al final me tienes que pasar **3 cosas**:
1. `GOOGLE_CLIENT_ID`
2. `GOOGLE_CLIENT_SECRET`
3. Confirmación de que registraste los **Redirect URIs** de abajo.

---

## Paso 1 — Crear el proyecto
1. Entra a https://console.cloud.google.com/
2. Arriba a la izquierda, selector de proyecto → **New Project**.
3. Nombre: `CRM Turistea` (o el que quieras) → **Create**.
4. Asegúrate de que el proyecto nuevo quede **seleccionado** (arriba).

## Paso 2 — Habilitar las APIs
Menú **APIs & Services → Library**. Busca y dale **Enable** a cada una:
- **Gmail API**  → para enviar correos
- **Google Calendar API**  → para ver/crear citas
- **Google Tasks API**  *(opcional)*  → si quieres sincronizar tareas

## Paso 3 — Configurar la pantalla de consentimiento (OAuth consent screen)
**APIs & Services → OAuth consent screen**
1. **User Type: External** → **Create**.
2. Completa:
   - **App name:** Turistea CRM (lo verá la agencia al conectar)
   - **User support email:** tu correo
   - **Developer contact:** tu correo
   - (Opcional) logo y dominio.
3. **Scopes** → **Add or remove scopes** → agrega manualmente (pega en "Manually add scopes"):
   ```
   openid
   email
   profile
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/tasks
   ```
   (Los últimos tres son "sensibles/restringidos" — está bien, sigue.)
4. **Test users:** mientras la app no esté verificada, agrega aquí los correos
   de las agencias (o el tuyo) que vayan a probar. Hasta ~100 cuentas.
5. Guarda. **No necesitas enviar a verificación todavía** para probar.

## Paso 4 — Crear las credenciales OAuth
**APIs & Services → Credentials → Create Credentials → OAuth client ID**
1. **Application type: Web application**
2. **Name:** `CRM Web`
3. **Authorized redirect URIs** → agrega **exactamente** estas (con **Add URI**):

   **Desarrollo (local):**
   ```
   http://localhost:3000/api/google/callback
   ```
   **Producción (cuando tengas el dominio, ej.):**
   ```
   https://crmturistea.com/api/google/callback
   ```
4. **Create**.
5. Copia el **Client ID** y el **Client Secret** → me los pasas.

> ⚠️ **Importante sobre el callback:** Google **no permite comodines** en los
> redirect URIs (no se puede `*.crmturistea.com`). Por eso el CRM usa **un único
> dominio fijo** para el callback de Google y luego te devuelve a tu subdominio.
> Esto ya lo manejo yo en el código — tú solo registra las URLs de arriba tal cual.

## (Opcional) Paso 5 — Authorized JavaScript origins
Si Google lo pide, agrega también en "Authorized JavaScript origins":
```
http://localhost:3000
https://crmturistea.com
```

---

## Qué pasa después (lo hago yo en el código)
- Botón **"Conectar Gmail"** en el CRM (por usuario/agencia).
- Ruta `/api/google/callback` que intercambia el código por tokens.
- Tabla `cuenta_google` (tokens por agencia, cifrados/aislados por tenant) — migración.
- Refresh automático de tokens (Google los expira).
- Funciones para: **enviar correo** desde la oportunidad, **crear evento** en Calendar,
  y leer la agenda.

## Variables de entorno que configuraré
```
GOOGLE_CLIENT_ID=...            # me lo pasas
GOOGLE_CLIENT_SECRET=...        # me lo pasas (server-only)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

---

## Notas sobre verificación (producción)
- **Para probar ahora:** con la app en modo "Testing" + las agencias como *test users*,
  funciona todo (solo verán una advertencia "app no verificada" que pueden saltar).
- **Para abrir a cualquier agencia sin advertencias:** hay que enviar la app a
  **verificación de Google** (formulario + posible video de demo + revisión de
  seguridad por los scopes restringidos). Puede tardar de días a semanas. Se hace
  cuando ya esté listo el flujo y tengas dominio de producción.
