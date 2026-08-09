# Convención para nuevos módulos

Cada módulo del roadmap (Bank Management, Bank Account Management, Bank
Adapter System, Session Manager, Scheduler, Sync Engine, Movement Parser,
Movement Validator, Movement Deduplication, Movement Management, Sync Log,
Retry & Error Handling, Queue, Credentials, Audit, Rate Limiting, Event
Publisher, Internal API, API Auth, Observability, Monitoring & Alerts,
Admin) vive en su propia carpeta aquí, siguiendo esta forma:

```
modules/<nombre-modulo>/
├── <nombre>.module.ts
├── <nombre>.controller.ts      # solo si expone HTTP
├── <nombre>.service.ts
├── dto/                        # solo si expone HTTP o eventos
└── repositories/                # solo si persiste datos (implementa un *Port de core/ports)
```

Reglas:

1. Un módulo solo accede a datos de otro módulo a través de su servicio
   público o del puerto correspondiente en `src/core/ports/` — nunca
   importando directamente su repositorio o su modelo de Prisma.
2. Todo lo específico de un banco (selectores, flujos de login, parsing
   particular) vive exclusivamente en `bank-adapter/adapters/<banco>/`.
   Ningún otro módulo debe tener lógica condicionada por el banco.
3. Antes de agregar un módulo nuevo, revisar `core/ports/` — si el módulo
   implementa un contrato existente, debe declarar `provide: X_PORT, useClass: ...`
   en su `*.module.ts` para que el resto del sistema lo consuma por
   inyección de dependencias, no por importación directa de la clase.

Siguiente módulo sugerido a implementar: **Bank Management** (1), seguido
de **Bank Account Management** (2) y **Credentials/Security** (15), ya que
Bank Account depende de poder cifrar credenciales desde el día 1.
