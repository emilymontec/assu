'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BankStatusBadge } from '@/components/status-badge';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api } from '@/lib/api-client';
import type { Bank } from '@/lib/types';

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    api
      .banks.list()
      .then((res) => setBanks(res as Bank[]))
      .catch(() => setNotImplemented(true));
  }, []);

  return (
    <>
      <PageHeader
        title="Bancos"
        description="Entidades financieras soportadas por Assu."
        action={
          <Button size="sm" disabled={notImplemented}>
            <Plus className="h-3.5 w-3.5" /> Registrar banco
          </Button>
        }
      />

      {notImplemented && <NotImplementedYet endpoint="GET /banks" module="Bank Management" />}

      {banks && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Tipo de integración</TableHead>
              <TableHead>Adapter</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell className="font-medium">{bank.name}</TableCell>
                <TableCell className="text-muted-foreground">{bank.country}</TableCell>
                <TableCell className="text-muted-foreground">{bank.integrationType}</TableCell>
                <TableCell className="text-muted-foreground">{bank.adapterKey}</TableCell>
                <TableCell>
                  <BankStatusBadge status={bank.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
