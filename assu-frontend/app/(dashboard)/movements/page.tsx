'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api } from '@/lib/api-client';
import type { Movement } from '@/lib/types';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(amount);
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    api
      .movements.list()
      .then((res) => setMovements(res as Movement[]))
      .catch(() => setNotImplemented(true));
  }, []);

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Movimientos bancarios detectados, normalizados y validados por Assu."
      />

      {notImplemented && <NotImplementedYet endpoint="GET /movements" module="Movement Management" />}

      {movements && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Verificado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                <TableCell className="font-medium">{formatAmount(m.amount, m.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{m.movementType}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(m.date).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === 'VALID' ? 'success' : m.status === 'INVALID' ? 'danger' : 'default'}>
                    {m.status}
                  </Badge>
                </TableCell>
                <TableCell>{m.verified ? '✓' : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
