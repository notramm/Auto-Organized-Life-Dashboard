// packages/database/src/seeds/index.ts
// Run: npx ts-node src/seeds/index.ts
// Purpose: Populate local dev DB with realistic test data
import crypto from 'crypto';
import { PrismaClient, UserPlan, FileType, FileStatus, TagSource } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clean existing seed data ─────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.insightItem.deleteMany();
  await prisma.searchLog.deleteMany();
  await prisma.fileAIMetadata.deleteMany();
  await prisma.filePreview.deleteMany();
  await prisma.fileTag.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ── Users ─────────────────────────────────────────────────────────
  // Password for all test users: Test@1234
  // Argon2id hash of "Test@1234"
  const testPasswordHash =
    '$argon2id$v=19$m=65536,t=3,p=4$abc123$hashedpasswordplaceholder';

  const [ram, priya, arjun] = await Promise.all([
    prisma.user.create({
      data: {
        id: uuid(),
        email: 'ram@aold.dev',
        passwordHash: testPasswordHash,
        fullName: 'Ram Sharma',
        plan: UserPlan.pro,
        storageUsedBytes: BigInt(2_147_483_648), // 2 GB
        storageQuotaBytes: BigInt(53_687_091_200), // 50 GB
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuid(),
        email: 'priya@aold.dev',
        passwordHash: testPasswordHash,
        fullName: 'Priya Patel',
        plan: UserPlan.free,
        storageUsedBytes: BigInt(1_073_741_824), // 1 GB
        storageQuotaBytes: BigInt(5_368_709_120), // 5 GB
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuid(),
        email: 'arjun@aold.dev',
        passwordHash: testPasswordHash,
        fullName: 'Arjun Mehta',
        plan: UserPlan.free,
        storageUsedBytes: BigInt(536_870_912), // 512 MB
        storageQuotaBytes: BigInt(5_368_709_120),
        emailVerified: false,
      },
    }),
  ]);

  console.log(`  ✓ Created 3 users: ${ram.email}, ${priya.email}, ${arjun.email}`);

  // ── Folders for Ram ──────────────────────────────────────────────
  const [goaFolder, workFolder, _designFolder] = await Promise.all([
    prisma.folder.create({
      data: {
        id: uuid(),
        userId: ram.id,
        name: 'Goa Trip 2024',
        path: 'goa-trip-2024',
      },
    }),
    prisma.folder.create({
      data: {
        id: uuid(),
        userId: ram.id,
        name: 'Work Documents',
        path: 'work-documents',
      },
    }),
    prisma.folder.create({
      data: {
        id: uuid(),
        userId: ram.id,
        name: 'Design Assets',
        path: 'design-assets',
      },
    }),
  ]);

  // Sub-folder
  const contractsFolder = await prisma.folder.create({
    data: {
      id: uuid(),
      userId: ram.id,
      parentId: workFolder.id,
      name: 'Contracts',
      path: 'work-documents/contracts',
    },
  });

  // Smart folder
  await prisma.folder.create({
    data: {
      id: uuid(),
      userId: ram.id,
      name: 'All Travel Photos',
      path: 'smart-travel',
      isSmart: true,
      smartRule: { tags: ['ai:travel', 'ai:beach', 'ai:outdoor'] },
    },
  });

  console.log('  ✓ Created folders for Ram');

  // ── Files ─────────────────────────────────────────────────────────
  const imageChainId = uuid();
  const docChainId   = uuid();
  const videoChainId = uuid();

  const files = await Promise.all([
    // Image 1 — Goa beach photo (READY with AI metadata)
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        folderId: goaFolder.id,
        name: 'goa_beach_sunset.jpg',
        mimeType: 'image/jpeg',
        fileType: FileType.IMAGE,
        sizeBytes: BigInt(3_145_728), // 3 MB
        s3Key: `${ram.id}/images/goa_beach_sunset.jpg`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.READY,
        versionChainId: imageChainId,
        versionNumber: 1,
        isLatest: true,
        createdAt: daysAgo(30),
      },
    }),
    // Image 2 — Another Goa photo
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        folderId: goaFolder.id,
        name: 'goa_market_street.jpg',
        mimeType: 'image/jpeg',
        fileType: FileType.IMAGE,
        sizeBytes: BigInt(2_097_152),
        s3Key: `${ram.id}/images/goa_market_street.jpg`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.READY,
        versionChainId: uuid(),
        versionNumber: 1,
        isLatest: true,
        createdAt: daysAgo(29),
      },
    }),
    // Document — Contract (READY)
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        folderId: contractsFolder.id,
        name: 'freelance_contract_2024.pdf',
        mimeType: 'application/pdf',
        fileType: FileType.DOCUMENT,
        sizeBytes: BigInt(524_288), // 512 KB
        s3Key: `${ram.id}/documents/freelance_contract_2024.pdf`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.READY,
        versionChainId: docChainId,
        versionNumber: 2,
        isLatest: true,
        createdAt: daysAgo(10),
      },
    }),
    // Document v1 (old version of contract)
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        folderId: contractsFolder.id,
        name: 'freelance_contract_2024.pdf',
        mimeType: 'application/pdf',
        fileType: FileType.DOCUMENT,
        sizeBytes: BigInt(512_000),
        s3Key: `${ram.id}/documents/freelance_contract_2024_v1.pdf`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.READY,
        versionChainId: docChainId,
        versionNumber: 1,
        isLatest: false,
        createdAt: daysAgo(20),
      },
    }),
    // Video — Goa reel (PROCESSING)
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        folderId: goaFolder.id,
        name: 'goa_beach_reel.mp4',
        mimeType: 'video/mp4',
        fileType: FileType.VIDEO,
        sizeBytes: BigInt(157_286_400), // 150 MB
        s3Key: `${ram.id}/videos/goa_beach_reel.mp4`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.PROCESSING,
        versionChainId: videoChainId,
        versionNumber: 1,
        isLatest: true,
        createdAt: daysAgo(1),
      },
    }),
    // PENDING file (just uploaded)
    prisma.file.create({
      data: {
        id: uuid(),
        userId: ram.id,
        name: 'design_mockup_v3.png',
        mimeType: 'image/png',
        fileType: FileType.IMAGE,
        sizeBytes: BigInt(8_388_608), // 8 MB
        s3Key: `${ram.id}/images/design_mockup_v3.png`,
        s3Bucket: 'aold-files-dev',
        status: FileStatus.PENDING,
        versionChainId: uuid(),
        versionNumber: 1,
        isLatest: true,
        createdAt: new Date(),
      },
    }),
  ]);

  const [beachPhoto, marketPhoto, contract] = files;
  console.log('  ✓ Created 6 files for Ram');

  // ── AI Metadata ───────────────────────────────────────────────────
  await Promise.all([
    prisma.fileAIMetadata.create({
      data: {
        fileId: beachPhoto.id,
        description: 'A stunning sunset at Goa beach with golden sky, calm waves, and silhouettes of palm trees.',
        detectedObjects: [
          { label: 'beach', confidence: 0.98 },
          { label: 'sunset', confidence: 0.95 },
          { label: 'palm tree', confidence: 0.87 },
          { label: 'ocean waves', confidence: 0.91 },
        ],
        detectedScenes: [
          { label: 'outdoor', confidence: 0.99 },
          { label: 'beach', confidence: 0.97 },
          { label: 'sunset', confidence: 0.94 },
          { label: 'travel', confidence: 0.88 },
        ],
        detectedEntities: {
          people: [],
          organizations: [],
          dates: [],
          amounts: [],
          locations: ['Goa', 'India'],
        },
        pineconeVectorId: `vec_${beachPhoto.id}`,
        processingDurationMs: 4200,
        processedAt: daysAgo(29),
      },
    }),
    prisma.fileAIMetadata.create({
      data: {
        fileId: contract.id,
        description: 'Freelance design contract between Ram Sharma and TechCorp Pvt Ltd.',
        summary:
          'A freelance contract for UI/UX design services. The agreement covers a 3-month engagement at ₹80,000/month. Contract expires on 2024-12-31.',
        detectedObjects: [],
        detectedScenes: [],
        detectedEntities: {
          people: ['Ram Sharma'],
          organizations: ['TechCorp Pvt Ltd'],
          dates: ['2024-10-01', '2024-12-31'],
          amounts: ['₹80,000'],
          locations: ['Mumbai'],
        },
        pineconeVectorId: `vec_${contract.id}`,
        processingDurationMs: 8500,
        processedAt: daysAgo(9),
      },
    }),
  ]);

  console.log('  ✓ Created AI metadata for 2 files');

  // ── Tags ──────────────────────────────────────────────────────────
  await Promise.all([
    // Beach photo tags
    ...['ai:travel', 'ai:beach', 'ai:outdoor', 'ai:sunset', 'ai:goa'].map((tag) =>
      prisma.fileTag.create({
        data: { fileId: beachPhoto.id, tagValue: tag, source: TagSource.AI, confidence: 0.9 },
      }),
    ),
    prisma.fileTag.create({
      data: { fileId: beachPhoto.id, tagValue: 'user:favourite', source: TagSource.USER },
    }),
    // Contract tags
    ...['ai:contract', 'ai:legal', 'ai:work', 'ai:invoice'].map((tag) =>
      prisma.fileTag.create({
        data: { fileId: contract.id, tagValue: tag, source: TagSource.AI, confidence: 0.85 },
      }),
    ),
  ]);

  console.log('  ✓ Created tags');

  // ── Previews ──────────────────────────────────────────────────────
  await Promise.all([
    prisma.filePreview.create({
      data: {
        fileId: beachPhoto.id,
        thumbnailS3Key: `${ram.id}/thumbnails/goa_beach_sunset_thumb.jpg`,
        previewS3Key: `${ram.id}/previews/goa_beach_sunset_preview.jpg`,
        cdnBaseUrl: 'https://cdn.aold.dev',
      },
    }),
    prisma.filePreview.create({
      data: {
        fileId: contract.id,
        thumbnailS3Key: `${ram.id}/thumbnails/freelance_contract_thumb.jpg`,
        previewS3Key: `${ram.id}/previews/freelance_contract_page1.jpg`,
        cdnBaseUrl: 'https://cdn.aold.dev',
      },
    }),
  ]);

  console.log('  ✓ Created file previews');

  // ── Search Logs ───────────────────────────────────────────────────
  await Promise.all([
    prisma.searchLog.create({
      data: {
        userId: ram.id,
        queryText: 'beach photos goa',
        resultCount: 5,
        clickedFileIds: [beachPhoto.id],
        latencyMs: 187,
        createdAt: daysAgo(2),
      },
    }),
    prisma.searchLog.create({
      data: {
        userId: ram.id,
        queryText: 'freelance contract',
        resultCount: 2,
        clickedFileIds: [contract.id],
        latencyMs: 210,
        createdAt: daysAgo(1),
      },
    }),
  ]);

  console.log('  ✓ Created search logs');

  // ── Insights ──────────────────────────────────────────────────────
  await Promise.all([
    prisma.insightItem.create({
      data: {
        userId: ram.id,
        type: 'reminder',
        title: 'Contract expiring soon',
        description:
          'Your freelance contract with TechCorp Pvt Ltd expires on 2024-12-31 — in 21 days.',
        fileIds: [contract.id],
        priority: 'high',
        dueDate: new Date('2024-12-31'),
      },
    }),
    prisma.insightItem.create({
      data: {
        userId: ram.id,
        type: 'group',
        title: 'Goa Trip 2024',
        description:
          'You have 3 files from your Goa trip — 2 photos and 1 video. Want me to create an album?',
        fileIds: [beachPhoto.id, marketPhoto.id],
        priority: 'low',
      },
    }),
    prisma.insightItem.create({
      data: {
        userId: ram.id,
        type: 'digest',
        title: "Today's summary",
        description: '1 new file uploaded, 1 file still processing, 2 GB storage used (40% of plan).',
        fileIds: [],
        priority: 'low',
      },
    }),
  ]);

  console.log('  ✓ Created insight items');

  // ── Audit log ─────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: ram.id,
      action: 'file.upload',
      resourceId: beachPhoto.id,
      resourceType: 'file',
      metadata: { filename: 'goa_beach_sunset.jpg', sizeBytes: 3145728 },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('  ✓ Created audit logs');
  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts:');
  console.log('  ram@aold.dev   / Test@1234  (Pro plan)');
  console.log('  priya@aold.dev / Test@1234  (Free plan)');
  console.log('  arjun@aold.dev / Test@1234  (Free plan)');
  console.log('\nRun: npx prisma studio   to browse the data');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });