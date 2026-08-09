export enum AccountStatus {
  PENDING = 'PENDING', // recién creada, aún no ha sincronizado nunca
  ACTIVE = 'ACTIVE', // sincronizando con normalidad
  REAUTH_REQUIRED = 'REAUTH_REQUIRED', // credenciales inválidas o sesión no recuperable
  SUSPENDED = 'SUSPENDED', // desactivada manualmente por el merchant/admin
  ERROR = 'ERROR', // fallando de forma repetida (ver SyncLog para el detalle)
}
