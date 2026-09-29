const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = (process.argv[2] || '').toLowerCase();
const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
const pgSchemaPath = path.resolve(__dirname, '../backend/prisma/schema.postgresql.prisma');

if (target === 'postgres' || target === 'postgresql') {
  console.log('Switching Prisma schema to PostgreSQL...');
  if (!fs.existsSync(pgSchemaPath)) {
    console.error('Missing schema.postgresql.prisma template.');
    process.exit(1);
  }
  const pgContent = fs.readFileSync(pgSchemaPath, 'utf8');
  fs.writeFileSync(schemaPath, pgContent, 'utf8');
  console.log('Prisma schema updated to provider: "postgresql"');
  console.log('Next step: Ensure DATABASE_URL in backend/.env is set to your postgres connection string:');
  console.log('  DATABASE_URL="postgresql://user:password@localhost:5432/codeforge?schema=public"');
  console.log('Then run: npx prisma db push (inside backend folder)');
} else if (target === 'sqlite') {
  console.log('Switching Prisma schema to SQLite...');
  let content = fs.readFileSync(schemaPath, 'utf8');
  content = content.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('Prisma schema updated to provider: "sqlite"');
} else {
  console.log('Usage: node scripts/switch-database.js [postgres|sqlite]');
}
