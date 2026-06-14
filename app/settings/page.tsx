import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="App Ayarlari" sub="Logo, renkler, para birimi, kur tablosu ve stok koruma kurali." />
      <SettingsClient settings={s} />
    </div>
  );
}
