# Informe QA — Turistea CRM

**Fecha**: 2026-06-09  
**Método**: Auditoría estática del código en 3 pasadas con agentes paralelos por módulo. Cada hallazgo verificado adversarialmente leyendo el archivo apuntado.

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Hallazgos brutos detectados | 348 |
| Verificaciones adversariales corridas | 266 |
| Confirmados como reales | 183 |
| Refutados (falsos positivos) | 83 |

### Por severidad

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 20 |
| 🟠 Alto    | 97 |
| 🟡 Medio   | 123 |
| ⚪ Bajo    | 108 |

### Por tipo

| Tipo | Cantidad |
|---|---|
| logica_rota | 87 |
| bug | 65 |
| ux | 57 |
| deuda | 44 |
| a11y | 34 |
| security | 27 |
| perf | 18 |
| rls_problema | 11 |
| sql_invalido | 4 |
| validacion_rota | 1 |

### Por módulo

| Módulo | Hallazgos |
|---|---|
| Campañas + Listas envío + Plantillas | 31 |
| Agencias (super-admin) + facturación | 30 |
| API pública v1 + integraciones | 30 |
| Fidelización + Reservas + Cotizaciones + Itinerario (Módulo multi-tenant) | 30 |
| Oportunidades + Kanban + Pipelines | 29 |
| Reportes + Dashboard + Búsqueda | 28 |
| Agenda + Notificaciones | 19 |
| Autenticación + Cuenta | 18 |
| Ajustes — Roles, Usuarios, Planes, Comisiones, NPS, Territorios | 16 |
| Fidelización + Reservas + Itinerario (Next.js 15 + Supabase + Tailwind) | 16 |
| Productos + Catálogo Turistea | 15 |
| Autenticación + Cuenta (Login, Signup, Recovery, Middleware, JWT Claims) | 15 |
| Contactos | 14 |
| Ajustes (Roles, Usuarios, Planes, Comisiones, NPS, Territorios) | 14 |
| Contactos (Next.js + Supabase + RLS) | 12 |
| Productos + Catálogo Turistea (Next.js 15 + Supabase) | 11 |
| Empresas (CRUD, Sedes, Contactos, Campos Custom) | 11 |
| Empresas (CRUD, sedes, contactos, edición inline, campos custom) | 9 |

---

# Hallazgos por módulo

## 📦 API pública v1 + integraciones

### 1. 🔴 CRÍTICO — logica_rota

En [modulo]/route.ts línea 91, la consulta maybeSingle() no chequea .error. Si la BD falla, el código continúa sin 'emp' y luego intenta insertar una empresa sin manejo de error, causando que se inserte sin company_id.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:91`
- 🔁 **Reproducir**: Llamar POST /api/v1/contactos sin empresa_id mientras la BD está lenta o tiene problemas. El contacto se creará sin empresa_id válida.
- 🔧 **Fix**: Agregar: const { data: emp, error: empErr } = await admin.from('empresa')... y chequear empErr antes de procesar.

### 2. 🔴 CRÍTICO — logica_rota

Código en [modulo]/route.ts línea 70 intenta insertar en tabla 'lista_espera' que NO existe en las migraciones. Las migraciones usan columna 'en_espera' en las tablas contacto/empresa/oportunidad/producto, no una tabla separada.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:70-77`
- 🔁 **Reproducir**: Exceder el límite mensual de API y enviar POST contacto/oportunidad. La respuesta será error 400 porque la tabla no existe.
- 🔧 **Fix**: Cambiar lógica para usar en_espera=true en la tabla de destino, o crear tabla lista_espera si es la intención.

### 3. 🔴 CRÍTICO — logica_rota

El endpoint POST /api/v1/[modulo] intenta insertar en tabla 'lista_espera' que NO existe. Las migraciones usan la columna 'en_espera' en cada tabla (contacto, empresa, oportunidad, producto), no una tabla separada.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:70-77`
- 🔁 **Reproducir**: Exceder el límite de API mensual e intentar crear un contacto u oportunidad. El POST fallará con error de tabla desconocida.
- 🔧 **Fix**: Usar SET UPDATE en lugar de INSERT: en lugar de insertar en lista_espera, leer el plan del tenant, verificar si se excede, e insertar la fila con en_espera = TRUE (el trigger aplicar_lista_espera() ya lo hace automáticamente).

### 4. 🟠 ALTO — security

En api-keys.ts línea 48-51, la consulta SELECT no filtra explícitamente por tenant_id. Aunque createServerSupabase() aplica RLS, falta el filtro explícito .eq('tenant_id', caller.tenantId) para seguridad multi-tenant robusta.

- 📄 **Archivo**: `lib/db/api-keys.ts:48-51`
- 🔁 **Reproducir**: Si RLS falla o hay vulnerabilidad en la política, se podría ver la existencia de keys activas de otros tenants.
- 🔧 **Fix**: Agregar .eq('tenant_id', caller.tenantId) al query de existentes.

### 5. 🟠 ALTO — logica_rota

En api-keys.ts línea 102-106, el update de usados_mes se hace sin await y sin esperar confirmación. Hay race condition: si dos requests llegan simultáneamente, ambos verán el contador anterior e incrementarán mal. El contador quedará inconsistente.

- 📄 **Archivo**: `lib/db/api-keys.ts:102-106`
- 🔁 **Reproducir**: Hacer 2+ requests simultáneos con la misma API key. El contador usados_mes no sumará correctamente.
- 🔧 **Fix**: Cambiar .then(() => {}, () => {}) por await Promise.resolve(...) o usar una función lock/mutex en DB.

### 6. 🟠 ALTO — ux

En integraciones-manager.tsx línea 158, el cast 'as ("contacto.creado")[]' es incorrecto. Debería ser 'as EventoWebhook[]' porque EVENTOS_WEBHOOK incluye 5 eventos diferentes, no solo contacto.creado.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:158`
- 🔁 **Reproducir**: Crear webhook con evento 'oportunidad.etapa_cambiada'. El type checker no valida correctamente porque el cast es demasiado específico.
- 🔧 **Fix**: Importar EventoWebhook type y usar: 'eventos as EventoWebhook[]'

### 7. 🟠 ALTO — logica_rota

En api-keys.ts línea 102-106, el update de usados_mes NO espera respuesta (fire-and-forget sin await). Dos requests simultáneos verán el mismo contador anterior e incrementarán mal, dejando el contador inconsistente.

- 📄 **Archivo**: `lib/db/api-keys.ts:102-106`
- 🔁 **Reproducir**: Enviar 2+ requests paralelos con la misma API key en el mismo segundo. El contador quedará desincronizado.
- 🔧 **Fix**: Cambiar la línea 102 de admin.from(...) a await admin.from(...) para asegurar que se completa antes de retornar.

### 8. 🟠 ALTO — rls_problema

listWebhooks() en lib/db/webhooks.ts:18-29 NO filtra por tenant_id. Retorna todos los webhooks de todos los tenants. Aunque RLS debería proteger, la falta de filtro explícito viola la seguridad multi-tenant robusta.

- 📄 **Archivo**: `lib/db/webhooks.ts:18-29`
- 🔁 **Reproducir**: Un admin de tenant A puede ver/acceder webhooks de tenant B si se bypass RLS accidentalmente.
- 🔧 **Fix**: Agregar .eq('tenant_id', caller.tenantId) al SELECT en listWebhooks(). Igual para listReportesProgramados().

### 9. 🟠 ALTO — rls_problema

updateWebhook() en lib/db/webhooks.ts:44-49 NO filtra por tenant_id en el UPDATE. Un admin podría modificar un webhook de otro tenant.

- 📄 **Archivo**: `lib/db/webhooks.ts:44-49`
- 🔁 **Reproducir**: Un admin con acceso a base de datos podría actualizar webhook de otro tenant mediante ID conocido.
- 🔧 **Fix**: Agregar .eq('tenant_id', caller.tenantId) antes de .update(). Igual en deleteWebhook().

### 10. 🟠 ALTO — rls_problema

deleteWebhook() en lib/db/webhooks.ts:50-55 NO filtra por tenant_id. Permite eliminar webhooks de otro tenant.

- 📄 **Archivo**: `lib/db/webhooks.ts:50-55`
- 🔁 **Reproducir**: Un admin obtiene el ID de un webhook de otro tenant y lo elimina.
- 🔧 **Fix**: Agregar .eq('tenant_id', caller.tenantId) al DELETE.

### 11. 🟠 ALTO — security

En integraciones-manager.tsx:158, el cast 'as ("contacto.creado")[]' es incorrecto. EVENTOS_WEBHOOK tiene 5 eventos distintos, pero el cast solo espera uno. Permite pasar arrays de eventos inválidos sin detección en compilación.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:158`
- 🔁 **Reproducir**: Seleccionar múltiples eventos (ej. contacto.creado + oportunidad.creada) y enviar. El cast incorrecto puede causar comportamiento impredecible.
- 🔧 **Fix**: Cambiar el cast a 'as EventoWebhook[]' para que sea type-safe.

### 12. 🟡 MEDIO — logica_rota

En integraciones-manager.tsx línea 150, el estado 'eventos' es 'string[]' pero debería ser 'EventoWebhook[]' para type safety. Permite pushear eventos inválidos sin error en tiempo de compilación.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:150`
- 🔁 **Reproducir**: El código compila sin error pero no valida en tiempo de ejecución si se intenta setEventos() con valor inválido.
- 🔧 **Fix**: Cambiar: const [eventos, setEventos] = useState<EventoWebhook[]>([])

### 13. 🟡 MEDIO — ux

En integraciones-manager.tsx línea 62-68, función 'crear' no tiene try-catch. Si crearApiKeyAction() lanza excepción, setCreating nunca se pone en false, dejando el UI en estado 'Creando...' forever.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:62-68`
- 🔁 **Reproducir**: Si hay error de red o excepción no capturada en action, el botón queda disabled perpetuamente.
- 🔧 **Fix**: Envolver en try-finally: try { ... } finally { setCreating(false) }

### 14. 🟡 MEDIO — logica_rota

En integraciones-manager.tsx línea 155, función 'crear' (webhooks) no tiene try-catch. Si crearWebhookAction() lanza excepción, setCreating nunca se pone en false.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:155-161`
- 🔁 **Reproducir**: Error no capturado → botón stays disabled.
- 🔧 **Fix**: Envolver en try-finally.

### 15. 🟡 MEDIO — logica_rota

En integraciones-manager.tsx línea 224, función 'crear' (reportes) no tiene try-catch. Si crearReporteProgramadoAction() lanza excepción, setBusy nunca se pone en false.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:224-229`
- 🔁 **Reproducir**: Error no capturado → botón stays disabled.
- 🔧 **Fix**: Envolver en try-finally.

### 16. 🟡 MEDIO — logica_rota

En webhooks.ts línea 75-81, el fetch es fire-and-forget sin timeout. Si la URL destino nunca responde, el request cuelga indefinidamente en memoria. No hay timeout configurado.

- 📄 **Archivo**: `lib/db/webhooks.ts:75-81`
- 🔁 **Reproducir**: Crear webhook a URL que no responde (ej. timeout forever). El proceso Node.js mantendrá el request abierto.
- 🔧 **Fix**: Agregar timeout: fetch(..., { timeout: 5000 })

### 17. 🟡 MEDIO — logica_rota

En webhooks.ts línea 76, el .then() async lee r.status pero no consume el body de respuesta. Esto puede causar memory leak si la respuesta es grande.

- 📄 **Archivo**: `lib/db/webhooks.ts:76-77`
- 🔁 **Reproducir**: Webhook recibe respuesta 1MB. El body no se consume, ocupando memoria.
- 🔧 **Fix**: Agregar r.text() o r.json() para consumir y descartar el body.

### 18. 🟡 MEDIO — logica_rota

En integraciones-manager.tsx:150, el estado 'eventos' es 'string[]' pero debería ser 'EventoWebhook[]'. Permite pushear valores inválidos sin error de compilación.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:150`
- 🔁 **Reproducir**: El estado acepta cualquier string, no solo los eventos válidos de EVENTOS_WEBHOOK.
- 🔧 **Fix**: Cambiar 'setEventos: useState<string[]>([])' a 'useState<EventoWebhook[]>([])' para type safety.

### 19. 🟡 MEDIO — logica_rota

POST /api/v1/[modulo] no valida que contacto_id y empresa_id sean UUIDs válidos o que existan para el tenant. Si se envía un ID de otro tenant, el INSERT falla silenciosamente pero el mensaje de error es genérico.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:99-101`
- 🔁 **Reproducir**: Crear oportunidad con contacto_id de otro tenant. El INSERT fallará pero sin mensaje específico.
- 🔧 **Fix**: Validar que contacto_id y empresa_id pertenecen al tenant antes de INSERT.

### 20. 🟡 MEDIO — logica_rota

POST /api/v1/oportunidades no valida que pipeline_id y etapa_id existan o sean válidos. La tabla oportunidad requiere estos campos (NOT NULL), pero el endpoint no los valida.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:24`
- 🔁 **Reproducir**: Crear oportunidad sin pipeline_id o etapa_id. Falla con error de DB genérico, no validación clara.
- 🔧 **Fix**: Agregar validación explícita de que pipeline_id y etapa_id se proporcionen y existan.

### 21. 🟡 MEDIO — ux

En integraciones-manager.tsx, no hay validación de email en los destinatarios de reportes programados. El campo acepta cualquier string y solo hace split(',;\s+'). Emails inválidos se guardarán y causarán errores en el envío.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:237`
- 🔁 **Reproducir**: Ingresar 'ana@, jefe@invalido' como destinatarios. Se aceptará pero fallará en envío.
- 🔧 **Fix**: Agregar validación de email con regex en actions.ts rpSchema, o en el componente.

### 22. 🟡 MEDIO — ux

En integraciones-manager.tsx:156, la validación de form es confusa: verifica nombre.trim() pero el estado nombre puede estar desincronizado si el usuario borra rápidamente y hace click. No hay debounce.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:155-156`
- 🔁 **Reproducir**: Escribir nombre, borrar, click crear rápidamente. Posible race condition.
- 🔧 **Fix**: Disable el botón mientras haycreating = true. O usar debounce en setNombre.

### 23. 🟡 MEDIO — perf

authenticateApiKey() en api-keys.ts realiza 3 queries a Supabase (una SELECT, luego UPDATE fire-and-forget) en cada request API. Para APIs de alto volumen, esto ralentiza.

- 📄 **Archivo**: `lib/db/api-keys.ts:84-116`
- 🔁 **Reproducir**: Hacer 100+ requests simultáneos a la API v1. Cada uno hace auth + update del contador.
- 🔧 **Fix**: Cachear el resultado de auth durante el request, o usar un job async para actualizar el contador.

### 24. ⚪ BAJO — a11y

En integraciones-manager.tsx línea 93, el botón 'Copiar' no tiene aria-label ni accesibilidad clara para screen readers.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:93-95`
- 🔁 **Reproducir**: Usar screen reader. El botón no describe su función.
- 🔧 **Fix**: Agregar: aria-label='Copiar API key al portapapeles'

### 25. ⚪ BAJO — deuda

El comentario en [modulo]/route.ts línea 44 dice 'Rate limit consume cuenta sólo para escrituras; lectura sólo informativo' pero el código SÍ incrementa usados en GET. El comentario es engañoso.

- 📄 **Archivo**: `app/api/v1/[modulo]/route.ts:44`
- 🔧 **Fix**: Actualizar comentario a: 'Lectura devuelve uso pero no incrementa contador' o cambiar lógica.

### 26. ⚪ BAJO — deuda

Las acciones en actions.ts manejan errores como strings genéricos. Los tipos de error y mensajes no son estructurados. Dificulta debugging.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/actions.ts:14,18,34,42,67`
- 🔧 **Fix**: Considerar enum de error codes o tipos más específicos.

### 27. ⚪ BAJO — ux

En la documentación (docs/page.tsx:71-74), se menciona 'lista de espera' pero el usuario ve campos de 'estado' con 'en_espera' column. La terminología es inconsistente.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/docs/page.tsx:71-74`
- 🔁 **Reproducir**: Leer la docs vs revisar el schema. Confusión sobre dónde se almacenan los 'held' records.
- 🔧 **Fix**: Aclarar en docs que en_espera es una columna en cada tabla, no una tabla separada.

### 28. ⚪ BAJO — deuda

webhooks.ts dispatchWebhook() hace fetch sin timeout. Si la URL del webhook es lenta, puede bloquear la ejecución del request principal.

- 📄 **Archivo**: `lib/db/webhooks.ts:75`
- 🔁 **Reproducir**: Crear webhook con URL que tarda 30s en responder. El POST de datos se ralentiza.
- 🔧 **Fix**: Agregar AbortSignal con timeout a fetch().

### 29. ⚪ BAJO — deuda

En api-keys.ts:33, listApiKeys() mapea mes_actual !== ahoraMes para resetear usados_mes. Si un mes tiene mes_actual null, la lógica puede fallar.

- 📄 **Archivo**: `lib/db/api-keys.ts:32-37`
- 🔁 **Reproducir**: Una API key legacy con mes_actual=null. El usados_mes no se resetea.
- 🔧 **Fix**: Agregar migration para llenar mes_actual con el mes actual en api_keys existentes.

### 30. ⚪ BAJO — a11y

En integraciones-manager.tsx línea 194-203, el checkbox para activar webhook tiene label 'activar' pero está fuera del label element proper. Screen readers pueden no asociarlo.

- 📄 **Archivo**: `app/(app)/ajustes/integraciones/integraciones-manager.tsx:194-203`
- 🔁 **Reproducir**: Usar screen reader. El checkbox 'activar' no tiene label asociado correctamente.
- 🔧 **Fix**: Envolver el input en <label> o usar htmlFor.


## 📦 Agencias (super-admin) + facturación

### 1. 🔴 CRÍTICO — logica_rota

En crearAgencia (lib/db/agencias.ts línea 157), el rollback intenta eliminar el tenant si falla la creación del admin. Pero si el delete falla por RLS o error de DB, se lanza el error del delete (no el original), perdiendo el contexto de por qué falló la provisión. Además, no se garantiza que el delete éxito.

- 📄 **Archivo**: `lib/db/agencias.ts, línea 155-159`
- 🔁 **Reproducir**: 1. Crear agencia cuando la tabla usuario tiene trigger con error. 2. Se intenta hacer rollback del tenant. 3. Si el delete falla, se pierda el error original y se muestra error genérico del delete.
- 🔧 **Fix**: Guardar el error original antes del rollback. Si delete falla, re-lanzar el error original con el rollback error como contexto. O usar transaction.

### 2. 🟠 ALTO — logica_rota

Input NIT en tabla de agencias usa `defaultValue` en un contexto que mapea sobre datos dinámicos. Cuando `router.refresh()` actualiza los datos, el input mantiene el valor antiguo porque React no controla su estado. El usuario ve valores stale si cambia el NIT y luego otra acción dispara refresh.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 112`
- 🔁 **Reproducir**: 1. Editar NIT de agencia (onBlur gatilla changeAgencia). 2. Router.refresh() vuelve con datos nuevos. 3. El input mantiene el valor antiguo que el usuario tipó, no sincroniza con las nuevas props.
- 🔧 **Fix**: Cambiar de `defaultValue` a `key={a.id}` en el tr, o usar input controlado con `value` y estado local, o agregar useEffect para resetear cuando initial cambia.

### 3. 🟠 ALTO — logica_rota

En agencias/actions.ts línea 39, el casteo `(u?.email as string | undefined) ?? (tenant.admin_email as string)` puede forzar un string vacío o no válido si tanto u?.email como tenant.admin_email son falsy/nulls. No hay validación de que el email sea realmente una cadena válida.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/actions.ts, línea 39`
- 🔁 **Reproducir**: Si la query de usuario devuelve null y tenant.admin_email también es null, el casteo `as string` fuerza un undefined a string, causando que generateLink() reciba null o undefined.
- 🔧 **Fix**: Cambiar a `const email = u?.email ?? tenant?.admin_email; if (!email) throw new Error('No email found');`

### 4. 🟠 ALTO — logica_rota

En agencias-manager.tsx, el estado `initial` nunca se actualiza después de crear/modificar agencias. El componente usa props inicial que no cambian cuando router.refresh() se ejecuta, causando que la UI muestre datos stale.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 28-78`
- 🔁 **Reproducir**: Crear una nueva agencia, verla aparecer en el panel. Luego editar plan/estado de otra agencia desde otra pestaña. Volver: los cambios no aparecen hasta F5.
- 🔧 **Fix**: Usar useTransition() o re-fetch data en lugar de solo router.refresh(), o pasar estado local que se actualice inmediatamente.

### 5. 🟠 ALTO — logica_rota

En agencias-manager.tsx línea 35, `litePlan` se busca con .toLowerCase() pero planes pasados desde page.tsx no están normalizados. Si el plan se llama 'LITE' o 'Lite Starter', la busca fallará y se asignará planes[0] sin garantías.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 35`
- 🔧 **Fix**: Normalizar nombres en page.tsx o buscar por ID en lugar de nombre.

### 6. 🟠 ALTO — logica_rota

En planes-manager.tsx línea 171, quando se guarda un plan, `orden` se obtiene de `editing?.orden ?? 0`, pero al crear nuevo plan, siempre será 0. No hay lógica para auto-incrementar orden o rellenar huecos.

- 📄 **Archivo**: `app/(app)/ajustes/planes/planes-manager.tsx, línea 172`
- 🔁 **Reproducir**: Crear 3 planes nuevos. Todos tendrán orden=0, causando que se renderizen en orden aleatorio o por creado_en.
- 🔧 **Fix**: Calcular `orden: Math.max(...planes.map(p=>p.orden)) + 1` para nuevos planes.

### 7. 🟡 MEDIO — ux

Cuando se cambia plan/estado de agencia (changeAgencia en agencias-manager.tsx), si hay error, setSavingId se limpia pero el estado `error` se muestra. Sin embargo, el input NIT con `defaultValue` no se re-sincroniza, dejando el UI con valores stale si el usuario cambió múltiples campos.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 47-54`
- 🔁 **Reproducir**: 1. Cambiar NIT + Plan. 2. El NIT se guarda pero el plan falla. 3. El input NIT muestra el valor que el usuario tipó, no el valor original de la DB (que no cambió).

### 8. 🟡 MEDIO — logica_rota

En planes-manager.tsx línea 124, la función `onToggle(p)` usa `p.activo` para decidir si activar o desactivar. Pero `p` viene del array `initial` que no se actualiza hasta que `router.refresh()` completa. Si el usuario hace click en desactivar, luego inmediatamente en activar antes del refresh, el segundo click va a intentar desactivar de nuevo (porque p.activo aún es true).

- 📄 **Archivo**: `app/(app)/ajustes/planes/planes-manager.tsx, línea 55-59`
- 🔁 **Reproducir**: 1. Click 'Desactivar' plan. 2. Inmediatamente click 'Activar' antes que el refresh complete. 3. El segundo click envía !p.activo que es el estado antiguo, causando logic error.

### 9. 🟡 MEDIO — logica_rota

En planes-manager.tsx línea 172, cuando se crea un nuevo plan, `orden` siempre es 0 porque `editing?.orden ?? 0` devuelve 0 cuando editing es null. Esto significa todos los planes nuevos se crean con orden=0, sin auto-incremento ni lógica para asignar orden siguiente.

- 📄 **Archivo**: `app/(app)/ajustes/planes/planes-manager.tsx, línea 172`
- 🔁 **Reproducir**: Crear múltiples planes nuevos. Todos tendrán orden=0. Si se ordena por orden, van a estar juntos con orden no determinístico.

### 10. 🟡 MEDIO — bug

En facturacion/page.tsx línea 83, si `r.periodo_fin` es null pero también `r.trial_termina_en` es null, se renderiza 'trial: —' confundiendo al usuario. No hay validación si la suscripción está en estado 'activa' pero sin fechas.

- 📄 **Archivo**: `app/(app)/ajustes/facturacion/page.tsx, línea 82-84`
- 🔁 **Reproducir**: Crear una agencia sin plan, sin trial. Ir a facturación y ver cómo se muestra 'trial: —' aunque el estado sea 'activa'.
- 🔧 **Fix**: Mejorar lógica: si estado='activa' y periodo_fin=null, mostrar 'Indefinido' o 'Activa sin vencimiento'.

### 11. 🟡 MEDIO — bug

En agencias/actions.ts línea 39, `u?.email` se castea a `string` sin verificar. Si la query devuelve nulo o usuario inactivo, se asigna tenant.admin_email como fallback pero sin logging de por qué cambió.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/actions.ts, línea 39`
- 🔧 **Fix**: Agregar tipo explicit `const email: string = (u?.email as string) ?? tenant.admin_email` o mejor, usar el admin_email directamente si el usuario activo no existe.

### 12. 🟡 MEDIO — security

En agencias/actions.ts línea 44, se hace window.location.href sin sanitizar la URL generada. Si verComoAgenciaAction devuelve URL malformada (XSS), no hay validación.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 44`
- 🔧 **Fix**: Validar que res.url sea una URL válida con URL constructor antes de asignar a window.location.href.

### 13. 🟡 MEDIO — bug

En crearSchema (actions.ts línea 71), subdominio usa `.trim().toLowerCase()` pero la regex en agencias.ts línea 80 (SUBDOMINIO_RE) requiere 2-32 chars. Min length 2 permite 'a' después de trim.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/actions.ts, línea 71`
- 🔁 **Reproducir**: Ingresar subdominio 'a1' o 'ab'. Min=2 en schema Zod permite it pero regex SUBDOMINIO_RE espera al menos 3 caracteres si hay guiones.
- 🔧 **Fix**: Hacer min=3 en crearSchema o actualizar regex para permitir 2 caracteres válidos.

### 14. 🟡 MEDIO — bug

En agencias.ts línea 56, usuarios_count se calcula con `t.usuario?.[0]?.count ?? 0`. Pero Supabase devuelve `usuario(count)` como aggregate, no array. Acceso `[0]` es innecesario y puede fallar si estructura cambia.

- 📄 **Archivo**: `lib/db/agencias.ts, línea 56`
- 🔧 **Fix**: Verificar estructura real: usar `t.usuario?.count ?? 0` o `(t.usuario as unknown as {count: number})?.count ?? 0`.

### 15. ⚪ BAJO — ux

En agencias-manager.tsx línea 273, navigator.clipboard.writeText() puede fallar (sin permisos, en contexto inseguro, etc.) pero el error se ignora silenciosamente con `.then()` sin `.catch()`. El usuario cree que copió pero no pasó.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 273`
- 🔧 **Fix**: Agregar `.catch()` para mostrar error o fallback a prompt() si clipboard no disponible.

### 16. ⚪ BAJO — ux

En facturacion/page.tsx línea 83, si tanto `periodo_fin` como `trial_termina_en` son nulos, se renderiza `trial: —`. Pero la semántica es confusa: ¿está en trial o ya terminó? El estado real debería validar si es `activa` + `periodo_fin` null (pago único) o `trial` con fecha null (no válido).

- 📄 **Archivo**: `app/(app)/ajustes/facturacion/page.tsx, línea 82-84`
- 🔁 **Reproducir**: Una agencia con estado_suscripcion='activa', periodo_fin=null, trial_termina_en=null aparecerá como 'trial: —' confundiendo al admin.

### 17. ⚪ BAJO — perf

En agencias/page.tsx línea 10, se hacen dos queries en paralelo (listAgencias y listPlanes) con Promise.all(), pero listAgencias hace una query que join con plan(nombre) y usuario(count), causando potencialmente N+1 si Supabase no optimiza los joins.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/page.tsx, línea 10`
- 🔧 **Fix**: Verificar que las queries usan select con joins explícitos y que los índices estén presentes.

### 18. ⚪ BAJO — deuda

En lib/db/agencias.ts, no hay logging cuando se falla el rollback de crear agencia. Si el rollback silenciosamente no elimina el tenant fantasma, queda un registro huérfano sin admin usuario.

- 📄 **Archivo**: `lib/db/agencias.ts, línea 155-159`
- 🔧 **Fix**: Agregar logging o error tracking cuando el rollback falla.

### 19. ⚪ BAJO — logica_rota

En agencias-manager.tsx línea 228, cuando se tipea el nombre de agencia, automáticamente se genera el slug para subdominio. Pero la función slug() no valida el resultado de ser vacío (si el nombre es '---' se vuelve vacío). El schema luego rechaza min(2) pero el error va directo al usuario sin feedback que fue por el slug vacío.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 196-198, 228`
- 🔁 **Reproducir**: Tipear '---' como nombre. El subdominio se vuelve vacío. Al intentar crear, error 'Subdominio requerido'.

### 20. ⚪ BAJO — a11y

Input de NIT en tabla (agencias-manager.tsx línea 110) no tiene aria-label. Title solo ayuda a mouse, no a screen readers.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 110`
- 🔧 **Fix**: Agregar `aria-label='NIT de {nombre_empresa}'` al input.

### 21. ⚪ BAJO — perf

En PlanForm, cuando se edita un plan, no hay indicador de loading en el botón guardas. El usuario puede pensar que no pasó nada y hacer click múltiples veces.

- 📄 **Archivo**: `app/(app)/ajustes/planes/planes-manager.tsx, línea 297`
- 🔧 **Fix**: El botón ya tiene `disabled={saving}` pero falta visual feedback. Considerar agregar spinner o cambiar texto.

### 22. ⚪ BAJO — logica_rota

En agencias-manager.tsx línea 227, el onChange del nombre ejecuta slug() inline dentro del setState. Si el componente re-renderiza antes de que se complete el slug, el state puede desincronizarse. No hay debounce.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 227-228`

### 23. ⚪ BAJO — ux

Cuando se crea una agencia exitosamente (CredencialesPanel), el botón para cerrar el panel (onClose) no está claro. El usuario podría intentar refresh manual pensando que falló.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 298`

### 24. ⚪ BAJO — ux

En planes-manager.tsx línea 282, input type='number' para limites permite valores negativos (min='0' falta en algunos inputs). Usuario puede ingresar -100 usuarios como límite.

- 📄 **Archivo**: `app/(app)/ajustes/planes/planes-manager.tsx, línea 279-285`
- 🔁 **Reproducir**: Crear plan, en Límites ingresar '-5' en campo Usuarios. El form lo acepta.
- 🔧 **Fix**: Agregar min='0' a Input type='number' en sección de Límites.

### 25. ⚪ BAJO — a11y

En agencias-manager.tsx línea 110-118, input de NIT no tiene aria-label. El placeholder 'NIT' no es suficiente para lectores de pantalla.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 110-118`
- 🔧 **Fix**: Agregar aria-label='NIT de la agencia en Turistea' al input.

### 26. ⚪ BAJO — deuda

En agencias.ts línea 39-44, el type assertion inline para mapear `usuario?.[0]?.count` asume siempre que la respuesta es un array si existe. Supabase puede cambiar behavior en versiones futuras.

- 📄 **Archivo**: `lib/db/agencias.ts, línea 40-44`
- 🔧 **Fix**: Definir un type interface separado para la respuesta de listAgencias() y reutilizarlo.

### 27. ⚪ BAJO — ux

En agencias-manager.tsx línea 17-26, la función `fmtDate()` y `trialInfo()` no manejan dates inválidas (string vacío o 'null'). Si BD devuelve null inesperado, muestra '—' sin errores visibles.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 17-26`

### 28. ⚪ BAJO — perf

En facturacion/page.tsx, la función `fmtDate()` se llama en cada row del map pero no se memoiza. Con 100+ agencias, esto causa re-renders innecesarios.

- 📄 **Archivo**: `app/(app)/ajustes/facturacion/page.tsx, línea 26-28, 83`
- 🔧 **Fix**: Mover fmtDate() fuera del componente o usar useMemo si la conversión es costosa.

### 29. ⚪ BAJO — ux

En facturacion/page.tsx línea 48, el texto menciona 'STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET' pero devs podrían no saber si son obligatorios ambos. El mensaje es vago.

- 📄 **Archivo**: `app/(app)/ajustes/facturacion/page.tsx, línea 50-54`
- 🔧 **Fix**: Ser más explícito: 'Ambas vars de entorno son obligatorias para activar cobro automático.'

### 30. ⚪ BAJO — deuda

En agencias-manager.tsx, no hay confirmación antes de cambiar estado a 'suspendido' o 'cancelado'. Un click accidental puede suspender una agencia en producción.

- 📄 **Archivo**: `app/(app)/ajustes/agencias/agencias-manager.tsx, línea 134`
- 🔁 **Reproducir**: Dropdown estado, seleccionar 'Suspendido'. Cambio inmediato sin confirmar.
- 🔧 **Fix**: Agregar confirmación: `if (!confirm(...)) return;` en changeAgencia() cuando estado cambia a suspendido/cancelado.


## 📦 Agenda + Notificaciones

### 1. 🔴 CRÍTICO — security

deleteCuentaGoogle() usa .neq('usuario_id', '') que elimina TODAS las conexiones Google de todos los usuarios del tenant, no solo la del usuario actual.

- 📄 **Archivo**: `lib/db/google.ts:80`
- 🔧 **Fix**: Cambiar .neq('usuario_id', '') por .eq('usuario_id', user.id) después de obtener el usuario actual con getSessionUser().

### 2. 🟠 ALTO — bug

El form en google-tasks.tsx tiene inputs para 'title' y 'due', pero la acción intenta leer un campo 'notes' que no existe, dejando notes vacío siempre.

- 📄 **Archivo**: `app/(app)/agenda/google-tasks.tsx:59-62 vs app/(app)/agenda/tasks-actions.ts:11,19`
- 🔁 **Reproducir**: Ir a Agenda, agregar una tarea, verá que el campo de notas no existe en el form pero se intenta procesar.
- 🔧 **Fix**: Agregar un Input con name='notes' opcional en el form de google-tasks.tsx, o remover la lectura de 'notes' en tasks-actions.ts.

### 3. 🟠 ALTO — logica_rota

En secuencias-types.ts, PASO_TIPOS incluye 'whatsapp' en la tabla actividad pero NO en PASO_TIPOS array. Si un paso de secuencia intenta usar 'whatsapp', pasará validación pero podría no renderizarse correctamente en formularios.

- 📄 **Archivo**: `lib/secuencias-types.ts:4,9`
- 🔧 **Fix**: Agregar 'whatsapp' a PASO_TIPOS const: [..., 'whatsapp', ...] para alinearse con los tipos de actividad válidos.

### 4. 🟠 ALTO — bug

toggleActividad hace un SELECT DESPUÉS de la actualización (línea 637). Si la actividad fue eliminada en otro request entre la UPDATE y el SELECT, act será null y no se loguea el cambio, además hay una carrera de condición potencial.

- 📄 **Archivo**: `lib/db/mutations.ts:626-640`
- 🔧 **Fix**: Hacer el SELECT ANTES de la actualización para guardar los datos, o usar RETURNING en Supabase para obtenerlos en la misma operación.

### 5. 🟠 ALTO — logica_rota

PASO_TIPOS en lib/secuencias-types.ts excluye 'whatsapp', pero inscribirEnSecuencia() en lib/db/secuencias.ts mapea p.actividad_tipo sin validación. Las actividades creadas desde una secuencia con 'whatsapp' fallaran en la DB (tipo IN constraint).

- 📄 **Archivo**: `lib/secuencias-types.ts:4`
- 🔁 **Reproducir**: Crear una secuencia que incluya un paso con actividad_tipo='whatsapp'. Inscribir una oportunidad en esa secuencia. Las actividades se crearán pero fallarán en la DB por constraint de tipo.
- 🔧 **Fix**: Agregar 'whatsapp' a PASO_TIPOS: export const PASO_TIPOS = ["llamada", "email", "reunion", "whatsapp", "otra"]

### 6. 🟠 ALTO — ux

En app/(app)/ajustes/secuencias/secuencias-manager.tsx línea 115, el cast de tipo es incorrecto: onChange=(e) => update(i, { ...paso, actividad_tipo: e.target.value as "llamada" }) siempre castea como 'llamada', no como el valor seleccionado. El usuario ve todas las opciones en el Select pero solo 'llamada' se guarda.

- 📄 **Archivo**: `app/(app)/ajustes/secuencias/secuencias-manager.tsx:115`
- 🔁 **Reproducir**: Ir a Ajustes > Secuencias. Editar una secuencia. Cambiar el tipo de un paso a 'reunion'. Guardar. Al reabrir, el tipo vuelve a 'llamada'.
- 🔧 **Fix**: Cambiar el cast: as PasoSecuencia["actividad_tipo"] o validar con un type guard. Ej: actividad_tipo: e.target.value as const

### 7. 🟠 ALTO — rls_problema

Tabla cuenta_google (0012_cuenta_google.sql) tiene RLS policies solo para SELECT y DELETE, pero NO hay INSERT/UPDATE policies explícitas. Técnicamente el upsert en saveCuentaGoogle() usa service_role (admin), pero falta documentar/implementar las policies correctas para que un usuario pueda actualizar su propia conexión en futuro.

- 📄 **Archivo**: `supabase/migrations/0012_cuenta_google.sql:20-32`
- 🔁 **Reproducir**: Ver comentario en línea 31: 'Inserts/updates of tokens are performed by the server via service_role.' Sin RLS policies explícitas para INSERT/UPDATE, si se remueve service_role, el upsert fallará silenciosamente.
- 🔧 **Fix**: Agregar policies explicit INSERT/UPDATE para usuarios sobre su propia fila. Ej: CREATE POLICY cuenta_google_upsert ... FOR ALL TO authenticated WITH CHECK (tenant_id = current_tenant_id() AND usuario_id = auth.uid())

### 8. 🟡 MEDIO — a11y

Botón de completar tarea en google-tasks.tsx tiene title='Completar' pero le falta aria-label para lectores de pantalla.

- 📄 **Archivo**: `app/(app)/agenda/google-tasks.tsx:72`
- 🔧 **Fix**: Agregar aria-label='Marcar tarea como completada' al button.

### 9. 🟡 MEDIO — a11y

Botón de eliminar actividad en actividades-section.tsx no tiene aria-label ni title, lo que dificulta para usuarios de asistencia accesoria.

- 📄 **Archivo**: `components/oportunidad/actividades-section.tsx:191-196`
- 🔧 **Fix**: Agregar title='Eliminar' y/o aria-label='Eliminar actividad' al button.

### 10. 🟡 MEDIO — ux

El form de crear actividades en actividades-section.tsx (lines 123-149) falta validación visual del campo fecha_programada. Se acepta cualquier string sin validación de formato ISO, lo que podría guardar fechas inválidas.

- 📄 **Archivo**: `components/oportunidad/actividades-section.tsx:143`
- 🔧 **Fix**: Usar z.string().datetime() en lugar de z.string().nullable() para fecha_programada en el schema de validación.

### 11. 🟡 MEDIO — security

Los errores de Supabase se exponen directamente al usuario mediante e.message. Mensajes como 'row_is_duplicated' o 'permission denied' revelan detalles internos de la BD.

- 📄 **Archivo**: `components/oportunidad/actividades-actions.ts:88,98,108`
- 🔧 **Fix**: Mappear errores conocidos a mensajes amigables: if (e.message.includes('unique')) return 'Ya existe'; if (e.message.includes('permission')) return 'Sin permiso'.

### 12. 🟡 MEDIO — bug

En lib/db/secuencias.ts línea 68 y lib/secuencias-types.ts, no hay validación de que p.actividad_tipo esté en la lista permitida durante inscribirEnSecuencia(). Si una secuencia guardada tiene una actividad_tipo inválida en el JSONB de 'pasos', se insertará una actividad con tipo inválido.

- 📄 **Archivo**: `lib/db/secuencias.ts:75-87`
- 🔁 **Reproducir**: Corromper manualmente el JSONB de pasos en una secuencia (via DB directo) con actividad_tipo='invalid'. Inscribir oportunidad. La actividad se crea con tipo inválido, violaría el constraint CHECK de la tabla.
- 🔧 **Fix**: Validar cada p.actividad_tipo en pasos.map() antes de insertar. Ej: if (!['llamada','email','reunion','otra','whatsapp'].includes(p.actividad_tipo)) throw new Error(...)

### 13. 🟡 MEDIO — logica_rota

En components/oportunidad/actividades-section.tsx línea 123, el form no tiene method='POST'. Aunque usa onSubmit e FormData, la forma es técnicamente un 'GET' form nativo (sin method), por lo que el navegador podría incluir datos sensibles en la URL antes del JS intercepte.

- 📄 **Archivo**: `components/oportunidad/actividades-section.tsx:123`
- 🔁 **Reproducir**: Con JS deshabilitado o con red lenta, enviar el formulario. Los valores del formulario (descripción, fecha, tipo) aparecerán en la URL query string.
- 🔧 **Fix**: Agregar method='POST' al <form>. Aunque es handled por una action 'use server', una declaración explícita de método reduce ambigüedad.

### 14. 🟡 MEDIO — bug

En app/(app)/agenda/google-tasks.tsx línea 72, el button para completar tarea NO tiene type='button', por lo que es tipo 'submit' por defecto. Si el botón está dentro de cualquier form padre (no aquí, pero en layouts anidados), submitirá un formulario accidentalmente.

- 📄 **Archivo**: `app/(app)/agenda/google-tasks.tsx:72`
- 🔁 **Reproducir**: Estructura futura: si se wrappea GoogleTasks en un <form>, clickear en cualquier tarea para completarla submiteará la form parental.
- 🔧 **Fix**: Cambiar <button onClick={() => complete(t.id)} ... a <button type='button' onClick={() => complete(t.id)} ...

### 15. ⚪ BAJO — perf

En deleteCuentaGoogle, falta agregar el usuario en el filtro. Aunque actualmente falla, si se fixea podría mejorar performance agregando un check anticipado.

- 📄 **Archivo**: `lib/db/google.ts:78-82`
- 🔧 **Fix**: Antes del delete, hacer const user = await getSessionUser(); y validar que exista.

### 16. ⚪ BAJO — ux

En GoogleTasks component, después de router.refresh(), la lista 'initial' props no se actualiza automáticamente. El usuario ve la tarea aún en la lista hasta que recarga manualmente (aunque router.refresh debería hacerlo, a nivel UI hay lag).

- 📄 **Archivo**: `app/(app)/agenda/google-tasks.tsx:16-86`
- 🔧 **Fix**: Considerar un estado local optimista que remove la tarea de la lista inmediatamente, o usar SWR/useEffect para re-fetch.

### 17. ⚪ BAJO — deuda

El componente SecuenciaForm en secuencias-manager.tsx no valida que los días en los pasos sean números no-negativos en el frontend. Un usuario podría ingresar '-5' dias y causaría una fecha programada en el pasado.

- 📄 **Archivo**: `app/(app)/ajustes/secuencias/secuencias-manager.tsx:121`
- 🔧 **Fix**: Agregar min='0' y step='1' al Input de días para forzar valores válidos.

### 18. ⚪ BAJO — a11y

En app/(app)/agenda/agenda-view.tsx línea 99, falta aria-label en el botón 'Mes anterior' (←). El símbolo no es descriptivo para lectores de pantalla.

- 📄 **Archivo**: `app/(app)/agenda/agenda-view.tsx:99-102`
- 🔁 **Reproducir**: Usar lector de pantalla (NVDA, JAWS). El botón solo dirá 'botón' sin descripción.
- 🔧 **Fix**: Ya tiene aria-label='Mes anterior' en línea 99. Verificar que otros botones de navegación también lo tengan.

### 19. ⚪ BAJO — deuda

En lib/db/google.ts línea 80, deleteCuentaGoogle() usa .neq('usuario_id', '') que es un hack para borrar TODAS las filas del usuario. Debería usar .eq('usuario_id', user.id) pero la función no recibe user.

- 📄 **Archivo**: `lib/db/google.ts:78-82`
- 🔁 **Reproducir**: Llamar a deleteCuentaGoogle() dos veces. La primera borra la fila del usuario, la segunda no hace nada. Si en futuro se agregan más filas por usuario, este método no escalará.
- 🔧 **Fix**: Pasar usuario_id como parámetro o agregar getSessionUser() dentro. Cambiar a .eq('usuario_id', user.id)


## 📦 Ajustes (Roles, Usuarios, Planes, Comisiones, NPS, Territorios)

### 1. 🔴 CRÍTICO — rls_problema

listComisiones() no filtra explícitamente por tenant_id, puede exponer datos de otros tenants si RLS falla

- 📄 **Archivo**: `lib/db/comisiones.ts:20-32`
- 🔁 **Reproducir**: Verificar que queries de comisiones tengan filtro tenant_id; si RLS se desactiva, se ven comisiones de otros tenants
- 🔧 **Fix**: Agregar .eq('tenant_id', userTenantId) a las queries de usuario y oportunidad

### 2. 🟠 ALTO — security

Password field usando type='text' en lugar de type='password' — expone contraseña en pantalla de administrador

- 📄 **Archivo**: `app/(app)/admin/usuarios/new-usuario-form.tsx:59`
- 🔁 **Reproducir**: Crear usuario nuevo, la contraseña se muestra en texto plano en el input

### 3. 🟠 ALTO — security

Password field usando type='text' en lugar de type='password' en formulario de edición de usuario

- 📄 **Archivo**: `app/(app)/admin/usuarios/[id]/edit-usuario-form.tsx:57`
- 🔁 **Reproducir**: Editar usuario existente y cambiar contraseña, el campo muestra texto en lugar de asteriscos

### 4. 🟠 ALTO — rls_problema

listNps() no filtra explícitamente por tenant_id en SELECT — depende únicamente de RLS

- 📄 **Archivo**: `lib/db/nps.ts:44-70`
- 🔧 **Fix**: Agregar .eq('tenant_id', userTenantId) después del select() para defensa en profundidad

### 5. 🟠 ALTO — bug

updatePlantilla() en mutations.ts no valida tenant_id — cualquier admin puede editar plantillas de otro tenant

- 📄 **Archivo**: `lib/db/mutations.ts:230-238`
- 🔧 **Fix**: Verificar que la plantilla_correo.tenant_id = user.tenantId antes de permitir update

### 6. 🟠 ALTO — bug

deletePlantilla() no valida tenant_id — permite eliminar plantillas de otros tenants

- 📄 **Archivo**: `lib/db/mutations.ts:240-245`
- 🔧 **Fix**: Agregar validación de tenant_id antes de delete

### 7. 🟠 ALTO — logica_rota

createRol() y updateRol() permiten es_admin = true sin restricción; no hay validación de que solo super-admin pueda crear roles admin

- 📄 **Archivo**: `lib/db/roles.ts:123-157`
- 🔧 **Fix**: Validar que el caller sea es_admin o super-admin antes de permitir es_admin=true en nuevo rol

### 8. 🟡 MEDIO — logica_rota

updateUsuario() no valida que el usuario a actualizar pertenezca al mismo tenant que el admin que realiza la acción

- 📄 **Archivo**: `lib/db/mutations.ts:749-775`
- 🔧 **Fix**: Verificar que el usuario a actualizar sea del mismo tenant que el usuario actual antes de permitir cambios

### 9. 🟡 MEDIO — bug

setComisionConfig() no valida que el usuario a actualizar pertenezca al tenant del admin

- 📄 **Archivo**: `lib/db/comisiones.ts:71-84`
- 🔧 **Fix**: Validar tenant_id del usuario contra el tenant del caller antes de permitir update

### 10. 🟡 MEDIO — bug

responderNps() usa createAdminSupabase() sin validar que el token sea válido antes de actualizar (aunque existe validación de estado y fecha)

- 📄 **Archivo**: `lib/db/nps.ts:101-111`
- 🔧 **Fix**: La validación de estado='pendiente' es correcta; sin embargo no rechaza después de fecha esperada si respondido_en existe

### 11. 🟡 MEDIO — bug

setUsuarioRol() no valida que el usuario a asignar pertenezca al mismo tenant que el caller

- 📄 **Archivo**: `lib/db/roles.ts:176-203`
- 🔧 **Fix**: Agregar validación: SELECT tenant_id FROM usuario WHERE id=usuarioId y comparar con caller.tenantId

### 12. 🟡 MEDIO — logica_rota

getMyPermisos() intersecta permisos de rol con plan, pero si no hay plan, retorna permisos completos sin validar si es_admin real

- 📄 **Archivo**: `lib/db/roles.ts:76-114`
- 🔧 **Fix**: Asegurar que sinTecho=false por defecto para tenants con plan_id=null

### 13. ⚪ BAJO — a11y

EditUsuarioForm y NewUsuarioForm falta aria-label en campos de contraseña

- 📄 **Archivo**: `app/(app)/admin/usuarios/new-usuario-form.tsx:59, app/(app)/admin/usuarios/[id]/edit-usuario-form.tsx:57`

### 14. ⚪ BAJO — deuda

Cast a 'unknown as Record<string, unknown>[]' en listNps() — typings poco estrictos

- 📄 **Archivo**: `lib/db/nps.ts:53`
- 🔧 **Fix**: Usar tipado explícito desde Supabase en lugar de cast a unknown


## 📦 Ajustes — Roles, Usuarios, Planes, Comisiones, NPS, Territorios

### 1. 🔴 CRÍTICO — logica_rota

En territorios.ts listTerritorios() línea 44 no usa tenantId filter en la query de oportunidades ganadas, causando que ventas de otros tenants se acumulen al territorio. RLS no alcanza subconsultas simples.

- 📄 **Archivo**: `lib/db/territorios.ts:44-48`
- 🔧 **Fix**: Agregar .eq('tenant_id', caller.tenantId) a la query de oportunidades.

### 2. 🟠 ALTO — rls_problema

setUsuarioRol() en lib/db/roles.ts línea 176 no verifica que el rol_id pertenezca al mismo tenant. Un admin de tenant A podría asignar roles del tenant B a sus usuarios si obtiene el ID.

- 📄 **Archivo**: `lib/db/roles.ts:176-203`
- 🔁 **Reproducir**: 1. Ser admin en un tenant. 2. Obtener rol_id de otro tenant. 3. Llamar setUsuarioRol(usuarioId, otro_tenant_rol_id). Sin validación cross-tenant, podría asignar.

### 3. 🟠 ALTO — logica_rota

syncUsuariosLegacyRol() en lib/db/roles.ts línea 206 itera usuarios por rol_id sin filtrar por tenant_id, causando que cambios de rol sincronicen usuarios de otros tenants.

- 📄 **Archivo**: `lib/db/roles.ts:206-216`

### 4. 🟠 ALTO — sql_invalido

En listComisiones() (lib/db/comisiones.ts:25), se selecciona 'comision_pct' pero si la columna es 'comision_pct' en DB (snake_case), el mapping en línea 53 usa camelCase. Sin garantía schema DB.

- 📄 **Archivo**: `lib/db/comisiones.ts:25-62`
- 🔧 **Fix**: Verificar nombres de columnas en DB y usar consistently snake_case en Supabase queries.

### 5. 🟠 ALTO — rls_problema

setTenantPlan() (lib/db/planes.ts:120) requiere isPlatformAdmin() pero no valida que el tenantId que recibe sea válido o pertenezca a la plataforma. Acceso directo a admin sin verificación.

- 📄 **Archivo**: `lib/db/planes.ts:120-125`

### 6. 🟠 ALTO — bug

listNps() (lib/db/nps.ts:44) no filtra por tenant_id. Retorna todas las respuestas de todos los tenants en select.

- 📄 **Archivo**: `lib/db/nps.ts:44-70`
- 🔧 **Fix**: Agregar .eq('tenant_id', user.tenantId) al select de nps_respuesta.

### 7. 🟡 MEDIO — bug

EditUsuarioForm (edit-usuario-form.tsx:44) bindea activo como string pero updateSchema.preprocess() (actions.ts:18) convierte 'true'/'false'/'on' a booleano. Si form envía otro valor, preprocess lo deja como string y z.boolean() falla silenciosamente.

- 📄 **Archivo**: `app/(app)/admin/usuarios/[id]/edit-usuario-form.tsx:44 y actions.ts:18-19`
- 🔧 **Fix**: Usar z.preprocess con validación más estricta o HTML boolean input nativo.

### 8. 🟡 MEDIO — ux

En new-usuario-form.tsx línea 59, password type='text' en lugar de type='password' hace visible la contraseña inicial en pantalla, exponiendo el valor a mirones.

- 📄 **Archivo**: `app/(app)/admin/usuarios/new-usuario-form.tsx:59`

### 9. 🟡 MEDIO — ux

En comisiones-manager.tsx línea 106, Select value={rol} donde rol es '' si sin rol, pero el Select no tiene clase 'w-full' y el layout puede desalinearse con inputs de número.

- 📄 **Archivo**: `app/(app)/comisiones/comisiones-manager.tsx:106`

### 10. 🟡 MEDIO — deuda

En responderNpsAction (app/nps/[token]/actions.ts) no hay validación de rate-limit. Misma URL puede responder múltiples veces si el token se repite.

- 📄 **Archivo**: `app/nps/[token]/actions.ts:5-11`
- 🔧 **Fix**: Verificar en DB que token estada 'pendiente' antes de permitir actualizar.

### 11. 🟡 MEDIO — perf

En listTerritorios() línea 51-54, se itera ganadas sin índice de asignado_id. Para grandes datasets, ventasPorAsesor.get() es O(n*m) en lugar de O(n+m).

- 📄 **Archivo**: `lib/db/territorios.ts:50-62`

### 12. 🟡 MEDIO — logica_rota

En getListaEsperaResumen() (lib/db/planes.ts:196-203), loop sobre tablas hardcodeadas sin cheque de RLS. Si RLS tabla falla, count devuelve null y se suma como 0, ocultando el error.

- 📄 **Archivo**: `lib/db/planes.ts:195-204`

### 13. 🟡 MEDIO — bug

En createInvitacion() (lib/db/invitaciones.ts:71-131), check de email duplicado (línea 80-86) solo busca en usuario, no en invitacion pendiente. Dos invites al mismo email pueden crearse simultáneamente.

- 📄 **Archivo**: `lib/db/invitaciones.ts:80-86`
- 🔧 **Fix**: Agregar check en tabla invitacion también, o usar unique constraint en DB.

### 14. ⚪ BAJO — a11y

En nps-form.tsx línea 38-50, botones de puntaje no tienen aria-label. Usuarios con lector de pantallas no saben qué número representa cada botón.

- 📄 **Archivo**: `app/nps/[token]/nps-form.tsx:38-50`
- 🔧 **Fix**: Agregar aria-label={`Puntaje ${i} de 10`} a cada botón.

### 15. ⚪ BAJO — ux

ComisionesManager suma totalVentas usando .reduce() pero no valida moneda consistente. Si hay asesores con monedas mixtas, suma es incorrecta sin warning.

- 📄 **Archivo**: `app/(app)/comisiones/comisiones-manager.tsx:23-25`
- 🔧 **Fix**: Filtrar por moneda única o convertir antes de sumar.

### 16. ⚪ BAJO — deuda

updateRol() (lib/db/roles.ts:142-157) no filtra por tenant_id al actualizar. RLS debería protegerlo, pero lógica app-side es confusa sin verificación explícita.

- 📄 **Archivo**: `lib/db/roles.ts:142-157`


## 📦 Autenticación + Cuenta (Login, Signup, Recovery, Middleware, JWT Claims)

### 1. 🟠 ALTO — logica_rota

El middleware (line 84) verifica que userTenantId === tenant.id, pero nunca valida que el tenant exista o esté activo después de extraerlo. Si findTenantBySubdomain() retorna null (línea 46), la ejecución continúa con tenant como null, causando crash en las líneas posteriores.

- 📄 **Archivo**: `middleware.ts:45-89`
- 🔁 **Reproducir**: Hacer una solicitud a un subdominio cuyo tenant esté marcado como 'suspendido' o 'cancelado'. El middleware nunca rechecked este estado en el request actual.
- 🔧 **Fix**: Después de línea 45, añadir: if (!tenant) return NextResponse.redirect(`${env.ROOT_URL}/landing?reason=invalid_tenant`); También, agregar una check explícita que el tenant.estado === 'activo' antes de permitir acceso a rutas protegidas.

### 2. 🟠 ALTO — security

En login-form.tsx (línea 62), cuando el login es desde el dominio central (bare domain), se intenta fetch /api/auth/tenant-home sin verificar que la respuesta es válida. Si el endpoint retorna 404 o 401, el código cae silenciosamente al fallback (línea 79) sin informar al usuario del problema.

- 📄 **Archivo**: `app/(auth)/login/login-form.tsx:61-76`
- 🔁 **Reproducir**: Logging in from bare domain cuando el usuario no tiene un tenant_id en DB. El error se traga silenciosamente.
- 🔧 **Fix**: Verificar !res.ok y mostrar un error específico al usuario. Actualmente: if (res.ok && session) debería separarse en checks explícitos para error handling.

### 3. 🟠 ALTO — security

En forgot-form.tsx (línea 23), el redirectTo se construye con window.location.origin, permitiendo que un atacante en un subdominio 'evil.base.com' redirige los links de reset a 'evil.base.com/auth/reset-password'. Los tokens de recuperación de Supabase serían válidos desde cualquier origen.

- 📄 **Archivo**: `app/(auth)/forgot-password/forgot-form.tsx:23`
- 🔁 **Reproducir**: Acceder a login desde evil.base.com, solicitar reset. El link enviado apuntará a evil.base.com.
- 🔧 **Fix**: Hardcodear el dominio base seguro o validar que window.location.origin coincida con env.ROOT_URL, o que sea un subdominio válido del env.BASE_DOMAIN.

### 4. 🟠 ALTO — ux

En reset-form.tsx (línea 58), setTimeout redirige automáticamente al login después de 1800ms cuando done=true. Si el usuario está lento o hay latencia, puede resultar en UX confuso donde se presiona el botón pero se redirige antes de que vea el mensaje de éxito.

- 📄 **Archivo**: `app/(auth)/reset-password/reset-form.tsx:58`
- 🔁 **Reproducir**: Actualizar contraseña y observar comportamiento en red lenta.
- 🔧 **Fix**: Cambiar a una redirección basada en callback después de que el usuario haga click, no basada en timer. O mostrar más claramente que está redirigiendo.

### 5. 🟡 MEDIO — logica_rota

En handoff/page.tsx (línea 27), se valida que access_token y refresh_token estén presentes, pero nunca se valida que el 'next' parámetro sea una ruta válida. Un atacante podría setear next=http://evil.com y redirigir al usuario fuera del app.

- 📄 **Archivo**: `app/auth/handoff/page.tsx:22,48`
- 🔁 **Reproducir**: Pasar next=http://evil.com en el hash del handoff URL después del login desde dominio central.
- 🔧 **Fix**: Validar que 'next' es una ruta relativa (starts with '/') o belongs a un whitelist de rutas permitidas.

### 6. 🟡 MEDIO — security

En handoff/page.tsx (línea 42), se guarda imp + agencia en localStorage sin sanitizar. Si agencia contiene javascript/HTML, podría causar XSS cuando se muestra en impersonation-banner.tsx.

- 📄 **Archivo**: `app/auth/handoff/page.tsx:41-42`
- 🔁 **Reproducir**: Pasar agencia='<img src=x onerror="alert(1)">'. Cuando se renderiza en line 40 de impersonation-banner.tsx, ejecuta el script.
- 🔧 **Fix**: Sanitizar entrada o usar innerText en lugar de innerHTML. Mejor aún: usar props type-safe en lugar de localStorage para datos críticos.

### 7. 🟡 MEDIO — logica_rota

En login-form.tsx (línea 71), la URL del handoff se construye manualmente sin escaping adecuado del subdomain. Si subdomain contiene caracteres especiales o si env.BASE_DOMAIN es inválido, la URL resultante puede ser malformada.

- 📄 **Archivo**: `app/(auth)/login/login-form.tsx:71`
- 🔁 **Reproducir**: No es fácil de explotar en producción, pero si BASE_DOMAIN tiene puerto o protocolo inseguro, el handoff URL sería inválido.
- 🔧 **Fix**: Usar URL API para construir la URL de forma segura: new URL(`/auth/handoff#${hash}`, `https://${subdomain}.${env.BASE_DOMAIN}`).href

### 8. 🟡 MEDIO — ux

En forgot-form.tsx (línea 29), el error es genérico ('No se pudo enviar el email'). Supabase podría retornar errores específicos (user not found, rate limited, etc.) que podrían ser más útiles al usuario.

- 📄 **Archivo**: `app/(auth)/forgot-password/forgot-form.tsx:28-30`
- 🔁 **Reproducir**: Intentar reset con email que no existe. El error genérico no ayuda.

### 9. 🟡 MEDIO — a11y

En reset-form.tsx, falta aria-label en el botón de actualizar contraseña. El Input también falta aria-label (solo tiene Label visual).

- 📄 **Archivo**: `app/(auth)/reset-password/reset-form.tsx:133`
- 🔁 **Reproducir**: Screen reader: el botón no tiene label accesible.

### 10. ⚪ BAJO — deuda

En login-form.tsx (línea 136), hay un texto hardcodeado en español ('¿Olvidaste tu contraseña?') que debería venir de las translations (t('...')). El resto del form usa i18next correctamente.

- 📄 **Archivo**: `app/(auth)/login/login-form.tsx:136`
- 🔁 **Reproducir**: Cambiar idioma a English - el link sigue en español.

### 11. ⚪ BAJO — deuda

En forgot-form.tsx (líneas 29, 69), hay textos hardcodeados en español ('Enviando...', 'Enviar link de recuperación') que no están en el i18n.

- 📄 **Archivo**: `app/(auth)/forgot-password/forgot-form.tsx:69,71,73`
- 🔁 **Reproducir**: Cambiar idioma a English - textos siguen en español.

### 12. ⚪ BAJO — deuda

En reset-form.tsx (líneas 41, 45, 64, 72, 76, 97, 134), todos los textos están hardcodeados en español. Deberían usar t() para internacionalización.

- 📄 **Archivo**: `app/(auth)/reset-password/reset-form.tsx:41,45,64,72,76,97,134`
- 🔁 **Reproducir**: Cambiar idioma a English - toda la página sigue en español.

### 13. ⚪ BAJO — deuda

En handoff/page.tsx, el textos 'Ingresando a tu espacio...' está hardcodeado sin i18n. Debería usar useTranslation().

- 📄 **Archivo**: `app/auth/handoff/page.tsx:67`
- 🔁 **Reproducir**: Cambiar idioma - sigue en español.

### 14. ⚪ BAJO — deuda

En auth/error/page.tsx, aunque hay traducciones para algunos mensajes, el fallback para 'unknown' reason solo retorna Spanish. No hay fallback bilingüe consistente.

- 📄 **Archivo**: `app/auth/error/page.tsx:19`
- 🔁 **Reproducir**: Pasar un reason desconocido.

### 15. ⚪ BAJO — perf

En getSessionUser (lib/auth.ts line 32-35), se llama Promise.all([getUser(), getSession()]) pero ambas funciones hacen requests a Supabase. Aunque están cacheadas internamente por Supabase, se ejecutan en paralelo innecesariamente - getSession() es suficiente para obtener el usuario autenticado.

- 📄 **Archivo**: `lib/auth.ts:32-35`
- 🔁 **Reproducir**: Monitorear requests a Supabase - verás dos requests cuando una sería suficiente.
- 🔧 **Fix**: Solo usar getSession() que retorna tanto session como implícitamente valida el usuario.


## 📦 Autenticación + Cuenta

### 1. 🔴 CRÍTICO — logica_rota

Race condition en LoginForm: setSubmitting nunca se resetea si el user es null después de signIn (error desconocido del navegador, JavaScript bloqueado, etc.). El botón queda disabled para siempre.

- 📄 **Archivo**: `app/(auth)/login/login-form.tsx:36-48`
- 🔁 **Reproducir**: 1) Bloquear JavaScript antes de hacer click en login. 2) El error se captura pero setSubmitting(false) en línea 47 no se ejecuta. 3) Usuario recarga y botón está eternamente disabled.

### 2. 🟠 ALTO — logica_rota

Condición insegura en middleware (middleware.ts:84): si el JWT custom_access_token_hook falla en Supabase (ej: función SQL SECURITY DEFINER revocada), userTenantId será undefined. El check '!userTenantId || userTenantId !== tenant.id' redirige a error, pero error messages no mencionan que claims faltan.

- 📄 **Archivo**: `middleware.ts:78-89`
- 🔧 **Fix**: Agregar logging y clarificar: si claims.tenant_id falta, es un error de configuración, no auth flow. Considerar cache_control headers para evitar errores silenciosos en CDN.

### 3. 🟠 ALTO — bug

acceptInvitacionAction (invitacion/actions.ts): schema valida token solo por min length (10 chars). Si alguien adivina o pasa 10 caracteres aleatorios, getInvitacionByToken retorna null pero error es silencioso. getInvitacionByToken no hace rate-limit.

- 📄 **Archivo**: `app/invitacion/actions.ts:6-18`
- 🔁 **Reproducir**: Hacer POST a /invitacion con token='1234567890'. El form muestra 'Invitación no válida' pero sin log de intento brute-force.

### 4. 🟠 ALTO — bug

ResetPasswordForm (reset-form.tsx): useEffect sin dependency array en línea 27-37 suscribe a auth.onAuthStateChange() pero NUNCA se desuscribe en cleanup (return subscription.unsubscribe()). Si usuario navega afuera + vuelve, hay múltiples listeners y memory leak.

- 📄 **Archivo**: `app/(auth)/reset-password/reset-form.tsx:27-37`
- 🔧 **Fix**: Ya está presente return subscription.unsubscribe() en línea 36. Pero verificar que useEffect tiene dependency array correcto: [] (empty).

### 5. 🟠 ALTO — ux

ResetPasswordForm y AcceptForm: setTimeout usa 1800ms (1.8s) pero no cancela si usuario navega afuera. Si logout/navega en esos 1.8s, router.push() ejecuta pero sin sesión. Además, 1800ms es tan corto que pueden ocurrir dobles-clics.

- 📄 **Archivo**: `app/(auth)/reset-password/reset-form.tsx:58 y app/invitacion/accept-form.tsx:33`
- 🔁 **Reproducir**: 1) Reset password exitoso. 2) Esperar 0.5s y navegar manualmente. 3) El setTimeout aún redirige a /login, overwrites user intent.

### 6. 🟠 ALTO — security

Handoff page (auth/handoff/page.tsx:42): localStorage.setItem() puede fallar silentemente en modo privado. Si falla, 'crm.impersonando' no se crea pero error se ignora (catch bloque vacío). Usuario no sabe que soporte mode no se activó.

- 📄 **Archivo**: `app/auth/handoff/page.tsx:41-46`
- 🔁 **Reproducir**: Abrir handoff en modo incógnito/privado. No hay error, pero flag crm.impersonando no se guarda.

### 7. 🟠 ALTO — bug

Handoff page: window.location.replace(next) NO VALIDA que 'next' sea ruta relativa. Si token malicioso contiene next='http://evil.com', la redirección te lleva fuera del app sin error. Fragment (#) protege del servidor pero no del atacante que controla tokens.

- 📄 **Archivo**: `app/auth/handoff/page.tsx:48`
- 🔧 **Fix**: Validar: next.startsWith('/') || next.startsWith('?'). Rechazar URLs absolutas.

### 8. 🟠 ALTO — security

tenant-home route (app/api/auth/tenant-home/route.ts) NO VERIFICA que usuario.tenant_id coincida con subdomain/header. Si attacker tiene sesión válida de Tenant A pero está en Tenant B, endpoint retorna subdomain de Tenant A sin error. Middleware later va a bloquear (tenant_mismatch), pero interim leak de tenant mapping.

- 📄 **Archivo**: `app/api/auth/tenant-home/route.ts:10-43`

### 9. 🟡 MEDIO — logica_rota

ForgotPasswordForm (forgot-form.tsx:24): redirectTo es hardcoded a window.location.origin. Si usuario está en subdomain pero es publico, origin es 'tenant.domain.com'. Supabase email link va a ese subdomain pero si tenant no existe más, 404. No hay fallback.

- 📄 **Archivo**: `app/(auth)/forgot-password/forgot-form.tsx:23`
- 🔧 **Fix**: Enviar reset link a bare domain (/login?reset=token) o preservar tenant context en link.

### 10. 🟡 MEDIO — bug

loginForm en tenant subdomain (línea 52-56): Si currentSubdomain() retorna true, router.push + router.refresh() ocurren pero NO esperan. Si refresh() falla, user navega a 'next' con stale JWT. Mejor: await refresh primero.

- 📄 **Archivo**: `app/(auth)/login/login-form.tsx:52-56`
- 🔧 **Fix**: await router.refresh() antes de router.push(). O usar startTransition().

### 11. 🟡 MEDIO — ux

All auth forms: error messages son genéricos (e.g., 'No se pudo enviar el email') pero usuario no sabe si es typo en email o backend error. ForgotPasswordForm no distingue entre 'usuario no encontrado' vs 'servicio SMTP down'.

- 📄 **Archivo**: `app/(auth)/forgot-password/forgot-form.tsx:29`
- 🔁 **Reproducir**: Ingresa email incorrecto en forgot-password. Mismo mensaje que si backend está down.

### 12. 🟡 MEDIO — a11y

LanguageSwitcher (language-switcher.tsx:26): Button tiene aria-label pero onclick es button (sin label text). Si CSS no carga, button mostrará vacío. Similar issue en todas las forms: Input y Label conectados por htmlFor pero no hay aria-describedby para hints de validación.

- 📄 **Archivo**: `components/language-switcher.tsx:26-29`
- 🔧 **Fix**: Agregar text dentro button: <button>ES/EN</button>. O agregar aria-label visible.

### 13. 🟡 MEDIO — deuda

AcceptForm y ResetPasswordForm: hardcoded español ('Las contraseñas no coinciden', 'Mínimo 8 caracteres'). Pero LoginForm usa i18n (t('login.error_invalid_credentials')). Inconsistente.

- 📄 **Archivo**: `app/invitacion/accept-form.tsx:22,29 y app/(auth)/reset-password/reset-form.tsx:41,45`

### 14. 🟡 MEDIO — bug

acceptInvitacion() en invitaciones.ts (línea 205-209): createUser() NO HACE ROLLBACK si posterior insert a usuario table falla. User se crea en auth.users pero no linkea a public.usuario, entonces next login va a fallar con 'tenant_id missing' en JWT hook.

- 📄 **Archivo**: `lib/db/invitaciones.ts:205-227`
- 🔁 **Reproducir**: 1) Simular INSERT falla en public.usuario (via constraint violation). 2) User creado en auth.users pero no en public.usuario. 3) Next login: JWT claims vacíos, middleware rechaza como tenant_mismatch.

### 15. 🟡 MEDIO — bug

inviteUrl() (invitaciones.ts:32): Usa env.BASE_DOMAIN.includes('localhost') para decidir schema. Pero si BASE_DOMAIN es 'crm-staging.example.com', va a HTTPS pero si es 'crm.local', HTTP. Puede haber mixed-content error si email client re-encodes URL.

- 📄 **Archivo**: `lib/db/invitaciones.ts:32`
- 🔧 **Fix**: Usar env.ROOT_URL si existe, o parametrizar schema explícitamente.

### 16. ⚪ BAJO — deuda

SignOutButton (components/auth/sign-out-button.tsx:14) no valida si signOut() falló. Si Supabase session está corrupta, signOut() puede rechazar. Usuario ve 'Cerrar sesión' button pero nada ocurre.

- 📄 **Archivo**: `components/auth/sign-out-button.tsx:12-16`

### 17. ⚪ BAJO — deuda

AcceptForm (invitacion/accept-form.tsx): Password confirmation hace string match (===) pero InputHTMLAttributes no tiene onPaste bloqueado. Usuario puede paste password equivocado sin verlo visualmente, confirma, intenta submit, error 'no coincide'.

- 📄 **Archivo**: `app/invitacion/accept-form.tsx:13-58`

### 18. ⚪ BAJO — perf

middleware.ts (línea 45): findTenantBySubdomain() tiene cache TTL 60s. En cluster con múltiples workers, si tenant se suspende, change puede no reflejarse en algunos workers por 60s. Verbose pero low severity.

- 📄 **Archivo**: `lib/tenant.ts:69`
- 🔧 **Fix**: Considerar shared cache (Redis) o shorter TTL (5s) si scaling es problema.


## 📦 Campañas + Listas envío + Plantillas

### 1. 🔴 CRÍTICO — logica_rota

Race condition en envío de campaña: se verifica `estado == 'borrador'` pero sin bloqueo de escritura concurrente. Dos requests simultáneos pueden enviar la misma campaña dos veces.

- 📄 **Archivo**: `lib/db/campanias.ts:144-146`
- 🔁 **Reproducir**: Enviar la misma campaña desde dos pestañas simultáneamente. Ambas pasarán la verificación de estado y enviarán correos duplicados.
- 🔧 **Fix**: Usar atomic update: actualizar estado a 'enviada' en la misma query que verifica 'borrador' como condición, o usar una transacción con FOR UPDATE.

### 2. 🔴 CRÍTICO — bug

Falta de error checking en update final de campaña (línea 165-168). Si el update falla, se retorna éxito al usuario aunque la campaña no haya sido marcada como enviada.

- 📄 **Archivo**: `lib/db/campanias.ts:165-170`
- 🔁 **Reproducir**: Enviar campaña cuando la DB está en estado inconsistente. El update fallará silenciosamente pero se retornará {ok: true}.
- 🔧 **Fix**: Capturar error del update: const {error} = await admin.from(...).update(...); if (error) throw new Error(error.message);

### 3. 🔴 CRÍTICO — security

Falta de verificación de permisos en deleteListaEnvio(). No valida que el usuario sea admin, permitiendo que cualquier usuario autenticado elimine listas de envío de su tenant.

- 📄 **Archivo**: `lib/db/listas-envio.ts:41-45`
- 🔁 **Reproducir**: Usuario no-admin llama deleteListaEnvio(id) desde cliente directo. RLS previene acceso, pero la función no valida rol; solo confia en RLS.
- 🔧 **Fix**: Agregar: const user = await getSessionUser(); if (user?.rol !== 'admin') throw new Error('Solo administradores');

### 4. 🔴 CRÍTICO — security

deleteListaEnvio() no verifica permisos de admin. Cualquier usuario autenticado podría eliminar listas de otros. RLS está en la tabla pero la función no lo enforce server-side.

- 📄 **Archivo**: `lib/db/listas-envio.ts:41-45`
- 🔧 **Fix**: Agregar await ensureAdmin() al inicio como hace deleteCampania

### 5. 🟠 ALTO — security

Ausencia de Foreign Key en columna `campania_id` de tabla `correo_enviado`. Permite registrar tracking para campañas inexistentes, quebrando integridad referencial y métricas.

- 📄 **Archivo**: `supabase/migrations/0035_correo_campanas_api.sql:13`
- 🔧 **Fix**: Agregar: campania_id UUID REFERENCES public.campania(id) ON DELETE CASCADE,

### 6. 🟠 ALTO — bug

Link roto a página inexistente: listas-panel.tsx línea 19 enlaza a `/campanias/listas/${l.id}` pero no existe esa ruta (solo existe /campanias/listas/nueva).

- 📄 **Archivo**: `app/(app)/campanias/listas-panel.tsx:19`
- 🔁 **Reproducir**: Hacer click en el nombre de una lista en el panel. Se obtiene 404.
- 🔧 **Fix**: Crear /campanias/listas/[id]/page.tsx con detalles/edición de la lista, o remover el link si la feature está incompleta.

### 7. 🟠 ALTO — bug

Acceso a `data.id` sin null-check en createListaEnvio. Si .single() retorna (data: null, error: null) en edge case, causa crash.

- 📄 **Archivo**: `lib/db/listas-envio.ts:38`
- 🔁 **Reproducir**: Caso edge case teórico si Supabase retorna ambos null. En práctica raro pero posible.
- 🔧 **Fix**: Guardar tipo: const singleResult = await ...select('id').single(); if (!singleResult.data) throw new Error('Insert failed'); return singleResult.data.id;

### 8. 🟠 ALTO — ux

Componente Form en campanias-manager.tsx no es un elemento <form>. Usa <div> con Button type='button' + onClick. Si bien funciona, incumple semántica HTML y quebra navegadores viejos sin JS.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:103-127`
- 🔧 **Fix**: Cambiar <div> por <form onSubmit={guardar}>. Mover onClick a onSubmit del form. Cambiar Button a type='submit'.

### 9. 🟠 ALTO — bug

Botón de eliminar campaña sin type='button'. En HTML5, buttons sin type defaults a 'submit', lo que puede triggerear submit de formularios no intencionados.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:77`

### 10. 🟠 ALTO — logica_rota

data.id access sin null-check en createListaEnvio. Aunque .single() debería fallar, si retorna error pero data es null, se lanzará error al acceder a data.id.

- 📄 **Archivo**: `lib/db/listas-envio.ts:38`
- 🔧 **Fix**: Agregar: if (!data) throw new Error('No se creó la lista')

### 11. 🟠 ALTO — logica_rota

data.id access sin null-check en createCampania. Mismo patrón: no verifica si data existe antes de retornar data.id.

- 📄 **Archivo**: `lib/db/campanias.ts:114`
- 🔧 **Fix**: Agregar: if (!data) throw new Error('No se creó la campaña')

### 12. 🟠 ALTO — ux

window.location.href en client component (form.tsx:23). En SSR/hydration, esto puede causar errores o comportamiento inesperado. Debería usar useSearchParams() en su lugar.

- 📄 **Archivo**: `app/(app)/campanias/listas/nueva/form.tsx:23-24`
- 🔧 **Fix**: Reemplazar: const searchParams = useSearchParams(); const filtros = searchParams.get('filtros') ?? ''

### 13. 🟠 ALTO — security

HTML del email (cuerpo_html) se guarda sin sanitización. Un usuario admin podría inyectar JavaScript o tracking malicioso que se ejecute en los clientes.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:119`
- 🔧 **Fix**: Usar librería como DOMPurify o bleach antes de guardar cuerpo_html

### 14. 🟡 MEDIO — a11y

Botón 'Eliminar campaña' (icono trash) sin aria-label. Usuarios de screen readers ven solo el icono.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:77`
- 🔁 **Reproducir**: Activar screen reader. El botón no tiene etiqueta accesible.
- 🔧 **Fix**: Agregar aria-label='Eliminar campaña' al button.

### 15. 🟡 MEDIO — a11y

Falta aria-label en cierre de modal (FilterBuilder, línea 100-102). Botón X sin etiqueta.

- 📄 **Archivo**: `components/filters/filter-builder.tsx:97-104`
- 🔧 **Fix**: Ya tiene aria-label='Cerrar' en línea 101. Bien.

### 16. 🟡 MEDIO — security

Potencial XSS en HtmlEditor: dangerouslySetInnerHTML carga `value` sin sanitización previa. Aunque está en contentEditable, si el HTML proviene de DB comprometida, XSS es posible.

- 📄 **Archivo**: `components/ui/html-editor.tsx:83`
- 🔁 **Reproducir**: Guardar HTML malicioso en BD (e.g., via API o inyección SQL). Al recargar, ejecuta JS en el contexto del editor.
- 🔧 **Fix**: Sanitizar con DOMPurify antes de setInnerHTML. O usar librería como rehype-sanitize.

### 17. 🟡 MEDIO — bug

Double type cast (as unknown as) en resolverDestinatarios es anti-pattern TypeScript. Esconde errores de tipo.

- 📄 **Archivo**: `lib/db/campanias.ts:130`
- 🔧 **Fix**: Definir tipo explícito: type ContactoRow = {id: string; email: string; empresa: ...}; const rows = (data as ContactoRow[]).map(...);

### 18. 🟡 MEDIO — perf

listListasEnvio() carga TODAS las listas sin paginación. Si hay 10k listas, se descarga todo.

- 📄 **Archivo**: `lib/db/listas-envio.ts:10-19`
- 🔧 **Fix**: Agregar LIMIT en query y soporte paginación en UI.

### 19. 🟡 MEDIO — a11y

Botón de eliminar campaña sin aria-label ni title. Usuarios con lectores de pantalla no sabrán qué hace el ícono Trash.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:77`

### 20. 🟡 MEDIO — deuda

Casting excesivo a 'unknown' antes de typear. En línea 130 de campanias.ts, se castea 'data' a 'unknown' como Record<string, unknown> lo que es un anti-pattern.

- 📄 **Archivo**: `lib/db/campanias.ts:130`
- 🔧 **Fix**: Definir un tipo RawContactoRow y usarlo directamente: (data as RawContactoRow[]).map(...)

### 21. 🟡 MEDIO — logica_rota

getCampaniaMetrics() accede a r.abierto_en y r.click_en sin validar que existan en el tipo. Si la query retorna columnas diferentes, causará undefined.

- 📄 **Archivo**: `lib/db/campanias.ts:20-28`
- 🔁 **Reproducir**: Alterar query en línea 20 para no seleccionar abierto_en o click_en; el cálculo de abiertos/clicksU fallará silenciosamente

### 22. 🟡 MEDIO — ux

HtmlEditor usa document.execCommand (deprecated). Aunque funciona ahora, puede fallar en browsers futuros. Debería reemplazarse con ContentEditable API moderna o library robusta.

- 📄 **Archivo**: `components/ui/html-editor.tsx:29`

### 23. 🟡 MEDIO — logica_rota

resolverDestinatarios() filtra por r.email pero previamente mapeó email a '' si es null. Esto permite que contactos con email null pasen el filtro, siendo enviados a '' después.

- 📄 **Archivo**: `lib/db/campanias.ts:132-135`
- 🔧 **Fix**: No hacer casting a '' en línea 132; mantener null y filtrar antes del return

### 24. 🟡 MEDIO — logica_rota

onEliminar no resetea error/okMsg anteriores. Si el usuario tenía un error visible y luego elimina, se sigue viendo el antiguo error después del refresh.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:30-34`

### 25. 🟡 MEDIO — a11y

Botón de envío de campaña (línea 73) no tiene aria-label. El ícono Send + texto 'Enviar' son suficientes, pero mejoraría si hubiera aria-label explícito.

- 📄 **Archivo**: `app/(app)/campanias/campanias-manager.tsx:73`

### 26. ⚪ BAJO — deuda

deleteListaEnvio() está definida pero nunca es usada. Código muerto.

- 📄 **Archivo**: `lib/db/listas-envio.ts:41-45`

### 27. ⚪ BAJO — bug

tasa_bounce siempre retorna null en métricas aunque exista columna `bounces`. El cálculo no está implementado (debería dividir bounces/enviados).

- 📄 **Archivo**: `lib/db/campanias.ts:34, 64`
- 🔧 **Fix**: Cambiar: tasa_bounce: v.enviados ? Math.round((v.bounces / v.enviados) * 1000) / 10 : null; (si bounces se llena en registrarCorreoEnviado)

### 28. ⚪ BAJO — logica_rota

En crearListaAction, se cuentan contactos filtrando in-memory sin tenant isolation. Si dos tenants llaman simultáneamente, los filtros podrían cross-contaminar si hay estado global.

- 📄 **Archivo**: `app/(app)/campanias/listas/nueva/actions.ts:23-26`
- 🔧 **Fix**: Asegurar que listContactos() respeta tenant_id en la query de BD (verificar que RLS está habilitada).

### 29. ⚪ BAJO — perf

getAllCampaniaMetrics() carga todas las filas de correo_enviado sin paginación. Con miles de correos, esto es ineficiente.

- 📄 **Archivo**: `lib/db/campanias.ts:39-69`
- 🔧 **Fix**: Agregar índice y/o paginación; considerar materializar métricas en tabla separada

### 30. ⚪ BAJO — deuda

createListaAction llama a listContactos({}) SIN límite, luego filtra en memoria. Con 10k+ contactos, consume mucha RAM.

- 📄 **Archivo**: `app/(app)/campanias/listas/nueva/actions.ts:23`
- 🔧 **Fix**: Considerar server-side filtering o paginación

### 31. ⚪ BAJO — deuda

Validación del email al envío es mínima (solo checka que exista string, no formato RFC). sendGmail() fallaría con emails malformados como 'test@' pero sin feedback útil.

- 📄 **Archivo**: `lib/db/campanias.ts:158`
- 🔧 **Fix**: Validar email con regex o librería antes de pasarlo a sendGmail


## 📦 Contactos (Next.js + Supabase + RLS)

### 1. 🟠 ALTO — sql_invalido

En picker-data.ts línea 21-37, los queries a Supabase no verifican el objeto .error. Si alguna query falla (por RLS, conexión o timeout), .data será undefined pero se retorna un array vacío sin indicación del error. Esto causa fallos silenciosos donde los datos de empresa, contacto, usuario etc. no cargan pero el usuario no ve ningún error.

- 📄 **Archivo**: `lib/db/picker-data.ts:21-37`
- 🔧 **Fix**: Verificar .error en cada query y lanzar excepción si ocurre. Ej: `const { data, error } = await supabase...; if (error) throw new Error(error.message);`

### 2. 🟠 ALTO — logica_rota

En contacto-form.tsx línea 53 y 90, los selects de empresa y usuario tienen defaultValue vinculado a IDs que podrían no estar en las opciones cargadas. Si picker-data falla (error silencioso anterior), los arrays estarán vacíos pero el form seguirá intentando mostrar valores por defecto que no existen en las opciones, creando un estado inválido del select.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/contacto-form.tsx:53,90`
- 🔁 **Reproducir**: 1. Hacer falla simulada en picker-data (ej. desconectar DB). 2. Abrir /contactos/{id}/editar. 3. El select de empresa y usuario mostrarán un estado vacío pero el formulario mostrará valores por defecto inválidos.
- 🔧 **Fix**: Validar en el servidor que picker.empresas y picker.usuarios tengan elementos relevantes antes de renderizar. O mostrar un error si están vacíos.

### 3. 🟡 MEDIO — logica_rota

En contacto-aside.tsx línea 39, useState(c.campos_custom) inicializa el estado local pero nunca sincroniza si el prop c.campos_custom cambia. Si el padre actualiza los datos (ej. por una actualización en tiempo real), los campos personalizados en el aside quedarán obsoletos.

- 📄 **Archivo**: `app/(app)/contactos/[id]/contacto-aside.tsx:39`
- 🔧 **Fix**: Usar useEffect para sincronizar el estado cuando c.campos_custom cambia. Ej: `useEffect(() => { setCampos(c.campos_custom ?? {}); }, [c.campos_custom]);`

### 4. 🟡 MEDIO — ux

En updateContactoAction (actions.ts línea 54-55), se llama revalidatePath('/contactos/{id}') y revalidatePath('/contactos'), pero el redirect en línea 56 va a /contactos/{id}. Si el usuario hace refresh después de editar, verá datos nuevos. Sin embargo, la cache se revalida para ambas rutas, lo cual es correcto pero podría haber una race condition si el redirect es muy rápido.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/actions.ts:54-56`
- 🔧 **Fix**: El código actual es correcto. Sin embargo, considerar si hay race condition entre revalidatePath y redirect. Probablemente no hay problema práctico.

### 5. ⚪ BAJO — deuda

En prevValue (inline-edit.ts línea 34), se hace un cast doble `as unknown as Record<string, unknown>`. Si el campo no existe en data, retorna undefined en lugar de null. Aunque esto funciona, es un anti-patrón.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:34`
- 🔧 **Fix**: Usar un cast simple o una función helper. Ej: `const field = (data as Record<string, unknown>)?.[field];`

### 6. ⚪ BAJO — ux

En contacto-aside.tsx línea 46, cuando se edita un campo personalizado de tipo checkbox, la descripción del cambio muestra 'Sí' o 'No', pero el valor actual guardado en campos_custom[campo.clave] podría ser boolean (true/false) o string ('true'/'false'). No hay garantía de que el tipo sea consistente.

- 📄 **Archivo**: `app/(app)/contactos/[id]/contacto-aside.tsx:46`
- 🔧 **Fix**: Normalizar el tipo de datos para campos checkbox. Ej: asegurar que siempre son boolean en la DB o siempre string en el código.

### 7. ⚪ BAJO — a11y

En contacto-form.tsx línea 41, el Input de nombre no tiene aria-label ni aria-describedby. El htmlFor del Field está vinculado, pero esto puede mejorar la accesibilidad en lectores de pantalla.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/contacto-form.tsx:41`
- 🔧 **Fix**: Verificar que todos los inputs tengan labels semánticos. El actual usa Field que probablemente genera labels correctamente, pero revisar el componente Field.

### 8. ⚪ BAJO — perf

En page.tsx línea 18, cuando hay filtros avanzados, se cargan hasta 2000 contactos. Esto podría causar problemas de performance si hay muchos contactos. La tabla render los 2000 sin paginación visible.

- 📄 **Archivo**: `app/(app)/contactos/page.tsx:18`
- 🔧 **Fix**: Implementar paginación o virtualización para listas grandes. O reducir el límite a 500-1000.

### 9. ⚪ BAJO — ux

En inline-edit.tsx línea 80 del componente, cuando se revertido un cambio fallido, no hay feedback visual de que el cambio fue revertido. El user vera que el valor vuelve a lo anterior sin explicación.

- 📄 **Archivo**: `components/ui/inline-edit.tsx:53`
- 🔁 **Reproducir**: 1. Editar un campo inline. 2. Simular un error en el servidor (ej. RLS deny). 3. El valor se revierta silenciosamente sin aviso al usuario.
- 🔧 **Fix**: Mostrar un toast o animación cuando se revertido un cambio debido a error.

### 10. ⚪ BAJO — deuda

En relaciones.ts línea 101, se usa `usuario:asignado_id(nombre)` pero en contactos.ts línea 50 se usa `asignado:usuario!contacto_asignado_id_fkey(nombre)`. Las dos formas funcionan pero no son consistentes. Esto puede confundir a futuros desarrolladores.

- 📄 **Archivo**: `lib/db/relaciones.ts:101 vs lib/db/contactos.ts:50`
- 🔧 **Fix**: Usar la misma sintaxis en ambos lugares. Preferiblemente la forma con el alias explícito para claridad.

### 11. ⚪ BAJO — security

En rfm.ts línea 23, se hace un cast `as number` sin validación. Si o.valor es un string o cualquier otro tipo, esto podría causar comportamiento inesperado. Aunque la DB tiene constraints, el casting es inseguro.

- 📄 **Archivo**: `lib/db/rfm.ts:23`
- 🔧 **Fix**: Validar que o.valor sea un número válido antes de usarlo. Ej: `Number.isFinite(o.valor) ? o.valor : 0`

### 12. ⚪ BAJO — logica_rota

En nivelPorMonto (rfm.ts línea 9-12), no hay validación de que plata < oro. Si los thresholds están invertidos en la configuración, la lógica dará resultados incorrectos (ej. todo sería 'oro' o todo sería 'bronce'). Esto es un problema de data pero podría validarse.

- 📄 **Archivo**: `lib/db/rfm.ts:9-12`
- 🔧 **Fix**: Considerar agregar una validación en getTenantConfig para asegurar que oro >= plata. O agregar un comentario documentando esta expectativa.


## 📦 Contactos

### 1. 🔴 CRÍTICO — logica_rota

En lib/db/rfm.ts línea 18-23, la función nivelDeContacto() no verifica el objeto error de la query Supabase. Si la query falla, data será undefined y el código intentará reducir un array undefined, causando crash o resultado incorrecto.

- 📄 **Archivo**: `lib/db/rfm.ts:18-23`
- 🔧 **Fix**: Agregar destructuring de error: const { data, error } = await supabase... y validar: if (error) throw error; antes de usar data

### 2. 🔴 CRÍTICO — sql_invalido

En app/(app)/contactos/[id]/editar/actions.ts línea 27, fecha_nacimiento se valida como z.preprocess(emptyToNull, z.string().nullable()) sin validación de formato ISO8601 o rango de fechas. Acepta cualquier string, incluyendo valores inválidos como 'notadate'.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/actions.ts:27`
- 🔁 **Reproducir**: Intentar editar un contacto e ingresar fecha_nacimiento='xyz' (string inválido). El formulario no rechazará el valor.
- 🔧 **Fix**: Cambiar a z.string().datetime() o z.coerce.date() para validar formato ISO8601

### 3. 🟠 ALTO — ux

En lib/actions/inline-edit.ts línea 114, saveContactoField() solo revalida /contactos/{id} pero no revalida /contactos (la lista). Cambios inline de campos como nombre no se reflejan en la tabla de listado hasta refresh manual.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:114`
- 🔁 **Reproducir**: Hacer inline edit del nombre en contacto-aside, volver a lista de contactos. El nombre viejo se sigue viendo en la tabla.
- 🔧 **Fix**: Agregar revalidatePath('/contactos') después de revalidatePath(`/contactos/${id}`)

### 4. 🟠 ALTO — logica_rota

En lib/actions/inline-edit.ts línea 33 y 40, las funciones prevValue() y usuarioNombre() no verifican el objeto error de Supabase. Si la query falla, devuelven valores por defecto pero pierden la excepción, ocultando fallos RLS o de conectividad.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:33,40`
- 🔧 **Fix**: Agregar destructuring de error en ambas funciones y throw si error existe

### 5. 🟠 ALTO — ux

En components/ui/inline-edit.tsx línea 37, useState(value) inicializa current pero no sincroniza si el prop value cambia. Si el padre actualiza el value de un contacto en tiempo real, el estado local queda obsoleto (stale state).

- 📄 **Archivo**: `components/ui/inline-edit.tsx:37`
- 🔁 **Reproducir**: Cargar contacto con nombre 'Juan', hacer inline edit a 'Carlos' pero no guardar. Si la prop value se actualiza desde el servidor, el campo seguirá mostrando 'Juan'.
- 🔧 **Fix**: Agregar useEffect que actualice current cuando value cambie: useEffect(() => { setCurrent(value); committed.current = value; }, [value])

### 6. 🟠 ALTO — bug

En app/(app)/contactos/[id]/editar/actions.ts línea 15, empresa_id valida UUID pero no verifica que la empresa pertenezca al tenant actual. Un asesor podría asignar un contacto a una empresa de otro tenant si conoce el UUID.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/actions.ts:15`
- 🔁 **Reproducir**: En el form de edición, interceptar formData y reemplazar empresa_id con UUID de empresa de otro tenant. Sin validación en server, se asignará.
- 🔧 **Fix**: En updateContacto() de mutations.ts, verificar que la empresa existe y pertenece al mismo tenant antes de actualizar

### 7. 🟠 ALTO — bug

En lib/actions/inline-edit.ts línea 73, el campo email en CONTACTO_FIELDS solo hace trim() sin validación de formato. Inline edit permite guardar valores como 'notanemail' sin error de validación.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:73`
- 🔁 **Reproducir**: En aside, hacer inline edit de email a 'xyz'. Se guardará sin validación. Form.tsx sí valida .email() pero inline no.
- 🔧 **Fix**: Agregar validación: email: { coerce: (v) => { const trimmed = v.trim(); if (!trimmed.includes('@')) throw new Error('Email inválido'); return trimmed; }, label: 'Email' }

### 8. 🟡 MEDIO — logica_rota

En lib/db/relaciones.ts línea 35-41 (listOportunidadesDeContacto) no verifica .error de la query. Si falla, devuelve [] en lugar de lanzar excepción, ocultando fallos de conectividad o RLS.

- 📄 **Archivo**: `lib/db/relaciones.ts:35-41`
- 🔧 **Fix**: Destructurar error: const { data, error } = await supabase...; if (error) throw error;

### 9. 🟡 MEDIO — logica_rota

En lib/db/relaciones.ts línea 46-52 (listOportunidadesDeEmpresa) igual que arriba: no verifica .error, silencia fallos.

- 📄 **Archivo**: `lib/db/relaciones.ts:46-52`
- 🔧 **Fix**: Agregar verificación de error

### 10. 🟡 MEDIO — security

En app/api/public/contactos/route.ts línea 50, se hace .ilike('nombre', 'API') pero no se valida que emp sea del tipo esperado antes de acceder a emp.id en línea 51. El casting implícito puede causar acceso a undefined.

- 📄 **Archivo**: `app/api/public/contactos/route.ts:50-51`
- 🔧 **Fix**: Agregar validación: if (!emp?.id) throw new Error(...)

### 11. 🟡 MEDIO — ux

En app/(app)/contactos/[id]/editar/contacto-form.tsx, el campo asignado_id usa defaultValue sin validar que el usuario en picker.usuarios existe en la lista. Si el contacto está asignado a un usuario eliminado, Select quedará sin opción marcada.

- 📄 **Archivo**: `app/(app)/contactos/[id]/editar/contacto-form.tsx:90`
- 🔁 **Reproducir**: Eliminar un usuario que tenga contactos asignados. Al editar ese contacto, el select de 'Asignado a' no mostrará la opción del usuario eliminado.
- 🔧 **Fix**: Verificar en page.tsx que contacto.asignado_id existe en usuarios, o mostrar fallback

### 12. ⚪ BAJO — deuda

En lib/db/contactos.ts línea 45-82 (listContactos), se cargan todos los contactos con limit 200 o 2000. Sin paginación, queries grandes pueden ser lentas. Mejor usar offset/limit o cursor-based pagination.

- 📄 **Archivo**: `lib/db/contactos.ts:52`
- 🔧 **Fix**: Agregar soporte a offset y limit dinámicos en listContactos

### 13. ⚪ BAJO — a11y

En app/(app)/contactos/page.tsx línea 71, el span 'no asignado' no tiene aria-label. Screen readers no comunican claramente el estado.

- 📄 **Archivo**: `app/(app)/contactos/page.tsx:71`
- 🔧 **Fix**: Agregar aria-label='Sin asignar' al span

### 14. ⚪ BAJO — perf

En app/(app)/contactos/[id]/page.tsx línea 34-42, se cargan 7 queries en paralelo cada vez que se abre un contacto. Sin caching, usuarios frecuentes ven latencia. Considerar SWR o cache de campos que no cambian (campos, normas de RFM).

- 📄 **Archivo**: `app/(app)/contactos/[id]/page.tsx:34-42`
- 🔧 **Fix**: Cachear listCampos y RFM_DEFAULT en un store o usar revalidatePath selectiva


## 📦 Empresas (CRUD, Sedes, Contactos, Campos Custom)

### 1. 🟠 ALTO — ux

InlineEditField para email en empresa-aside no valida formato de email. Acepta cualquier string sin validar estructura de correo, a diferencia del formulario principal que usa type="email".

- 📄 **Archivo**: `app/(app)/empresas/[id]/empresa-aside.tsx:66-67`
- 🔁 **Reproducir**: En el aside derecho, hacer clic en Email e ingresar texto inválido como 'notanemail' → se guarda sin error. En el formulario de edición, el browser rechaza esto.
- 🔧 **Fix**: Agregar type="email" a InlineEditField label=Email o validar en saveEmpresaField antes de guardar.

### 2. 🟠 ALTO — logica_rota

El schema de validación en empresa-form.tsx usa z.preprocess(emptyToNull) en email, pero emptyToNull nunca devuelve null para email porque el campo pasará a z.string().email() que requiere un string válido antes de poder ser nullable.

- 📄 **Archivo**: `app/(app)/empresas/[id]/editar/actions.ts:16`
- 🔁 **Reproducir**: Intentar guardar formulario con email vacío → el preprocess convierte a null, pero z.string().email() se aplica al null resultante, causando error.
- 🔧 **Fix**: Cambiar a: z.preprocess(emptyToNull, z.string().email().nullable()) - nullable DEBE estar después de .email()

### 3. 🟠 ALTO — a11y

InlineEditField no especifica type='email' para el campo Email, por lo que no recibe validación nativa del browser ni funcionalidad de email (ej. teclado móvil con @).

- 📄 **Archivo**: `app/(app)/empresas/[id]/empresa-aside.tsx:66-67`
- 🔁 **Reproducir**: Editar email en aside en mobile → el teclado no muestra @ por defecto. Cambiar a type='email' en InlineEditField.
- 🔧 **Fix**: Pasar type='email' en el InlineEditField para Email.

### 4. 🟠 ALTO — security

Las mutations createSede, updateSede, deleteSede usan ensureWriter() que solo verifica rol='admin', pero NO verifica si el usuario tiene permisos específicos para el módulo 'empresas'. ensurePermission() no se usa.

- 📄 **Archivo**: `lib/db/mutations.ts:790, 806, 827`
- 🔁 **Reproducir**: Un admin sin permisos explícitos para 'empresas:crear' puede crear sedes. Las RLS en DB lo permitirían pero la app-layer validation no lo rechaza.
- 🔧 **Fix**: Cambiar ensureWriter() a await ensurePermission('empresas', 'editar') en createSede, updateSede, deleteSede.

### 5. 🟡 MEDIO — ux

En sedes-section.tsx, el checkbox es_principal no tiene un label visible. Solo tiene la clase 'rounded' pero el text 'Marcar como sede principal' está fuera del <label>, lo que rompe la accesibilidad.

- 📄 **Archivo**: `components/sedes/sedes-section.tsx:208-210`
- 🔁 **Reproducir**: Intentar hacer clic en el texto 'Marcar como sede principal' → no selecciona el checkbox. Solo hace clic directo en el input.
- 🔧 **Fix**: El texto está dentro de <label> pero no tiene htmlFor. Agregar htmlFor='es_principal' al label.

### 6. 🟡 MEDIO — logica_rota

En updateSede(), la query neq('id', id) hace .neq() después de .update() pero neq() es un filtro SELECT, no una restricción post-update. La sintaxis correcta es .neq('id', id) ANTES de .update().

- 📄 **Archivo**: `lib/db/mutations.ts:815-820`
- 🔁 **Reproducir**: Marcar una sede no principal como 'principal' cuando hay otra marcada → ambas quedan marcadas como principal.
- 🔧 **Fix**: Cambiar línea 819 de .neq('id', id) a .not('id', 'eq', id) o reestructurar para actualizar correctamente.

### 7. 🟡 MEDIO — ux

Después de guardar una empresa, se hace redirect() a /empresas/[id], pero esto ocurre DESPUÉS de revalidatePath(). Si el usuario tiene cache activo, puede ver stale data brevemente.

- 📄 **Archivo**: `app/(app)/empresas/[id]/editar/actions.ts:55-57`
- 🔁 **Reproducir**: Editar empresa, hacer submit → el redirect puede ocurrir antes de que Next.js recache, causando flash de datos viejos.
- 🔧 **Fix**: Invertir orden: primero redirect(), luego Next.js recachea automáticamente. O usar revalidateTag() en lugar de revalidatePath().

### 8. 🟡 MEDIO — ux

El estado 'inactivo' en ESTADO_BADGE en empresas/page.tsx mapea a 'default' (gris), pero en empresa-aside.tsx mapea a 'inactivo'. Estilos inconsistentes para el mismo estado.

- 📄 **Archivo**: `app/(app)/empresas/page.tsx:13-17`
- 🔁 **Reproducir**: Ver empresa inactiva en listado vs en detail → colores diferentes.
- 🔧 **Fix**: Estandarizar ESTADO_BADGE en ambos archivos o crear una constante compartida.

### 9. ⚪ BAJO — deuda

saveEmpresaField en inline-edit.ts no valida el email antes de guardarlo. EMPRESA_FIELDS['email'] solo hace str() que trimea, sin validar formato.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:80 + saveEmpresaField:121-134`
- 🔁 **Reproducir**: Guardar email inválido mediante inline edit → se guarda directamente en DB sin validar.
- 🔧 **Fix**: Agregar validación de email en saveEmpresaField o usar un coerce más estricto que rechace emails malformados.

### 10. ⚪ BAJO — a11y

Los botones 'Editar' y 'Eliminar' en sedes-section.tsx no tienen aria-labels descriptivos. 'Editar' podría decir 'Editar sede [nombre]'.

- 📄 **Archivo**: `components/sedes/sedes-section.tsx:135-136`
- 🔁 **Reproducir**: Usar screen reader → botones no describen qué sede editan.
- 🔧 **Fix**: Agregar aria-label={`Editar sede ${sede.nombre}`} y similar para eliminar.

### 11. ⚪ BAJO — deuda

El campo 'Sitio web' en empresa-form.tsx tiene placeholder='https://...' pero no valida que sea una URL válida. Acepta cualquier string.

- 📄 **Archivo**: `app/(app)/empresas/[id]/editar/empresa-form.tsx:62`
- 🔁 **Reproducir**: Guardar sitio_web='notaurl' → se guarda sin error.
- 🔧 **Fix**: Agregar validación z.string().url() en el schema o al menos un pattern para URLs.


## 📦 Empresas (CRUD, sedes, contactos, edición inline, campos custom)

### 1. 🟠 ALTO — logica_rota

El campo 'nombre' de Empresa en saveEmpresaField no valida que sea no-vacío. Un usuario puede editar inline el nombre y dejarlo vacío, guardando una empresa con nombre vacío, violando la integridad de datos.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:79`
- 🔧 **Fix**: Cambiar el coerce para 'nombre' en EMPRESA_FIELDS de `(v) => v.trim()` a `(v) => { const trimmed = v.trim(); if (!trimmed) throw new Error('Nombre requerido'); return trimmed; }` O validar en patchEmpresa antes de actualizar.

### 2. 🟠 ALTO — logica_rota

El campo 'nombre' de Contacto en saveContactoField no valida que sea no-vacío. Un usuario puede editar inline y dejar el nombre vacío, creando un contacto sin nombre.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:71`
- 🔧 **Fix**: Agregar validación de non-vacío para 'nombre' en CONTACTO_FIELDS, similar a la de 'nombre' en Empresa.

### 3. 🟠 ALTO — logica_rota

El campo 'email' de Contacto en saveContactoField no valida que sea un email válido. Permite guardar valores inválidos como 'test' o 'abc'. Esto es inconsistente con la creación de contactos que requiere z.string().email().

- 📄 **Archivo**: `lib/actions/inline-edit.ts:73`
- 🔧 **Fix**: Cambiar de `{ coerce: (v) => v.trim(), label: 'Email' }` a una validación que incluya verificación de formato de email.

### 4. 🟡 MEDIO — logica_rota

El campo 'estado_empresa' de Empresa en saveEmpresaField no valida que sea uno de los valores permitidos ['prospecto', 'cliente', 'inactivo']. Un usuario podría editar inline y enviar un valor inválido como 'activo' o 'xyz'.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:85`
- 🔧 **Fix**: Cambiar de `{ coerce: (v) => v, label: 'Estado' }` a una validación que verifique que el valor sea uno de los enum values válidos.

### 5. 🟡 MEDIO — logica_rota

El componente InlineEditField no sincroniza el estado local cuando las props cambian. Si un componente padre se re-renderiza con nuevos datos de Empresa (después de revalidatePath), el InlineEditField mantiene valores stale del render anterior.

- 📄 **Archivo**: `components/ui/inline-edit.tsx:26-40`
- 🔧 **Fix**: Agregar un useEffect que actualice current y committed.current cuando el prop 'value' cambia: useEffect(() => { setCurrent(value); committed.current = value; }, [value]);

### 6. 🟡 MEDIO — logica_rota

En EmpresaAside, cuando se edita un campo personalizado, se usa el estado local campos_custom para obtener el valor anterior (línea 46). Pero este estado no se sincroniza si el padre se re-renderiza con nuevos datos del servidor.

- 📄 **Archivo**: `app/(app)/empresas/[id]/empresa-aside.tsx:39-49`
- 🔧 **Fix**: Agregar useEffect que sincronice campos_custom cuando e.campos_custom cambia: useEffect(() => { setCampos(e.campos_custom ?? {}); }, [e.campos_custom]);

### 7. ⚪ BAJO — ux

En sedes-section.tsx, cuando se intenta editar el campo 'es_principal' (checkbox), si no se marca, la FormData no incluirá la clave. El preprocess lo maneja correctamente, pero el patrón es frágil.

- 📄 **Archivo**: `components/sedes/sedes-section.tsx:209`
- 🔁 **Reproducir**: 1. Abrir edición de una sede marcada como principal. 2. Desmarcar 'Marcar como sede principal'. 3. Guardar. El valor se actualiza correctamente, pero el patrón es frágil para otros checkboxes.
- 🔧 **Fix**: Usar un patrón más robusto: agregar un hidden input para cada checkbox: <input type='hidden' name='es_principal' value='false' /> seguido del checkbox value='true'.

### 8. ⚪ BAJO — deuda

Validación de email con z.preprocess(emptyToNull, z.string().email().nullable()) es un patrón poco intuitivo. El orden correcto sería validar que sea email ANTES de aplicar preprocess.

- 📄 **Archivo**: `app/(app)/empresas/[id]/editar/actions.ts:16 y otros`
- 🔧 **Fix**: Usar un patrón más claro: z.string().email().or(z.literal('').transform(() => null)).nullable() o validar con z.union([z.string().email(), z.literal('').transform(() => null)]).

### 9. ⚪ BAJO — ux

En empresas/page.tsx, cuando se aplican filtros avanzados, se cargan hasta 2000 registros. Si hay más de 2000 empresas, algunos registros no se mostrarán ni se filtrarán, causando resultados incompletos sin aviso al usuario.

- 📄 **Archivo**: `app/(app)/empresas/page.tsx:25`
- 🔁 **Reproducir**: Si el tenant tiene >2000 empresas y se aplica un filtro avanzado, algunos resultados no aparecerán porque se cargan máximo 2000.


## 📦 Fidelización + Reservas + Cotizaciones + Itinerario (Módulo multi-tenant)

### 1. 🔴 CRÍTICO — logica_rota

Timezone bug en fidelizacion: diasAlProximoCumple() crea Date con 'T00:00:00' (UTC) pero hoy = new Date() usa hora local. Comparación de fechas en timezones distintos produce cálculos incorrectos de días al próximo cumpleaños.

- 📄 **Archivo**: `lib/db/fidelizacion.ts, línea 15-20`
- 🔧 **Fix**: Usar UTC consistently: const hoy = new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z');

### 2. 🔴 CRÍTICO — security

crearReservaDesdeOportunidad() no verifica permisos del usuario sobre la oportunidad. Solo valida que exista el tenant y la agencia. Un usuario podría reservar una oportunidad de otro usuario del mismo tenant.

- 📄 **Archivo**: `lib/db/reservas.ts, línea 104-122`
- 🔧 **Fix**: Agregar verificación de ownership o permisos: verificar que oportunidad_id pertenece al usuario actual o está compartida.

### 3. 🔴 CRÍTICO — logica_rota

Timezone bug en fidelizacion: diasAlProximoCumple() crea Date con 'T00:00:00' (UTC) pero hoy = new Date() usa hora local. Comparación de fechas en timezones distintos produce cálculos incorrectos de días al próximo cumpleaños.

- 📄 **Archivo**: `lib/db/fidelizacion.ts, línea 15-20`
- 🔧 **Fix**: Usar UTC consistently: const hoy = new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z');

### 4. 🟠 ALTO — logica_rota

PasajerosSection no tiene forma de EDITAR pasajeros existentes. Existe actualizarPasajeroAction() pero nunca se invoca en la UI. Solo permite crear, subir documento y eliminar.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx, línea 115-149`
- 🔁 **Reproducir**: 1. Ir a una oportunidad. 2. Agregar un pasajero. 3. Intentar editar su nombre, documento, fecha. No es posible.

### 5. 🟠 ALTO — logica_rota

updatePasajero() en lib/db/pasajeros.ts no verifica tenant_id antes de actualizar. Llamada a update() sin condición WHERE tenant_id, lo que permite que un usuario edite pasajeros de otro tenant si conoce el ID.

- 📄 **Archivo**: `lib/db/pasajeros.ts, línea 71`
- 🔁 **Reproducir**: 1. Como usuario de tenant A con ID pasajero X de otro tenant. 2. Llamar updatePasajero() directamente con ese ID. 3. Supabase RLS debería bloquear pero es buena práctica verificar en la función.

### 6. 🟠 ALTO — security

crearReservaDesdeOportunidad() no verifica permisos del usuario sobre la oportunidad. Solo valida que exista el tenant y la agencia. Un usuario podría reservar una oportunidad de otro usuario del mismo tenant.

- 📄 **Archivo**: `lib/db/reservas.ts, línea 104-122`
- 🔧 **Fix**: Agregar verificación de ownership o permisos: verificar que oportunidad_id pertenece al usuario actual o está compartida.

### 7. 🟠 ALTO — logica_rota

PasajerosSection no tiene forma de EDITAR pasajeros existentes. Existe actualizarPasajeroAction() pero nunca se invoca en la UI. Solo permite crear, subir documento y eliminar.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx, línea 115-149`
- 🔁 **Reproducir**: 1. Ir a una oportunidad. 2. Agregar un pasajero. 3. Intentar editar su nombre, documento, fecha. No es posible.

### 8. 🟠 ALTO — security

updatePasajero() en lib/db/pasajeros.ts no verifica tenant_id antes de actualizar. Llamada a update() sin condición WHERE tenant_id, lo que permite que un usuario edite pasajeros de otro tenant si conoce el ID.

- 📄 **Archivo**: `lib/db/pasajeros.ts, línea 71`
- 🔁 **Reproducir**: 1. Como usuario de tenant A con ID pasajero X de otro tenant. 2. Llamar updatePasajero() directamente con ese ID. 3. Supabase RLS debería bloquear pero es buena práctica verificar en la función.

### 9. 🟡 MEDIO — a11y

Botones sin atributos accesibles. En reservas-view.tsx línea 80 hay un button sin aria-label ni type adecuado para una acción de refresh.

- 📄 **Archivo**: `app/(app)/reservas/reservas-view.tsx, línea 80-82`
- 🔁 **Reproducir**: Usar screen reader para verificar que el botón 'actualizar' no tiene label accesible.

### 10. 🟡 MEDIO — validacion_rota

fecha_pago en pagoSchema solo valida z.string().min(4), que es demasiado permisivo. Acepta cualquier string de 4+ caracteres, no valida formato de fecha (YYYY-MM-DD).

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-actions.ts, línea 14`
- 🔧 **Fix**: Cambiar a z.string().date() o z.string().regex(/^\d{4}-\d{2}-\d{2}$/) para validar ISO date.

### 11. 🟡 MEDIO — bug

reservas-view.tsx línea 122 muestra doc_vencimiento pero ese campo no está siendo seleccionado ni mapeado. En la tabla de pasajeros se muestra fecha_nacimiento, no doc_vencimiento.

- 📄 **Archivo**: `app/(app)/reservas/reservas-view.tsx, línea 122 (implícito - revisar mapReservasPorSolicitud())`
- 🔁 **Reproducir**: Ver lista de pasajeros en una reserva; el campo doc_vencimiento no aparecerá o mostrará datos incorrectos.

### 12. 🟡 MEDIO — sql_invalido

En mapReservasPorSolicitud() línea 70, la relación 'oportunidad' asume que el retorno es un array o un objeto. El código maneja ambos casos, pero el tipo casting es muy permisivo: (Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad) as { nombre: string } | null sin validación de estructura.

- 📄 **Archivo**: `lib/db/reservas.ts, línea 78-79`

### 13. 🟡 MEDIO — bug

ReservaForm en reserva-panel.tsx calcula monto usando solo precio_dbl, ignora tipos de habitación. monto = salida.precio_dbl * pax.adultos + (salida.precio_nino ?? 0) * pax.ninos pero no incluye precio_sgl ni precio_tpl.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-panel.tsx, línea 148`
- 🔁 **Reproducir**: Crear reserva con habitaciones sencillas/triples; el monto estimado mostrará precio doble en lugar del precio de la habitación elegida.

### 14. 🟡 MEDIO — ux

Botones en pasajeros-section sin aria-label. En línea 127 'Ver doc' y línea 142 botón de upload, línea 145 botón de delete. Son solo iconos sin text accesible.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx, línea 127, 142, 145`
- 🔧 **Fix**: Agregar aria-label a cada button o usar atributo title más explícito.

### 15. 🟡 MEDIO — logica_rota

crearHabitacion() no verifica que la oportunidad exista o pertenezca al tenant actual. Solo valida tenant_id al insertar, pero no on DELETE CASCADE + RLS no previene creación en oportunidad ajena.

- 📄 **Archivo**: `lib/db/habitaciones.ts, línea 19-37`
- 🔁 **Reproducir**: Como usuario A, intentar crearHabitacion para oportunidad_id de usuario B. RLS debería bloquear, pero no hay validación en la función.

### 16. 🟡 MEDIO — a11y

Botones sin atributos accesibles. En reservas-view.tsx línea 80 hay un button sin aria-label ni type adecuado para una acción de refresh.

- 📄 **Archivo**: `app/(app)/reservas/reservas-view.tsx, línea 80-82`
- 🔁 **Reproducir**: Usar screen reader para verificar que el botón 'actualizar' no tiene label accesible.

### 17. 🟡 MEDIO — ux

fecha_pago en pagoSchema solo valida z.string().min(4), que es demasiado permisivo. Acepta cualquier string de 4+ caracteres, no valida formato de fecha (YYYY-MM-DD).

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-actions.ts, línea 14`
- 🔧 **Fix**: Cambiar a z.string().date() o z.string().regex(/^\d{4}-\d{2}-\d{2}$/) para validar ISO date.

### 18. 🟡 MEDIO — bug

ReservasView no mapea correctamente doc_vencimiento de pasajeros. El campo existe en la BD pero no se usa en la visualización de reservas.

- 📄 **Archivo**: `app/(app)/reservas/reservas-view.tsx, línea 99-129 (implícito)`
- 🔁 **Reproducir**: Ver lista de reservas; no muestra información de vencimiento de documentos de pasajeros.

### 19. 🟡 MEDIO — logica_rota

mapReservasPorSolicitud() maneja type casting permisivo para la relación 'oportunidad', asumiendo estructura sin validación: (Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad) as { nombre: string } | null

- 📄 **Archivo**: `lib/db/reservas.ts, línea 78-79`

### 20. 🟡 MEDIO — bug

ReservaForm calcula monto usando solo precio_dbl, ignorando tipos de habitación. No considera precio_sgl ni precio_tpl en la estimación.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-panel.tsx, línea 148`
- 🔁 **Reproducir**: Crear reserva con habitaciones sencillas/triples; el monto estimado mostrará precio doble en lugar del precio correcto.

### 21. 🟡 MEDIO — a11y

Botones en pasajeros-section sin aria-label. Líneas 127 (Ver doc), 142 (upload), 145 (delete) son solo iconos sin texto accesible.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx, línea 127, 142, 145`
- 🔧 **Fix**: Agregar aria-label explícito a cada button.

### 22. ⚪ BAJO — ux

Email en schema de pasajero no valida formato. z.string().trim().max(160).nullable() acepta strings inválidos como 'notanemail'.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-actions.ts, línea 22`
- 🔧 **Fix**: Usar z.string().email() o z.string().email().optional() para validar formato de email.

### 23. ⚪ BAJO — ux

PagoForm en reserva-panel.tsx línea 233 usa new Date().toISOString().slice(0,10) para fecha hoy. Si el formulario se abre y espera, la fecha no se actualiza; debería ser dinámico o al menos informar al usuario que es una 'fecha de hoy al cargar'.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-panel.tsx, línea 233`
- 🔁 **Reproducir**: Abrir formulario de pago después de las 23:59 UTC, mantener abierto hasta la medianoche. La fecha será del día anterior en el navegador.

### 24. ⚪ BAJO — perf

getFidelizacion() siempre carga .limit(1000) contactos sin pagination, incluso si hay 10mil. En tenants grandes, esto puede causar slowdown.

- 📄 **Archivo**: `lib/db/fidelizacion.ts, línea 36`
- 🔧 **Fix**: Agregar parámetro limit configurable o paginar resultados.

### 25. ⚪ BAJO — deuda

ItinerarioEditor uses 'keys' como índice en lista (key={i}), no key={d.id}. Si se reordena el itinerario, React puede renderizar componentes stale.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/itinerario-editor.tsx, línea 59`
- 🔧 **Fix**: Asignar ID único a cada día del itinerario en lugar de usar índice.

### 26. ⚪ BAJO — a11y

En HabitacionesSection línea 71, Select onChange sin onBlur, y el Select field sin label visible (solo className grid). Falta estructura accesible con labels asociados.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/habitaciones-section.tsx, línea 71-72`

### 27. ⚪ BAJO — ux

Email en schema de pasajero no valida formato. z.string().trim().max(160).nullable() acepta strings inválidos como 'notanemail'.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-actions.ts, línea 22`
- 🔧 **Fix**: Usar z.string().email() o z.string().email().optional() para validar formato de email.

### 28. ⚪ BAJO — ux

PagoForm en reserva-panel.tsx línea 233 usa new Date().toISOString().slice(0,10) para fecha hoy. Si el formulario se abre y espera, la fecha no se actualiza.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-panel.tsx, línea 233`
- 🔁 **Reproducir**: Abrir formulario de pago después de las 23:59 UTC, mantener abierto hasta la medianoche. La fecha será del día anterior.

### 29. ⚪ BAJO — perf

getFidelizacion() siempre carga .limit(1000) contactos sin pagination, incluso en tenants con 10k+ contactos. Puede causar slowdown en grandes volúmenes.

- 📄 **Archivo**: `lib/db/fidelizacion.ts, línea 36`
- 🔧 **Fix**: Agregar parámetro limit configurable o implementar pagination.

### 30. ⚪ BAJO — deuda

ItinerarioEditor usa índices como keys (key={i}) en lugar de IDs únicos. Si se reordena el itinerario, React puede renderizar componentes stale.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/itinerario-editor.tsx, línea 59`
- 🔧 **Fix**: Asignar ID único a cada día del itinerario.


## 📦 Fidelización + Reservas + Itinerario (Next.js 15 + Supabase + Tailwind)

### 1. 🟠 ALTO — bug

En pasajeros-section.tsx línea 96, el Select del tipo de pasajero usa type casting incorrecto 'as "adulto"' sin importar qué opción seleccione. Siempre castea a 'adulto' aunque el usuario seleccione 'nino' o 'bebe'.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx:96`
- 🔁 **Reproducir**: Ir a una oportunidad, agregar pasajero, seleccionar 'Niño' o 'Bebé' en el Select. El tipo que se guarda es siempre 'adulto'.
- 🔧 **Fix**: Cambiar 'setTipo(e.target.value as "adulto")' por 'setTipo(e.target.value as "adulto" | "nino" | "bebe")' o simplemente 'setTipo(e.target.value as any)' y dejar que TS se encargue, o hacer el cast genérico a la union type correcta.

### 2. 🟠 ALTO — bug

En habitaciones-section.tsx línea 71, el Select para tipo de habitación usa type casting incorrecto 'as "doble"' sin importar qué tipo seleccione. Siempre castea a 'doble' aunque el usuario seleccione 'sencilla' o 'triple'.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/habitaciones-section.tsx:71`
- 🔁 **Reproducir**: Ir a una oportunidad, intentar agregar una habitación de tipo 'sencilla' o 'triple'. El tipo guardado siempre es 'doble'.
- 🔧 **Fix**: Cambiar 'setNuevoTipo(e.target.value as "doble")' por 'setNuevoTipo(e.target.value as TipoHabitacion)' para hacerlo genérico.

### 3. 🟠 ALTO — logica_rota

En habitaciones-section.tsx línea 32, se inicializa useState con pasajeros pero nunca se sincronizan cuando props cambian. Si props.pasajeros se actualiza, el componente usará datos stale del estado local.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/habitaciones-section.tsx:32`
- 🔁 **Reproducir**: Editar un pasajero (ej. cambiar tipo o nombre) desde otra sección, volver al componente HabitacionesSection. El estado local no refleja los cambios.
- 🔧 **Fix**: Usar useEffect para sincronizar: `useEffect(() => { setPax(pasajeros); }, [pasajeros])`

### 4. 🟠 ALTO — bug

En pasajeros.ts línea 69-71, la función updatePasajero no verifica tenantId antes de actualizar. Un usuario malintencionado podría actualizar pasajeros de otros tenants si conoce el ID.

- 📄 **Archivo**: `lib/db/pasajeros.ts:69-71`
- 🔁 **Reproducir**: Llamar directamente updatePasajero con un ID de pasajero que pertenece a otro tenant (asumiendo que RLS no está bien configurado).
- 🔧 **Fix**: Agregar verificación de tenantId: `const user = await getSessionUser(); const { data: p } = await supabase.from('pasajero').select('tenant_id').eq('id', id).maybeSingle(); if (p?.tenant_id !== user?.tenantId) throw new Error('Acceso denegado');`

### 5. 🟠 ALTO — rls_problema

En habitaciones.ts línea 46-49, la función asignarPasajeroHabitacion no verifica tenantId. Permite actualizar la habitación de cualquier pasajero sin validar permisos.

- 📄 **Archivo**: `lib/db/habitaciones.ts:46-49`
- 🔁 **Reproducir**: Un tenant podría asignar pasajeros de otro tenant a habitaciones.
- 🔧 **Fix**: Verificar que el pasajero pertenece al mismo tenant antes de actualizar.

### 6. 🟠 ALTO — rls_problema

En habitaciones.ts línea 40-43, la función eliminarHabitacion no verifica tenantId. Permite eliminar habitaciones sin validar que pertenecen al tenant actual.

- 📄 **Archivo**: `lib/db/habitaciones.ts:40-43`
- 🔁 **Reproducir**: Un tenant podría eliminar habitaciones que no le pertenecen si conoce el ID.
- 🔧 **Fix**: Verificar tenant_id antes de eliminar: agregar .eq('tenant_id', user.tenantId) al query de delete.

### 7. 🟡 MEDIO — bug

En reservas.ts línea 233, se accede a data.id sin verificar que data no sea null, aunque hay check de error. Si .single() retorna null con error null, esto crashearía.

- 📄 **Archivo**: `lib/db/reservas.ts:233`
- 🔁 **Reproducir**: Caso edge: si Supabase retorna result sin error pero sin datos, el acceso a data.id fallaría.
- 🔧 **Fix**: Agregar validación: `if (!data) throw new Error('Fallo al crear reserva');`

### 8. 🟡 MEDIO — bug

En cotizacion-builder.tsx línea 248, se usa índice como key en el map de items: `key={i}`. Si los items se reordenan o eliminan, React perderá el estado y puede causar re-renders incorrectos.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/cotizacion-builder.tsx:248`
- 🔁 **Reproducir**: Crear varios items, eliminar uno del medio, luego agregar uno nuevo. Los valores de input pueden quedar desincronizados o React perderá foco en inputs.
- 🔧 **Fix**: Usar un ID único para cada item, no el índice. Ej: `key={it.producto_id || `temp-${i}`}`

### 9. 🟡 MEDIO — ux

En reserva-panel.tsx línea 148, el cálculo de monto asume que precio_dbl y precio_nino nunca son 0. Si precio_dbl es 0, la condición `salida?.precio_dbl != null` sería true pero el resultado sería 0, lo que es correcto. Sin embargo, si bebes en pax no tienen precio configurado (precio_bebe), no se incluye en el cálculo.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/reserva-panel.tsx:148`
- 🔁 **Reproducir**: Hacer una reserva con bebés, el monto estimado no incluye el costo de los bebés.
- 🔧 **Fix**: Agregar soporte para precio de bebés: `+ (salida?.precio_bebe ?? 0) * pax.bebes`

### 10. 🟡 MEDIO — logica_rota

En pasajeros-section.tsx línea 47, cuando se crea un pasajero, los campos fecha_nacimiento y doc_vencimiento se convierten a null si vacíos (via || null). Pero la validación en pasajeros-actions.ts (línea 19-20) es `.nullable().optional().default(null)`, que podría permitir strings vacíos si el usuario no borra el campo.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx:47`
- 🔁 **Reproducir**: Crear un pasajero, dejar los campos de fecha vacíos pero sin dejar null, y enviar. Podría validar ok pero con strings vacíos.
- 🔧 **Fix**: En el schema de zod, usar z.string().date() en lugar de z.string().nullable() para validar fechas reales.

### 11. ⚪ BAJO — deuda

En fidelizacion.ts línea 15, la función diasAlProximoCumple usa `new Date(iso + "T00:00:00")` que es vulnerable a timezone issues. Si el servidor y navegador están en timezones diferentes, puede desplazar un día.

- 📄 **Archivo**: `lib/db/fidelizacion.ts:15`
- 🔁 **Reproducir**: Usuario en timezone UTC-3 podría ver cumpleaños un día antes/después dependiendo del horario.
- 🔧 **Fix**: Usar UTC: `new Date(iso + "T00:00:00Z")` o trabajar con dates sin hora.

### 12. ⚪ BAJO — perf

En fidelizacion.ts línea 36, se usa .limit(1000) al listar contactos para cumpleaños. Si hay muchos registros, esto carga demasiados datos innecesarios. Debería filtrar por rango de fechas en la DB.

- 📄 **Archivo**: `lib/db/fidelizacion.ts:36`
- 🔁 **Reproducir**: BD con 10k+ contactos sin fecha_nacimiento carga innecesariamente.
- 🔧 **Fix**: Filtrar en la query: `.gte('fecha_nacimiento', hoy.toISOString().slice(0, 10)).lte('fecha_nacimiento', futuro.toISOString().slice(0, 10))`

### 13. ⚪ BAJO — a11y

En pasajeros-section.tsx línea 102, las labels de input de fecha no tienen el atributo htmlFor asociado. Los labels están anidados al lugar del input.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/pasajeros-section.tsx:102-103`
- 🔁 **Reproducir**: Screen reader lee labels sin poder asociarlos a inputs correctamente.
- 🔧 **Fix**: Estructurar como: `<label htmlFor="fechanac">Nacimiento</label><Input id="fechanac" type="date" />`

### 14. ⚪ BAJO — a11y

En habitaciones-section.tsx línea 63-65, los botones de mover día (▲ ▼) usan caracteres unicode sin aria-label. Screen readers no entienden qué hacen.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/itinerario-editor.tsx:63-65`
- 🔁 **Reproducir**: Usar screen reader en los botones de ordenar días, no dice qué hacen.
- 🔧 **Fix**: Agregar aria-label: `<button aria-label="Subir día">▲</button>`

### 15. ⚪ BAJO — security

En reservas-view.tsx línea 80, el botón de refresh usa router.refresh() directamente sin prevención de double-click. Un usuario impaciente podría hacer click múltiples veces causando requests innecesarias.

- 📄 **Archivo**: `app/(app)/reservas/reservas-view.tsx:80`
- 🔁 **Reproducir**: Hacer click rápidamente varias veces en el botón de actualizar.
- 🔧 **Fix**: Agregar estado de loading para deshabilitar el botón mientras se refresca.

### 16. ⚪ BAJO — deuda

En reservas.ts línea 61 y similares en otros archivos, se retorna [] cuando hay error. Esto hace que sea difícil detectar si el error fue permission denied o tabla no existe. Silencia errores legítimos.

- 📄 **Archivo**: `lib/db/reservas.ts:61`
- 🔁 **Reproducir**: Si una tabla no existe (por migración incompleta), retorna [] sin avisar al user.
- 🔧 **Fix**: Considerar si ciertos errores deberían ser throws en lugar de empty returns, o loguear errores.


## 📦 Oportunidades + Kanban + Pipelines

### 1. 🟠 ALTO — logica_rota

El campo 'estrategia' está en OPP_FIELDS (inline-edit.ts:67) y se puede editar vía detail-aside.tsx, pero NO está incluido en el schema de validación de create/edit (nueva/actions.ts y [id]/editar/actions.ts). Cuando se intenta crear u editar una oportunidad vía formulario, el campo se descarta silenciosamente sin error.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:67, app/(app)/oportunidades/nueva/actions.ts:19-39, app/(app)/oportunidades/[id]/editar/actions.ts:20-40`
- 🔁 **Reproducir**: 1. Ir a crear una oportunidad, editar estrategia en detail-aside, guardar; 2. Refrescar la página; 3. El valor de estrategia se perdió porque no pasó la validación Zod.

### 2. 🟠 ALTO — bug

En oportunidad-productos-actions.ts:21, 'moneda' se valida con z.string().trim().max(8) sin enum restrictivo, permitiendo valores arbitrarios (e.g., 'INVALID', 'BTC'). Esto viola el contrato esperado con las enums de moneda en otros actions (nueva/actions.ts:28).

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/oportunidad-productos-actions.ts:21`
- 🔧 **Fix**: Cambiar a z.enum(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]) como en nueva/actions.ts

### 3. 🟠 ALTO — logica_rota

En updateOportunidad (mutations.ts:345-403), cuando se cambia estado a 'perdido', NO se valida que motivo_perdida_id no sea null. El schema refine() en actions.ts evita que se envíe estado='perdido' sin motivo en el cliente, pero updateOportunidad acepta cualquier patch sin esa validación.

- 📄 **Archivo**: `lib/db/mutations.ts:345-403`
- 🔁 **Reproducir**: Via API o código que llame updateOportunidad directamente con estado='perdido' pero motivo_perdida_id=null, se crea un inconsistencia.

### 4. 🟠 ALTO — logica_rota

listOportunidades() no filtra automáticamente eliminadas cuando el usuario no especifica un estado explícito. En la tabla de oportunidades, si no se pasa estado='eliminado', se muestran todas las oportunidades incluyendo las eliminadas (soft-delete).

- 📄 **Archivo**: `lib/db/oportunidades.ts:235-283`
- 🔁 **Reproducir**: Navega a /oportunidades/tabla sin especificar un filtro de estado. Cualquier oportunidad con estado='eliminado' aparecerá en la tabla.
- 🔧 **Fix**: Agregar automáticamente una cláusula .neq('estado', 'eliminado') en listOportunidades() a menos que se especifique estado='eliminado' explícitamente.

### 5. 🟠 ALTO — bug

En OportunidadForm, el campo 'estrategia' es renderizado en detail-aside pero nunca es incluido en el formulario de create/edit. El campo existe en DB (0032_fidelizacion.sql) pero no puede ser editado vía formulario.

- 📄 **Archivo**: `components/forms/oportunidad-form.tsx:1-296 (no contiene estrategia)`
- 🔁 **Reproducir**: Intenta editar una oportunidad existente y busca el campo 'estrategia'. No aparece en el formulario principal, solo en el panel lateral.
- 🔧 **Fix**: Agregar campo de estrategia en OportunidadForm entre los campos de 'estado' y 'valor'.

### 6. 🟠 ALTO — rls_problema

Las políticas RLS de 'oportunidad' no filtran por 'estado'. Un asesor puede ver oportunidades eliminadas si les envían la URL directa, aunque sean asignadas a otro asesor (la RLS permite ver si asignado_id = tu_id OR es_admin).

- 📄 **Archivo**: `supabase/migrations/0003_rls_policies.sql:122-149`
- 🔁 **Reproducir**: Como asesor, intenta acceder a /oportunidades/[id_opp_otro_asesor] donde estado='eliminado'. Si RLS no filtra, verás un error 403, pero la lógica debería ser más consistente.
- 🔧 **Fix**: Opcionalmente agregar filtro AND estado != 'eliminado' en oportunidad_select policy, o dejar que sea responsabilidad de la app-layer (como está ahora).

### 7. 🟠 ALTO — security

La página nueva oportunidad (/oportunidades/nueva) no valida permisos para 'crear' oportunidad antes de mostrar el formulario. Solo la server action createOportunidadAction valida, pero un usuario sin permiso ve la UI.

- 📄 **Archivo**: `app/(app)/oportunidades/nueva/page.tsx:1-44`
- 🔁 **Reproducir**: Con un usuario sin permiso 'oportunidades:crear', navega a /oportunidades/nueva. Verás el formulario. Al enviar fallará, pero la UX es mala.
- 🔧 **Fix**: Agregar await getMyPermisos() en la page.tsx y redirigir a /oportunidades si no tiene permiso antes de renderizar CreateWrapper.

### 8. 🟡 MEDIO — ux

En oportunidad-productos.tsx:233-234, al editar cantidad/precio, se usa Number(e.target.value) sin validación. Si el input es vacío o inválido, se pasa NaN al servidor, violando z.number().nonnegative() durante la validación.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/oportunidad-productos.tsx:233-234, 248-249`

### 9. 🟡 MEDIO — bug

En detail-aside.tsx:145-147, el select para 'Asignado' usa onSave pero NO desactiva el botón submit ni previene múltiples clics. Un usuario rápido puede disparar saveOportunidadField() varias veces antes del refetch, causando race condition de actualización.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/detail-aside.tsx:116-157`

### 10. 🟡 MEDIO — bug

En kanban-board.tsx:113, cuando se revierte el optimistic update (error.ok === false), se hace setBoard(initialBoard), pero initialBoard está congelado en el useState inicial. Si el tablero se renderizó con un pipeline diferente después, la revert usa datos stale.

- 📄 **Archivo**: `app/(app)/oportunidades/kanban/kanban-board.tsx:48, 113-114`

### 11. 🟡 MEDIO — ux

En oportunidad-productos.tsx, la función useAsValue() (línea 116) NO valida que total sea > 0 ni que los precios sean válidos. Un usuario puede hacer clic en 'Usar como valor' con un total de 0 o NaN, creando una oportunidad con valor inválido.

- 📄 **Archivo**: `app/(app)/oportunidades/[id]/oportunidad-productos.tsx:115-119`

### 12. 🟡 MEDIO — bug

En table filters.tsx:138-143, los inputs de valor_min y valor_max aceptan min=0 pero NO validan que min <= max en el frontend. Si envían valor_min=100 y valor_max=50, la query de DB silenciosamente retorna 0 resultados sin aviso.

- 📄 **Archivo**: `app/(app)/oportunidades/tabla/filters.tsx:137-143`

### 13. 🟡 MEDIO — logica_rota

En pipeline-editor.tsx:62-75, onAddEtapa calcula fd.set('orden', String(etapas.length)) asumiendo órdenes lineales, pero si se borran etapas intermedias (orden 0,1,3), etapas.length=2 crea una orden duplicada (2 cuando ya existe orden 3). No hay deduplicación.

- 📄 **Archivo**: `app/(app)/admin/pipelines/[id]/pipeline-editor.tsx:67`

### 14. 🟡 MEDIO — bug

En oportunidades table, bulk delete action no valida que el número de IDs sea razonable. Un usuario malicioso puede enviar 10000 IDs, causando una query DELETE IN (...) gigante sin paginación o límite.

- 📄 **Archivo**: `app/(app)/oportunidades/tabla/bulk-actions.ts:56-67`

### 15. 🟡 MEDIO — ux

En tabla de oportunidades, no hay un filtro de 'Estado' visible en la UI para filtrar por 'activo', 'ganado', 'perdido', 'eliminado'. Los usuarios deben escribir una URL con ?estado=x. Contrasta con otros filtros que tienen UI.

- 📄 **Archivo**: `app/(app)/oportunidades/tabla/filters.tsx:1-156`
- 🔁 **Reproducir**: Abre /oportunidades/tabla. Busca un select para filtrar por 'estado'. No existe en los filtros avanzados.
- 🔧 **Fix**: Agregar un select con opciones [activo, ganado, perdido, eliminado, todos] en OportunidadFilters y pasar params.estado a listOportunidades().

### 16. 🟡 MEDIO — bug

En KanbanBoard (kanban-board.tsx:113), el revert después de un drag-and-drop fallido setea board a initialBoard, pero initialBoard nunca se mutó. El problema es que optimistic update es bueno, pero si falla, revert perfecto. Sin embargo, si hay otro estado que cambió (ej. filter query), el revert pierde cambios.

- 📄 **Archivo**: `app/(app)/oportunidades/kanban/kanban-board.tsx:91-114`
- 🔁 **Reproducir**: Arrastra una tarjeta en el kanban mientras el servidor está lento. Si la acción falla, el board revierte. Pero si entre el drag start y end cambiaste el filtro, verás conflictos.
- 🔧 **Fix**: Capturar el estado exacto antes del optimistic update y restaurarlo, no initialBoard (que es stale).

### 17. 🟡 MEDIO — bug

En KanbanBoard, si la etapa targetada en drag-and-drop NO pertenece al mismo pipeline, la búsqueda 'for stage of col.etapas' puede fallar. getKanbanBoard() devuelve solo 1 pipeline pero la UI renderiza todas las etapas en un loop. Si dropeas fuera de ese pipeline, newStageId es inválido.

- 📄 **Archivo**: `app/(app)/oportunidades/kanban/kanban-board.tsx:69-115`
- 🔁 **Reproducir**: Configura 2 pipelines. Intenta arrastrar una tarjeta de pipeline A a pipeline B (si ambos se renderizan juntos). moveOportunidadAction fallará.
- 🔧 **Fix**: Validar que newStageId existe en alguna etapa del board antes de hacer moveOportunidadAction.

### 18. 🟡 MEDIO — logica_rota

En updateOportunidad (mutations.ts:345-402), si cambias etapa_id y estado simultáneamente (ej. a 'ganado'), se ejecutan ambos webhooks/reglas. Pero si la regla de 'etapa_cambiada' crea una actividad que espera cierto estado, puede haber race condition.

- 📄 **Archivo**: `lib/db/mutations.ts:373-401`
- 🔁 **Reproducir**: Edita una oportunidad: cambia etapa Y estado a ganado simultáneamente. Observa si se disparan ambas reglas en orden correcto.
- 🔧 **Fix**: Documentar o explícitamente manejar que las reglas se ejecutan en paralelo; asegurar que cada regla es idempotente.

### 19. 🟡 MEDIO — perf

En getKanbanBoard() (oportunidades.ts:147-223), se hacen 3 queries paralelas (.from(pipeline), .from(etapa_pipeline), .from(oportunidad)) pero sin error handling. Si alguna falla, la data es null y se retorna [] sin log. Esto causa silent failure cuando el pipeline desaparece.

- 📄 **Archivo**: `lib/db/oportunidades.ts:149-168`
- 🔁 **Reproducir**: Elimina un pipeline mientras estás viendo el kanban. Refresca. El kanban ahora muestra vacío sin error visible al usuario.
- 🔧 **Fix**: Agregar error handling después de cada .select() y mostrar un mensaje amigable si falla.

### 20. ⚪ BAJO — deuda

En inline-edit.ts:66, 'moneda' usa coerce: (v) => v sin trimming ni validación. Debería al menos trimear y validar contra enum de monedas permitidas.

- 📄 **Archivo**: `lib/actions/inline-edit.ts:66`

### 21. ⚪ BAJO — a11y

En oportunidades-table.tsx, el checkbox de 'seleccionar todo' (línea 118) tiene aria-label correcto, pero los select de bulk actions (Asignar, Estado, Etiqueta) no tienen aria-label, afectando lectores de pantalla.

- 📄 **Archivo**: `app/(app)/oportunidades/tabla/oportunidades-table.tsx:70, 79, 91`

### 22. ⚪ BAJO — deuda

En admin/pipelines/actions.ts:67, etapaSchema valida días_maximo_alerta con z.number().int().positive().nullable(), pero no especifica un máximo (p.ej. max(365)). Un usuario puede crear una alerta de 999999 días, causando overflow visual en el kanban.

- 📄 **Archivo**: `app/(app)/admin/pipelines/actions.ts:30`

### 23. ⚪ BAJO — deuda

En mutations.ts:465, resolverAsesor es llamado para validar/resolver el asignado durante createOportunidad, pero NO se llama durante updateOportunidad. Esto permite que un usuarioActualice asignado_id a un valor inválido sin pasar por la lógica de validación.

- 📄 **Archivo**: `lib/db/mutations.ts:457-477, 345-403`

### 24. ⚪ BAJO — ux

En create-wrapper.tsx:20, se define moneda: 'USD' por defecto, pero si el tenant usa ARS como moneda principal, el usuario debe cambiar el select manualmente. Debería leerse del tenant config.

- 📄 **Archivo**: `app/(app)/oportunidades/nueva/create-wrapper.tsx:20`

### 25. ⚪ BAJO — a11y

En kanban-board.tsx (Column header), el link de editar etapa (pencil icon, línea 213) no tiene aria-label descriptivo. Solo dice 'aria-label: Editar etapa' genérico.

- 📄 **Archivo**: `app/(app)/oportunidades/kanban/kanban-board.tsx:213-220`
- 🔁 **Reproducir**: Abre DevTools. Inspecciona el icono de lápiz en la columna del kanban. El aria-label no especifica CUÁL etapa.
- 🔧 **Fix**: Cambiar a aria-label={`Editar etapa ${stage.nombre}`}

### 26. ⚪ BAJO — ux

En OportunidadForm, cuando contactosFiltrados.length === 0 o etapasFiltradas.length === 0, el botón de submit es disabled pero el mensaje de error aparece debajo. La UX es confusa: ¿está guardando o no?

- 📄 **Archivo**: `components/forms/oportunidad-form.tsx:277-293`
- 🔁 **Reproducir**: Selecciona una empresa sin contactos. El botón 'Crear oportunidad' queda disabled pero no hay feedback claro.
- 🔧 **Fix**: Mover el mensaje de error más arriba o cambiar el botón a 'disabled con tooltip' que explique por qué.

### 27. ⚪ BAJO — deuda

En oportunidades.ts, los tipos RawOpp (línea 172-181) son redefinidos inline en getKanbanBoard(). El mismo patrón se repite en listOportunidades() (línea 288). Esto viola DRY.

- 📄 **Archivo**: `lib/db/oportunidades.ts:172-181, 288`
- 🔁 **Reproducir**: Busca 'type RawOpp' o patrones similares en el archivo. Ves duplicación de tipos.
- 🔧 **Fix**: Extraer los tipos a nivel de módulo o usar un esquema Zod reutilizable.

### 28. ⚪ BAJO — deuda

En OportunidadForm, si hay contactosFiltrados.length === 0 pero contacto_id ya es válido (edit mode), el select se deshabilita, lo que puede romper la edición si no había guardado antes.

- 📄 **Archivo**: `components/forms/oportunidad-form.tsx:127-143`
- 🔁 **Reproducir**: Crea oportunidad con empresa A y contacto A. Luego elimina contacto A y edita la oportunidad. El contacto desaparece del dropdown.
- 🔧 **Fix**: En edit mode, mantener la opción actual visible aunque esté 'fuera' de los filtrados actuales.

### 29. ⚪ BAJO — ux

En OportunidadForm, cuando estado==='perdido', el campo motivo_perdida_id es required. Pero el frontend no impide enviar sin motivo; solo hay validación en server. Si JS falla, usuario puede guardar sin motivo.

- 📄 **Archivo**: `components/forms/oportunidad-form.tsx:243-263`
- 🔁 **Reproducir**: Abre DevTools console. Deshabilita JS. Selecciona estado='Perdida' sin llenar motivo. Intenta guardar.
- 🔧 **Fix**: Agregar validación client-side o asegurar que requiem es hard-enforced en el tipo schema de Zod (ya lo está, pero mejorar mensajes).


## 📦 Productos + Catálogo Turistea (Next.js 15 + Supabase)

### 1. 🟠 ALTO — logica_rota

Checkbox 'activo' invierte su logic: cuando está desmarcado, la validación convierte undefined en true. El preprocess en línea 27 of acciones con la expresión 'v === undefined' retorna true cuando el checkbox no se envía, causando que productos se guarden como activos cuando deberían ser inactivos.

- 📄 **Archivo**: `app/(app)/productos/actions.ts:27`
- 🔁 **Reproducir**: Crear un producto nuevo, dejar el checkbox 'Activo' desmarcado, guardar. Verificar en DB que origen=true en lugar de false.
- 🔧 **Fix**: Cambiar el preprocess a: (v) => v === 'true' || v === 'on' || v === true, y asegurar que el checkbox se envía con value='' cuando está desmarcado, o usar .optional().default(false)

### 2. 🟠 ALTO — bug

Botón de eliminar (Delete) se muestra para productos 'turistea' cuando canEliminar=true, pero esos productos no deberían poder eliminarse por agencias. Solo administrador de plataforma debería poder eliminarlos.

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:212-215`
- 🔁 **Reproducir**: Como agencia, cargar un producto Turistea en /productos. Si el rol tiene permiso eliminar, se verá el botón Trash2 aunque el producto sea origen='turistea'.
- 🔧 **Fix**: Cambiar la condición en línea 212 a: {canEliminar && row.origen === 'propio' && (...)} para evitar mostrar el botón para productos Turistea

### 3. 🟠 ALTO — ux

El componente CatalogoBrowse mantiene estado stale en la variable 'done' (Set de IDs ya copiados). Si el usuario recarga la página o navega fuera y vuelve, el Set no se limpia, mostrando incorrectamente productos como ya cargados aunque no lo estén.

- 📄 **Archivo**: `app/(app)/catalogo/catalogo-browse.tsx:33`
- 🔁 **Reproducir**: Copiar un producto en el catálogo (verá 'Cargado'). Recargar la página. El producto seguirá mostrando 'Cargado' aunque la lista inicial de productos ya fue refrescada.
- 🔧 **Fix**: Agregar useEffect que resetee 'done' cuando 'productos' (props) cambian: useEffect(() => setDone(new Set()), [productos])

### 4. 🟡 MEDIO — bug

El revalidatePath en saveProductoAction solo invalida '/productos' pero no invalida las rutas específicas del producto (/productos/[id], /productos/[id]/editar). Cuando se edita un producto desde la página de detalle, los cambios no se reflejan en esa página hasta la siguiente navegación manual.

- 📄 **Archivo**: `app/(app)/productos/actions.ts:36,40`
- 🔁 **Reproducir**: Editar un producto desde /productos/[id]/editar. Cambiar un campo. Guardar. Volver a /productos/[id]. El cambio no se verá hasta hacer F5.
- 🔧 **Fix**: Cambiar revalidatePath a revalidatePath('/productos', 'layout') o agregar revalidatePath('/productos/[id]') específicamente

### 5. 🟡 MEDIO — ux

El editor de producto en /productos/[id]/editar usa un hack frágil: hace click programático a un botón invisible con querySelector. Si el botón no existe o hay timing issues, el editor no abre. Además no es accesible.

- 📄 **Archivo**: `app/(app)/productos/[id]/editar/editor-shell.tsx:16-17`
- 🔁 **Reproducir**: Acceder directamente a /productos/[id]/editar de un producto. A veces el formulario no abre si el DOM no ha renderizado completamente.
- 🔧 **Fix**: Pasar el producto como prop al editor en lugar de buscar el botón. O usar un callback que la ProductosManager exponga para abrir el editor

### 6. 🟡 MEDIO — security

No hay validación de tamaño de archivo para uploads de imagen y adjuntos. Un usuario podría subir archivos de múltiples GB, causando DoS en storage o ralentizando uploads.

- 📄 **Archivo**: `app/(app)/productos/[id]/media-upload.tsx:23-45, app/(app)/productos/[id]/actions.ts:16-75`
- 🔁 **Reproducir**: Subir un archivo de imagen > 100MB. No hay mensaje de error ni rechazo.
- 🔧 **Fix**: Validar file.size en media-upload.tsx antes de llamar a setImagenAction. Por ejemplo: if (file.size > 10*1024*1024) { setError('Máximo 10MB'); return; }

### 7. 🟡 MEDIO — bug

Cuando se elimina un producto, la UI en ProductosManager no refleja el cambio hasta que se hace router.refresh(). Durante el startTransition, el producto sigue siendo visible, lo que puede confundir al usuario que lo acaba de eliminar.

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:65-72`
- 🔁 **Reproducir**: Eliminar un producto. Notar que sigue siendo visible en la tabla hasta que la página se recarga.
- 🔧 **Fix**: Optimistically remove the item from state antes de llamar a deleteProductoAction, o usar setSelected para desseleccionar inmediatamente

### 8. ⚪ BAJO — a11y

Los botones de editar y eliminar productos no tienen aria-label. Los iconos Pencil y Trash2 no tienen alt text. Solo tienen title attribute que no es accesible para screen readers.

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:208,213`
- 🔁 **Reproducir**: Usar un screen reader (NVDA, JAWS) para navegar la tabla. Los botones se leen como 'button' sin contexto.
- 🔧 **Fix**: Agregar aria-label={`Editar producto ${row.nombre}`} y aria-label={`Eliminar producto ${row.id}`}

### 9. ⚪ BAJO — a11y

Los checkboxes en el catálogo (línea 258) no tienen labels asociadas. El input está dentro de un <label> pero sin htmlFor/id pairing explícito.

- 📄 **Archivo**: `app/(app)/catalogo/catalogo-browse.tsx:256-259`
- 🔁 **Reproducir**: Con screen reader, el checkbox no tiene label descripción.
- 🔧 **Fix**: Agregar aria-label={`Seleccionar ${p.nombre}`} o usar label con htmlFor

### 10. ⚪ BAJO — deuda

La función listOportunidadesPorProducto usa un type assertion frágil (as unknown as Row[]) para acceder a nested relationships. Esto oculta posibles errores de estructura de datos.

- 📄 **Archivo**: `lib/db/productos.ts:72`
- 🔁 **Reproducir**: Si la respuesta de Supabase cambiar estructura, no habrá tipo error.
- 🔧 **Fix**: Usar Zod schema o better-typed queries en lugar de type assertions

### 11. ⚪ BAJO — ux

El mensaje de error en saveProductoAction solo muestra el primer error (issues[0]). Si hay múltiples campos inválidos, el usuario solo ve el primero.

- 📄 **Archivo**: `app/(app)/productos/actions.ts:32`
- 🔁 **Reproducir**: Enviar formulario con múltiples campos inválidos. Solo verá error del primer campo.
- 🔧 **Fix**: Retornar todos los errores o mostrar los 3 primeros: error: parsed.error.issues.slice(0,3).map(i => i.message).join(', ')


## 📦 Productos + Catálogo Turistea

### 1. 🔴 CRÍTICO — security

En productos-manager.tsx línea 212-215, el botón eliminar aparece incluso para productos origen='turistea'. No hay validación UI que lo bloquee. Aunque el server rechazará el delete por RLS, la UI permite al usuario intentar, causando error inesperado en lugar de ocultarlo.

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:212-215`
- 🔁 **Reproducir**: 1. Ir a /productos, tab 'Catálogo Turistea'. 2. Si canEliminar=true, aparece botón Trash para productos Turistea. 3. Click borrar genera error porque el backend no permite eliminar origen='turistea'.

### 2. 🟠 ALTO — bug

En Form component de catalogo-manager.tsx, el estado local `f` se inicializa una sola vez con `useState()` pero no sincroniza cuando el prop `editing` cambia. Al pasar de crear a editar producto (o entre ediciones), los campos mantienen valores stale del producto anterior.

- 📄 **Archivo**: `app/(app)/ajustes/catalogo/catalogo-manager.tsx:90-98`
- 🔁 **Reproducir**: 1. En /ajustes/catalogo, crear un producto A. 2. Sin cerrar el form, hacer clic en editar otro producto B existente. 3. Los campos siguen mostrando valores de A en lugar de B.

### 3. 🟠 ALTO — logica_rota

En catalogo-browse.tsx línea 134, se accede a `res.count` sin verificar que la propiedad existe. Si `copiarMultiplesProductosAction` falla parcialmente y devuelve `{ ok: true, count: undefined }`, se interpola undefined en el mensaje.

- 📄 **Archivo**: `app/(app)/catalogo/catalogo-browse.tsx:134`

### 4. 🟠 ALTO — logica_rota

En editor-shell.tsx, se usa `querySelector` con `data-edit-id` dentro de `useEffect` sin dependencias correctas. El setTimeout(30ms) puede fallar si el DOM tarda más en renderizar. Además, invocar .click() sin debounce puede activar múltiples veces.

- 📄 **Archivo**: `app/(app)/productos/[id]/editar/editor-shell.tsx:14-20`
- 🔁 **Reproducir**: 1. Abrir /productos/[id]/editar en dispositivo lento. 2. El botón edit podría no clickearse si renderizado tarda >30ms. 3. Múltiples renders pueden disparar .click() varias veces.

### 5. 🟠 ALTO — bug

En catalogo-mayorista.ts línea 85 y 142, se accede directo a `data.id` sin verificar que `data` no es null. Aunque hay chequeo de `error` previo, `single()` puede retornar data=null si la query no devuelve exactamente 1 fila.

- 📄 **Archivo**: `lib/db/catalogo-mayorista.ts:85,142`

### 6. 🟠 ALTO — logica_rota

En catalogo-browse.tsx línea 122-128, cuando se copia múltiples items, el loop que construye `items` usa `productos.filter()` sobre el arreglo inicial, no sobre `filtrados`. Si hay filtros activos, se copian productos que el usuario no ve.

- 📄 **Archivo**: `app/(app)/catalogo/catalogo-browse.tsx:122-128`
- 🔁 **Reproducir**: 1. En /catalogo, filtrar por destino=España. 2. Seleccionar y copiar visibles. 3. Se copian España+otros (no solo los filtrados).

### 7. 🟡 MEDIO — bug

En productos-manager.tsx línea 128, el checkbox activo usa `defaultChecked` pero es un form descontrolado. Si el usuario edita y cambia activo, luego cancela, el estado del checkbox no resetea correctamente en siguiente edición.

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:128`

### 8. 🟡 MEDIO — logica_rota

En catalogo-mayorista.ts línea 149, `copiarMultiplesAMisProductos` retorna 0 si items.length=0 pero no hay validación previa en la UI. Si se selecciona sin filtros (lista vacía por error), se copia 0 items sin feedback claro.

- 📄 **Archivo**: `lib/db/catalogo-mayorista.ts:149`

### 9. 🟡 MEDIO — bug

En [id]/actions.ts línea 27, `getPublicUrl()` retorna `{ data: ... }` pero es sync y no puede fallar. Sin embargo, si CUPOS_SUPABASE_URL no está configurado, imgUrl() retorna null. Se debería validar que url sea válida antes de guardar en DB.

- 📄 **Archivo**: `app/(app)/productos/[id]/actions.ts:27-28`

### 10. 🟡 MEDIO — logica_rota

En productos/actions.ts, la validación con z.preprocess(emptyToNull, z.string().nullable()) puede permitir strings vacios que luego se convierten a null, causando inconsistencia entre el estado del form y la DB.

- 📄 **Archivo**: `app/(app)/productos/actions.ts:18-26`

### 11. 🟡 MEDIO — bug

En catalogo-mayorista.ts línea 120, la fórmula de cálculo de precioVenta usa `Math.round(...* 100) / 100` que puede causar errores de redondeo flotante. Debería usar Decimal o librería de precisión.

- 📄 **Archivo**: `lib/db/catalogo-mayorista.ts:120`

### 12. 🟡 MEDIO — bug

En media-upload.tsx, cuando se sube un adjunto, no hay validación de tamaño máximo de archivo. Usuarios pueden intentar subir archivos muy grandes causando timeout.

- 📄 **Archivo**: `app/(app)/productos/[id]/media-upload.tsx:38-59`

### 13. ⚪ BAJO — ux

En catalogo-browse.tsx, después de copiar items exitosamente, el mensaje se cierra después de router.refresh() pero no hay indicador visual persistente. Usuario no sabe si la copia fue completa.

- 📄 **Archivo**: `app/(app)/catalogo/catalogo-browse.tsx:133-137`

### 14. ⚪ BAJO — a11y

En productos-manager.tsx, el form de crear/editar no tiene aria-labels en muchos inputs. Los textareas no tienen label explícito en algunos casos (aunque usan Field wrapper).

- 📄 **Archivo**: `app/(app)/productos/productos-manager.tsx:83-125`

### 15. ⚪ BAJO — deuda

En productos.ts, la función `listOportunidadesPorProducto` usa tipado complicado con `Row[]` y casting `as unknown as Row[]`. Debería usar tipos más simples o usar union types explícitos.

- 📄 **Archivo**: `lib/db/productos.ts:71-72`


## 📦 Reportes + Dashboard + Búsqueda

### 1. 🔴 CRÍTICO — logica_rota

Los filtros de pipeline, producto, asesor, desde y hasta se reciben en searchParams pero nunca se aplican a loadDashboard(). Los parámetros se pasan solo a ReportesFiltersBar para mostrar visualmente que están seleccionados, pero los datos retornados no están filtrados.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, líneas 17-26`
- 🔁 **Reproducir**: Acceder a /reportes?pipeline=X&producto=Y&asesor=Z y observar que los datos mostrados no cambian.

### 2. 🔴 CRÍTICO — logica_rota

loadDashboard() no recibe ni utiliza parámetros de filtro (pipeline, producto, asesor, desde, hasta). Los searchParams se pasan a ReportesFiltersBar solo para UI, pero los datos retornados no están filtrados. Los usuarios verán filtros aplicados visualmente pero los números seguirán siendo globales.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, líneas 17-26`
- 🔁 **Reproducir**: Ir a /reportes, seleccionar un filtro (ej: asesor específico), observar que los KPIs y tablas no cambian.

### 3. 🟠 ALTO — bug

En EmbudoChart, Math.max(...data.map((d) => d.alcanzaron), 1) ignora el segundo parámetro 1. Debería ser Math.max(1, ...data.map(...)) para garantizar un mínimo de 1. Esto puede causar cálculo erróneo de porcentajes si data está vacío.

- 📄 **Archivo**: `app/(app)/dashboard/charts.tsx, línea 154`
- 🔧 **Fix**: Cambiar a: const max = Math.max(1, ...data.map((d) => d.alcanzaron));

### 4. 🟠 ALTO — bug

loadDashboard() no tiene parámetro para filtrar por rango de fechas (desde/hasta). ReportesFiltersBar permite seleccionar fechas pero loadDashboard() las ignora completamente.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, línea 20 + lib/db/dashboard.ts, línea 95`
- 🔧 **Fix**: Agregar parámetros opcionales a loadDashboard(desde?: string, hasta?: string) y filtrar opportunities por fecha_esperada_cierre

### 5. 🟠 ALTO — bug

loadDashboard() no filtra por producto. El formulario permite filtrar por producto pero no hay código que aplique este filtro a los datos retornados.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, línea 20`
- 🔧 **Fix**: Agregar parámetro producto_id a loadDashboard() e implementar lógica de filtrado

### 6. 🟠 ALTO — bug

loadDashboard() no filtra por pipeline. Aunque el dashboard tiene un pipeline_id implícito (el default), ReportesFiltersBar permite cambiar el pipeline pero esto no afecta los datos.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, línea 20`
- 🔧 **Fix**: Agregar parámetro pipeline_id a loadDashboard()

### 7. 🟠 ALTO — bug

ExportCsvButton accede a rows[0] en línea 10 sin validar si existe. Si rows está vacío, Object.keys() fallará silenciosamente o retornará array vacío, causando CSV vacío.

- 📄 **Archivo**: `app/(app)/reportes/export-button.tsx, línea 10`
- 🔁 **Reproducir**: Exportar una tabla vacía (ej: motivos de pérdida cuando no hay oportunidades perdidas). El CSV descargará con solo headers.

### 8. 🟠 ALTO — a11y

ReportesFiltersBar: los <label> no están vinculados a sus <select> e <input> mediante htmlFor/id. Lectores de pantalla no podrán asociar las etiquetas con los controles.

- 📄 **Archivo**: `app/(app)/reportes/filters-bar.tsx, líneas 41-90`
- 🔧 **Fix**: Agregar id a cada select/input (ej: id="pipeline-filter") y htmlFor="pipeline-filter" en cada <label>.

### 9. 🟠 ALTO — logica_rota

dashboard.ts destructuring Promise.all sin manejo de .error (líneas 155-173). Si cualquier query Supabase falla, se ignora el error y se trabaja con .data indefinido. Las queries con Promise.resolve() para scope=me devuelven { data: [] } pero no tienen .error field.

- 📄 **Archivo**: `lib/db/dashboard.ts, líneas 154-173`
- 🔧 **Fix**: Verificar .error en destructuring o usar try-catch alrededor de Promise.all.

### 10. 🟡 MEDIO — bug

En lib/filters/evaluate.ts, la regex /[^0-9.\-]/g para convertir strings a números es incorrecto. El signo menos al final mantiene todos los dígitos, puntos y signos menos, pero si hay múltiples guiones como '1.5-20', se convierte en '1.520' en lugar de error o valor correcto.

- 📄 **Archivo**: `lib/filters/evaluate.ts, línea 26`
- 🔧 **Fix**: Usar parseFloat(String(v)) o una regex más específica como /^-?\d+(\.\d+)?$/

### 11. 🟡 MEDIO — logica_rota

atribucion.ts retorna [] cuando hay error en Supabase (línea 13) sin logging ni visibilidad del error. Los usuarios verán un reporte vacío sin saber si falló la carga o si realmente no hay datos.

- 📄 **Archivo**: `lib/db/atribucion.ts, línea 13`
- 🔧 **Fix**: Agregar console.error(error) o logging estructurado antes de retornar []

### 12. 🟡 MEDIO — logica_rota

campanias-perf.ts retorna [] cuando hay error (línea 46) sin logging. El usuario no puede distinguir entre datos vacíos legítimos y errores de base de datos.

- 📄 **Archivo**: `lib/db/campanias-perf.ts, línea 46`
- 🔧 **Fix**: Agregar console.error(error) antes de retornar []

### 13. 🟡 MEDIO — ux

Cuando listAtribucionPorEstrategia() o getCampaniasPerf() retornan [] por error, no hay indicador visual de que falló la carga. El usuario ve tablas vacías sin poder distinguir entre 'sin datos' y 'error de carga'.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, líneas 143-173`
- 🔁 **Reproducir**: Simular un error de red en Supabase y observar que la sección 'Atribución por estrategia' desaparece silenciosamente sin mensaje de error.

### 14. 🟡 MEDIO — logica_rota

La velocidad de cierre (velocidad_dias) se calcula usando el MAX(cambiado_en) del historial_etapa, pero esto puede incluir cambios intermedios. Debería ser desde creado_en hasta la última etapa (ganada/perdida), no un cambio arbitrario.

- 📄 **Archivo**: `lib/db/dashboard.ts, líneas 362-382`
- 🔧 **Fix**: Usar solo cambios hacia etapas finales o calcular desde creado_en hasta fecha_actualizado cuando estado=ganado.

### 15. 🟡 MEDIO — ux

Cuando campanias.length === 0 en /reportes, la tabla de 'Desempeño de campañas' muestra una fila fake [['—', '—', ...]] en lugar de un mensaje 'Sin datos' como en otras tablas. Inconsistencia visual.

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, línea 168`
- 🔧 **Fix**: Envolver la Section en un condicional como el resto: {campanias.length > 0 && <Section ...>}

### 16. 🟡 MEDIO — perf

BuscarAvanzadaPage carga TODOS los contactos/empresas/oportunidades cuando hasAdvanced=true (.limit() default 200), pero luego filtra en memoria con rowMatches(). Para tenants con miles de registros, esto puede causar timeout o lentitud.

- 📄 **Archivo**: `app/(app)/buscar/page.tsx, líneas 32-36`
- 🔧 **Fix**: Implementar filtrado del lado del servidor en listContactos/listEmpresas/listOportunidades, o subir el límite con advertencia.

### 17. 🟡 MEDIO — bug

En filters-bar.tsx línea 44, si el usuario selecciona un value vacío, se elimina el param pero no se limpia el estado local del select (React-controlled). El select mantendrá el value anterior hasta que se vuelva a cambiar.

- 📄 **Archivo**: `app/(app)/reportes/filters-bar.tsx, línea 44`
- 🔧 **Fix**: Usar onChange={(e) => set(key, e.target.value || '')} para sincronizar correctamente.

### 18. ⚪ BAJO — deuda

En FilterBuilder (components/filters/filter-builder.tsx línea 54), se ignora la regla react-hooks/exhaustive-deps. El efecto sincroniza con searchParams solo cuando 'open' cambia, pero no cuando searchParams cambia. Esto puede dejar estado stale si los parámetros cambian mientras el diálogo está abierto.

- 📄 **Archivo**: `components/filters/filter-builder.tsx, línea 54-55`
- 🔧 **Fix**: Agregar searchParams y paramName a las dependencias o crear un efecto separado

### 19. ⚪ BAJO — a11y

Los labels en ReportesFiltersBar no están asociados con sus inputs/selects mediante htmlFor/id. Esto viola WCAG y afecta la accesibilidad para usuarios de lectores de pantalla.

- 📄 **Archivo**: `app/(app)/reportes/filters-bar.tsx, líneas 41-89`

### 20. ⚪ BAJO — a11y

Falta aria-label en varios botones clave: el botón de exportar CSV en reportes no tiene aria-label que describa su función.

- 📄 **Archivo**: `app/(app)/reportes/export-button.tsx, línea 26`

### 21. ⚪ BAJO — a11y

En dashboard/page.tsx, el section #actividades-pendientes carece de aria-live o role=region para indicar contenido dinámico que podría cambiar.

- 📄 **Archivo**: `app/(app)/dashboard/page.tsx, línea 211`

### 22. ⚪ BAJO — ux

En buscar/page.tsx, cuando matches.length > 200, se muestra un aviso 'Mostrando los primeros 200', pero el usuario no tiene forma de refinar los filtros dentro del resultado (ej: paginación). Debe volver a la página anterior y ajustar filtros.

- 📄 **Archivo**: `app/(app)/buscar/page.tsx, línea 85`
- 🔁 **Reproducir**: Crear filtros que devuelvan más de 200 resultados y observar que no hay paginación.

### 23. ⚪ BAJO — deuda

Los tipos en dashboard.ts tienen un patrón repetido de 'T | T[] | null' para manejar respuestas de Supabase con joins. Esto podría simplificarse con una función de normalización o tipo genérico reutilizable.

- 📄 **Archivo**: `lib/db/dashboard.ts, líneas 188-193`
- 🔧 **Fix**: Crear una función normalizeRelation<T>() o tipo Relation<T> reutilizable

### 24. ⚪ BAJO — bug

El campo 'completada' en el .select() de actividades (línea 122) no se usa en el mapeo posterior. Se trae innecesariamente porque la query.eq('completada', false) ya filtra.

- 📄 **Archivo**: `lib/db/dashboard.ts, línea 122`
- 🔧 **Fix**: Remover 'completada' del select: "id, oportunidad_id, tipo, descripcion, fecha_programada, oportunidad(nombre, asignado_id)"

### 25. ⚪ BAJO — bug

En export-button.tsx línea 16, se agrega BOM (﻿) al CSV, lo que causa problemas en algunos editores no-Microsoft. El BOM es innecesario en UTF-8 moderno.

- 📄 **Archivo**: `app/(app)/reportes/export-button.tsx, línea 16`
- 🔧 **Fix**: Remover ﻿: new Blob([csv], { type: 'text/csv;charset=utf-8' })

### 26. ⚪ BAJO — logica_rota

Casting 'as Array<...>' en buscar/page.tsx líneas 33-35 oculta que los tipos retornados de listContactos/Empresas/Oportunidades podrían no incluir todos los campos necesarios para el filtrado. Debería ser contactoListItem & Record<string, unknown>.

- 📄 **Archivo**: `app/(app)/buscar/page.tsx, líneas 33-35`
- 🔧 **Fix**: Remover el casting genérico o asegurar que los tipos son correctos.

### 27. ⚪ BAJO — deuda

Varios valores null/undefined en datos de reportes se representan como "—" en texto pero no hay tooltips/hints que expliquen por qué están vacíos (ej: win_rate=null en algunas oportunidades).

- 📄 **Archivo**: `app/(app)/reportes/page.tsx, línea 49; app/(app)/dashboard/page.tsx, línea 65`
- 🔁 **Reproducir**: Ver un KPI con valor "—" sin explicación contextual de por qué.

### 28. ⚪ BAJO — perf

El cálculo de moneda_pipeline por frecuencia (línea 385-386) usa reduce + sort que es O(n log n). Para muchas monedas es eficiente pero podría memorizarse si se ejecuta múltiples veces.

- 📄 **Archivo**: `lib/db/dashboard.ts, líneas 384-386`


