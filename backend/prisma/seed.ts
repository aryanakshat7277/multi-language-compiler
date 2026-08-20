import { PrismaClient, Role, Difficulty } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash,
      displayName: 'Admin User',
      role: Role.ADMIN,
      progress: { create: {} }
    }
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@test.com' },
    update: {},
    create: {
      email: 'instructor@test.com',
      passwordHash,
      displayName: 'Instructor User',
      role: Role.INSTRUCTOR,
      progress: { create: {} }
    }
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      email: 'student@test.com',
      passwordHash,
      displayName: 'Student User',
      role: Role.STUDENT,
      progress: { create: {} }
    }
  });

  console.log('Seeded users.');

  // 2. Languages
  const languages = [
    { id: 'c', displayName: 'C', extension: 'c', compileCmd: 'gcc {file} -o main', runCmd: './main', compileRequired: true, version: '11', memoryLimitMb: 128, timeLimitMs: 2000, enabled: true },
    { id: 'cpp', displayName: 'C++', extension: 'cpp', compileCmd: 'g++ {file} -o main', runCmd: './main', compileRequired: true, version: '17', memoryLimitMb: 128, timeLimitMs: 2000, enabled: true },
    { id: 'java', displayName: 'Java', extension: 'java', compileCmd: 'javac {file}', runCmd: 'java Main', compileRequired: true, version: '17', memoryLimitMb: 512, timeLimitMs: 4000, enabled: true },
    { id: 'python', displayName: 'Python', extension: 'py', compileCmd: null, runCmd: 'python3 {file}', compileRequired: false, version: '3.10', memoryLimitMb: 128, timeLimitMs: 5000, enabled: true },
    { id: 'javascript', displayName: 'JavaScript', extension: 'js', compileCmd: null, runCmd: 'node {file}', compileRequired: false, version: '18', memoryLimitMb: 256, timeLimitMs: 3000, enabled: true },
    { id: 'typescript', displayName: 'TypeScript', extension: 'ts', compileCmd: 'npx tsc {file}', runCmd: 'node {file_no_ext}.js', compileRequired: true, version: '5', memoryLimitMb: 256, timeLimitMs: 4000, enabled: true },
    { id: 'go', displayName: 'Go', extension: 'go', compileCmd: 'go build -o main {file}', runCmd: './main', compileRequired: true, version: '1.20', memoryLimitMb: 128, timeLimitMs: 2000, enabled: true },
    { id: 'rust', displayName: 'Rust', extension: 'rs', compileCmd: 'rustc {file} -o main', runCmd: './main', compileRequired: true, version: '1.70', memoryLimitMb: 128, timeLimitMs: 2000, enabled: true }
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { id: lang.id },
      update: lang,
      create: lang
    });
  }
  
  console.log('Seeded languages.');

  // 3. Problems
  const problem1 = await prisma.problem.upsert({
    where: { slug: 'two-sum' },
    update: {},
    create: {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      difficulty: Difficulty.EASY,
      timeLimit: 1000,
      memoryLimit: 128,
      tags: JSON.stringify(['array', 'hash-table']),
      createdById: admin.id,
      testCases: {
        create: [
          { input: '4\n2 7 11 15\n9\n', expectedOutput: '0 1\n', isHidden: false, orderIndex: 1 },
          { input: '3\n3 2 4\n6\n', expectedOutput: '1 2\n', isHidden: false, orderIndex: 2 }
        ]
      }
    }
  });

  const problem2 = await prisma.problem.upsert({
    where: { slug: 'fibonacci' },
    update: {},
    create: {
      title: 'Fibonacci Number',
      slug: 'fibonacci',
      description: 'The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1.',
      difficulty: Difficulty.EASY,
      timeLimit: 1000,
      memoryLimit: 128,
      tags: JSON.stringify(['math', 'dp']),
      createdById: instructor.id,
      testCases: {
        create: [
          { input: '2\n', expectedOutput: '1\n', isHidden: false, orderIndex: 1 },
          { input: '4\n', expectedOutput: '3\n', isHidden: true, orderIndex: 2 }
        ]
      }
    }
  });

  console.log('Seeded problems.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
