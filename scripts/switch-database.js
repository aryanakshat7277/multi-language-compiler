const fs = require('fs');
const path = require('path');

const target = (process.argv[2] || '').toLowerCase();
const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
const pgSchemaPath = path.resolve(__dirname, '../backend/prisma/schema.postgresql.prisma');
const sqliteSchemaPath = path.resolve(__dirname, '../backend/prisma/schema.sqlite.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`Cannot find Prisma schema at: ${schemaPath}`);
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf8');

if (target === 'postgres' || target === 'postgresql') {
  console.log('Switching Prisma schema to PostgreSQL for production...');
  content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, content, 'utf8');
  fs.writeFileSync(pgSchemaPath, content, 'utf8');
  console.log('✓ Prisma schema updated to provider: "postgresql"');
} else if (target === 'sqlite') {
  console.log('Switching Prisma schema to SQLite for local zero-setup dev...');
  content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, 'utf8');
  fs.writeFileSync(sqliteSchemaPath, content, 'utf8');
  console.log('✓ Prisma schema updated to provider: "sqlite"');
} else {
  console.log('Usage: node scripts/switch-database.js [postgres|sqlite]');
}
