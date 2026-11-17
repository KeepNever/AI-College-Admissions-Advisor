import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const provinceCodes = ['11', '12', '31', '33', '37', '46'];

async function main() {
  // Check current state
  const before = await prisma.provinceRankSegment.findMany({
    where: { provinceCode: { in: provinceCodes } },
    select: { provinceCode: true, subjectType: true, score: true, rank: true }
  });
  console.log('Before update:', before.length, 'rows');
  before.forEach(r => console.log(`  ${r.provinceCode} | ${r.subjectType} | score=${r.score} rank=${r.rank}`));

  // Update rank segments
  const updatedRank = await prisma.provinceRankSegment.updateMany({
    where: { provinceCode: { in: provinceCodes }, subjectType: '物理' },
    data: { subjectType: '综合改革' }
  });
  console.log('\nRank segments updated:', updatedRank.count);

  // Update batch lines
  const updatedBatch = await prisma.provinceBatchLine.updateMany({
    where: { provinceCode: { in: provinceCodes }, subjectType: '物理' },
    data: { subjectType: '综合改革' }
  });
  console.log('Batch lines updated:', updatedBatch.count);

  // Verify
  const after = await prisma.provinceRankSegment.findMany({
    where: { provinceCode: { in: provinceCodes } },
    select: { provinceCode: true, subjectType: true, score: true, rank: true }
  });
  console.log('\nAfter update:', after.length, 'rows');
  after.forEach(r => console.log(`  ${r.provinceCode} | ${r.subjectType} | score=${r.score} rank=${r.rank}`));
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
