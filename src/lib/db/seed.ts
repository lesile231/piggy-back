import { createDb } from "./client";
import {
  categories, tourismSpots, spotCategories, locationAliases,
  events, flows, flowSteps, flowOptions, resolutionLogs,
} from "./schema";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
config({ path: ".env.local" });

async function seed() {
  const db = createDb(process.env.DATABASE_URL!);

  // ── Idempotent cleanup (order matters due to FK constraints) ──
  console.log("Cleaning existing seed data...");
  await db.delete(flowOptions);
  await db.delete(flowSteps);
  await db.delete(flows);
  await db.delete(resolutionLogs);
  await db.delete(locationAliases);
  await db.delete(spotCategories);
  await db.delete(events);
  await db.delete(tourismSpots);
  await db.delete(categories);

  // ── Categories ──
  console.log("Seeding categories...");
  const cats = await db.insert(categories).values([
    { slug: "beach", names: { en: "Beach", ja: "ビーチ", zh: "海滩", ko: "해변" }, icon: "🏖", sortOrder: 1 },
    { slug: "restaurant", names: { en: "Restaurant", ja: "レストラン", zh: "餐厅", ko: "맛집" }, icon: "🍽", sortOrder: 2 },
    { slug: "market", names: { en: "Market", ja: "市場", zh: "市场", ko: "시장" }, icon: "🏪", sortOrder: 3 },
    { slug: "temple", names: { en: "Temple", ja: "寺院", zh: "寺庙", ko: "사찰" }, icon: "🏛", sortOrder: 4 },
    { slug: "cafe", names: { en: "Cafe", ja: "カフェ", zh: "咖啡厅", ko: "카페" }, icon: "☕", sortOrder: 5 },
    { slug: "park", names: { en: "Park", ja: "公園", zh: "公园", ko: "공원" }, icon: "🌳", sortOrder: 6 },
    { slug: "culture", names: { en: "Culture", ja: "文化", zh: "文化", ko: "문화" }, icon: "🎭", sortOrder: 7 },
    { slug: "shopping", names: { en: "Shopping", ja: "ショッピング", zh: "购物", ko: "쇼핑" }, icon: "🛍", sortOrder: 8 },
  ]).returning();

  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id])) as Record<string, string>;

  // ── Tourism Spots ──
  console.log("Seeding tourism spots...");
  const spots = await db.insert(tourismSpots).values([
    {
      nameKo: "해운대 해수욕장",
      names: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海水浴场", ko: "해운대 해수욕장" },
      description: {
        en: "Korea's most famous beach, stretching 1.5 km along the coast with fine white sand. A hub for water sports, festivals, and vibrant nightlife.",
        ja: "韓国で最も有名なビーチ。白い砂浜が1.5km続き、ウォータースポーツやフェスティバルが楽しめます。",
        zh: "韩国最著名的海滩，绵延1.5公里的白色沙滩，是水上运动、节日和夜生活的中心。",
        ko: "대한민국 최고의 해수욕장으로, 1.5km의 하얀 모래사장이 펼쳐진 부산의 대표 관광지입니다.",
      },
      addressKo: "부산 해운대구 우동 해운대해변로 264",
      addresses: { en: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", ja: "釜山市海雲台区佑洞264番地", zh: "釜山海云台区佑洞海云台海边路264号" },
      latitude: "35.1587",
      longitude: "129.1604",
      rating: "4.7",
      images: ["/images/spots/haeundae.jpg"],
      tags: ["beach", "swimming", "nightlife", "family"],
      source: "curated",
    },
    {
      nameKo: "자갈치시장",
      names: { en: "Jagalchi Fish Market", ja: "チャガルチ市場", zh: "扎嘎其市场", ko: "자갈치시장" },
      description: {
        en: "Korea's largest seafood market where you can buy fresh fish and have it prepared on the spot. A must-visit for seafood lovers.",
        ja: "韓国最大の水産市場。新鮮な魚をその場で調理してもらえます。シーフード好き必見のスポットです。",
        zh: "韩国最大的海鲜市场，您可以购买新鲜鱼类并当场烹饪。海鲜爱好者的必去之地。",
        ko: "대한민국 최대의 수산시장으로, 싱싱한 해산물을 현장에서 맛볼 수 있는 부산의 명소입니다.",
      },
      addressKo: "부산 중구 자갈치해안로 52",
      addresses: { en: "52 Jagalchihaean-ro, Jung-gu, Busan", ja: "釜山市中区チャガルチ海岸路52番地", zh: "釜山中区扎嘎其海岸路52号" },
      latitude: "35.0968",
      longitude: "129.0305",
      rating: "4.5",
      images: ["/images/spots/jagalchi.jpg"],
      tags: ["market", "seafood", "local-food"],
      source: "curated",
    },
    {
      nameKo: "감천문화마을",
      names: { en: "Gamcheon Culture Village", ja: "甘川文化村", zh: "甘川文化村", ko: "감천문화마을" },
      description: {
        en: "A colorful hillside village known as the 'Machu Picchu of Busan', featuring vibrant murals, art installations, and charming alleyways.",
        ja: "「釜山のマチュピチュ」と呼ばれるカラフルな丘の上の村。鮮やかな壁画やアート作品が楽しめます。",
        zh: "被称为「釜山的马丘比丘」的色彩缤纷的山坡村庄，拥有鲜艳的壁画、艺术装置和迷人的小巷。",
        ko: "'부산의 마추픽추'로 불리는 알록달록한 벽화마을로, 예술 작품과 골목길이 매력적입니다.",
      },
      addressKo: "부산 사하구 감내2로 203",
      addresses: { en: "203 Gamnae 2-ro, Saha-gu, Busan", ja: "釜山市沙下区甘内2路203番地", zh: "釜山沙下区甘内2路203号" },
      latitude: "35.0975",
      longitude: "129.0106",
      rating: "4.6",
      images: ["/images/spots/gamcheon.jpg"],
      tags: ["culture", "art", "photo-spot", "walking"],
      source: "curated",
    },
    {
      nameKo: "광안리 해수욕장",
      names: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里海水浴场", ko: "광안리 해수욕장" },
      description: {
        en: "A beautiful urban beach famous for its stunning night view of the Gwangan Bridge (Diamond Bridge). Popular for cafes and bars along the waterfront.",
        ja: "広安大橋（ダイヤモンドブリッジ）の夜景が美しい都市型ビーチ。海沿いのカフェやバーが人気です。",
        zh: "以广安大桥（钻石桥）夜景闻名的美丽都市海滩，海滨沿线咖啡馆和酒吧林立。",
        ko: "광안대교(다이아몬드 브릿지)의 야경으로 유명한 도심 해변으로, 해변가 카페와 바가 인기입니다.",
      },
      addressKo: "부산 수영구 광안해변로 219",
      addresses: { en: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", ja: "釜山市水営区広安海辺路219番地", zh: "釜山水营区广安海边路219号" },
      latitude: "35.1531",
      longitude: "129.1186",
      rating: "4.6",
      images: ["/images/spots/gwangalli.jpg"],
      tags: ["beach", "nightlife", "cafe", "bridge-view"],
      source: "curated",
    },
    {
      nameKo: "태종대",
      names: { en: "Taejongdae Resort Park", ja: "太宗台", zh: "太宗台", ko: "태종대" },
      description: {
        en: "A scenic coastal park on Yeongdo Island with dramatic cliffs, a lighthouse, and panoramic ocean views. Take the Danubi train around the park.",
        ja: "影島にある海岸公園。断崖絶壁、灯台、パノラマの海の景色が楽しめます。ダヌビ列車で園内を巡れます。",
        zh: "位于影岛的海滨公园，拥有壮观的悬崖、灯塔和全景海景。可以乘坐丹努比列车环游公园。",
        ko: "영도에 위치한 해안 절경 공원으로, 절벽, 등대, 탁 트인 바다 전망이 일품입니다. 다누비 열차로 편하게 관람할 수 있습니다.",
      },
      addressKo: "부산 영도구 전망로 24",
      addresses: { en: "24 Jeonmang-ro, Yeongdo-gu, Busan", ja: "釜山市影島区展望路24番地", zh: "釜山影岛区展望路24号" },
      latitude: "35.0518",
      longitude: "129.0847",
      rating: "4.5",
      images: ["/images/spots/taejongdae.jpg"],
      tags: ["park", "nature", "ocean-view", "lighthouse"],
      source: "curated",
    },
    {
      nameKo: "해동용궁사",
      names: { en: "Haedong Yonggungsa Temple", ja: "海東龍宮寺", zh: "海东龙宫寺", ko: "해동용궁사" },
      description: {
        en: "A stunning seaside Buddhist temple perched on the rugged coastline. One of the few temples in Korea built on the ocean shore.",
        ja: "荒々しい海岸線に建つ美しい海辺の仏教寺院。韓国では数少ない海岸沿いの寺院です。",
        zh: "坐落在崎岖海岸线上的壮丽海滨佛教寺庙，是韩国少数建在海岸边的寺庙之一。",
        ko: "해안 절벽 위에 자리한 아름다운 해변 사찰로, 바다와 절이 어우러진 한국의 대표적인 해안 사찰입니다.",
      },
      addressKo: "부산 기장군 기장읍 용궁길 86",
      addresses: { en: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑龍宮路86番地", zh: "釜山机张郡机张邑龙宫路86号" },
      latitude: "35.1884",
      longitude: "129.2233",
      rating: "4.6",
      images: ["/images/spots/yonggungsa.jpg"],
      tags: ["temple", "ocean-view", "spiritual", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "국제시장",
      names: { en: "Gukje Market (International Market)", ja: "国際市場", zh: "国际市场", ko: "국제시장" },
      description: {
        en: "One of Korea's largest traditional markets with hundreds of shops selling everything from clothing and accessories to street food and souvenirs.",
        ja: "韓国最大級の伝統市場。衣料品やアクセサリーから屋台グルメ、お土産まで数百の店が軒を連ねます。",
        zh: "韩国最大的传统市场之一，拥有数百家商店，从服装配饰到街头美食和纪念品应有尽有。",
        ko: "의류, 액세서리, 길거리 음식, 기념품 등을 파는 수백 개의 상점이 모여 있는 부산의 대표 전통시장입니다.",
      },
      addressKo: "부산 중구 신창동4가",
      addresses: { en: "Sinchang-dong 4-ga, Jung-gu, Busan", ja: "釜山市中区新昌洞4街", zh: "釜山中区新昌洞4街" },
      latitude: "35.1007",
      longitude: "129.0290",
      rating: "4.4",
      images: ["/images/spots/gukje.jpg"],
      tags: ["market", "shopping", "street-food", "traditional"],
      source: "curated",
    },
    {
      nameKo: "범어사",
      names: { en: "Beomeosa Temple", ja: "梵魚寺", zh: "梵鱼寺", ko: "범어사" },
      description: {
        en: "One of Korea's most important Buddhist temples, nestled in the forests of Mt. Geumjeongsan. Founded in 678 AD, it features stunning architecture and serene mountain trails.",
        ja: "韓国で最も重要な仏教寺院のひとつ。金井山の森に抱かれた678年創建の名刹で、美しい建築と静寂な山道が魅力です。",
        zh: "韩国最重要的佛教寺庙之一，坐落在金井山森林中。建于公元678年，拥有令人惊叹的建筑和宁静的山间步道。",
        ko: "금정산 자락에 자리한 한국의 대표적인 사찰로, 678년에 창건되어 아름다운 건축과 산책로가 유명합니다.",
      },
      addressKo: "부산 금정구 범어사로 250",
      addresses: { en: "250 Beomeosa-ro, Geumjeong-gu, Busan", ja: "釜山市金井区梵魚寺路250番地", zh: "釜山金井区梵鱼寺路250号" },
      latitude: "35.2840",
      longitude: "129.0672",
      rating: "4.6",
      images: ["/images/spots/beomeosa.jpg"],
      tags: ["temple", "mountain", "hiking", "spiritual"],
      source: "curated",
    },
    {
      nameKo: "송정 해수욕장",
      names: { en: "Songjeong Beach", ja: "松亭ビーチ", zh: "松亭海水浴场", ko: "송정 해수욕장" },
      description: {
        en: "A quieter alternative to Haeundae, known for its excellent surfing conditions and laid-back atmosphere with charming cafes along the beachfront.",
        ja: "海雲台より静かなビーチで、サーフィンに最適。ビーチ沿いのカフェも魅力です。",
        zh: "比海云台更安静的海滩，以出色的冲浪条件和悠闲氛围著称，海滨沿线咖啡馆迷人。",
        ko: "해운대보다 한적한 해변으로, 서핑 명소이자 해변가 카페거리가 매력적인 곳입니다.",
      },
      addressKo: "부산 해운대구 송정해변로 62",
      addresses: { en: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", ja: "釜山市海雲台区松亭海辺路62番地", zh: "釜山海云台区松亭海边路62号" },
      latitude: "35.1788",
      longitude: "129.1996",
      rating: "4.5",
      images: ["/images/spots/songjeong.jpg"],
      tags: ["beach", "surfing", "cafe", "quiet"],
      source: "curated",
    },
    {
      nameKo: "다대포 해수욕장",
      names: { en: "Dadaepo Beach", ja: "多大浦ビーチ", zh: "多大浦海水浴场", ko: "다대포 해수욕장" },
      description: {
        en: "A wide, shallow beach famous for its spectacular sunsets and the Dadaepo Sunset Fountain of Dreams, one of the largest musical fountains in the world.",
        ja: "壮大な夕日と世界最大級の音楽噴水「多大浦夕日噴水」で有名な広く浅いビーチです。",
        zh: "以壮观的日落和世界最大音乐喷泉之一的多大浦日落梦幻喷泉闻名的宽阔浅滩海滩。",
        ko: "아름다운 일몰과 세계 최대 규모의 음악 분수인 다대포 꿈의 낙조분수로 유명한 넓고 얕은 해변입니다.",
      },
      addressKo: "부산 사하구 몰운대1길 14",
      addresses: { en: "14 Morundae 1-gil, Saha-gu, Busan", ja: "釜山市沙下区没雲台1路14番地", zh: "釜山沙下区没云台1路14号" },
      latitude: "35.0466",
      longitude: "128.9664",
      rating: "4.4",
      images: ["/images/spots/dadaepo.jpg"],
      tags: ["beach", "sunset", "fountain", "family"],
      source: "curated",
    },
    {
      nameKo: "오륙도 스카이워크",
      names: { en: "Oryukdo Skywalk", ja: "五六島スカイウォーク", zh: "五六岛天空步道", ko: "오륙도 스카이워크" },
      description: {
        en: "A thrilling glass-bottomed walkway jutting out over coastal cliffs, offering panoramic views of the ocean and the five-to-six islands that give the area its name.",
        ja: "海岸の崖の上に突き出したスリル満点のガラス張りの遊歩道。五六島の絶景パノラマが楽しめます。",
        zh: "惊险的玻璃栈道伸出海岸悬崖之上，可以俯瞰大海和五六岛的全景。",
        ko: "해안 절벽 위에 유리 바닥으로 설치된 스릴 넘치는 전망대로, 오륙도와 바다를 한눈에 볼 수 있습니다.",
      },
      addressKo: "부산 남구 오륙도로 137",
      addresses: { en: "137 Oryukdo-ro, Nam-gu, Busan", ja: "釜山市南区五六島路137番地", zh: "釜山南区五六岛路137号" },
      latitude: "35.1014",
      longitude: "129.1234",
      rating: "4.3",
      images: ["/images/spots/oryukdo.jpg"],
      tags: ["park", "ocean-view", "glass-walkway", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "동백섬",
      names: { en: "Dongbaekseom Island", ja: "冬柏島", zh: "冬柏岛", ko: "동백섬" },
      description: {
        en: "A small island connected to Haeundae Beach by a walking path, featuring the APEC House, lush camellia forests, and stunning coastal views.",
        ja: "海雲台ビーチと散歩道で繋がった小さな島。APECハウス、椿の森、海岸の絶景が楽しめます。",
        zh: "通过步行道与海云台海滩相连的小岛，拥有APEC会议厅、茂密的山茶花林和壮丽的海岸景色。",
        ko: "해운대 해수욕장과 산책로로 연결된 작은 섬으로, APEC 하우스, 동백나무 숲, 해안 절경이 매력적입니다.",
      },
      addressKo: "부산 해운대구 동백로 116",
      addresses: { en: "116 Dongbaek-ro, Haeundae-gu, Busan", ja: "釜山市海雲台区冬柏路116番地", zh: "釜山海云台区冬柏路116号" },
      latitude: "35.1536",
      longitude: "129.1506",
      rating: "4.4",
      images: ["/images/spots/dongbaekseom.jpg"],
      tags: ["park", "island", "ocean-view", "walking"],
      source: "curated",
    },
    {
      nameKo: "BIFF 광장",
      names: { en: "BIFF Square", ja: "BIFF広場", zh: "BIFF广场", ko: "BIFF 광장" },
      description: {
        en: "A lively street in Nampo-dong famous for its connection to the Busan International Film Festival, lined with street food stalls, shops, and handprint plaques of film stars.",
        ja: "南浦洞の賑やかな通り。釜山国際映画祭ゆかりの地で、屋台グルメや映画スターの手形プレートが並びます。",
        zh: "南浦洞的热闹街道，因釜山国际电影节而闻名，两旁有街头美食摊位、商店和电影明星手印牌匾。",
        ko: "남포동의 활기찬 거리로, 부산국제영화제의 상징이며 길거리 음식과 영화인 핸드프린팅이 유명합니다.",
      },
      addressKo: "부산 중구 비프광장로 36",
      addresses: { en: "36 BIFF Square-ro, Jung-gu, Busan", ja: "釜山市中区BIFF広場路36番地", zh: "釜山中区BIFF广场路36号" },
      latitude: "35.0988",
      longitude: "129.0291",
      rating: "4.2",
      images: ["/images/spots/biff.jpg"],
      tags: ["culture", "street-food", "shopping", "landmark"],
      source: "curated",
    },
    {
      nameKo: "흰여울문화마을",
      names: { en: "Huinnyeoul Culture Village", ja: "ヒンヨウル文化村", zh: "白浅滩文化村", ko: "흰여울문화마을" },
      description: {
        en: "A picturesque coastal village in Yeongdo with narrow alleys, ocean-view cafes, and art galleries built along the cliff edge overlooking the sea.",
        ja: "影島の絵のように美しい海岸沿いの村。断崖に沿って建てられたカフェやギャラリーが並びます。",
        zh: "影岛风景如画的海岸村庄，狭窄的小巷、海景咖啡馆和悬崖边的艺术画廊。",
        ko: "영도 해안 절벽을 따라 형성된 마을로, 좁은 골목길과 바다 전망 카페, 아트 갤러리가 매력적입니다.",
      },
      addressKo: "부산 영도구 영선동4가",
      addresses: { en: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", ja: "釜山市影島区永仙洞4街", zh: "釜山影岛区永仙洞4街" },
      latitude: "35.0782",
      longitude: "129.0419",
      rating: "4.4",
      images: ["/images/spots/huinnyeoul.jpg"],
      tags: ["culture", "ocean-view", "cafe", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "용두산공원 & 부산타워",
      names: { en: "Yongdusan Park & Busan Tower", ja: "龍頭山公園＆釜山タワー", zh: "龙头山公园和釜山塔", ko: "용두산공원 & 부산타워" },
      description: {
        en: "A hilltop park in the heart of Busan offering 360-degree views from the iconic Busan Tower. Beautiful by day and spectacular at night.",
        ja: "釜山の中心にある丘の上の公園。釜山タワーから360度のパノラマが楽しめます。昼も夜も絶景です。",
        zh: "位于釜山市中心的山顶公园，从标志性的釜山塔可以欣赏360度全景。白天美丽，夜晚壮观。",
        ko: "부산 도심의 언덕 위 공원으로, 부산타워에서 360도 전망을 감상할 수 있습니다. 낮과 밤 모두 아름답습니다.",
      },
      addressKo: "부산 중구 용두산길 37-55",
      addresses: { en: "37-55 Yongdusan-gil, Jung-gu, Busan", ja: "釜山市中区龍頭山路37-55番地", zh: "釜山中区龙头山路37-55号" },
      latitude: "35.1008",
      longitude: "129.0324",
      rating: "4.3",
      images: ["/images/spots/yongdusan.jpg"],
      tags: ["park", "tower", "city-view", "landmark"],
      source: "curated",
    },
  ]).returning();

  // ── Spot ↔ Category junction ──
  console.log("Seeding spot-category links...");
  const sc = (spotIdx: number, catSlug: string) => ({
    spotId: spots[spotIdx]!.id, categoryId: catMap[catSlug]!,
  });
  const spotCatLinks = [
    // Haeundae Beach → beach
    sc(0, "beach"),
    // Jagalchi → market, restaurant
    sc(1, "market"), sc(1, "restaurant"),
    // Gamcheon → culture
    sc(2, "culture"),
    // Gwangalli → beach, cafe
    sc(3, "beach"), sc(3, "cafe"),
    // Taejongdae → park
    sc(4, "park"),
    // Yonggungsa → temple
    sc(5, "temple"),
    // Gukje Market → market, shopping
    sc(6, "market"), sc(6, "shopping"),
    // Beomeosa → temple
    sc(7, "temple"),
    // Songjeong → beach, cafe
    sc(8, "beach"), sc(8, "cafe"),
    // Dadaepo → beach
    sc(9, "beach"),
    // Oryukdo → park
    sc(10, "park"),
    // Dongbaekseom → park
    sc(11, "park"),
    // BIFF Square → culture, shopping
    sc(12, "culture"), sc(12, "shopping"),
    // Huinnyeoul → culture
    sc(13, "culture"),
    // Yongdusan → park
    sc(14, "park"),
  ];
  await db.insert(spotCategories).values(spotCatLinks);

  // ── Location Aliases (comprehensive coverage for §4.1 Stage 2) ──
  // Includes RR romanization, MR variants, common typos, phonetic approximations, CJK variants
  console.log("Seeding location aliases...");
  const a = (spotIdx: number, alias: string, lang: string) => ({
    spotId: spots[spotIdx]!.id, alias, language: lang, source: "manual" as const,
  });
  await db.insert(locationAliases).values([
    // ── [0] 해운대 해수욕장 ──
    a(0, "haeundae", "en"),
    a(0, "haeundae beach", "en"),
    a(0, "hae un dae", "en"),
    a(0, "hey oon day", "en"),           // phonetic approximation
    a(0, "heundae", "en"),               // common typo
    a(0, "hyeundae", "en"),              // common typo
    a(0, "haeundae beach busan", "en"),
    a(0, "famous beach busan", "en"),
    a(0, "ヘウンデ", "ja"),
    a(0, "ヘウンデビーチ", "ja"),
    a(0, "海雲台", "ja"),
    a(0, "海雲台ビーチ", "ja"),
    a(0, "海云台", "zh"),
    a(0, "海云台海水浴场", "zh"),
    a(0, "海雲台", "zh"),                // traditional
    a(0, "해운대", "ko"),
    a(0, "해운대해수욕장", "ko"),
    a(0, "playa haeundae", "es"),
    a(0, "playa de haeundae", "es"),
    a(0, "playa famosa busan", "es"),

    // ── [1] 자갈치시장 ──
    a(1, "jagalchi", "en"),
    a(1, "jagalchi market", "en"),
    a(1, "jagalchi fish market", "en"),
    a(1, "chagalchi", "en"),             // MR romanization
    a(1, "chagalchi market", "en"),      // MR
    a(1, "jagalchi seafood market", "en"),
    a(1, "fish market busan", "en"),
    a(1, "seafood market", "en"),
    a(1, "チャガルチ", "ja"),
    a(1, "チャガルチ市場", "ja"),
    a(1, "鱼市场", "zh"),
    a(1, "扎嘎其市场", "zh"),
    a(1, "자갈치", "ko"),
    a(1, "자갈치시장", "ko"),
    a(1, "mercado de pescado", "es"),
    a(1, "mercado jagalchi", "es"),
    a(1, "mercado de mariscos busan", "es"),

    // ── [2] 감천문화마을 ──
    a(2, "gamcheon", "en"),
    a(2, "gamcheon village", "en"),
    a(2, "gamcheon culture village", "en"),
    a(2, "gamchon", "en"),               // typo/MR
    a(2, "gamchon culture village", "en"),
    a(2, "colorful village", "en"),
    a(2, "colorful village busan", "en"),
    a(2, "art village", "en"),
    a(2, "machu picchu busan", "en"),
    a(2, "カムチョン", "ja"),
    a(2, "甘川文化村", "ja"),
    a(2, "甘川文化村", "zh"),
    a(2, "甘川村", "zh"),
    a(2, "감천", "ko"),
    a(2, "감천마을", "ko"),
    a(2, "감천문화마을", "ko"),
    a(2, "aldea gamcheon", "es"),
    a(2, "aldea cultural gamcheon", "es"),
    a(2, "aldea colorida busan", "es"),
    a(2, "machu picchu de busan", "es"),

    // ── [3] 광안리 해수욕장 ──
    a(3, "gwangalli", "en"),
    a(3, "gwangalli beach", "en"),
    a(3, "kwangalli", "en"),             // MR
    a(3, "kwangalli beach", "en"),       // MR
    a(3, "gwangali", "en"),              // common typo
    a(3, "gwanganli", "en"),             // common typo
    a(3, "diamond bridge beach", "en"),
    a(3, "広安里", "ja"),
    a(3, "広安里ビーチ", "ja"),
    a(3, "クァンアルリ", "ja"),
    a(3, "广安里", "zh"),
    a(3, "广安里海水浴场", "zh"),
    a(3, "광안리", "ko"),
    a(3, "광안리해수욕장", "ko"),
    a(3, "playa gwangalli", "es"),
    a(3, "puente diamante busan", "es"),

    // ── [4] 태종대 ──
    a(4, "taejongdae", "en"),
    a(4, "taejongdae park", "en"),
    a(4, "taejongdae resort park", "en"),
    a(4, "tejongdae", "en"),             // common typo
    a(4, "cliff park busan", "en"),
    a(4, "太宗台", "ja"),
    a(4, "テジョンデ", "ja"),
    a(4, "太宗台", "zh"),
    a(4, "태종대", "ko"),
    a(4, "parque taejongdae", "es"),
    a(4, "acantilados de busan", "es"),

    // ── [5] 해동용궁사 ──
    a(5, "yonggungsa", "en"),
    a(5, "yonggungsa temple", "en"),
    a(5, "haedong yonggungsa", "en"),
    a(5, "haedong yonggungsa temple", "en"),
    a(5, "seaside temple busan", "en"),
    a(5, "ocean temple", "en"),
    a(5, "海東龍宮寺", "ja"),
    a(5, "ヨングンサ", "ja"),
    a(5, "海东龙宫寺", "zh"),
    a(5, "해동용궁사", "ko"),
    a(5, "용궁사", "ko"),
    a(5, "templo junto al mar", "es"),
    a(5, "templo yonggungsa", "es"),
    a(5, "templo del oceano busan", "es"),

    // ── [6] 국제시장 ──
    a(6, "gukje market", "en"),
    a(6, "gukje", "en"),
    a(6, "kukje market", "en"),           // MR
    a(6, "international market", "en"),
    a(6, "international market busan", "en"),
    a(6, "国際市場", "ja"),
    a(6, "クッチェ", "ja"),
    a(6, "国际市场", "zh"),
    a(6, "국제시장", "ko"),
    a(6, "mercado internacional", "es"),
    a(6, "mercado gukje", "es"),

    // ── [7] 범어사 ──
    a(7, "beomeosa", "en"),
    a(7, "beomeosa temple", "en"),
    a(7, "pomosa", "en"),                 // MR romanization
    a(7, "pomosa temple", "en"),          // MR
    a(7, "bumosa", "en"),                 // typo
    a(7, "beomeo temple", "en"),
    a(7, "beomosa", "en"),               // typo
    a(7, "梵魚寺", "ja"),
    a(7, "ポモサ", "ja"),
    a(7, "梵鱼寺", "zh"),
    a(7, "범어사", "ko"),
    a(7, "templo beomeosa", "es"),
    a(7, "templo en la montana busan", "es"),

    // ── [8] 송정 해수욕장 ──
    a(8, "songjeong", "en"),
    a(8, "songjeong beach", "en"),
    a(8, "songjung", "en"),               // MR
    a(8, "songjung beach", "en"),
    a(8, "松亭", "ja"),
    a(8, "松亭ビーチ", "ja"),
    a(8, "松亭海水浴场", "zh"),
    a(8, "송정", "ko"),
    a(8, "송정해수욕장", "ko"),
    a(8, "playa songjeong", "es"),
    a(8, "playa de surf busan", "es"),

    // ── [9] 다대포 해수욕장 ──
    a(9, "dadaepo", "en"),
    a(9, "dadaepo beach", "en"),
    a(9, "dadaepo sunset", "en"),
    a(9, "多大浦", "ja"),
    a(9, "多大浦ビーチ", "ja"),
    a(9, "多大浦海水浴场", "zh"),
    a(9, "다대포", "ko"),
    a(9, "다대포해수욕장", "ko"),
    a(9, "playa dadaepo", "es"),
    a(9, "atardecer dadaepo", "es"),

    // ── [10] 오륙도 스카이워크 ──
    a(10, "oryukdo", "en"),
    a(10, "oryukdo skywalk", "en"),
    a(10, "oryukdo sky walk", "en"),
    a(10, "five six island", "en"),
    a(10, "五六島", "ja"),
    a(10, "五六島スカイウォーク", "ja"),
    a(10, "五六岛", "zh"),
    a(10, "오륙도", "ko"),
    a(10, "오륙도스카이워크", "ko"),
    a(10, "pasarela oryukdo", "es"),
    a(10, "mirador de cristal busan", "es"),

    // ── [11] 동백섬 ──
    a(11, "dongbaekseom", "en"),
    a(11, "dongbaek island", "en"),
    a(11, "dongbaek", "en"),
    a(11, "camellia island", "en"),
    a(11, "冬柏島", "ja"),
    a(11, "冬柏岛", "zh"),
    a(11, "동백섬", "ko"),
    a(11, "동백", "ko"),
    a(11, "isla dongbaek", "es"),
    a(11, "isla de las camelias", "es"),

    // ── [12] BIFF 광장 ──
    a(12, "biff square", "en"),
    a(12, "biff plaza", "en"),
    a(12, "nampodong", "en"),
    a(12, "nampo dong", "en"),
    a(12, "BIFF広場", "ja"),
    a(12, "BIFF广场", "zh"),
    a(12, "비프광장", "ko"),
    a(12, "남포동", "ko"),
    a(12, "plaza biff", "es"),
    a(12, "plaza del cine busan", "es"),

    // ── [13] 흰여울문화마을 ──
    a(13, "huinnyeoul", "en"),
    a(13, "huinnyeoul village", "en"),
    a(13, "huinnyeoul culture village", "en"),
    a(13, "white rapids village", "en"),
    a(13, "ヒンヨウル", "ja"),
    a(13, "ヒンヨウル文化村", "ja"),
    a(13, "白浅滩文化村", "zh"),
    a(13, "흰여울", "ko"),
    a(13, "흰여울마을", "ko"),
    a(13, "흰여울문화마을", "ko"),
    a(13, "aldea huinnyeoul", "es"),
    a(13, "aldea costera busan", "es"),

    // ── [14] 용두산공원 & 부산타워 ──
    a(14, "busan tower", "en"),
    a(14, "yongdusan", "en"),
    a(14, "yongdusan park", "en"),
    a(14, "pusan tower", "en"),           // MR
    a(14, "龍頭山", "ja"),
    a(14, "釜山タワー", "ja"),
    a(14, "龙头山", "zh"),
    a(14, "釜山塔", "zh"),
    a(14, "용두산", "ko"),
    a(14, "용두산공원", "ko"),
    a(14, "부산타워", "ko"),
    a(14, "torre de busan", "es"),
    a(14, "parque yongdusan", "es"),
  ]).onConflictDoNothing();

  // ── Events (future dates to appear as active) ──
  console.log("Seeding events...");
  await db.insert(events).values([
    {
      nameKo: "부산 국제 불꽃축제",
      names: { en: "Busan International Fireworks Festival", ja: "釜山国際花火祭り", zh: "釜山国际烟花节", ko: "부산 국제 불꽃축제" },
      description: {
        en: "One of Asia's largest fireworks festivals held at Gwangalli Beach, featuring spectacular pyrotechnic displays by international teams with the Diamond Bridge as backdrop.",
        ja: "広安里ビーチで開催されるアジア最大級の花火大会。ダイヤモンドブリッジを背景に国際チームによる壮大な花火ショーが楽しめます。",
        zh: "在广安里海滩举办的亚洲最大烟花节之一，以钻石桥为背景，国际团队带来壮观的烟火表演。",
        ko: "광안리 해수욕장에서 열리는 아시아 최대 규모의 불꽃축제로, 광안대교를 배경으로 화려한 불꽃 쇼가 펼쳐집니다.",
      },
      category: "festival",
      venueName: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里海滩", ko: "광안리 해수욕장" },
      addressKo: "부산 수영구 광안해변로",
      latitude: "35.1531",
      longitude: "129.1186",
      startsAt: new Date("2026-10-25T18:00:00+09:00"),
      endsAt: new Date("2026-10-25T22:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장" },
      images: ["/images/events/fireworks.jpg"],
      source: "curated",
    },
    {
      nameKo: "부산 국제 영화제 (BIFF)",
      names: { en: "Busan International Film Festival (BIFF)", ja: "釜山国際映画祭 (BIFF)", zh: "釜山国际电影节 (BIFF)", ko: "부산 국제 영화제 (BIFF)" },
      description: {
        en: "Asia's premier film festival showcasing hundreds of films from around the world. Features outdoor screenings, star-studded red carpet events, and cultural programs.",
        ja: "世界中から数百本の映画が上映されるアジア最大の映画祭。野外上映、レッドカーペットイベント、文化プログラムが楽しめます。",
        zh: "亚洲首屈一指的电影节，展映来自世界各地的数百部电影，设有露天放映、红毯活动和文化项目。",
        ko: "전 세계 수백 편의 영화를 상영하는 아시아 최고의 영화제로, 야외 상영, 레드카펫 이벤트, 문화 프로그램 등이 진행됩니다.",
      },
      category: "festival",
      venueName: { en: "Busan Cinema Center", ja: "釜山シネマセンター", zh: "釜山电影中心", ko: "영화의 전당" },
      addressKo: "부산 해운대구 수영강변대로 120",
      latitude: "35.1649",
      longitude: "129.1343",
      startsAt: new Date("2026-10-07T10:00:00+09:00"),
      endsAt: new Date("2026-10-16T22:00:00+09:00"),
      priceInfo: { en: "Tickets from ₩7,000", ja: "チケット7,000ウォン～", zh: "票价7,000韩元起", ko: "티켓 7,000원부터" },
      bookingUrl: "https://www.biff.kr",
      images: ["/images/events/biff.jpg"],
      source: "curated",
    },
    {
      nameKo: "해운대 모래축제",
      names: { en: "Haeundae Sand Festival", ja: "海雲台砂まつり", zh: "海云台沙雕节", ko: "해운대 모래축제" },
      description: {
        en: "An annual beach festival featuring incredible sand sculptures by world-class artists, live performances, beach sports, and family activities along Haeundae Beach.",
        ja: "世界的なアーティストによる砂の彫刻、ライブパフォーマンス、ビーチスポーツが楽しめる年間ビーチフェスティバルです。",
        zh: "年度海滩节日，展示世界级艺术家创作的精美沙雕，还有现场表演、沙滩运动和家庭活动。",
        ko: "세계적인 아티스트들의 모래 조각, 라이브 공연, 비치 스포츠, 가족 체험활동이 가득한 해운대의 대표 축제입니다.",
      },
      category: "festival",
      venueName: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海滩", ko: "해운대 해수욕장" },
      addressKo: "부산 해운대구 해운대해변로 264",
      latitude: "35.1587",
      longitude: "129.1604",
      startsAt: new Date("2027-05-22T10:00:00+09:00"),
      endsAt: new Date("2027-05-25T21:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장" },
      images: ["/images/events/sand-festival.jpg"],
      source: "curated",
    },
    {
      nameKo: "부산 원아시아 페스티벌 (BOF)",
      names: { en: "Busan One Asia Festival (BOF)", ja: "釜山ワンアジアフェスティバル (BOF)", zh: "釜山同一个亚洲文化节 (BOF)", ko: "부산 원아시아 페스티벌 (BOF)" },
      description: {
        en: "A massive K-pop and Korean culture festival featuring top idol performances, fan meetings, K-beauty expos, and interactive hallyu experiences across Busan.",
        ja: "トップK-POPアイドルのパフォーマンス、ファンミーティング、K-ビューティーエキスポなど韓流体験が満載の大型フェスティバルです。",
        zh: "大型K-pop和韩国文化节，包括顶级偶像表演、粉丝见面会、K-beauty博览会和互动韩流体验。",
        ko: "K-pop 톱 아이돌 공연, 팬미팅, K-뷰티 엑스포 등 다양한 한류 체험이 가능한 대형 문화 축제입니다.",
      },
      category: "performance",
      venueName: { en: "Busan Asiad Main Stadium", ja: "釜山アジアド主競技場", zh: "釜山亚运会主体育场", ko: "부산아시아드 주경기장" },
      addressKo: "부산 연제구 월드컵대로 344",
      latitude: "35.1690",
      longitude: "129.0598",
      startsAt: new Date("2026-10-17T15:00:00+09:00"),
      endsAt: new Date("2026-10-26T22:00:00+09:00"),
      priceInfo: { en: "Free / paid seats available", ja: "無料 / 有料席あり", zh: "免费 / 有付费座位", ko: "무료 / 유료석 별도" },
      bookingUrl: "https://www.bof.or.kr",
      images: ["/images/events/bof.jpg"],
      source: "curated",
    },
    {
      nameKo: "부산 크리스마스 마켓",
      names: { en: "Busan Christmas Market", ja: "釜山クリスマスマーケット", zh: "釜山圣诞市集", ko: "부산 크리스마스 마켓" },
      description: {
        en: "A festive Christmas market at Haeundae featuring holiday decorations, handmade crafts, seasonal treats, mulled wine, and live caroling performances.",
        ja: "海雲台で開催されるクリスマスマーケット。ホリデーデコレーション、手作り雑貨、季節のグルメ、ホットワインが楽しめます。",
        zh: "在海云台举办的圣诞市集，设有节日装饰、手工艺品、季节美食、热红酒和现场圣歌表演。",
        ko: "해운대에서 열리는 크리스마스 마켓으로, 홀리데이 장식, 수공예품, 시즌 간식, 와인 등이 가득합니다.",
      },
      category: "exhibition",
      venueName: { en: "Haeundae Square", ja: "海雲台広場", zh: "海云台广场", ko: "해운대 광장" },
      addressKo: "부산 해운대구 구남로 41",
      latitude: "35.1592",
      longitude: "129.1598",
      startsAt: new Date("2026-12-15T11:00:00+09:00"),
      endsAt: new Date("2026-12-31T21:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장" },
      images: ["/images/events/christmas-market.jpg"],
      source: "curated",
    },
  ]);

  // ── Flows ──
  console.log("Seeding flows...");
  const [transitFlow] = await db.insert(flows).values([
    { name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索", zh: "查找路线", ko: "길찾기" }, sortOrder: 1 },
    { name: "tourism", icon: "🏖", displayNames: { en: "Tourist Spots", ja: "観光地", zh: "旅游景点", ko: "관광지/맛집" }, sortOrder: 2 },
    { name: "booking", icon: "🎫", displayNames: { en: "Book Activity", ja: "予約", zh: "预订", ko: "예약하기" }, sortOrder: 3 },
  ]).returning();

  if (transitFlow) {
    const steps = await db.insert(flowSteps).values([
      { flowId: transitFlow.id, stepOrder: 1, type: "text_input", messages: { en: "Where are you now?", ja: "今どこにいますか？", zh: "您现在在哪里？", ko: "현재 위치가 어디인가요?" } },
      { flowId: transitFlow.id, stepOrder: 2, type: "text_input", messages: { en: "Where would you like to go?", ja: "どこに行きたいですか？", zh: "您想去哪里？", ko: "어디로 가고 싶으세요?" } },
      { flowId: transitFlow.id, stepOrder: 3, type: "api_call", messages: {}, apiAction: "search_transit_route" },
      { flowId: transitFlow.id, stepOrder: 4, type: "result", messages: { en: "Here are your route options:", ja: "ルートオプション：", zh: "路线选项：", ko: "경로 옵션:" } },
    ]).returning();

    if (steps[1]) {
      await db.insert(flowOptions).values([
        { stepId: steps[1].id, labels: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台", ko: "해운대 해수욕장" }, value: "haeundae", sortOrder: 1 },
        { stepId: steps[1].id, labels: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里", ko: "광안리 해수욕장" }, value: "gwangalli", sortOrder: 2 },
        { stepId: steps[1].id, labels: { en: "Jagalchi Market", ja: "チャガルチ市場", zh: "扎嘎其市场", ko: "자갈치시장" }, value: "jagalchi", sortOrder: 3 },
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
