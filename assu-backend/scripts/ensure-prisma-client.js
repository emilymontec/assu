const { existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const projectRoot = join(__dirname, '..');
const generatedClient = join(projectRoot, 'node_modules', '.prisma', 'client', 'index.js');
const schemaPath = join(projectRoot, 'prisma', 'schema.prisma');

if (!existsSync(schemaPath)) {
  console.warn('[ensure-prisma-client] No se encontró prisma/schema.prisma; se omite prisma generate.');
  process.exit(0);
}

if (existsSync(generatedClient)) {
  process.exit(0);
}

console.log('[ensure-prisma-client] Cliente de Prisma no generado; ejecutando prisma generate...');

const result = spawnSync(process.execPath, [require.resolve('prisma'), 'generate'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[ensure-prisma-client] No se pudo ejecutar prisma generate: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
