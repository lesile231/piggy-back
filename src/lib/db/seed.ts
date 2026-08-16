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
    { slug: "entertainment", names: { en: "Entertainment", ja: "エンタメ", zh: "娱乐", ko: "놀거리" }, icon: "🎢", sortOrder: 9 },
    { slug: "resort", names: { en: "Resort", ja: "リゾート", zh: "度假村", ko: "리조트" }, icon: "🏨", sortOrder: 10 },
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
      images: ["https://images.unsplash.com/photo-1701172189149-450eecf09863?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1703756292793-287f082d3a45?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1701595964277-712b453dd66b?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1749367092696-a8c42d0d552e?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1781204515940-b78666fcb0a8?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1748786919806-464841e61654?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1770297346253-f1255dd167dc?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1751820705348-386098a2c148?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1672842408576-5076d505d8c1?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1676290995185-0287c1b812ce?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1733683721857-6439cd6a8c68?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1778147356071-c8f5a7287ea6?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1758570764602-d57bc2922dea?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1741345380609-86aa10bb6f8d?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1686232344073-f1b7dd22ca6b?w=1200&h=630&fit=crop"],
      tags: ["park", "tower", "city-view", "landmark"],
      source: "curated",
    },
    // ── [15] 기장시장 ──
    {
      nameKo: "기장시장",
      names: { en: "Gijang Market", ja: "機張市場", zh: "机张市场", ko: "기장시장" },
      description: {
        en: "A traditional market in Gijang famous for fresh snow crab, seaweed, and local seafood. One of Busan's best spots for authentic, affordable seafood dining.",
        ja: "新鮮なズワイガニ、ワカメ、地元の海産物で有名な機張の伝統市場。手頃な価格で本格的な海鮮が楽しめます。",
        zh: "以新鲜雪蟹、海带和当地海鲜闻名的机张传统市场，是釜山品尝正宗实惠海鲜的好去处。",
        ko: "대게, 미역, 해산물로 유명한 기장의 전통시장으로, 싱싱한 해산물을 저렴하게 즐길 수 있는 부산의 명소입니다.",
      },
      addressKo: "부산 기장군 기장읍 읍내로104번길 16",
      addresses: { en: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑邑内路104番ギル16", zh: "釜山机张郡机张邑邑内路104番街16号" },
      latitude: "35.2448",
      longitude: "129.2183",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1590005354167-6da97870c757?w=1200&h=630&fit=crop"],
      tags: ["market", "seafood", "local-food", "traditional"],
      source: "curated",
    },
    // ── [16] 롯데월드 어드벤처 부산 ──
    {
      nameKo: "롯데월드 어드벤처 부산",
      names: { en: "Lotte World Adventure Busan", ja: "ロッテワールド アドベンチャー釜山", zh: "乐天世界冒险釜山", ko: "롯데월드 어드벤처 부산" },
      description: {
        en: "A world-class indoor theme park in Busan's Osiria Tourist Complex, featuring thrilling rides, fairy-tale themed zones, parades, and entertainment for all ages.",
        ja: "オシリア観光団地にある世界水準のテーマパーク。スリル満点のアトラクション、メルヘンゾーン、パレードが楽しめます。",
        zh: "位于釜山奥西利亚旅游区的世界级室内主题公园，拥有刺激的游乐设施、童话主题区、花车巡游等老少皆宜的娱乐项目。",
        ko: "오시리아 관광단지에 위치한 세계적 수준의 실내 테마파크로, 스릴 넘치는 놀이기구와 동화 테마존, 퍼레이드를 즐길 수 있습니다.",
      },
      addressKo: "부산 기장군 기장읍 동부산관광로 42",
      addresses: { en: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑東釜山観光路42番地", zh: "釜山机张郡机张邑东釜山观光路42号" },
      latitude: "35.1964",
      longitude: "129.2150",
      rating: "4.3",
      images: ["https://images.unsplash.com/photo-1569180880150-df4eed93c90b?w=1200&h=630&fit=crop"],
      tags: ["theme-park", "family", "indoor", "entertainment"],
      source: "curated",
    },
    // ── [17] 아난티 코브 ──
    {
      nameKo: "아난티 코브",
      names: { en: "Ananti Cove", ja: "アナンティ コーブ", zh: "安纳迪海湾", ko: "아난티 코브" },
      description: {
        en: "A luxury seaside resort complex in Gijang featuring the Banyan Tree Club & Spa, Hilton Busan, premium dining, and a scenic coastal promenade with ocean views.",
        ja: "バンヤンツリー クラブ&スパやヒルトン釜山を擁する機張の高級海辺リゾート。プレミアムダイニングと絶景の海岸散歩道が魅力です。",
        zh: "位于机张的豪华海滨度假村，拥有悦榕庄俱乐部和水疗中心、釜山希尔顿酒店、高级餐饮以及风景优美的海岸步道。",
        ko: "반얀트리 클럽 앤 스파, 힐튼 부산이 있는 기장의 럭셔리 해변 리조트 단지로, 프리미엄 다이닝과 오션뷰 해안 산책로가 매력적입니다.",
      },
      addressKo: "부산 기장군 기장읍 기장해안로 268-32",
      addresses: { en: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑機張海岸路268-32番地", zh: "釜山机张郡机张邑机张海岸路268-32号" },
      latitude: "35.1888",
      longitude: "129.2215",
      rating: "4.5",
      images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&h=630&fit=crop"],
      tags: ["resort", "luxury", "ocean-view", "spa"],
      source: "curated",
    },
    // ── [18] 스카이라인 루지 부산 ──
    {
      nameKo: "스카이라인 루지 부산",
      names: { en: "Skyline Luge Busan", ja: "スカイラインリュージュ釜山", zh: "天际滑车釜山", ko: "스카이라인 루지 부산" },
      description: {
        en: "An exciting gravity-fueled luge ride down scenic tracks with ocean views. Take the skyride chairlift up and race down on fun, easy-to-control luge carts.",
        ja: "海を見ながらスリル満点のリュージュを楽しめるアウトドア体験施設。スカイライドで上り、ルージュカートで爽快に下ります。",
        zh: "一项刺激的重力滑车体验，沿着有海景的赛道滑行。乘坐空中缆车上山，驾驶操控简便的滑车一路飞驰而下。",
        ko: "오션뷰를 배경으로 스릴 넘치는 루지 카트를 타고 내려오는 아웃도어 체험 시설입니다. 스카이라이드로 올라가 즐기는 짜릿한 질주!",
      },
      addressKo: "부산 기장군 기장읍 기장해안로 205",
      addresses: { en: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑機張海岸路205番地", zh: "釜山机张郡机张邑机张海岸路205号" },
      latitude: "35.1921",
      longitude: "129.2085",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1595780821298-5c93e27dba0f?w=1200&h=630&fit=crop"],
      tags: ["entertainment", "outdoor", "family", "ocean-view"],
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
    // Gijang Market → market, restaurant
    sc(15, "market"), sc(15, "restaurant"),
    // Lotte World Adventure Busan → entertainment
    sc(16, "entertainment"),
    // Ananti Cove → resort
    sc(17, "resort"),
    // Skyline Luge Busan → entertainment
    sc(18, "entertainment"),
  ];
  await db.insert(spotCategories).values(spotCatLinks);

  // ── Location Aliases (comprehensive coverage for §4.1 Stage 2) ──
  // Includes RR romanization, MR variants, common typos, phonetic approximations, CJK variants
  console.log("Seeding location aliases...");
  const a = (spotIdx: number, alias: string, lang: string, type: "place" | "area" = "place") => ({
    spotId: spots[spotIdx]!.id, alias, language: lang, source: "manual" as const, type,
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

    // ── [15] 기장시장 ──
    // Area aliases — "기장" is a district, not just the market
    a(15, "gijang", "en", "area"),
    a(15, "gijang-gun", "en", "area"),
    a(15, "kijang", "en", "area"),               // MR romanization
    a(15, "jigang", "en", "area"),               // common typo / reversed syllable
    a(15, "機張", "ja", "area"),
    a(15, "キジャン", "ja", "area"),
    a(15, "机张", "zh", "area"),
    a(15, "기장", "ko", "area"),
    // Place aliases — specific to 기장시장
    a(15, "gijang market", "en"),
    a(15, "kijang market", "en"),
    a(15, "gijang crab market", "en"),
    a(15, "snow crab market busan", "en"),
    a(15, "機張市場", "ja"),
    a(15, "机张市场", "zh"),
    a(15, "기장시장", "ko"),
    a(15, "기장대게", "ko"),
    a(15, "mercado gijang", "es"),
    a(15, "mercado de cangrejo busan", "es"),

    // ── [16] 롯데월드 어드벤처 부산 ──
    a(16, "lotte world", "en"),
    a(16, "lotte world busan", "en"),
    a(16, "lotte world adventure busan", "en"),
    a(16, "lotteworld", "en"),
    a(16, "lotteworld busan", "en"),
    a(16, "lotte theme park", "en"),
    a(16, "lotte theme park busan", "en"),
    a(16, "busan theme park", "en"),
    a(16, "ロッテワールド", "ja"),
    a(16, "ロッテワールド釜山", "ja"),
    a(16, "乐天世界", "zh"),
    a(16, "乐天世界釜山", "zh"),
    a(16, "롯데월드", "ko"),
    a(16, "롯데월드부산", "ko"),
    a(16, "롯데월드어드벤처부산", "ko"),
    a(16, "parque lotte world", "es"),
    a(16, "lotte world busan parque", "es"),

    // ── [17] 아난티 코브 ──
    a(17, "ananti", "en"),
    a(17, "ananti cove", "en"),
    a(17, "ananti cove busan", "en"),
    a(17, "ananti resort", "en"),
    a(17, "banyan tree busan", "en"),
    a(17, "banyan tree club busan", "en"),
    a(17, "banyantree busan", "en"),
    a(17, "hilton busan", "en"),
    a(17, "アナンティ", "ja"),
    a(17, "アナンティコーブ", "ja"),
    a(17, "バンヤンツリー釜山", "ja"),
    a(17, "安纳迪", "zh"),
    a(17, "安纳迪海湾", "zh"),
    a(17, "悦榕庄釜山", "zh"),
    a(17, "아난티", "ko"),
    a(17, "아난티코브", "ko"),
    a(17, "반얀트리", "ko"),
    a(17, "반얀트리부산", "ko"),
    a(17, "resort ananti", "es"),

    // ── [18] 스카이라인 루지 부산 ──
    a(18, "luge", "en"),
    a(18, "luge busan", "en"),
    a(18, "skyline luge", "en"),
    a(18, "skyline luge busan", "en"),
    a(18, "busan luge", "en"),
    a(18, "リュージュ", "ja"),
    a(18, "スカイラインリュージュ", "ja"),
    a(18, "リュージュ釜山", "ja"),
    a(18, "天际滑车", "zh"),
    a(18, "滑车釜山", "zh"),
    a(18, "루지", "ko"),
    a(18, "루지부산", "ko"),
    a(18, "스카이라인루지", "ko"),

    // ── 오시리아 관광단지 → 롯데월드(대표) + 각 시설 alias ──
    a(16, "osiria", "en"),
    a(16, "osiria busan", "en"),
    a(16, "osiria tourist complex", "en"),
    a(16, "dongbusan tourist complex", "en"),
    a(16, "オシリア", "ja"),
    a(16, "奥西利亚", "zh"),
    a(16, "오시리아", "ko"),
    a(16, "오시리아관광단지", "ko"),
    a(16, "동부산관광단지", "ko"),

    // ══════════════════════════════════════════════════════════════
    // Phonetic aliases for new languages (fr/de/it/es/id/th)
    // Each language's speakers write Korean names differently
    // ══════════════════════════════════════════════════════════════

    // ── [0] 해운대 해수욕장 — phonetic variants ──
    // French
    a(0, "heoundé", "fr"),
    a(0, "heunde", "fr"),
    a(0, "heounde", "fr"),
    a(0, "héoundé", "fr"),
    a(0, "plage de haeundae", "fr"),
    a(0, "plage haeundae", "fr"),
    a(0, "plage celebre busan", "fr"),
    // German
    a(0, "häunde", "de"),
    a(0, "heunde", "de"),
    a(0, "haunde", "de"),
    a(0, "häundä", "de"),
    a(0, "strand haeundae", "de"),
    a(0, "berühmter strand busan", "de"),
    // Italian
    a(0, "eunde", "it"),
    a(0, "heunde", "it"),
    a(0, "aiunde", "it"),
    a(0, "spiaggia haeundae", "it"),
    a(0, "spiaggia famosa busan", "it"),
    // Spanish
    a(0, "jeundae", "es"),
    a(0, "heunde", "es"),
    a(0, "jaeundae", "es"),
    // Indonesian
    a(0, "pantai haeundae", "id"),
    a(0, "pantai terkenal busan", "id"),
    a(0, "heunde", "id"),
    // Thai
    a(0, "แฮอุนแด", "th"),
    a(0, "แฮอันเด", "th"),
    a(0, "หาดแฮอุนแด", "th"),

    // ── [1] 자갈치시장 — phonetic variants ──
    // French
    a(1, "djagaltchi", "fr"),
    a(1, "tchagaltchi", "fr"),
    a(1, "marché aux poissons", "fr"),
    a(1, "marché jagalchi", "fr"),
    a(1, "marché aux poissons busan", "fr"),
    // German
    a(1, "dschagaltschi", "de"),
    a(1, "tschagaltschi", "de"),
    a(1, "fischmarkt busan", "de"),
    a(1, "fischmarkt jagalchi", "de"),
    // Italian
    a(1, "giagalci", "it"),
    a(1, "ciagalci", "it"),
    a(1, "mercato del pesce busan", "it"),
    a(1, "mercato jagalchi", "it"),
    // Indonesian
    a(1, "pasar ikan busan", "id"),
    a(1, "pasar jagalchi", "id"),
    a(1, "pasar ikan jagalchi", "id"),
    // Thai
    a(1, "จากัลชี", "th"),
    a(1, "ตลาดปลาจากัลชี", "th"),
    a(1, "ตลาดปลาปูซาน", "th"),

    // ── [2] 감천문화마을 — phonetic variants ──
    // French
    a(2, "gamtchon", "fr"),
    a(2, "gamtchone", "fr"),
    a(2, "gamtcheon", "fr"),
    a(2, "village gamcheon", "fr"),
    a(2, "village coloré busan", "fr"),
    a(2, "village culturel gamcheon", "fr"),
    a(2, "machu picchu de busan", "fr"),
    // German
    a(2, "gamtschon", "de"),
    a(2, "gamtscheon", "de"),
    a(2, "kulturdorf gamcheon", "de"),
    a(2, "buntes dorf busan", "de"),
    a(2, "machu picchu von busan", "de"),
    // Italian
    a(2, "gamcion", "it"),
    a(2, "gamceon", "it"),
    a(2, "villaggio gamcheon", "it"),
    a(2, "villaggio colorato busan", "it"),
    a(2, "machu picchu di busan", "it"),
    // Spanish
    a(2, "gamchon", "es"),
    a(2, "pueblo colorido busan", "es"),
    // Indonesian
    a(2, "desa gamcheon", "id"),
    a(2, "desa budaya gamcheon", "id"),
    a(2, "desa warna-warni busan", "id"),
    // Thai
    a(2, "คัมชอน", "th"),
    a(2, "หมู่บ้านวัฒนธรรมคัมชอน", "th"),
    a(2, "หมู่บ้านสีสัน", "th"),

    // ── [3] 광안리 해수욕장 — phonetic variants ──
    // French
    a(3, "kouangalli", "fr"),
    a(3, "kouanalli", "fr"),
    a(3, "gwangalli", "fr"),
    a(3, "kwanganli", "fr"),
    a(3, "plage gwangalli", "fr"),
    a(3, "pont diamant busan", "fr"),
    // German
    a(3, "kwangalli", "de"),
    a(3, "gwanganli", "de"),
    a(3, "strand gwangalli", "de"),
    a(3, "diamantbrücke strand", "de"),
    // Italian
    a(3, "guangalli", "it"),
    a(3, "cuangalli", "it"),
    a(3, "kwangalli", "it"),
    a(3, "spiaggia gwangalli", "it"),
    a(3, "ponte diamante busan", "it"),
    // Spanish
    a(3, "guangalli", "es"),
    a(3, "kuangalli", "es"),
    a(3, "puente diamante busan", "es"),
    // Indonesian
    a(3, "pantai gwangalli", "id"),
    a(3, "kwangalli", "id"),
    a(3, "jembatan berlian busan", "id"),
    // Thai
    a(3, "กวางอัลลี", "th"),
    a(3, "หาดกวางอัลลี", "th"),
    a(3, "สะพานเพชรปูซาน", "th"),

    // ── [4] 태종대 — phonetic variants ──
    // French
    a(4, "tedjongdé", "fr"),
    a(4, "parc taejongdae", "fr"),
    a(4, "falaises busan", "fr"),
    // German
    a(4, "tädschongdä", "de"),
    a(4, "klippen busan", "de"),
    a(4, "park taejongdae", "de"),
    // Italian
    a(4, "tegionddè", "it"),
    a(4, "parco taejongdae", "it"),
    a(4, "scogliere busan", "it"),
    // Indonesian
    a(4, "taman taejongdae", "id"),
    a(4, "tebing busan", "id"),
    // Thai
    a(4, "แทจงแด", "th"),
    a(4, "อุทยานแทจงแด", "th"),

    // ── [5] 해동용궁사 — phonetic variants ──
    // French
    a(5, "yonggounsa", "fr"),
    a(5, "temple yonggungsa", "fr"),
    a(5, "temple au bord de mer busan", "fr"),
    // German
    a(5, "yonggungsa tempel", "de"),
    a(5, "meerestempel busan", "de"),
    // Italian
    a(5, "tempio yonggungsa", "it"),
    a(5, "tempio sul mare busan", "it"),
    // Indonesian
    a(5, "kuil yonggungsa", "id"),
    a(5, "kuil tepi laut busan", "id"),
    // Thai
    a(5, "วัดยงกุงซา", "th"),
    a(5, "วัดริมทะเลปูซาน", "th"),

    // ── [6] 국제시장 — phonetic variants ──
    // French
    a(6, "marché international", "fr"),
    a(6, "marché gukje", "fr"),
    a(6, "marché international busan", "fr"),
    a(6, "koukdjé", "fr"),
    // German
    a(6, "internationaler markt", "de"),
    a(6, "gukje markt", "de"),
    a(6, "kukdsche", "de"),
    // Italian
    a(6, "mercato internazionale", "it"),
    a(6, "mercato gukje", "it"),
    a(6, "kukje", "it"),
    // Indonesian
    a(6, "pasar internasional", "id"),
    a(6, "pasar gukje", "id"),
    a(6, "pasar internasional busan", "id"),
    // Thai
    a(6, "กุกเจ", "th"),
    a(6, "ตลาดกุกเจ", "th"),
    a(6, "ตลาดนานาชาติปูซาน", "th"),

    // ── [7] 범어사 — phonetic variants ──
    // French
    a(7, "temple beomeosa", "fr"),
    a(7, "temple de montagne busan", "fr"),
    a(7, "pomosa", "fr"),
    // German
    a(7, "beomeosa tempel", "de"),
    a(7, "bergtempel busan", "de"),
    // Italian
    a(7, "tempio beomeosa", "it"),
    a(7, "tempio di montagna busan", "it"),
    // Indonesian
    a(7, "kuil beomeosa", "id"),
    a(7, "kuil gunung busan", "id"),
    // Thai
    a(7, "วัดบอมอซา", "th"),
    a(7, "วัดบนเขาปูซาน", "th"),

    // ── [15] 기장시장 — phonetic variants ──
    // French — area (district name phonetics)
    a(15, "guidjang", "fr", "area"),
    a(15, "guijiang", "fr", "area"),
    a(15, "kidjang", "fr", "area"),
    a(15, "gidjang", "fr", "area"),
    // French — place (market-specific)
    a(15, "marché gijang", "fr"),
    a(15, "marché au crabe busan", "fr"),
    // German — area
    a(15, "gidschang", "de", "area"),
    a(15, "kidschang", "de", "area"),
    // German — place
    a(15, "gijang markt", "de"),
    a(15, "krabbenmarkt busan", "de"),
    // Italian — area
    a(15, "ghigiang", "it", "area"),
    // Italian — place
    a(15, "mercato gijang", "it"),
    a(15, "mercato del granchio busan", "it"),
    // Indonesian — area
    a(15, "kijang", "id", "area"),
    // Indonesian — place
    a(15, "pasar gijang", "id"),
    a(15, "pasar kepiting busan", "id"),
    // Thai — area
    a(15, "กีจัง", "th", "area"),
    // Thai — place
    a(15, "ตลาดกีจัง", "th"),
    a(15, "ตลาดปูหิมะปูซาน", "th"),

    // ── [16] 롯데월드 어드벤처 부산 — phonetic variants ──
    // French
    a(16, "lotte world busan", "fr"),
    a(16, "lotteu world", "fr"),
    a(16, "lotteu worldeu", "fr"),
    a(16, "parc lotte world", "fr"),
    a(16, "parc d'attractions busan", "fr"),
    // German
    a(16, "lotte world busan", "de"),
    a(16, "lotte welt busan", "de"),
    a(16, "freizeitpark busan", "de"),
    a(16, "vergnügungspark busan", "de"),
    // Italian
    a(16, "lotte world busan", "it"),
    a(16, "lotte uorld busan", "it"),
    a(16, "parco divertimenti busan", "it"),
    // Spanish
    a(16, "lotte world busan", "es"),
    a(16, "parque lotte world", "es"),
    a(16, "parque de atracciones busan", "es"),
    // Indonesian
    a(16, "lotte world busan", "id"),
    a(16, "taman hiburan busan", "id"),
    // Thai
    a(16, "ล็อตเต้เวิลด์", "th"),
    a(16, "ล็อตเต้เวิลด์ปูซาน", "th"),
    a(16, "สวนสนุกปูซาน", "th"),

    // ── [17] 아난티 코브 — phonetic variants ──
    // French
    a(17, "ananti cove", "fr"),
    a(17, "banyan tree busan", "fr"),
    a(17, "resort de luxe busan", "fr"),
    // German
    a(17, "ananti cove", "de"),
    a(17, "banyan tree busan", "de"),
    a(17, "luxusresort busan", "de"),
    // Italian
    a(17, "ananti cove", "it"),
    a(17, "banyan tree busan", "it"),
    a(17, "resort di lusso busan", "it"),
    // Indonesian
    a(17, "ananti cove", "id"),
    a(17, "banyan tree busan", "id"),
    a(17, "resor mewah busan", "id"),
    // Thai
    a(17, "อนันตี", "th"),
    a(17, "อนันตีโคฟ", "th"),
    a(17, "บันยันทรีปูซาน", "th"),

    // ── [18] 스카이라인 루지 부산 — phonetic variants ──
    // French
    a(18, "luge busan", "fr"),
    a(18, "skyline luge busan", "fr"),
    // German
    a(18, "luge busan", "de"),
    a(18, "rodelbahn busan", "de"),
    a(18, "skyline luge busan", "de"),
    // Italian
    a(18, "slittino busan", "it"),
    a(18, "luge busan", "it"),
    a(18, "skyline luge busan", "it"),
    // Indonesian
    a(18, "luge busan", "id"),
    a(18, "skyline luge busan", "id"),
    // Thai
    a(18, "ลูจปูซาน", "th"),
    a(18, "สกายไลน์ลูจ", "th"),
    a(18, "สกายไลน์ลูจปูซาน", "th"),
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
      images: ["https://images.unsplash.com/photo-1610343744628-c8e13a666dc0?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1781174849398-27a0d3f0de8b?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1660291120699-cd4938af5277?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1760966362386-e1012dbc3657?w=1200&h=630&fit=crop"],
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
      images: ["https://images.unsplash.com/photo-1761273075575-b006f7e43e06?w=1200&h=630&fit=crop"],
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
