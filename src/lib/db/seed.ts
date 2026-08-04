import { createDb } from "./client";
import { categories, tourismSpots, locationAliases, flows, flowSteps, flowOptions } from "./schema";
import "dotenv/config";

async function seed() {
  const db = createDb(process.env.DATABASE_URL!);

  console.log("Seeding categories...");
  await db.insert(categories).values([
    { slug: "beach", names: { en: "Beach", ja: "ビーチ", zh: "海滩", ko: "해변" }, icon: "🏖", sortOrder: 1 },
    { slug: "restaurant", names: { en: "Restaurant", ja: "レストラン", zh: "餐厅", ko: "맛집" }, icon: "🍽", sortOrder: 2 },
    { slug: "market", names: { en: "Market", ja: "市場", zh: "市场", ko: "시장" }, icon: "🏪", sortOrder: 3 },
    { slug: "temple", names: { en: "Temple", ja: "寺院", zh: "寺庙", ko: "사찰" }, icon: "🏛", sortOrder: 4 },
    { slug: "cafe", names: { en: "Cafe", ja: "カフェ", zh: "咖啡厅", ko: "카페" }, icon: "☕", sortOrder: 5 },
  ]).onConflictDoNothing();

  console.log("Seeding tourism spots...");
  const spots = await db.insert(tourismSpots).values([
    {
      nameKo: "해운대 해수욕장",
      names: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海水浴场" },
      description: { en: "Korea's most famous beach", ja: "韓国で最も有名なビーチ", zh: "韩国最著名的海滩" },
      addressKo: "부산 해운대구 우동",
      latitude: "35.1587",
      longitude: "129.1604",
      rating: "4.7",
      source: "curated",
    },
    {
      nameKo: "자갈치시장",
      names: { en: "Jagalchi Fish Market", ja: "チャガルチ市場", zh: "扎嘎其市场" },
      description: { en: "Korea's largest seafood market", ja: "韓国最大の水産市場", zh: "韩国最大的海鲜市场" },
      addressKo: "부산 중구 남포동",
      latitude: "35.0968",
      longitude: "129.0305",
      rating: "4.5",
      source: "curated",
    },
    {
      nameKo: "감천문화마을",
      names: { en: "Gamcheon Culture Village", ja: "甘川文化村", zh: "甘川文化村" },
      description: { en: "Colorful hillside village with art installations", ja: "カラフルな丘の上の芸術村", zh: "色彩缤纷的山坡艺术村" },
      addressKo: "부산 사하구 감천동",
      latitude: "35.0975",
      longitude: "129.0106",
      rating: "4.6",
      source: "curated",
    },
  ]).returning();

  console.log("Seeding location aliases...");
  if (spots[0]) {
    await db.insert(locationAliases).values([
      { spotId: spots[0].id, alias: "haeundae beach", language: "en", source: "manual" },
      { spotId: spots[0].id, alias: "famous beach busan", language: "en", source: "manual" },
      { spotId: spots[0].id, alias: "海雲台", language: "ja", source: "manual" },
      { spotId: spots[0].id, alias: "海云台", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }
  if (spots[1]) {
    await db.insert(locationAliases).values([
      { spotId: spots[1].id, alias: "fish market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "big fish market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "seafood market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "チャガルチ", language: "ja", source: "manual" },
      { spotId: spots[1].id, alias: "鱼市场", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }
  if (spots[2]) {
    await db.insert(locationAliases).values([
      { spotId: spots[2].id, alias: "colorful village", language: "en", source: "manual" },
      { spotId: spots[2].id, alias: "art village", language: "en", source: "manual" },
      { spotId: spots[2].id, alias: "甘川村", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }

  console.log("Seeding sample flows...");
  const [transitFlow] = await db.insert(flows).values([
    { name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索", zh: "查找路线", ko: "길찾기" }, sortOrder: 1 },
    { name: "tourism", icon: "🏖", displayNames: { en: "Tourist Spots", ja: "観光地", zh: "旅游景点", ko: "관광지/맛집" }, sortOrder: 2 },
    { name: "booking", icon: "🎫", displayNames: { en: "Book Activity", ja: "予約", zh: "预订", ko: "예약하기" }, sortOrder: 3 },
  ]).returning();

  if (transitFlow) {
    const steps = await db.insert(flowSteps).values([
      { flowId: transitFlow.id, stepOrder: 1, type: "text_input", messages: { en: "Where are you now?", ja: "今どこにいますか？", zh: "您现在在哪里？" } },
      { flowId: transitFlow.id, stepOrder: 2, type: "text_input", messages: { en: "Where would you like to go?", ja: "どこに行きたいですか？", zh: "您想去哪里？" } },
      { flowId: transitFlow.id, stepOrder: 3, type: "api_call", messages: {}, apiAction: "search_transit_route" },
      { flowId: transitFlow.id, stepOrder: 4, type: "result", messages: { en: "Here are your route options:", ja: "ルートオプション：", zh: "路线选项：" } },
    ]).returning();

    if (steps[1]) {
      await db.insert(flowOptions).values([
        { stepId: steps[1].id, labels: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台" }, value: "haeundae", sortOrder: 1 },
        { stepId: steps[1].id, labels: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里" }, value: "gwangalli", sortOrder: 2 },
        { stepId: steps[1].id, labels: { en: "Jagalchi Market", ja: "チャガルチ市場", zh: "扎嘎其市場" }, value: "jagalchi", sortOrder: 3 },
      ]).onConflictDoNothing();
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
