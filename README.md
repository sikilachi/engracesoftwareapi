# Engrace Software

Tek mağazalık özel (custom) Shopify uygulaması: dijital ürünleri tedarikçi API'lerinden (Kinguin, G2A, SMM panelleri, özel API) çeker, normalize eder, incelemeden geçirir, fiyat/stok kurallarını uygular ve Shopify'a yayınlar.

## Özellikler

- **Tedarikçiler** — Kinguin, G2A, SMM Panel API v2 (smmturk.org vb.) ve alan eşlemeli özel API konnektörleri. API anahtarları AES-256-GCM ile şifreli saklanır.
- **Ürün inceleme** — Arama + 11 filtre (tedarikçi, kategori, platform, bölge, dil, teslimat, içe aktarım durumu, stok, fiyat değişimi, görsel eksikliği, fiyat aralığı), toplu işlemler (yayınla, senkronla, kategori/koleksiyon/etiket ata, sil).
- **Fiyat kuralları** — Kapsam: genel / tedarikçi / kategori / ürün (özgüllük + priority ile çözülür). Yüzde veya sabit kâr, minimum kâr, .99 psikolojik yuvarlama, üstü çizili fiyat çarpanı, kur çevirimi.
- **Stok koruması** — Varsayılan: Shopify stok = floor(kaynak ÷ 4), üst sınır 5, kaynak 0 → Shopify 0. Mod: bölücü / sabit / aynen aktar. Ürün bazında override edilebilir.
- **SMM ürünleri** — Bir grup = Shopify'da tek ürün; paketler (miktar/ülke/refill/hız) varyant olur, her varyant sağlayıcı servis ID'sine bağlanır. SKU formatı: `SMM-{variantId}`.
- **SMM sipariş kuyruğu** — Shopify `orders/create` webhook'u SMM satışlarını yakalar, hedef linki line item property'den okur. Manuel akış: Kopyala → panelde sipariş aç → durumu güncelle (pending/processing/completed/failed/refunded).
- **Otomasyon-hazır modül** — Varsayılan **kapalı**. Grup bazında açılır, mod seçilir (manuel onay / otomatik gönder), gerçek API'ye test gönderimi yapılabilir.
- **Logo yöneticisi** — Platform başına logo; yüklenince o platformdaki tüm SMM gruplarına otomatik atanır.
- **Senkron davranışı** — Ürün bazında fiyat/stok/başlık/açıklama/görsel senkron aç-kapa + "manuel düzenlemelerimi koru" kilidi.
- **Loglama** — Tüm fetch, senkron, yayın ve webhook olayları seviye/alan filtreli log ekranında.
- **Kopya önleme** — `(supplierId, supplierProductId)` benzersiz anahtarı; aynı ürün ikinci kez çekildiğinde güncellenir, kopyalanmaz.

## Teknoloji

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite (tek satır değişiklikle Postgres/Supabase'e geçer) · Shopify Admin GraphQL API 2025-01.

## Kurulum

```bash
cp .env.example .env     # değerleri doldur (aşağıya bak)
npm install
npm run db:push          # veritabanını oluşturur (prisma/dev.db)
npm run dev              # http://localhost:3000
```

### .env değerleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Varsayılan `file:./dev.db`. Supabase için `postgresql://...` yap ve `prisma/schema.prisma` içindeki provider'ı `postgresql` olarak değiştir. |
| `APP_ENCRYPTION_KEY` | 32 baytlık hex anahtar. Üret: `openssl rand -hex 32` |
| `SHOPIFY_STORE_DOMAIN` | `magazan.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Custom app Admin API access token (`shpat_...`) |
| `SHOPIFY_API_VERSION` | Varsayılan `2025-01` |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook imza doğrulaması için (Shopify webhook ayarından alınır) |
| `APP_PUBLIC_URL` | Uygulamanın dışarıdan erişilen adresi (logoların Shopify'a yüklenmesi için, örn. Vercel URL'i) |

### Shopify custom app oluşturma

1. Shopify Admin → **Settings → Apps and sales channels → Develop apps → Create an app** ("Engrace").
2. **Configure Admin API scopes** — şunları işaretle:
   `write_products`, `read_products`, `write_inventory`, `read_inventory`, `read_orders`, `write_publications` (koleksiyon için `write_products` yeterli; koleksiyonlar otomatik oluşturulur).
3. **Install app** → **Admin API access token**'ı kopyala → `.env` içine `SHOPIFY_ADMIN_TOKEN` olarak yapıştır. *(Token bir kez gösterilir.)*
4. Mağaza domainini `SHOPIFY_STORE_DOMAIN` olarak gir.

### Webhook (SMM siparişleri için)

Shopify Admin → **Settings → Notifications → Webhooks → Create webhook**:

- Event: `Order creation`
- Format: JSON
- URL: `https://SENIN-DOMAIN/api/webhooks/orders`
- Oluşturulduktan sonra sayfada görünen imza anahtarını `.env` → `SHOPIFY_WEBHOOK_SECRET` olarak gir.

Yerelde test için `npm run dev` + bir tünel (ör. `cloudflared tunnel --url http://localhost:3000`) kullanabilirsin. Geliştirme modunda imzasız istekler kabul edilir; üretimde imza zorunludur.

> SMM ürün sayfasında müşteriden link almak için temanda ürün formuna bir line item property ekle (ör. `properties[Hedef Link]` adlı input). Webhook bu alanı otomatik okur ("Hedef Link", "Profil Linki" veya "Link" adlarını tanır).

## Tipik akış

1. **Tedarikçiler** → tedarikçi ekle → **Bağlantı testi** → **Ürünleri çek**.
2. **Ayarlar** → para birimi, kurlar ve stok kuralını kontrol et.
3. **Fiyat Kuralları** → en azından bir Genel kural ekle (örn. %30 + min kâr 1 + .99).
4. **Kategori Eşleme** → tedarikçi kategorilerini Shopify koleksiyonlarına bağla.
5. **Ürünler** → filtrele, seç, **Taslak yayınla** → Shopify'da kontrol et → **Aktif yayınla**.
6. SMM için: **Logo Yöneticisi**'nden platform logoları yükle → **SMM Hizmetleri**'nde grup + varyantlar → **Shopify'a yayınla**.
7. Sipariş gelince **SMM Siparişleri** kuyruğundan işle.
8. Stok/fiyat tazelemek için: ürün listesinde seç → **Stok / Fiyat / İkisi** senkron butonları (veya tedarikçi sayfasından tümünü yeniden çek).

## Otomatik senkron (opsiyonel)

Vercel'e dağıtırsan `vercel.json` ile cron ekleyebilirsin (örn. her 6 saatte bir tüm tedarikçilerden fetch + senkron). İlk sürümde senkron bilinçli olarak **manuel** bırakıldı; istersen `/api/sync` ucunu `{ "all": true, "what": "both" }` gövdesiyle çağıran bir cron yeterli.

## Test listesi

- [ ] Tedarikçi ekle → bağlantı testi yeşil
- [ ] Ürün çek → kopya oluşmuyor (ikinci çekimde sayı artmıyor, "güncellendi" görünüyor)
- [ ] Fiyat kuralı → ürün listesinde satış fiyatı ve kâr doğru, .99 ile bitiyor
- [ ] Stok kuralı → kaynak 0 olan üründe Shopify stok 0
- [ ] Taslak yayınla → Shopify'da ürün DRAFT olarak göründü, koleksiyon + etiketler doğru
- [ ] Ürün detayında manuel düzenleme + "koru" → yeniden çekince üzerine yazılmıyor
- [ ] SMM grubu yayınla → Shopify'da tek ürün, paketler varyant
- [ ] Test siparişi (Shopify) → webhook → kuyrukta görünüyor, hedef link dolu
- [ ] Logo yükle → gruba otomatik atandı

## Notlar / varsayımlar

- Veritabanı varsayılan olarak SQLite (sıfır kurulum). Üretimde Supabase/Postgres öner.
- Tedarikçi fetch'i varsayılan tek sayfa (≈100 ürün) çeker; büyük kataloglar için sayfalama parametresi konnektörlerde hazır.
- SMM siparişleri ilk sürümde manuel işlenir; otomasyon modülü hazır ama kapalı.
- "Uygulamadan sil" Shopify'a asla dokunmaz; Shopify'daki ürünü silmek istersen Shopify Admin'den yap.
