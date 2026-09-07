'use client';

import { Fragment, useEffect, useState } from 'react';
import { KeyRound, PauseCircle, PlayCircle, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AccountStatusBadge } from '@/components/status-badge';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api, ApiError } from '@/lib/api-client';
import type { BankAccount } from '@/lib/types';

function formatDate(iso: string | null) {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Reconectar una cuenta REAUTH_REQUIRED necesita credenciales nuevas
 * ANTES de poder reactivarla (BankAccountService.reactivate() rechaza
 * si sigue en ese estado) — por eso es un formulario de dos pasos en
 * uno: pega el JSON de credenciales, y esto encadena
 * PATCH /credentials → PATCH /reactivate.
 */
function ReconnectForm({ accountId, onDone }: { accountId: string; onDone: (message: string) => void }) {
  const [value, setValue] = useState('{\n  "phone": "",\n  "pin": ""\n}');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const credentials = JSON.parse(value);
      await api.accounts.updateCredentials(accountId, credentials);
      await api.accounts.reactivate(accountId);
      onDone('Credenciales actualizadas y cuenta reactivada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'JSON inválido o error al reconectar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Credenciales nuevas en texto plano (se cifran al guardarlas):
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button size="sm" onClick={submit} disabled={busy}>
        {busy ? 'Reconectando...' : 'Guardar y reconectar'}
      </Button>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ accountId: string; text: string } | null>(null);

  function load() {
    api.accounts
      .list()
      .then((res) => setAccounts(res as BankAccount[]))
      .catch(() => setNotImplemented(true));
  }

  useEffect(load, []);

  async function runAction(accountId: string, action: () => Promise<unknown>, successText: string) {
    setBusyId(accountId);
    setMessage(null);
    try {
      await action();
      setMessage({ accountId, text: successText });
      load(); // refresca estados (ej. syncEnabled, status) tras la acción
    } catch (err) {
      const text = err instanceof ApiError ? err.message : 'La operación no se pudo completar.';
      setMessage({ accountId, text });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Cuentas bancarias"
        description="Cuentas de merchants conectadas a cada banco: estado de sincronización y acciones operativas."
      />

      {notImplemented && (
        <NotImplementedYet endpoint="GET /bank-accounts" module="Bank Account Management" />
      )}

      {accounts && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Última sync</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const isBusy = busyId === account.id;
              return (
                <Fragment key={account.id}>
                  <TableRow>
                    <TableCell className="font-medium">{account.accountNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{account.merchantId}</TableCell>
                    <TableCell>
                      <AccountStatusBadge status={account.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.syncEnabled ? 'Habilitado' : 'Deshabilitado'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(account.lastSyncAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() =>
                            runAction(
                              account.id,
                              () => api.accounts.forceSync(account.id),
                              'Sincronización completada.',
                            )
                          }
                          title="Sincronización manual"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() =>
                            runAction(
                              account.id,
                              () => (account.syncEnabled ? api.accounts.disableSync(account.id) : api.accounts.enableSync(account.id)),
                              account.syncEnabled ? 'Sincronización automática deshabilitada.' : 'Sincronización automática habilitada.',
                            )
                          }
                          title={account.syncEnabled ? 'Deshabilitar sync automático' : 'Habilitar sync automático'}
                        >
                          {account.syncEnabled ? (
                            <ToggleRight className="h-3.5 w-3.5" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {account.status === 'SUSPENDED' || account.status === 'ERROR' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(account.id, () => api.accounts.reactivate(account.id), 'Cuenta reactivada.')
                            }
                            title="Reactivar cuenta"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                          </Button>
                        ) : account.status === 'REAUTH_REQUIRED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => setReconnectingId(reconnectingId === account.id ? null : account.id)}
                            title="Reconectar (actualizar credenciales)"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(account.id, () => api.accounts.suspend(account.id), 'Cuenta suspendida.')
                            }
                            title="Suspender cuenta"
                          >
                            <PauseCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {reconnectingId === account.id && (
                    <TableRow key={`${account.id}-reconnect`}>
                      <TableCell colSpan={6}>
                        <ReconnectForm
                          accountId={account.id}
                          onDone={(text) => {
                            setMessage({ accountId: account.id, text });
                            setReconnectingId(null);
                            load();
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {message?.accountId === account.id && (
                    <TableRow key={`${account.id}-message`}>
                      <TableCell colSpan={6} className="bg-muted/40 text-xs text-muted-foreground">
                        {message.text}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
