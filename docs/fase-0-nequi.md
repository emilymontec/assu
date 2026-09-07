# Fase 0 — Investigación real del portal de Nequi

Esto es trabajo que **tienes que hacer tú** (o alguien de tu equipo con
acceso a una cuenta real de Nequi). No es algo que se pueda completar
desde aquí: requiere iniciar sesión en el portal/app real de un banco
con DevTools abiertas, y eso implica credenciales reales, posible
2FA/OTP, y decisiones de negocio (legales/de producto) que no me
corresponde tomar por ti. Lo que sí puedo darte es exactamente qué
mirar y dónde pegarlo en el código.

Todo lo que falta vive en un solo archivo:

```
src/modules/bank-adapter/adapters/nequi/nequi.adapter.ts
```

Busca el bloque `SELECTORS` y las constantes `NEQUI_LOGIN_URL` /
`NEQUI_MOVEMENTS_URL` — son las únicas 9 cosas que hay que reemplazar.
El resto del adapter (manejo de errores, reintentos, extracción por
puntero para no reprocesar movimientos, captura de evidencia ante
fallos) ya está completo y no debería tocarse en esta fase.

---

## 1. Antes de tocar código: preguntas de negocio/legales

No avances a la parte técnica sin tener respuesta a esto — si la
respuesta a la primera es "no", el resto de la Fase 0 no aplica y hay
que reconsiderar el enfoque de "Bank Adapter System" completo:

1. **¿Los términos de uso de Nequi permiten automatizar el acceso a la
   cuenta de un usuario final?** Revísalo con quien lleve el tema legal
   de Forttu Pagos. Muchos bancos prohíben explícitamente el scraping en
   sus términos, incluso con el consentimiento del titular de la cuenta.
2. **¿La cuenta de Nequi que vas a usar para probar tiene MFA/OTP
   activado?** Si Nequi pide un código que llega por SMS/notificación
   push en cada login (no solo la primera vez desde un dispositivo
   nuevo), un login 100% automatizado sin intervención humana no es
   viable — hay que diseñar un flujo con un paso manual (ver sección 4).
3. **¿Usarás una cuenta de prueba con saldo mínimo, o la cuenta real del
   negocio?** Nunca hagas esta investigación exploratoria contra la
   cuenta de producción real sin haber medido el riesgo de que un script
   con errores dispare bloqueos de seguridad del banco.

---

## 2. Capturar los selectores reales

### Opción recomendada: `playwright codegen`

Playwright trae una herramienta que abre un navegador, graba cada clic
que haces, y te muestra el selector que usó. Es la forma más rápida y
confiable de conseguir selectores reales (mucho mejor que leer el HTML a
ojo, porque también te dice cuál selector es único/estable):

```bash
cd assu-backend
npx playwright codegen https://www.nequi.com.co
```

Esto abre dos ventanas: el navegador y un "Inspector" con el código
generado en vivo. Haz manualmente, dentro de ese navegador:

1. Ve a la pantalla de login. Escribe el número de teléfono en el campo
   correspondiente — el Inspector te mostrará algo como
   `page.fill('#phone', '...')` o `page.getByLabel('Número de celular').fill(...)`.
   **Ese selector (`#phone`, o el que sea) es el que va en
   `SELECTORS.phoneInput`.**
2. Repite para el campo de clave/PIN → `SELECTORS.pinInput`.
3. Haz clic en el botón de ingresar → `SELECTORS.submitButton`.
4. Si el login falla a propósito (usa una clave incorrecta una vez, en
   la cuenta de prueba), anota el selector del mensaje de error que
   aparece → `SELECTORS.loginErrorMessage`.
5. Con login exitoso, anota un selector de algo que SOLO aparece ya
   adentro (ej. el saludo con el nombre, o el botón de "Enviar/Pedir")
   → `SELECTORS.homeIndicator`.
6. Navega a la sección de movimientos/transacciones. Anota el selector
   del contenedor de la lista → `SELECTORS.movementsList`, y el de una
   fila individual (clic derecho → Inspect en DevTools, no en el
   Inspector de Playwright, para ver el HTML de una fila y encontrar una
   clase repetida) → `SELECTORS.movementRow`.
7. Confirma las URLs reales de login y de movimientos en la barra de
   direcciones → `NEQUI_LOGIN_URL` / `NEQUI_MOVEMENTS_URL`.

Cierra el codegen con `Ctrl+C` cuando termines — no hace falta guardar
el script completo que genera, solo los selectores puntuales de arriba.

### Cómo elegir un buen selector (para que no se rompa con cada rediseño)

Preferencia, de mejor a peor:
1. `data-testid`, `data-qa`, o cualquier atributo `data-*` (los equipos
   de frontend los agregan justamente para que QA/automatización no
   dependa de clases de CSS que cambian con cada rediseño visual).
2. `aria-label` / rol accesible (`page.getByRole('button', { name: 'Ingresar' })`).
3. Un `id` estable (revisa que no sea generado dinámicamente, ej.
   `id="input-3f8a91"` — eso cambia en cada carga).
4. Como último recurso, una clase CSS — pero evita clases de utilidad de
   frameworks (`flex`, `mt-4`, etc.) y evita depender de la posición
   (`:nth-child(3)`), que se rompe con el más mínimo cambio de layout.

### Extraer el shape de cada movimiento

Una vez tengas `SELECTORS.movementRow`, abre DevTools (F12) sobre una
fila real y anota qué sub-elementos tiene (monto, remitente, fecha,
referencia) y con qué selector/atributo se puede leer cada uno — el
`sync()` del adapter itera `movementRow` y necesita extraer esos campos
para armar el `RawMovement` que luego pasa a `movement-parser`.

---

## 3. Actualizar el código

Con los selectores en mano, edita directamente:

```ts
const NEQUI_LOGIN_URL = 'https://www.nequi.com.co/...'; // el real
const NEQUI_MOVEMENTS_URL = 'https://www.nequi.com.co/...'; // el real

const SELECTORS = {
  phoneInput: '...',
  pinInput: '...',
  submitButton: '...',
  loginErrorMessage: '...',
  homeIndicator: '...',
  movementsList: '...',
  movementRow: '...',
} as const;
```

Si extraer los campos de cada fila necesita algo más elaborado que un
`textContent()` (por ejemplo, el monto y la fecha están en sub-`<span>`
distintos dentro de la fila), ese código va en el método `sync()` del
mismo archivo — es la única parte que sabe cómo está armado el HTML de
Nequi; `movement-parser` recibe el resultado ya en crudo y no debería
necesitar cambios.

Corre los tests del adapter después de cada cambio:

```bash
pnpm test nequi.adapter
```

(Van a seguir pasando porque los tests usan Playwright mockeado — el
objetivo de esta fase es que el código sea *correcto* contra el HTML
real, cosa que ningún test unitario con mocks puede confirmar por sí
solo. El único momento de verdad es probar contra el portal real con la
cuenta de prueba, manualmente, con `PLAYWRIGHT_HEADLESS=false` en tu
`.env` para poder ver el navegador mientras corre.)

---

## 4. Si hay MFA/OTP obligatorio en cada login

Si confirmaste en el paso 1 que Nequi pide un código por cada login (no
solo la primera vez), un login 100% desatendido no es posible. El diseño
que encaja con la arquitectura actual, sin reescribir nada del resto del
sistema:

1. `LoginManagerService` ya distingue error transitorio de permanente
   (`common/errors/`). Se agrega un nuevo tipo, ej.
   `MfaRequiredError`, que el adapter lanza cuando detecta la pantalla
   de OTP.
2. `BankAccount.status` gana un valor `AWAITING_MFA` (similar a
   `REAUTH_REQUIRED`, que ya existe): la cuenta queda "pausada" ahí en
   vez de reintentar en loop.
3. Un endpoint nuevo en Admin/Operations (`POST
   /bank-accounts/:id/mfa-code`) recibe el código que un operador humano
   copia del SMS/notificación, lo pasa al `SessionManager` que retoma el
   login donde quedó (Playwright puede mantener la página abierta
   esperando ese input, con un timeout razonable — no indefinido).

Esto es un cambio de diseño real, no una simple actualización de
selectores — si llegas a este punto, vale la pena una sesión aparte
para implementarlo bien en vez de improvisarlo sobre la marcha.

---

## 5. Qué avisarme cuando termines esta fase

Cuando tengas los selectores reales y confirmes que el login+sync
funcionan contra el portal real (aunque sea en la cuenta de prueba),
dime y actualizo:

- `src/modules/README.md` (quitar la advertencia de "selectores
  placeholder" de Bank Adapter System).
- El `EXACT_MATCH` de punta a punta por WhatsApp ya debería funcionar
  solo con esto + `OCR_PROVIDER=tesseract` — no hace falta tocar
  `reconciliation-engine` ni `payment-verification` para que ese punto
  quede resuelto.
