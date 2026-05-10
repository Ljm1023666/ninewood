import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UPLOADS = path.join(import.meta.dirname, '..', 'uploads');

const SAMPLE_IMAGES = [
  // picsum.photos — free CC0 images, resized to portrait aspect for TikTok feel
  'https://picsum.photos/720/1280?random=10',
  'https://picsum.photos/720/1280?random=11',
  'https://picsum.photos/720/1280?random=12',
  'https://picsum.photos/720/1280?random=13',
  'https://picsum.photos/720/1280?random=14',
];

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`  ✓ ${path.basename(dest)} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e: any) {
    console.log(`  ✗ ${path.basename(dest)} failed: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Downloading sample images for Shorts...\n');

  const imageUrls: string[] = [];

  for (let i = 0; i < SAMPLE_IMAGES.length; i++) {
    const ext = 'jpg';
    const name = `sample_demand_${i + 1}.${ext}`;
    const ok = await download(SAMPLE_IMAGES[i], path.join(UPLOADS, name));
    if (ok) imageUrls.push(`/uploads/${name}`);
  }

  if (imageUrls.length === 0) {
    console.log('\nNo images downloaded. Using existing video.');
    imageUrls.push('/uploads/1778316022704-x30azgj0ylr.mp4');
  }

  console.log(`\nUpdating demands...`);

  const completed = await prisma.demand.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

  for (let i = 0; i < completed.length; i++) {
    const url = imageUrls[i % imageUrls.length];
    await prisma.demand.update({
      where: { id: completed[i].id },
      data: { mediaUrls: [url] },
    });
    console.log(`  ${completed[i].title} → ${url}`);
  }

  // Also set first demand to have the real video
  if (completed.length > 0) {
    await prisma.demand.update({
      where: { id: completed[0].id },
      data: { mediaUrls: ['/uploads/1778316022704-x30azgj0ylr.mp4', ...imageUrls.slice(0, 1)] },
    });
    console.log(`  ${completed[0].title} → added real video as primary`);
  }

  console.log('\nDone! Demands updated with media for explore page.');

  // List what's in uploads
  console.log('\nUploads directory:');
  for (const f of fs.readdirSync(UPLOADS)) {
    if (f.startsWith('.')) continue;
    const stat = fs.statSync(path.join(UPLOADS, f));
    const kb = (stat.size / 1024).toFixed(0);
    console.log(`  ${f} (${kb} KB)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
