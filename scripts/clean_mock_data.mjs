import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('--- PURGING ALL MOCK AND REFERENCE DATA ---');

  // Find genuine admin
  const admin = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  if (!admin) {
    throw new Error('Admin user not found!');
  }

  // 1. Reassign all problems to genuine Admin
  await prisma.problem.updateMany({
    data: { createdById: admin.id }
  });
  console.log('✓ Reassigned all problem creators to Admin.');

  // 2. Delete test submissions from mock accounts
  const mockUsers = await prisma.user.findMany({
    where: {
      email: {
        in: ['instructor@test.com', 'student@test.com', 'student_1790706094894@test.com']
      }
    }
  });

  const mockIds = mockUsers.map(u => u.id);

  if (mockIds.length > 0) {
    // Delete test results for those submissions
    const mockSubs = await prisma.submission.findMany({
      where: { userId: { in: mockIds } },
      select: { id: true }
    });
    const subIds = mockSubs.map(s => s.id);

    if (subIds.length > 0) {
      await prisma.testResult.deleteMany({ where: { submissionId: { in: subIds } } });
      await prisma.submissionFile.deleteMany({ where: { submissionId: { in: subIds } } });
      await prisma.submission.deleteMany({ where: { id: { in: subIds } } });
      console.log(`✓ Purged ${subIds.length} mock submissions.`);
    }

    // Delete user progress
    await prisma.userProgress.deleteMany({ where: { userId: { in: mockIds } } });

    // Delete assessments created by mock users
    await prisma.assessmentSubmission.deleteMany({ where: { userId: { in: mockIds } } });
    await prisma.assessment.deleteMany({ where: { createdById: { in: mockIds } } });

    // Delete mock users
    await prisma.user.deleteMany({ where: { id: { in: mockIds } } });
    console.log(`✓ Purged ${mockIds.length} mock/reference user accounts.`);
  }

  const activeUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, displayName: true }
  });
  console.log('✓ Authentic users in production database:', activeUsers);
}

clean()
  .catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
