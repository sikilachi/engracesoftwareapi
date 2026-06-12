import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Ayarlar" sub="Para birimi, kur tablosu ve genel stok koruma kuralı." />
      <SettingsClient settings={s} />
    </div>
  );
}
