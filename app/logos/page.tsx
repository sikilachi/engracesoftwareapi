import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import LogosClient from "@/components/LogosClient";

export const dynamic = "force-dynamic";

export default async function LogosPage() {
  const [logos, groups] = await Promise.all([
    prisma.logoAsset.findMany({ orderBy: { platform: "asc" } }),
    prisma.smmGroup.findMany({ select: { platform: true } }),
  ]);
  const usedPlatforms = Array.from(new Set(groups.map(g => g.platform)));
  const missing = usedPlatforms.filter(p => !logos.some(l => l.platform === p));
  return (
    <div>
      <PageHeader title="Logo Yöneticisi" sub="Platform başına bir logo. Yüklenince o platformdaki tüm SMM gruplarına otomatik atanır." />
      <LogosClient
        logos={logos.map(l => ({ platform: l.platform, url: l.url, filename: l.filename }))}
        missing={missing}
      />
    </div>
  );
}
