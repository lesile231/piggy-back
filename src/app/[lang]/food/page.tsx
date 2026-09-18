import { lang } from "next/root-params";
import { getDictionary } from "../dictionaries";
import Image from "next/image";
import Link from "next/link";

const FOOD_CATEGORIES = [
  {
    slug: "dwaeji-gukbap",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop",
    names: { ko: "돼지국밥", en: "Dwaeji-gukbap", ja: "テジクッパ", zh: "猪肉汤饭", es: "Sopa de Cerdo", fr: "Soupe de Porc", de: "Schweinesuppe", it: "Zuppa di Maiale", id: "Sup Babi", th: "แทจีกุกบับ" },
    desc: { ko: "부산의 소울푸드. 진한 돼지뼈 국물에 밥을 말아 먹는 부산 대표 음식", en: "Busan's soul food — rich pork bone broth served with rice", ja: "釜山のソウルフード — 豚骨スープにご飯を入れて食べる", zh: "釜山的灵魂美食——浓郁猪骨汤配米饭", es: "Caldo de cerdo con arroz, el plato emblematico de Busan", fr: "Bouillon de porc avec riz, plat emblematique de Busan", de: "Schweinebruhe mit Reis, Busans Leibgericht", it: "Brodo di maiale con riso, piatto simbolo di Busan", id: "Sup tulang babi dengan nasi, makanan khas Busan", th: "ซุปกระดูกหมูเข้มข้นกับข้าว อาหารประจำปูซาน" },
  },
  {
    slug: "milmyeon",
    image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&h=600&fit=crop",
    names: { ko: "밀면", en: "Milmyeon", ja: "ミルミョン", zh: "小麦冷面", es: "Milmyeon", fr: "Milmyeon", de: "Milmyeon", it: "Milmyeon", id: "Milmyeon", th: "มิลมยอน" },
    desc: { ko: "부산에서만 맛볼 수 있는 밀가루 냉면. 쫄깃한 면에 시원한 육수가 일품", en: "Busan-only wheat cold noodles — chewy noodles in refreshing broth", ja: "釜山だけの小麦冷麺 — もちもち麺にさっぱりスープ", zh: "釜山独有的小麦冷面——劲道面条配清爽汤底", es: "Fideos frios de trigo exclusivos de Busan", fr: "Nouilles froides de ble, specialite unique de Busan", de: "Kalte Weizennudeln, nur in Busan zu finden", it: "Noodle freddi di grano, esclusivi di Busan", id: "Mi dingin gandum khas Busan", th: "เส้นข้าวสาลีเย็นเฉพาะปูซาน เส้นเหนียวนุ่มในน้ำซุปเย็นสดชื่น" },
  },
  {
    slug: "raw-fish",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=600&fit=crop",
    names: { ko: "회 / 해산물", en: "Raw Fish & Seafood", ja: "刺身・海鮮", zh: "生鱼片/海鲜", es: "Pescado Crudo", fr: "Poisson Cru", de: "Rohfisch", it: "Pesce Crudo", id: "Ikan Mentah", th: "ปลาดิบ/อาหารทะเล" },
    desc: { ko: "항구도시 부산답게 싱싱한 활어회와 해산물이 넘쳐나는 곳", en: "Fresh sashimi and seafood from Korea's biggest port city", ja: "港町・釜山ならではの新鮮な活魚刺身と海鮮", zh: "韩国最大港口城市的新鲜刺身与海鲜", es: "Sashimi y mariscos frescos de la mayor ciudad portuaria de Corea", fr: "Sashimi et fruits de mer frais de la plus grande ville portuaire de Coree", de: "Frisches Sashimi und Meeresfruchte aus Koreas grosster Hafenstadt", it: "Sashimi e frutti di mare freschissimi dalla piu grande citta portuale coreana", id: "Sashimi dan seafood segar dari kota pelabuhan terbesar Korea", th: "ซาชิมิและอาหารทะเลสดจากเมืองท่าใหญ่ที่สุดของเกาหลี" },
  },
  {
    slug: "eomuk",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop",
    names: { ko: "어묵", en: "Fish Cake (Eomuk)", ja: "かまぼこ（オムク）", zh: "鱼糕", es: "Pastel de Pescado", fr: "Gateau de Poisson", de: "Fischkuchen", it: "Torta di Pesce", id: "Kue Ikan", th: "ฟิชเค้ก (อมุก)" },
    desc: { ko: "부산이 본고장인 어묵. 갓 튀긴 어묵과 뜨끈한 어묵탕을 즐겨보세요", en: "Busan is the birthplace of Korean fish cake — try it fresh-fried or in hot soup", ja: "韓国かまぼこの本場・釜山。揚げたてやおでん汁で楽しめます", zh: "韩国鱼糕的发源地釜山——现炸鱼糕或热汤鱼糕", es: "Busan es la cuna del fish cake coreano — pruebalo frito o en sopa caliente", fr: "Busan est le berceau du fish cake coreen — frit ou en soupe chaude", de: "Busan ist die Heimat des koreanischen Fischkuchens — frisch frittiert oder als heisse Suppe", it: "Busan e la patria del fish cake coreano — fritto fresco o in zuppa calda", id: "Busan adalah tempat lahir kue ikan Korea — coba yang baru digoreng atau dalam sup panas", th: "ปูซานคือถิ่นกำเนิดฟิชเค้กเกาหลี — ลองทอดสดหรือในซุปร้อน" },
  },
  {
    slug: "ssiat-hotteok",
    image: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=800&h=600&fit=crop",
    names: { ko: "씨앗호떡", en: "Ssiat-hotteok", ja: "シアッホットク", zh: "种子糖饼", es: "Ssiat-hotteok", fr: "Ssiat-hotteok", de: "Ssiat-hotteok", it: "Ssiat-hotteok", id: "Ssiat-hotteok", th: "ซีอัดโฮตต็อก" },
    desc: { ko: "BIFF광장 명물. 해바라기씨, 호박씨가 가득한 달콤 바삭한 부산식 호떡", en: "BIFF Square's famous sweet pancake filled with sunflower & pumpkin seeds", ja: "BIFF広場名物。ヒマワリの種とカボチャの種がたっぷり入った甘いパンケーキ", zh: "BIFF广场名物——满满葵花籽和南瓜籽的香甜煎饼", es: "El famoso panqueque dulce de BIFF Square con semillas de girasol y calabaza", fr: "La celebre crepe sucree de BIFF Square garnie de graines de tournesol et de citrouille", de: "Der beruhmte susse Pfannkuchen vom BIFF Square mit Sonnenblumen- und Kurbiskernen", it: "Il famoso pancake dolce di BIFF Square farcito con semi di girasole e zucca", id: "Panekuk manis terkenal dari BIFF Square berisi biji bunga matahari dan labu", th: "แพนเค้กหวานชื่อดังจาก BIFF สแควร์ สอดไส้เมล็ดทานตะวันและเมล็ดฟักทอง" },
  },
];

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.home.localFood };
}

export default async function FoodPage() {
  const locale = (await lang()) ?? "en";
  const dict = await getDictionary();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{dict.home.localFood}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {locale === "ko" ? "부산의 대표 먹거리를 만나보세요" : "Discover Busan's signature flavors"}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FOOD_CATEGORIES.map((cat) => {
          const name = (cat.names as Record<string, string>)[locale] ?? cat.names.en;
          const desc = (cat.desc as Record<string, string>)[locale] ?? cat.desc.en;
          return (
            <Link
              key={cat.slug}
              href={`/${locale}/food/${cat.slug}`}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={cat.image}
                  alt={name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-sky-600">
                  {name}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  {desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
