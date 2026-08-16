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
    { slug: "beach", names: { en: "Beach", ja: "ビーチ", zh: "海滩", ko: "해변", es: "Playa", fr: "Plage", de: "Strand", it: "Spiaggia", id: "Pantai", th: "ชายหาด" }, icon: "🏖", sortOrder: 1 },
    { slug: "restaurant", names: { en: "Restaurant", ja: "レストラン", zh: "餐厅", ko: "맛집", es: "Restaurante", fr: "Restaurant", de: "Restaurant", it: "Ristorante", id: "Restoran", th: "ร้านอาหาร" }, icon: "🍽", sortOrder: 2 },
    { slug: "market", names: { en: "Market", ja: "市場", zh: "市场", ko: "시장", es: "Mercado", fr: "Marche", de: "Markt", it: "Mercato", id: "Pasar", th: "ตลาด" }, icon: "🏪", sortOrder: 3 },
    { slug: "temple", names: { en: "Temple", ja: "寺院", zh: "寺庙", ko: "사찰", es: "Templo", fr: "Temple", de: "Tempel", it: "Tempio", id: "Kuil", th: "วัด" }, icon: "🏛", sortOrder: 4 },
    { slug: "cafe", names: { en: "Cafe", ja: "カフェ", zh: "咖啡厅", ko: "카페", es: "Cafe", fr: "Cafe", de: "Cafe", it: "Caffe", id: "Kafe", th: "คาเฟ่" }, icon: "☕", sortOrder: 5 },
    { slug: "park", names: { en: "Park", ja: "公園", zh: "公园", ko: "공원", es: "Parque", fr: "Parc", de: "Park", it: "Parco", id: "Taman", th: "สวนสาธารณะ" }, icon: "🌳", sortOrder: 6 },
    { slug: "culture", names: { en: "Culture", ja: "文化", zh: "文化", ko: "문화", es: "Cultura", fr: "Culture", de: "Kultur", it: "Cultura", id: "Budaya", th: "วัฒนธรรม" }, icon: "🎭", sortOrder: 7 },
    { slug: "shopping", names: { en: "Shopping", ja: "ショッピング", zh: "购物", ko: "쇼핑", es: "Compras", fr: "Shopping", de: "Einkaufen", it: "Shopping", id: "Belanja", th: "ช้อปปิ้ง" }, icon: "🛍", sortOrder: 8 },
    { slug: "entertainment", names: { en: "Entertainment", ja: "エンタメ", zh: "娱乐", ko: "놀거리", es: "Entretenimiento", fr: "Divertissement", de: "Unterhaltung", it: "Intrattenimento", id: "Hiburan", th: "ความบันเทิง" }, icon: "🎢", sortOrder: 9 },
    { slug: "resort", names: { en: "Resort", ja: "リゾート", zh: "度假村", ko: "리조트", es: "Resort", fr: "Complexe", de: "Resort", it: "Resort", id: "Resor", th: "รีสอร์ท" }, icon: "🏨", sortOrder: 10 },
  ]).returning();

  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id])) as Record<string, string>;

  // ── Tourism Spots ──
  console.log("Seeding tourism spots...");
  const spots = await db.insert(tourismSpots).values([
    {
      nameKo: "해운대 해수욕장",
      names: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海水浴场", ko: "해운대 해수욕장", es: "Playa Haeundae", fr: "Plage de Haeundae", de: "Haeundae Strand", it: "Spiaggia di Haeundae", id: "Pantai Haeundae", th: "หาดแฮอุนแด" },
      description: {
        en: "Korea's most famous beach, stretching 1.5 km along the coast with fine white sand. A hub for water sports, festivals, and vibrant nightlife.",
        ja: "韓国で最も有名なビーチ。白い砂浜が1.5km続き、ウォータースポーツやフェスティバルが楽しめます。",
        zh: "韩国最著名的海滩，绵延1.5公里的白色沙滩，是水上运动、节日和夜生活的中心。",
        ko: "대한민국 최고의 해수욕장으로, 1.5km의 하얀 모래사장이 펼쳐진 부산의 대표 관광지입니다.",
        es: "La playa mas famosa de Corea, con 1,5 km de fina arena blanca. Un centro de deportes acuaticos, festivales y animada vida nocturna.",
        fr: "La plage la plus celebre de Coree, s'etendant sur 1,5 km avec du sable blanc fin. Un haut lieu des sports nautiques, des festivals et de la vie nocturne.",
        de: "Koreas beruhmtester Strand mit 1,5 km feinem weissen Sand. Ein Zentrum fur Wassersport, Festivals und pulsierendes Nachtleben.",
        it: "La spiaggia piu famosa della Corea, con 1,5 km di sabbia bianca finissima. Un punto di riferimento per sport acquatici, festival e vita notturna.",
        id: "Pantai paling terkenal di Korea, membentang 1,5 km dengan pasir putih halus. Pusat olahraga air, festival, dan kehidupan malam yang semarak.",
        th: "หาดที่มีชื่อเสียงที่สุดของเกาหลี ทอดยาว 1.5 กม. ด้วยทรายขาวละเอียด เป็นศูนย์กลางกีฬาทางน้ำ เทศกาล และชีวิตกลางคืน",
      },
      addressKo: "부산 해운대구 우동 해운대해변로 264",
      addresses: { en: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", ja: "釜山市海雲台区佑洞264番地", zh: "釜山海云台区佑洞海云台海边路264号", es: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", fr: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", de: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", it: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", id: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan", th: "264 Haeundaehaebyeon-ro, U-dong, Haeundae-gu, Busan" },
      latitude: "35.1587",
      longitude: "129.1604",
      rating: "4.7",
      images: ["https://images.unsplash.com/photo-1701172189149-450eecf09863?w=1200&h=630&fit=crop"],
      tags: ["beach", "swimming", "nightlife", "family"],
      source: "curated",
    },
    {
      nameKo: "자갈치시장",
      names: { en: "Jagalchi Fish Market", ja: "チャガルチ市場", zh: "扎嘎其市场", ko: "자갈치시장", es: "Mercado de Pescado Jagalchi", fr: "Marche aux poissons de Jagalchi", de: "Jagalchi Fischmarkt", it: "Mercato del Pesce di Jagalchi", id: "Pasar Ikan Jagalchi", th: "ตลาดปลาจากัลชี" },
      description: {
        en: "Korea's largest seafood market where you can buy fresh fish and have it prepared on the spot. A must-visit for seafood lovers.",
        ja: "韓国最大の水産市場。新鮮な魚をその場で調理してもらえます。シーフード好き必見のスポットです。",
        zh: "韩国最大的海鲜市场，您可以购买新鲜鱼类并当场烹饪。海鲜爱好者的必去之地。",
        ko: "대한민국 최대의 수산시장으로, 싱싱한 해산물을 현장에서 맛볼 수 있는 부산의 명소입니다.",
        es: "El mercado de mariscos mas grande de Corea, donde puedes comprar pescado fresco y que te lo preparen al momento. Visita obligada para los amantes del marisco.",
        fr: "Le plus grand marche aux fruits de mer de Coree, ou l'on peut acheter du poisson frais et le faire preparer sur place. Incontournable pour les amateurs de fruits de mer.",
        de: "Koreas grosster Fischmarkt, auf dem man frischen Fisch kaufen und direkt vor Ort zubereiten lassen kann. Ein Muss fur Liebhaber von Meeresfruchten.",
        it: "Il mercato ittico piu grande della Corea, dove si puo acquistare pesce fresco e farlo preparare al momento. Una tappa obbligatoria per gli amanti dei frutti di mare.",
        id: "Pasar makanan laut terbesar di Korea, tempat Anda bisa membeli ikan segar dan langsung diolah di tempat. Wajib dikunjungi pecinta seafood.",
        th: "ตลาดอาหารทะเลที่ใหญ่ที่สุดในเกาหลี ซื้อปลาสดและให้ปรุงให้ทันที สถานที่ที่ต้องไปสำหรับคนรักอาหารทะเล",
      },
      addressKo: "부산 중구 자갈치해안로 52",
      addresses: { en: "52 Jagalchihaean-ro, Jung-gu, Busan", ja: "釜山市中区チャガルチ海岸路52番地", zh: "釜山中区扎嘎其海岸路52号", es: "52 Jagalchihaean-ro, Jung-gu, Busan", fr: "52 Jagalchihaean-ro, Jung-gu, Busan", de: "52 Jagalchihaean-ro, Jung-gu, Busan", it: "52 Jagalchihaean-ro, Jung-gu, Busan", id: "52 Jagalchihaean-ro, Jung-gu, Busan", th: "52 Jagalchihaean-ro, Jung-gu, Busan" },
      latitude: "35.0968",
      longitude: "129.0305",
      rating: "4.5",
      images: ["https://images.unsplash.com/photo-1703756292793-287f082d3a45?w=1200&h=630&fit=crop"],
      tags: ["market", "seafood", "local-food"],
      source: "curated",
    },
    {
      nameKo: "감천문화마을",
      names: { en: "Gamcheon Culture Village", ja: "甘川文化村", zh: "甘川文化村", ko: "감천문화마을", es: "Aldea Cultural Gamcheon", fr: "Village culturel de Gamcheon", de: "Gamcheon Kulturdorf", it: "Villaggio Culturale di Gamcheon", id: "Desa Budaya Gamcheon", th: "หมู่บ้านวัฒนธรรมคัมชอน" },
      description: {
        en: "A colorful hillside village known as the 'Machu Picchu of Busan', featuring vibrant murals, art installations, and charming alleyways.",
        ja: "「釜山のマチュピチュ」と呼ばれるカラフルな丘の上の村。鮮やかな壁画やアート作品が楽しめます。",
        zh: "被称为「釜山的马丘比丘」的色彩缤纷的山坡村庄，拥有鲜艳的壁画、艺术装置和迷人的小巷。",
        ko: "'부산의 마추픽추'로 불리는 알록달록한 벽화마을로, 예술 작품과 골목길이 매력적입니다.",
        es: "Un colorido pueblo en la ladera conocido como el 'Machu Picchu de Busan', con vibrantes murales, instalaciones artisticas y encantadores callejones.",
        fr: "Un village colore a flanc de colline surnomme le 'Machu Picchu de Busan', avec ses fresques murales, ses installations artistiques et ses ruelles charmantes.",
        de: "Ein farbenfrohes Hangdorf, bekannt als das 'Machu Picchu von Busan', mit lebendigen Wandmalereien, Kunstinstallationen und charmanten Gassen.",
        it: "Un colorato villaggio collinare noto come il 'Machu Picchu di Busan', con vivaci murales, installazioni artistiche e affascinanti vicoli.",
        id: "Desa perbukitan berwarna-warni yang dikenal sebagai 'Machu Picchu Busan', dengan mural cerah, instalasi seni, dan gang-gang yang menawan.",
        th: "หมู่บ้านบนเนินเขาสีสันสดใส ที่รู้จักกันในชื่อ 'มาชูปิกชูแห่งปูซาน' มีจิตรกรรมฝาผนัง งานศิลปะ และตรอกซอกซอยที่มีเสน่ห์",
      },
      addressKo: "부산 사하구 감내2로 203",
      addresses: { en: "203 Gamnae 2-ro, Saha-gu, Busan", ja: "釜山市沙下区甘内2路203番地", zh: "釜山沙下区甘内2路203号", es: "203 Gamnae 2-ro, Saha-gu, Busan", fr: "203 Gamnae 2-ro, Saha-gu, Busan", de: "203 Gamnae 2-ro, Saha-gu, Busan", it: "203 Gamnae 2-ro, Saha-gu, Busan", id: "203 Gamnae 2-ro, Saha-gu, Busan", th: "203 Gamnae 2-ro, Saha-gu, Busan" },
      latitude: "35.0975",
      longitude: "129.0106",
      rating: "4.6",
      images: ["https://images.unsplash.com/photo-1701595964277-712b453dd66b?w=1200&h=630&fit=crop"],
      tags: ["culture", "art", "photo-spot", "walking"],
      source: "curated",
    },
    {
      nameKo: "광안리 해수욕장",
      names: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里海水浴场", ko: "광안리 해수욕장", es: "Playa Gwangalli", fr: "Plage de Gwangalli", de: "Gwangalli Strand", it: "Spiaggia di Gwangalli", id: "Pantai Gwangalli", th: "หาดกวางอัลลี" },
      description: {
        en: "A beautiful urban beach famous for its stunning night view of the Gwangan Bridge (Diamond Bridge). Popular for cafes and bars along the waterfront.",
        ja: "広安大橋（ダイヤモンドブリッジ）の夜景が美しい都市型ビーチ。海沿いのカフェやバーが人気です。",
        zh: "以广安大桥（钻石桥）夜景闻名的美丽都市海滩，海滨沿线咖啡馆和酒吧林立。",
        ko: "광안대교(다이아몬드 브릿지)의 야경으로 유명한 도심 해변으로, 해변가 카페와 바가 인기입니다.",
        es: "Una hermosa playa urbana famosa por su impresionante vista nocturna del Puente Gwangan (Puente Diamante). Popular por sus cafes y bares frente al mar.",
        fr: "Une belle plage urbaine celebre pour sa vue nocturne spectaculaire du pont Gwangan (pont Diamant). Tres prisee pour ses cafes et bars en bord de mer.",
        de: "Ein wunderschoner Stadtstrand, beruhmt fur den atemberaubenden Nachtblick auf die Gwangan-Brucke (Diamantbrucke). Beliebt fur Cafes und Bars entlang der Promenade.",
        it: "Una splendida spiaggia urbana famosa per la vista notturna mozzafiato del Ponte Gwangan (Ponte Diamante). Rinomata per i caffe e i bar sul lungomare.",
        id: "Pantai kota yang indah, terkenal dengan pemandangan malam Jembatan Gwangan (Jembatan Berlian). Populer dengan kafe dan bar di sepanjang tepi laut.",
        th: "ชายหาดในเมืองที่สวยงาม มีชื่อเสียงจากวิวกลางคืนของสะพานกวางอัน (สะพานเพชร) เป็นที่นิยมด้วยคาเฟ่และบาร์ริมทะเล",
      },
      addressKo: "부산 수영구 광안해변로 219",
      addresses: { en: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", ja: "釜山市水営区広安海辺路219番地", zh: "釜山水营区广安海边路219号", es: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", fr: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", de: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", it: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", id: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", th: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan" },
      latitude: "35.1531",
      longitude: "129.1186",
      rating: "4.6",
      images: ["https://images.unsplash.com/photo-1749367092696-a8c42d0d552e?w=1200&h=630&fit=crop"],
      tags: ["beach", "nightlife", "cafe", "bridge-view"],
      source: "curated",
    },
    {
      nameKo: "태종대",
      names: { en: "Taejongdae Resort Park", ja: "太宗台", zh: "太宗台", ko: "태종대", es: "Parque Taejongdae", fr: "Parc de Taejongdae", de: "Taejongdae Naturpark", it: "Parco di Taejongdae", id: "Taman Taejongdae", th: "อุทยานแทจงแด" },
      description: {
        en: "A scenic coastal park on Yeongdo Island with dramatic cliffs, a lighthouse, and panoramic ocean views. Take the Danubi train around the park.",
        ja: "影島にある海岸公園。断崖絶壁、灯台、パノラマの海の景色が楽しめます。ダヌビ列車で園内を巡れます。",
        zh: "位于影岛的海滨公园，拥有壮观的悬崖、灯塔和全景海景。可以乘坐丹努比列车环游公园。",
        ko: "영도에 위치한 해안 절경 공원으로, 절벽, 등대, 탁 트인 바다 전망이 일품입니다. 다누비 열차로 편하게 관람할 수 있습니다.",
        es: "Un pintoresco parque costero en la isla de Yeongdo con impresionantes acantilados, un faro y vistas panoramicas al oceano. Recorre el parque en el tren Danubi.",
        fr: "Un parc cotier pittoresque sur l'ile de Yeongdo avec des falaises spectaculaires, un phare et des vues panoramiques sur l'ocean. Parcourez le parc en petit train Danubi.",
        de: "Ein malerischer Kustenpark auf der Insel Yeongdo mit dramatischen Klippen, einem Leuchtturm und Panoramablick auf den Ozean. Erkunden Sie den Park mit der Danubi-Bahn.",
        it: "Un pittoresco parco costiero sull'isola di Yeongdo con scogliere spettacolari, un faro e viste panoramiche sull'oceano. Percorri il parco con il trenino Danubi.",
        id: "Taman pesisir yang indah di Pulau Yeongdo dengan tebing dramatis, mercusuar, dan pemandangan laut panoramis. Naiki kereta Danubi untuk berkeliling taman.",
        th: "สวนสาธารณะริมชายฝั่งบนเกาะยองโด มีหน้าผาสูงชัน ประภาคาร และวิวทะเลแบบพาโนรามา นั่งรถไฟดานูบิชมรอบสวน",
      },
      addressKo: "부산 영도구 전망로 24",
      addresses: { en: "24 Jeonmang-ro, Yeongdo-gu, Busan", ja: "釜山市影島区展望路24番地", zh: "釜山影岛区展望路24号", es: "24 Jeonmang-ro, Yeongdo-gu, Busan", fr: "24 Jeonmang-ro, Yeongdo-gu, Busan", de: "24 Jeonmang-ro, Yeongdo-gu, Busan", it: "24 Jeonmang-ro, Yeongdo-gu, Busan", id: "24 Jeonmang-ro, Yeongdo-gu, Busan", th: "24 Jeonmang-ro, Yeongdo-gu, Busan" },
      latitude: "35.0518",
      longitude: "129.0847",
      rating: "4.5",
      images: ["https://images.unsplash.com/photo-1781204515940-b78666fcb0a8?w=1200&h=630&fit=crop"],
      tags: ["park", "nature", "ocean-view", "lighthouse"],
      source: "curated",
    },
    {
      nameKo: "해동용궁사",
      names: { en: "Haedong Yonggungsa Temple", ja: "海東龍宮寺", zh: "海东龙宫寺", ko: "해동용궁사", es: "Templo Haedong Yonggungsa", fr: "Temple Haedong Yonggungsa", de: "Haedong Yonggungsa Tempel", it: "Tempio Haedong Yonggungsa", id: "Kuil Haedong Yonggungsa", th: "วัดแฮดงยงกุงซา" },
      description: {
        en: "A stunning seaside Buddhist temple perched on the rugged coastline. One of the few temples in Korea built on the ocean shore.",
        ja: "荒々しい海岸線に建つ美しい海辺の仏教寺院。韓国では数少ない海岸沿いの寺院です。",
        zh: "坐落在崎岖海岸线上的壮丽海滨佛教寺庙，是韩国少数建在海岸边的寺庙之一。",
        ko: "해안 절벽 위에 자리한 아름다운 해변 사찰로, 바다와 절이 어우러진 한국의 대표적인 해안 사찰입니다.",
        es: "Un impresionante templo budista junto al mar, ubicado en la escarpada costa. Uno de los pocos templos en Corea construidos a orillas del oceano.",
        fr: "Un magnifique temple bouddhiste en bord de mer, perche sur la cote accidentee. L'un des rares temples en Coree construit au bord de l'ocean.",
        de: "Ein atemberaubender buddhistischer Tempel am Meer, auf der zerklafteten Kaste gelegen. Einer der wenigen Tempel in Korea, die direkt an der Ozeankuste erbaut wurden.",
        it: "Uno splendido tempio buddista sul mare, arroccato sulla costa frastagliata. Uno dei pochi templi in Corea costruiti sulla riva dell'oceano.",
        id: "Kuil Buddha tepi laut yang menakjubkan, bertengger di pesisir yang terjal. Salah satu dari sedikit kuil di Korea yang dibangun di tepi pantai.",
        th: "วัดพุทธริมทะเลที่งดงาม ตั้งอยู่บนชายฝั่งที่ขรุขระ เป็นหนึ่งในไม่กี่วัดในเกาหลีที่สร้างบนริมมหาสมุทร",
      },
      addressKo: "부산 기장군 기장읍 용궁길 86",
      addresses: { en: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑龍宮路86番地", zh: "釜山机张郡机张邑龙宫路86号", es: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", fr: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", de: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", it: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", id: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan", th: "86 Yonggung-gil, Gijang-eup, Gijang-gun, Busan" },
      latitude: "35.1884",
      longitude: "129.2233",
      rating: "4.6",
      images: ["https://images.unsplash.com/photo-1748786919806-464841e61654?w=1200&h=630&fit=crop"],
      tags: ["temple", "ocean-view", "spiritual", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "국제시장",
      names: { en: "Gukje Market (International Market)", ja: "国際市場", zh: "国际市场", ko: "국제시장", es: "Mercado Gukje (Mercado Internacional)", fr: "Marche Gukje (Marche International)", de: "Gukje Markt (Internationaler Markt)", it: "Mercato Gukje (Mercato Internazionale)", id: "Pasar Gukje (Pasar Internasional)", th: "ตลาดกุกเจ (ตลาดนานาชาติ)" },
      description: {
        en: "One of Korea's largest traditional markets with hundreds of shops selling everything from clothing and accessories to street food and souvenirs.",
        ja: "韓国最大級の伝統市場。衣料品やアクセサリーから屋台グルメ、お土産まで数百の店が軒を連ねます。",
        zh: "韩国最大的传统市场之一，拥有数百家商店，从服装配饰到街头美食和纪念品应有尽有。",
        ko: "의류, 액세서리, 길거리 음식, 기념품 등을 파는 수백 개의 상점이 모여 있는 부산의 대표 전통시장입니다.",
        es: "Uno de los mercados tradicionales mas grandes de Corea, con cientos de tiendas que venden desde ropa y accesorios hasta comida callejera y recuerdos.",
        fr: "L'un des plus grands marches traditionnels de Coree, avec des centaines de boutiques vendant de tout : vetements, accessoires, cuisine de rue et souvenirs.",
        de: "Einer der grossten traditionellen Markte Koreas mit Hunderten von Geschaften, die alles von Kleidung und Accessoires bis hin zu Strassenkuche und Souvenirs anbieten.",
        it: "Uno dei piu grandi mercati tradizionali della Corea, con centinaia di negozi che vendono di tutto, dall'abbigliamento allo street food e ai souvenir.",
        id: "Salah satu pasar tradisional terbesar di Korea dengan ratusan toko yang menjual segalanya, dari pakaian dan aksesori hingga jajanan kaki lima dan suvenir.",
        th: "หนึ่งในตลาดดั้งเดิมที่ใหญ่ที่สุดของเกาหลี มีร้านค้าหลายร้อยร้าน ขายทุกอย่างตั้งแต่เสื้อผ้า เครื่องประดับ ไปจนถึงอาหารริมทางและของที่ระลึก",
      },
      addressKo: "부산 중구 신창동4가",
      addresses: { en: "Sinchang-dong 4-ga, Jung-gu, Busan", ja: "釜山市中区新昌洞4街", zh: "釜山中区新昌洞4街", es: "Sinchang-dong 4-ga, Jung-gu, Busan", fr: "Sinchang-dong 4-ga, Jung-gu, Busan", de: "Sinchang-dong 4-ga, Jung-gu, Busan", it: "Sinchang-dong 4-ga, Jung-gu, Busan", id: "Sinchang-dong 4-ga, Jung-gu, Busan", th: "Sinchang-dong 4-ga, Jung-gu, Busan" },
      latitude: "35.1007",
      longitude: "129.0290",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1770297346253-f1255dd167dc?w=1200&h=630&fit=crop"],
      tags: ["market", "shopping", "street-food", "traditional"],
      source: "curated",
    },
    {
      nameKo: "범어사",
      names: { en: "Beomeosa Temple", ja: "梵魚寺", zh: "梵鱼寺", ko: "범어사", es: "Templo Beomeosa", fr: "Temple Beomeosa", de: "Beomeosa Tempel", it: "Tempio Beomeosa", id: "Kuil Beomeosa", th: "วัดบอมอซา" },
      description: {
        en: "One of Korea's most important Buddhist temples, nestled in the forests of Mt. Geumjeongsan. Founded in 678 AD, it features stunning architecture and serene mountain trails.",
        ja: "韓国で最も重要な仏教寺院のひとつ。金井山の森に抱かれた678年創建の名刹で、美しい建築と静寂な山道が魅力です。",
        zh: "韩国最重要的佛教寺庙之一，坐落在金井山森林中。建于公元678年，拥有令人惊叹的建筑和宁静的山间步道。",
        ko: "금정산 자락에 자리한 한국의 대표적인 사찰로, 678년에 창건되어 아름다운 건축과 산책로가 유명합니다.",
        es: "Uno de los templos budistas mas importantes de Corea, ubicado en los bosques del monte Geumjeongsan. Fundado en el 678 d.C., destaca por su arquitectura y sus senderos de montana.",
        fr: "L'un des temples bouddhistes les plus importants de Coree, niche dans les forets du mont Geumjeongsan. Fonde en 678 apr. J.-C., il offre une architecture remarquable et des sentiers de montagne paisibles.",
        de: "Einer der wichtigsten buddhistischen Tempel Koreas, eingebettet in die Walder des Berges Geumjeongsan. 678 n. Chr. gegrundet, mit beeindruckender Architektur und ruhigen Bergpfaden.",
        it: "Uno dei templi buddisti piu importanti della Corea, immerso nelle foreste del monte Geumjeongsan. Fondato nel 678 d.C., vanta un'architettura straordinaria e sereni sentieri montani.",
        id: "Salah satu kuil Buddha terpenting di Korea, terletak di hutan Gunung Geumjeongsan. Didirikan tahun 678 M, menampilkan arsitektur menakjubkan dan jalur pendakian yang tenang.",
        th: "หนึ่งในวัดพุทธที่สำคัญที่สุดของเกาหลี ตั้งอยู่ในป่าของภูเขากึมจองซาน สร้างขึ้นเมื่อปี ค.ศ. 678 มีสถาปัตยกรรมที่งดงามและเส้นทางเดินป่าที่สงบ",
      },
      addressKo: "부산 금정구 범어사로 250",
      addresses: { en: "250 Beomeosa-ro, Geumjeong-gu, Busan", ja: "釜山市金井区梵魚寺路250番地", zh: "釜山金井区梵鱼寺路250号", es: "250 Beomeosa-ro, Geumjeong-gu, Busan", fr: "250 Beomeosa-ro, Geumjeong-gu, Busan", de: "250 Beomeosa-ro, Geumjeong-gu, Busan", it: "250 Beomeosa-ro, Geumjeong-gu, Busan", id: "250 Beomeosa-ro, Geumjeong-gu, Busan", th: "250 Beomeosa-ro, Geumjeong-gu, Busan" },
      latitude: "35.2840",
      longitude: "129.0672",
      rating: "4.6",
      images: ["https://images.unsplash.com/photo-1751820705348-386098a2c148?w=1200&h=630&fit=crop"],
      tags: ["temple", "mountain", "hiking", "spiritual"],
      source: "curated",
    },
    {
      nameKo: "송정 해수욕장",
      names: { en: "Songjeong Beach", ja: "松亭ビーチ", zh: "松亭海水浴场", ko: "송정 해수욕장", es: "Playa Songjeong", fr: "Plage de Songjeong", de: "Songjeong Strand", it: "Spiaggia di Songjeong", id: "Pantai Songjeong", th: "หาดซงจอง" },
      description: {
        en: "A quieter alternative to Haeundae, known for its excellent surfing conditions and laid-back atmosphere with charming cafes along the beachfront.",
        ja: "海雲台より静かなビーチで、サーフィンに最適。ビーチ沿いのカフェも魅力です。",
        zh: "比海云台更安静的海滩，以出色的冲浪条件和悠闲氛围著称，海滨沿线咖啡馆迷人。",
        ko: "해운대보다 한적한 해변으로, 서핑 명소이자 해변가 카페거리가 매력적인 곳입니다.",
        es: "Una alternativa mas tranquila a Haeundae, conocida por sus excelentes condiciones para el surf y su ambiente relajado con encantadores cafes frente al mar.",
        fr: "Une alternative plus calme a Haeundae, reputee pour ses excellentes conditions de surf et son ambiance decontractee avec de charmants cafes en front de mer.",
        de: "Eine ruhigere Alternative zu Haeundae, bekannt fur hervorragende Surfbedingungen und entspannte Atmosphare mit charmanten Cafes am Strand.",
        it: "Un'alternativa piu tranquilla a Haeundae, nota per le eccellenti condizioni di surf e l'atmosfera rilassata con caffe incantevoli sul lungomare.",
        id: "Alternatif yang lebih tenang dari Haeundae, terkenal dengan kondisi surfing yang bagus dan suasana santai dengan kafe-kafe menarik di tepi pantai.",
        th: "ทางเลือกที่เงียบสงบกว่าแฮอุนแด ขึ้นชื่อเรื่องสภาพที่ดีสำหรับเล่นเซิร์ฟ บรรยากาศสบายๆ พร้อมคาเฟ่น่ารักริมชายหาด",
      },
      addressKo: "부산 해운대구 송정해변로 62",
      addresses: { en: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", ja: "釜山市海雲台区松亭海辺路62番地", zh: "釜山海云台区松亭海边路62号", es: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", fr: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", de: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", it: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", id: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan", th: "62 Songjeonghaebyon-ro, Haeundae-gu, Busan" },
      latitude: "35.1788",
      longitude: "129.1996",
      rating: "4.5",
      images: ["https://images.unsplash.com/photo-1672842408576-5076d505d8c1?w=1200&h=630&fit=crop"],
      tags: ["beach", "surfing", "cafe", "quiet"],
      source: "curated",
    },
    {
      nameKo: "다대포 해수욕장",
      names: { en: "Dadaepo Beach", ja: "多大浦ビーチ", zh: "多大浦海水浴场", ko: "다대포 해수욕장", es: "Playa Dadaepo", fr: "Plage de Dadaepo", de: "Dadaepo Strand", it: "Spiaggia di Dadaepo", id: "Pantai Dadaepo", th: "หาดดาแดโพ" },
      description: {
        en: "A wide, shallow beach famous for its spectacular sunsets and the Dadaepo Sunset Fountain of Dreams, one of the largest musical fountains in the world.",
        ja: "壮大な夕日と世界最大級の音楽噴水「多大浦夕日噴水」で有名な広く浅いビーチです。",
        zh: "以壮观的日落和世界最大音乐喷泉之一的多大浦日落梦幻喷泉闻名的宽阔浅滩海滩。",
        ko: "아름다운 일몰과 세계 최대 규모의 음악 분수인 다대포 꿈의 낙조분수로 유명한 넓고 얕은 해변입니다.",
        es: "Una playa amplia y poco profunda famosa por sus espectaculares puestas de sol y la Fuente de los Suenos de Dadaepo, una de las fuentes musicales mas grandes del mundo.",
        fr: "Une plage large et peu profonde celebre pour ses couchers de soleil spectaculaires et la Fontaine des Reves de Dadaepo, l'une des plus grandes fontaines musicales au monde.",
        de: "Ein breiter, flacher Strand, beruhmt fur seine spektakularen Sonnenuntergange und den Dadaepo Traumbrunnen, einen der grossten Musikbrunnen der Welt.",
        it: "Una spiaggia ampia e poco profonda famosa per i suoi spettacolari tramonti e la Fontana dei Sogni di Dadaepo, una delle piu grandi fontane musicali al mondo.",
        id: "Pantai lebar dan dangkal yang terkenal dengan pemandangan matahari terbenam yang spektakuler dan Air Mancur Impian Dadaepo, salah satu air mancur musikal terbesar di dunia.",
        th: "หาดกว้างน้ำตื้นที่มีชื่อเสียงเรื่องพระอาทิตย์ตกที่งดงาม และน้ำพุเต้นระบำดาแดโพ หนึ่งในน้ำพุดนตรีที่ใหญ่ที่สุดในโลก",
      },
      addressKo: "부산 사하구 몰운대1길 14",
      addresses: { en: "14 Morundae 1-gil, Saha-gu, Busan", ja: "釜山市沙下区没雲台1路14番地", zh: "釜山沙下区没云台1路14号", es: "14 Morundae 1-gil, Saha-gu, Busan", fr: "14 Morundae 1-gil, Saha-gu, Busan", de: "14 Morundae 1-gil, Saha-gu, Busan", it: "14 Morundae 1-gil, Saha-gu, Busan", id: "14 Morundae 1-gil, Saha-gu, Busan", th: "14 Morundae 1-gil, Saha-gu, Busan" },
      latitude: "35.0466",
      longitude: "128.9664",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1676290995185-0287c1b812ce?w=1200&h=630&fit=crop"],
      tags: ["beach", "sunset", "fountain", "family"],
      source: "curated",
    },
    {
      nameKo: "오륙도 스카이워크",
      names: { en: "Oryukdo Skywalk", ja: "五六島スカイウォーク", zh: "五六岛天空步道", ko: "오륙도 스카이워크", es: "Pasarela Oryukdo", fr: "Skywalk d'Oryukdo", de: "Oryukdo Skywalk", it: "Skywalk di Oryukdo", id: "Skywalk Oryukdo", th: "สกายวอล์คโอรยุกโด" },
      description: {
        en: "A thrilling glass-bottomed walkway jutting out over coastal cliffs, offering panoramic views of the ocean and the five-to-six islands that give the area its name.",
        ja: "海岸の崖の上に突き出したスリル満点のガラス張りの遊歩道。五六島の絶景パノラマが楽しめます。",
        zh: "惊险的玻璃栈道伸出海岸悬崖之上，可以俯瞰大海和五六岛的全景。",
        ko: "해안 절벽 위에 유리 바닥으로 설치된 스릴 넘치는 전망대로, 오륙도와 바다를 한눈에 볼 수 있습니다.",
        es: "Una emocionante pasarela con suelo de cristal que sobresale de los acantilados costeros, con vistas panoramicas al oceano y las cinco o seis islas que dan nombre al lugar.",
        fr: "Une passerelle au sol de verre surplombant les falaises cotieres, offrant une vue panoramique sur l'ocean et les cinq a six iles qui donnent leur nom au site.",
        de: "Ein aufregender Glassteg uber den Kustenklippen mit Panoramablick auf den Ozean und die funf bis sechs Inseln, die dem Ort seinen Namen geben.",
        it: "Un'emozionante passerella con pavimento in vetro che sporge dalle scogliere costiere, con vista panoramica sull'oceano e le cinque-sei isole che danno il nome all'area.",
        id: "Jalan kaca mendebarkan yang menjorok di atas tebing pesisir, menawarkan pemandangan panoramis lautan dan lima hingga enam pulau yang menjadi asal nama kawasan ini.",
        th: "ทางเดินพื้นกระจกที่น่าตื่นเต้น ยื่นออกไปเหนือหน้าผาชายฝั่ง มองเห็นวิวพาโนรามาของมหาสมุทรและเกาะห้าถึงหกเกาะที่เป็นที่มาของชื่อ",
      },
      addressKo: "부산 남구 오륙도로 137",
      addresses: { en: "137 Oryukdo-ro, Nam-gu, Busan", ja: "釜山市南区五六島路137番地", zh: "釜山南区五六岛路137号", es: "137 Oryukdo-ro, Nam-gu, Busan", fr: "137 Oryukdo-ro, Nam-gu, Busan", de: "137 Oryukdo-ro, Nam-gu, Busan", it: "137 Oryukdo-ro, Nam-gu, Busan", id: "137 Oryukdo-ro, Nam-gu, Busan", th: "137 Oryukdo-ro, Nam-gu, Busan" },
      latitude: "35.1014",
      longitude: "129.1234",
      rating: "4.3",
      images: ["https://images.unsplash.com/photo-1733683721857-6439cd6a8c68?w=1200&h=630&fit=crop"],
      tags: ["park", "ocean-view", "glass-walkway", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "동백섬",
      names: { en: "Dongbaekseom Island", ja: "冬柏島", zh: "冬柏岛", ko: "동백섬", es: "Isla Dongbaekseom", fr: "Ile de Dongbaekseom", de: "Dongbaekseom Insel", it: "Isola di Dongbaekseom", id: "Pulau Dongbaekseom", th: "เกาะดงแบกซอม" },
      description: {
        en: "A small island connected to Haeundae Beach by a walking path, featuring the APEC House, lush camellia forests, and stunning coastal views.",
        ja: "海雲台ビーチと散歩道で繋がった小さな島。APECハウス、椿の森、海岸の絶景が楽しめます。",
        zh: "通过步行道与海云台海滩相连的小岛，拥有APEC会议厅、茂密的山茶花林和壮丽的海岸景色。",
        ko: "해운대 해수욕장과 산책로로 연결된 작은 섬으로, APEC 하우스, 동백나무 숲, 해안 절경이 매력적입니다.",
        es: "Una pequena isla conectada a la playa de Haeundae por un sendero, con la Casa APEC, frondosos bosques de camelias y hermosas vistas costeras.",
        fr: "Une petite ile reliee a la plage de Haeundae par un sentier, abritant la Maison APEC, de luxuriantes forets de camelias et de superbes vues cotieres.",
        de: "Eine kleine Insel, die uber einen Fussweg mit dem Haeundae Strand verbunden ist, mit dem APEC-Haus, uppigen Kamelienwoldern und herrlichen Kustenblicken.",
        it: "Una piccola isola collegata alla spiaggia di Haeundae da un sentiero pedonale, con la Casa APEC, rigogliose foreste di camelie e splendide viste costiere.",
        id: "Pulau kecil yang terhubung ke Pantai Haeundae melalui jalur pejalan kaki, dengan Rumah APEC, hutan kamelia yang rimbun, dan pemandangan pesisir yang menakjubkan.",
        th: "เกาะเล็กๆ ที่เชื่อมต่อกับหาดแฮอุนแดด้วยทางเดิน มีบ้าน APEC ป่าดอกคามิเลียร่มรื่น และวิวชายฝั่งที่สวยงาม",
      },
      addressKo: "부산 해운대구 동백로 116",
      addresses: { en: "116 Dongbaek-ro, Haeundae-gu, Busan", ja: "釜山市海雲台区冬柏路116番地", zh: "釜山海云台区冬柏路116号", es: "116 Dongbaek-ro, Haeundae-gu, Busan", fr: "116 Dongbaek-ro, Haeundae-gu, Busan", de: "116 Dongbaek-ro, Haeundae-gu, Busan", it: "116 Dongbaek-ro, Haeundae-gu, Busan", id: "116 Dongbaek-ro, Haeundae-gu, Busan", th: "116 Dongbaek-ro, Haeundae-gu, Busan" },
      latitude: "35.1536",
      longitude: "129.1506",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1778147356071-c8f5a7287ea6?w=1200&h=630&fit=crop"],
      tags: ["park", "island", "ocean-view", "walking"],
      source: "curated",
    },
    {
      nameKo: "BIFF 광장",
      names: { en: "BIFF Square", ja: "BIFF広場", zh: "BIFF广场", ko: "BIFF 광장", es: "Plaza BIFF", fr: "Place BIFF", de: "BIFF-Platz", it: "Piazza BIFF", id: "Alun-alun BIFF", th: "จัตุรัสบิฟฟ์" },
      description: {
        en: "A lively street in Nampo-dong famous for its connection to the Busan International Film Festival, lined with street food stalls, shops, and handprint plaques of film stars.",
        ja: "南浦洞の賑やかな通り。釜山国際映画祭ゆかりの地で、屋台グルメや映画スターの手形プレートが並びます。",
        zh: "南浦洞的热闹街道，因釜山国际电影节而闻名，两旁有街头美食摊位、商店和电影明星手印牌匾。",
        ko: "남포동의 활기찬 거리로, 부산국제영화제의 상징이며 길거리 음식과 영화인 핸드프린팅이 유명합니다.",
        es: "Una animada calle en Nampo-dong famosa por su conexion con el Festival Internacional de Cine de Busan, con puestos de comida callejera, tiendas y placas con huellas de estrellas de cine.",
        fr: "Une rue animee de Nampo-dong celebre pour son lien avec le Festival International du Film de Busan, bordee de stands de street food, de boutiques et de plaques d'empreintes de stars du cinema.",
        de: "Eine lebhafte Strasse in Nampo-dong, beruhmt fur ihre Verbindung zum Busan International Film Festival, gesaumt von Strassenkuche-Standen, Geschaften und Handabdrucken von Filmstars.",
        it: "Una vivace strada di Nampo-dong famosa per il suo legame con il Busan International Film Festival, fiancheggiata da bancarelle di street food, negozi e targhe con le impronte delle star del cinema.",
        id: "Jalan yang ramai di Nampo-dong, terkenal karena hubungannya dengan Festival Film Internasional Busan, dipenuhi warung jajanan, toko, dan plakat cetakan tangan bintang film.",
        th: "ถนนคึกคักในนัมโพดง ที่มีชื่อเสียงจากเทศกาลภาพยนตร์นานาชาติปูซาน เรียงรายด้วยร้านอาหารริมทาง ร้านค้า และแผ่นรอยมือดาราภาพยนตร์",
      },
      addressKo: "부산 중구 비프광장로 36",
      addresses: { en: "36 BIFF Square-ro, Jung-gu, Busan", ja: "釜山市中区BIFF広場路36番地", zh: "釜山中区BIFF广场路36号", es: "36 BIFF Square-ro, Jung-gu, Busan", fr: "36 BIFF Square-ro, Jung-gu, Busan", de: "36 BIFF Square-ro, Jung-gu, Busan", it: "36 BIFF Square-ro, Jung-gu, Busan", id: "36 BIFF Square-ro, Jung-gu, Busan", th: "36 BIFF Square-ro, Jung-gu, Busan" },
      latitude: "35.0988",
      longitude: "129.0291",
      rating: "4.2",
      images: ["https://images.unsplash.com/photo-1758570764602-d57bc2922dea?w=1200&h=630&fit=crop"],
      tags: ["culture", "street-food", "shopping", "landmark"],
      source: "curated",
    },
    {
      nameKo: "흰여울문화마을",
      names: { en: "Huinnyeoul Culture Village", ja: "ヒンヨウル文化村", zh: "白浅滩文化村", ko: "흰여울문화마을", es: "Aldea Cultural Huinnyeoul", fr: "Village culturel de Huinnyeoul", de: "Huinnyeoul Kulturdorf", it: "Villaggio Culturale di Huinnyeoul", id: "Desa Budaya Huinnyeoul", th: "หมู่บ้านวัฒนธรรมฮินยอล" },
      description: {
        en: "A picturesque coastal village in Yeongdo with narrow alleys, ocean-view cafes, and art galleries built along the cliff edge overlooking the sea.",
        ja: "影島の絵のように美しい海岸沿いの村。断崖に沿って建てられたカフェやギャラリーが並びます。",
        zh: "影岛风景如画的海岸村庄，狭窄的小巷、海景咖啡馆和悬崖边的艺术画廊。",
        ko: "영도 해안 절벽을 따라 형성된 마을로, 좁은 골목길과 바다 전망 카페, 아트 갤러리가 매력적입니다.",
        es: "Un pintoresco pueblo costero en Yeongdo con callejones estrechos, cafes con vista al mar y galerias de arte construidas a lo largo del borde del acantilado.",
        fr: "Un pittoresque village cotier a Yeongdo avec des ruelles etroites, des cafes vue mer et des galeries d'art construites le long de la falaise surplombant la mer.",
        de: "Ein malerisches Kustendorf in Yeongdo mit engen Gassen, Cafes mit Meerblick und Kunstgalerien, die entlang der Klippenkante mit Blick aufs Meer erbaut wurden.",
        it: "Un pittoresco villaggio costiero a Yeongdo con vicoli stretti, caffe con vista sull'oceano e gallerie d'arte costruite lungo il bordo della scogliera affacciata sul mare.",
        id: "Desa pesisir yang indah di Yeongdo dengan gang-gang sempit, kafe berpemandangan laut, dan galeri seni yang dibangun di sepanjang tepi tebing menghadap laut.",
        th: "หมู่บ้านชายฝั่งที่งดงามในยองโด มีตรอกแคบ คาเฟ่วิวทะเล และแกลเลอรีศิลปะที่สร้างเรียงรายตามขอบหน้าผาริมทะเล",
      },
      addressKo: "부산 영도구 영선동4가",
      addresses: { en: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", ja: "釜山市影島区永仙洞4街", zh: "釜山影岛区永仙洞4街", es: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", fr: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", de: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", it: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", id: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan", th: "Yeongseon-dong 4-ga, Yeongdo-gu, Busan" },
      latitude: "35.0782",
      longitude: "129.0419",
      rating: "4.4",
      images: ["https://images.unsplash.com/photo-1741345380609-86aa10bb6f8d?w=1200&h=630&fit=crop"],
      tags: ["culture", "ocean-view", "cafe", "photo-spot"],
      source: "curated",
    },
    {
      nameKo: "용두산공원 & 부산타워",
      names: { en: "Yongdusan Park & Busan Tower", ja: "龍頭山公園＆釜山タワー", zh: "龙头山公园和釜山塔", ko: "용두산공원 & 부산타워", es: "Parque Yongdusan y Torre de Busan", fr: "Parc Yongdusan et Tour de Busan", de: "Yongdusan Park und Busan Tower", it: "Parco Yongdusan e Torre di Busan", id: "Taman Yongdusan dan Menara Busan", th: "สวนยงดูซานและหอคอยปูซาน" },
      description: {
        en: "A hilltop park in the heart of Busan offering 360-degree views from the iconic Busan Tower. Beautiful by day and spectacular at night.",
        ja: "釜山の中心にある丘の上の公園。釜山タワーから360度のパノラマが楽しめます。昼も夜も絶景です。",
        zh: "位于釜山市中心的山顶公园，从标志性的釜山塔可以欣赏360度全景。白天美丽，夜晚壮观。",
        ko: "부산 도심의 언덕 위 공원으로, 부산타워에서 360도 전망을 감상할 수 있습니다. 낮과 밤 모두 아름답습니다.",
        es: "Un parque en la cima de una colina en el corazon de Busan con vistas de 360 grados desde la iconica Torre de Busan. Hermoso de dia y espectacular de noche.",
        fr: "Un parc au sommet d'une colline au coeur de Busan offrant une vue a 360 degres depuis l'emblematique Tour de Busan. Magnifique le jour, spectaculaire la nuit.",
        de: "Ein Hugelpark im Herzen von Busan mit 360-Grad-Aussicht vom ikonischen Busan Tower. Schon bei Tag und spektakular bei Nacht.",
        it: "Un parco in cima a una collina nel cuore di Busan con vista a 360 gradi dall'iconica Torre di Busan. Bello di giorno e spettacolare di notte.",
        id: "Taman di puncak bukit di jantung kota Busan yang menawarkan pemandangan 360 derajat dari Menara Busan yang ikonik. Indah di siang hari dan spektakuler di malam hari.",
        th: "สวนสาธารณะบนเนินเขาใจกลางปูซาน มองเห็นวิว 360 องศาจากหอคอยปูซานอันเป็นสัญลักษณ์ สวยงามทั้งกลางวันและยามค่ำคืน",
      },
      addressKo: "부산 중구 용두산길 37-55",
      addresses: { en: "37-55 Yongdusan-gil, Jung-gu, Busan", ja: "釜山市中区龍頭山路37-55番地", zh: "釜山中区龙头山路37-55号", es: "37-55 Yongdusan-gil, Jung-gu, Busan", fr: "37-55 Yongdusan-gil, Jung-gu, Busan", de: "37-55 Yongdusan-gil, Jung-gu, Busan", it: "37-55 Yongdusan-gil, Jung-gu, Busan", id: "37-55 Yongdusan-gil, Jung-gu, Busan", th: "37-55 Yongdusan-gil, Jung-gu, Busan" },
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
      names: { en: "Gijang Market", ja: "機張市場", zh: "机张市场", ko: "기장시장", es: "Mercado de Gijang", fr: "Marche de Gijang", de: "Gijang Markt", it: "Mercato di Gijang", id: "Pasar Gijang", th: "ตลาดกีจัง" },
      description: {
        en: "A traditional market in Gijang famous for fresh snow crab, seaweed, and local seafood. One of Busan's best spots for authentic, affordable seafood dining.",
        ja: "新鮮なズワイガニ、ワカメ、地元の海産物で有名な機張の伝統市場。手頃な価格で本格的な海鮮が楽しめます。",
        zh: "以新鲜雪蟹、海带和当地海鲜闻名的机张传统市场，是釜山品尝正宗实惠海鲜的好去处。",
        ko: "대게, 미역, 해산물로 유명한 기장의 전통시장으로, 싱싱한 해산물을 저렴하게 즐길 수 있는 부산의 명소입니다.",
        es: "Un mercado tradicional en Gijang famoso por el cangrejo de nieve fresco, las algas y los mariscos locales. Uno de los mejores lugares de Busan para comer marisco autentico a buen precio.",
        fr: "Un marche traditionnel a Gijang repute pour le crabe des neiges frais, les algues et les fruits de mer locaux. L'un des meilleurs endroits de Busan pour des fruits de mer authentiques et abordables.",
        de: "Ein traditioneller Markt in Gijang, beruhmt fur frische Schneekrabben, Seetang und lokale Meeresfruchte. Einer der besten Orte in Busan fur erschwingliche, authentische Meereskuche.",
        it: "Un mercato tradizionale a Gijang famoso per il granchio delle nevi fresco, le alghe e i frutti di mare locali. Uno dei migliori posti di Busan per mangiare pesce autentico a prezzi accessibili.",
        id: "Pasar tradisional di Gijang yang terkenal dengan kepiting salju segar, rumput laut, dan seafood lokal. Salah satu tempat terbaik di Busan untuk menikmati hidangan laut autentik dengan harga terjangkau.",
        th: "ตลาดดั้งเดิมในกีจัง ขึ้นชื่อเรื่องปูหิมะสด สาหร่ายทะเล และอาหารทะเลท้องถิ่น หนึ่งในจุดหมายที่ดีที่สุดของปูซานสำหรับอาหารทะเลแท้ๆ ในราคาย่อมเยา",
      },
      addressKo: "부산 기장군 기장읍 읍내로104번길 16",
      addresses: { en: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑邑内路104番ギル16", zh: "釜山机张郡机张邑邑内路104番街16号", es: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", fr: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", de: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", it: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", id: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan", th: "16 Eupnae-ro 104beon-gil, Gijang-eup, Gijang-gun, Busan" },
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
      names: { en: "Lotte World Adventure Busan", ja: "ロッテワールド アドベンチャー釜山", zh: "乐天世界冒险釜山", ko: "롯데월드 어드벤처 부산", es: "Lotte World Adventure Busan", fr: "Lotte World Adventure Busan", de: "Lotte World Adventure Busan", it: "Lotte World Adventure Busan", id: "Lotte World Adventure Busan", th: "ล็อตเต้เวิลด์แอดเวนเจอร์ปูซาน" },
      description: {
        en: "A world-class indoor theme park in Busan's Osiria Tourist Complex, featuring thrilling rides, fairy-tale themed zones, parades, and entertainment for all ages.",
        ja: "オシリア観光団地にある世界水準のテーマパーク。スリル満点のアトラクション、メルヘンゾーン、パレードが楽しめます。",
        zh: "位于釜山奥西利亚旅游区的世界级室内主题公园，拥有刺激的游乐设施、童话主题区、花车巡游等老少皆宜的娱乐项目。",
        ko: "오시리아 관광단지에 위치한 세계적 수준의 실내 테마파크로, 스릴 넘치는 놀이기구와 동화 테마존, 퍼레이드를 즐길 수 있습니다.",
        es: "Un parque tematico de clase mundial en el complejo turistico Osiria de Busan, con atracciones emocionantes, zonas tematicas de cuentos de hadas, desfiles y entretenimiento para todas las edades.",
        fr: "Un parc a theme de classe mondiale dans le complexe touristique Osiria de Busan, avec des attractions a sensations, des zones feeriques, des parades et des divertissements pour tous les ages.",
        de: "Ein Freizeitpark der Weltklasse im Osiria-Touristenkomplex von Busan mit aufregenden Fahrgeschaften, Marchenthemenzonen, Paraden und Unterhaltung fur alle Altersgruppen.",
        it: "Un parco tematico di livello mondiale nel complesso turistico Osiria di Busan, con attrazioni emozionanti, aree a tema fiabesco, parate e intrattenimento per tutte le eta.",
        id: "Taman hiburan indoor kelas dunia di Kompleks Wisata Osiria Busan, dengan wahana seru, zona bertema dongeng, parade, dan hiburan untuk segala usia.",
        th: "สวนสนุกในร่มระดับโลกในอาณาเขตท่องเที่ยวโอซีเรียของปูซาน มีเครื่องเล่นสุดตื่นเต้น โซนธีมเทพนิยาย ขบวนพาเหรด และความบันเทิงสำหรับทุกวัย",
      },
      addressKo: "부산 기장군 기장읍 동부산관광로 42",
      addresses: { en: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑東釜山観光路42番地", zh: "釜山机张郡机张邑东釜山观光路42号", es: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", fr: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", de: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", it: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", id: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan", th: "42 Dongbusan Tourism-ro, Gijang-eup, Gijang-gun, Busan" },
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
      names: { en: "Ananti Cove", ja: "アナンティ コーブ", zh: "安纳迪海湾", ko: "아난티 코브", es: "Ananti Cove", fr: "Ananti Cove", de: "Ananti Cove", it: "Ananti Cove", id: "Ananti Cove", th: "อนันตีโคฟ" },
      description: {
        en: "A luxury seaside resort complex in Gijang featuring the Banyan Tree Club & Spa, Hilton Busan, premium dining, and a scenic coastal promenade with ocean views.",
        ja: "バンヤンツリー クラブ&スパやヒルトン釜山を擁する機張の高級海辺リゾート。プレミアムダイニングと絶景の海岸散歩道が魅力です。",
        zh: "位于机张的豪华海滨度假村，拥有悦榕庄俱乐部和水疗中心、釜山希尔顿酒店、高级餐饮以及风景优美的海岸步道。",
        ko: "반얀트리 클럽 앤 스파, 힐튼 부산이 있는 기장의 럭셔리 해변 리조트 단지로, 프리미엄 다이닝과 오션뷰 해안 산책로가 매력적입니다.",
        es: "Un lujoso complejo turistico junto al mar en Gijang con el Banyan Tree Club & Spa, el Hilton Busan, restaurantes premium y un paseo costero con vistas al oceano.",
        fr: "Un complexe hotelier de luxe en bord de mer a Gijang comprenant le Banyan Tree Club & Spa, le Hilton Busan, une gastronomie haut de gamme et une promenade cotiere avec vue sur l'ocean.",
        de: "Ein luxurioses Strandresort in Gijang mit dem Banyan Tree Club & Spa, dem Hilton Busan, erstklassiger Gastronomie und einer malerischen Kustenpromenade mit Meerblick.",
        it: "Un lussuoso complesso balneare a Gijang con il Banyan Tree Club & Spa, l'Hilton Busan, ristoranti premium e una passeggiata costiera panoramica con vista sull'oceano.",
        id: "Kompleks resor mewah tepi laut di Gijang dengan Banyan Tree Club & Spa, Hilton Busan, restoran premium, dan promenade pesisir yang indah dengan pemandangan laut.",
        th: "รีสอร์ทหรูริมทะเลในกีจัง มีบันยันทรีคลับแอนด์สปา ฮิลตันปูซาน ร้านอาหารระดับพรีเมียม และทางเดินริมชายฝั่งวิวทะเล",
      },
      addressKo: "부산 기장군 기장읍 기장해안로 268-32",
      addresses: { en: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑機張海岸路268-32番地", zh: "釜山机张郡机张邑机张海岸路268-32号", es: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", fr: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", de: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", it: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", id: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", th: "268-32 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan" },
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
      names: { en: "Skyline Luge Busan", ja: "スカイラインリュージュ釜山", zh: "天际滑车釜山", ko: "스카이라인 루지 부산", es: "Skyline Luge Busan", fr: "Skyline Luge Busan", de: "Skyline Luge Busan", it: "Skyline Luge Busan", id: "Skyline Luge Busan", th: "สกายไลน์ลูจปูซาน" },
      description: {
        en: "An exciting gravity-fueled luge ride down scenic tracks with ocean views. Take the skyride chairlift up and race down on fun, easy-to-control luge carts.",
        ja: "海を見ながらスリル満点のリュージュを楽しめるアウトドア体験施設。スカイライドで上り、ルージュカートで爽快に下ります。",
        zh: "一项刺激的重力滑车体验，沿着有海景的赛道滑行。乘坐空中缆车上山，驾驶操控简便的滑车一路飞驰而下。",
        ko: "오션뷰를 배경으로 스릴 넘치는 루지 카트를 타고 내려오는 아웃도어 체험 시설입니다. 스카이라이드로 올라가 즐기는 짜릿한 질주!",
        es: "Un emocionante paseo en luge impulsado por gravedad por pistas panoramicas con vistas al mar. Sube en el teleferico y baja a toda velocidad en divertidos carros de luge faciles de manejar.",
        fr: "Une descente palpitante en luge sur des pistes panoramiques avec vue sur l'ocean. Montez en telesiege et devalez la pente sur des luges amusantes et faciles a piloter.",
        de: "Eine aufregende Schwerkraft-Rodelfahrt uber malerische Strecken mit Meerblick. Mit dem Sessellift hinauf und auf lustigen, leicht zu steuernden Luge-Karts hinunter sausen.",
        it: "Un'emozionante discesa in slittino a gravita su piste panoramiche con vista sull'oceano. Sali con la seggiovia e scendi a tutta velocita su divertenti carrelli facili da guidare.",
        id: "Wahana luge seru yang meluncur di trek pemandangan dengan vista laut. Naik kereta gantung ke atas lalu meluncur turun dengan kart luge yang menyenangkan dan mudah dikendalikan.",
        th: "กิจกรรมลูจที่ใช้แรงโน้มถ่วงสุดตื่นเต้น ไหลลงตามลานวิวทะเล นั่งกระเช้าลอยฟ้าขึ้นไปแล้วแข่งลงมาบนรถลูจที่ควบคุมง่ายสุดสนุก",
      },
      addressKo: "부산 기장군 기장읍 기장해안로 205",
      addresses: { en: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", ja: "釜山市機張郡機張邑機張海岸路205番地", zh: "釜山机张郡机张邑机张海岸路205号", es: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", fr: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", de: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", it: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", id: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan", th: "205 Gijanghaeān-ro, Gijang-eup, Gijang-gun, Busan" },
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
      names: { en: "Busan International Fireworks Festival", ja: "釜山国際花火祭り", zh: "釜山国际烟花节", ko: "부산 국제 불꽃축제", es: "Festival Internacional de Fuegos Artificiales de Busan", fr: "Festival International de Feux d'Artifice de Busan", de: "Internationales Feuerwerk-Festival Busan", it: "Festival Internazionale dei Fuochi d'Artificio di Busan", id: "Festival Kembang Api Internasional Busan", th: "เทศกาลพลุนานาชาติปูซาน" },
      description: {
        en: "One of Asia's largest fireworks festivals held at Gwangalli Beach, featuring spectacular pyrotechnic displays by international teams with the Diamond Bridge as backdrop.",
        ja: "広安里ビーチで開催されるアジア最大級の花火大会。ダイヤモンドブリッジを背景に国際チームによる壮大な花火ショーが楽しめます。",
        zh: "在广安里海滩举办的亚洲最大烟花节之一，以钻石桥为背景，国际团队带来壮观的烟火表演。",
        ko: "광안리 해수욕장에서 열리는 아시아 최대 규모의 불꽃축제로, 광안대교를 배경으로 화려한 불꽃 쇼가 펼쳐집니다.",
        es: "Uno de los festivales de fuegos artificiales mas grandes de Asia, celebrado en la playa de Gwangalli, con espectaculares exhibiciones pirotecnicas de equipos internacionales con el Puente Diamante como telon de fondo.",
        fr: "L'un des plus grands festivals de feux d'artifice d'Asie, tenu a la plage de Gwangalli, avec des spectacles pyrotechniques spectaculaires d'equipes internationales sur fond de Pont Diamant.",
        de: "Eines der grossten Feuerwerksfestivals Asiens am Gwangalli Strand, mit spektakularen pyrotechnischen Darbietungen internationaler Teams vor der Kulisse der Diamantbrucke.",
        it: "Uno dei piu grandi festival di fuochi d'artificio dell'Asia, tenuto alla spiaggia di Gwangalli, con spettacolari esibizioni pirotecniche di squadre internazionali con il Ponte Diamante come sfondo.",
        id: "Salah satu festival kembang api terbesar di Asia yang diadakan di Pantai Gwangalli, menampilkan pertunjukan piroteknik spektakuler oleh tim internasional dengan latar belakang Jembatan Berlian.",
        th: "หนึ่งในเทศกาลพลุที่ใหญ่ที่สุดในเอเชีย จัดที่หาดกวางอัลลี มีการแสดงพลุสุดอลังการจากทีมนานาชาติโดยมีสะพานเพชรเป็นฉากหลัง",
      },
      category: "festival",
      venueName: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里海滩", ko: "광안리 해수욕장", es: "Playa Gwangalli", fr: "Plage de Gwangalli", de: "Gwangalli Strand", it: "Spiaggia di Gwangalli", id: "Pantai Gwangalli", th: "หาดกวางอัลลี" },
      addressKo: "부산 수영구 광안해변로",
      latitude: "35.1531",
      longitude: "129.1186",
      startsAt: new Date("2026-10-25T18:00:00+09:00"),
      endsAt: new Date("2026-10-25T22:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장", es: "Entrada gratuita", fr: "Entree libre", de: "Eintritt frei", it: "Ingresso gratuito", id: "Gratis masuk", th: "เข้าชมฟรี" },
      images: ["https://images.unsplash.com/photo-1610343744628-c8e13a666dc0?w=1200&h=630&fit=crop"],
      source: "curated",
    },
    {
      nameKo: "부산 국제 영화제 (BIFF)",
      names: { en: "Busan International Film Festival (BIFF)", ja: "釜山国際映画祭 (BIFF)", zh: "釜山国际电影节 (BIFF)", ko: "부산 국제 영화제 (BIFF)", es: "Festival Internacional de Cine de Busan (BIFF)", fr: "Festival International du Film de Busan (BIFF)", de: "Internationales Filmfestival Busan (BIFF)", it: "Festival Internazionale del Cinema di Busan (BIFF)", id: "Festival Film Internasional Busan (BIFF)", th: "เทศกาลภาพยนตร์นานาชาติปูซาน (BIFF)" },
      description: {
        en: "Asia's premier film festival showcasing hundreds of films from around the world. Features outdoor screenings, star-studded red carpet events, and cultural programs.",
        ja: "世界中から数百本の映画が上映されるアジア最大の映画祭。野外上映、レッドカーペットイベント、文化プログラムが楽しめます。",
        zh: "亚洲首屈一指的电影节，展映来自世界各地的数百部电影，设有露天放映、红毯活动和文化项目。",
        ko: "전 세계 수백 편의 영화를 상영하는 아시아 최고의 영화제로, 야외 상영, 레드카펫 이벤트, 문화 프로그램 등이 진행됩니다.",
        es: "El principal festival de cine de Asia que presenta cientos de peliculas de todo el mundo. Incluye proyecciones al aire libre, eventos de alfombra roja con estrellas y programas culturales.",
        fr: "Le premier festival de cinema d'Asie presentant des centaines de films du monde entier. Projections en plein air, tapis rouge etoile et programmes culturels.",
        de: "Asiens fuhrende Filmfestspiele mit Hunderten von Filmen aus aller Welt. Mit Freiluft-Vorfuhrungen, glamourosen Roter-Teppich-Events und Kulturprogrammen.",
        it: "Il principale festival cinematografico dell'Asia con centinaia di film da tutto il mondo. Proiezioni all'aperto, eventi sul tappeto rosso con star e programmi culturali.",
        id: "Festival film terkemuka di Asia yang menampilkan ratusan film dari seluruh dunia. Menampilkan pemutaran luar ruangan, acara karpet merah bertabur bintang, dan program budaya.",
        th: "เทศกาลภาพยนตร์ชั้นนำของเอเชีย ฉายภาพยนตร์หลายร้อยเรื่องจากทั่วโลก มีการฉายกลางแจ้ง งานพรมแดงดาราดัง และโปรแกรมวัฒนธรรม",
      },
      category: "festival",
      venueName: { en: "Busan Cinema Center", ja: "釜山シネマセンター", zh: "釜山电影中心", ko: "영화의 전당", es: "Centro Cinematografico de Busan", fr: "Centre Cinematographique de Busan", de: "Busan Kinozentrum", it: "Centro Cinematografico di Busan", id: "Pusat Sinema Busan", th: "ศูนย์ภาพยนตร์ปูซาน" },
      addressKo: "부산 해운대구 수영강변대로 120",
      latitude: "35.1649",
      longitude: "129.1343",
      startsAt: new Date("2026-10-07T10:00:00+09:00"),
      endsAt: new Date("2026-10-16T22:00:00+09:00"),
      priceInfo: { en: "Tickets from ₩7,000", ja: "チケット7,000ウォン～", zh: "票价7,000韩元起", ko: "티켓 7,000원부터", es: "Entradas desde ₩7.000", fr: "Billets a partir de ₩7 000", de: "Tickets ab ₩7.000", it: "Biglietti da ₩7.000", id: "Tiket mulai ₩7.000", th: "บัตรเริ่มต้น ₩7,000" },
      bookingUrl: "https://www.biff.kr",
      images: ["https://images.unsplash.com/photo-1781174849398-27a0d3f0de8b?w=1200&h=630&fit=crop"],
      source: "curated",
    },
    {
      nameKo: "해운대 모래축제",
      names: { en: "Haeundae Sand Festival", ja: "海雲台砂まつり", zh: "海云台沙雕节", ko: "해운대 모래축제", es: "Festival de Arena de Haeundae", fr: "Festival de Sable de Haeundae", de: "Haeundae Sandfestival", it: "Festival della Sabbia di Haeundae", id: "Festival Pasir Haeundae", th: "เทศกาลทรายแฮอุนแด" },
      description: {
        en: "An annual beach festival featuring incredible sand sculptures by world-class artists, live performances, beach sports, and family activities along Haeundae Beach.",
        ja: "世界的なアーティストによる砂の彫刻、ライブパフォーマンス、ビーチスポーツが楽しめる年間ビーチフェスティバルです。",
        zh: "年度海滩节日，展示世界级艺术家创作的精美沙雕，还有现场表演、沙滩运动和家庭活动。",
        ko: "세계적인 아티스트들의 모래 조각, 라이브 공연, 비치 스포츠, 가족 체험활동이 가득한 해운대의 대표 축제입니다.",
        es: "Un festival anual de playa con increibles esculturas de arena de artistas de talla mundial, actuaciones en vivo, deportes de playa y actividades familiares en la playa de Haeundae.",
        fr: "Un festival annuel de plage avec d'incroyables sculptures de sable realisees par des artistes de renommee mondiale, des spectacles, des sports de plage et des activites familiales le long de la plage de Haeundae.",
        de: "Ein jahrliches Strandfestival mit beeindruckenden Sandskulpturen von Weltklasse-Kunstlern, Live-Auftritten, Strandsportarten und Familienaktivitaten am Haeundae Strand.",
        it: "Un festival annuale sulla spiaggia con incredibili sculture di sabbia di artisti di fama mondiale, spettacoli dal vivo, sport da spiaggia e attivita per famiglie lungo la spiaggia di Haeundae.",
        id: "Festival pantai tahunan yang menampilkan patung pasir luar biasa dari seniman kelas dunia, pertunjukan langsung, olahraga pantai, dan aktivitas keluarga di sepanjang Pantai Haeundae.",
        th: "เทศกาลชายหาดประจำปีที่มีประติมากรรมทรายอันน่าทึ่งจากศิลปินระดับโลก การแสดงสด กีฬาชายหาด และกิจกรรมครอบครัวตลอดแนวหาดแฮอุนแด",
      },
      category: "festival",
      venueName: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海滩", ko: "해운대 해수욕장", es: "Playa Haeundae", fr: "Plage de Haeundae", de: "Haeundae Strand", it: "Spiaggia di Haeundae", id: "Pantai Haeundae", th: "หาดแฮอุนแด" },
      addressKo: "부산 해운대구 해운대해변로 264",
      latitude: "35.1587",
      longitude: "129.1604",
      startsAt: new Date("2027-05-22T10:00:00+09:00"),
      endsAt: new Date("2027-05-25T21:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장", es: "Entrada gratuita", fr: "Entree libre", de: "Eintritt frei", it: "Ingresso gratuito", id: "Gratis masuk", th: "เข้าชมฟรี" },
      images: ["https://images.unsplash.com/photo-1660291120699-cd4938af5277?w=1200&h=630&fit=crop"],
      source: "curated",
    },
    {
      nameKo: "부산 원아시아 페스티벌 (BOF)",
      names: { en: "Busan One Asia Festival (BOF)", ja: "釜山ワンアジアフェスティバル (BOF)", zh: "釜山同一个亚洲文化节 (BOF)", ko: "부산 원아시아 페스티벌 (BOF)", es: "Festival One Asia de Busan (BOF)", fr: "Festival One Asia de Busan (BOF)", de: "Busan One Asia Festival (BOF)", it: "Festival One Asia di Busan (BOF)", id: "Festival One Asia Busan (BOF)", th: "เทศกาลวันเอเชียปูซาน (BOF)" },
      description: {
        en: "A massive K-pop and Korean culture festival featuring top idol performances, fan meetings, K-beauty expos, and interactive hallyu experiences across Busan.",
        ja: "トップK-POPアイドルのパフォーマンス、ファンミーティング、K-ビューティーエキスポなど韓流体験が満載の大型フェスティバルです。",
        zh: "大型K-pop和韩国文化节，包括顶级偶像表演、粉丝见面会、K-beauty博览会和互动韩流体验。",
        ko: "K-pop 톱 아이돌 공연, 팬미팅, K-뷰티 엑스포 등 다양한 한류 체험이 가능한 대형 문화 축제입니다.",
        es: "Un gran festival de K-pop y cultura coreana con actuaciones de idolos, encuentros con fans, exposiciones de K-beauty y experiencias interactivas de hallyu en todo Busan.",
        fr: "Un grand festival de K-pop et de culture coreenne avec des performances d'idoles, des fan meetings, des expos K-beauty et des experiences hallyu interactives a travers Busan.",
        de: "Ein grosses K-Pop- und koreanisches Kulturfestival mit Auftritten von Top-Idols, Fantreffen, K-Beauty-Messen und interaktiven Hallyu-Erlebnissen in ganz Busan.",
        it: "Un grande festival di K-pop e cultura coreana con esibizioni di idol, incontri con i fan, fiere K-beauty ed esperienze hallyu interattive in tutta Busan.",
        id: "Festival K-pop dan budaya Korea besar-besaran yang menampilkan pertunjukan idol papan atas, fan meeting, expo K-beauty, dan pengalaman hallyu interaktif di seluruh Busan.",
        th: "เทศกาลเคป็อปและวัฒนธรรมเกาหลีขนาดยิ่งใหญ่ มีการแสดงของไอดอลชื่อดัง แฟนมีตติ้ง เอ็กซ์โปเคบิวตี้ และประสบการณ์ฮัลลยูแบบอินเทอร์แอคทีฟ",
      },
      category: "performance",
      venueName: { en: "Busan Asiad Main Stadium", ja: "釜山アジアド主競技場", zh: "釜山亚运会主体育场", ko: "부산아시아드 주경기장", es: "Estadio Principal Asiad de Busan", fr: "Stade Principal Asiad de Busan", de: "Busan Asiad Hauptstadion", it: "Stadio Principale Asiad di Busan", id: "Stadion Utama Asiad Busan", th: "สนามกีฬาหลักเอเชียดปูซาน" },
      addressKo: "부산 연제구 월드컵대로 344",
      latitude: "35.1690",
      longitude: "129.0598",
      startsAt: new Date("2026-10-17T15:00:00+09:00"),
      endsAt: new Date("2026-10-26T22:00:00+09:00"),
      priceInfo: { en: "Free / paid seats available", ja: "無料 / 有料席あり", zh: "免费 / 有付费座位", ko: "무료 / 유료석 별도", es: "Gratis / asientos de pago disponibles", fr: "Gratuit / places payantes disponibles", de: "Kostenlos / kostenpflichtige Platze verfugbar", it: "Gratuito / posti a pagamento disponibili", id: "Gratis / kursi berbayar tersedia", th: "ฟรี / มีที่นั่งเสียค่าใช้จ่าย" },
      bookingUrl: "https://www.bof.or.kr",
      images: ["https://images.unsplash.com/photo-1760966362386-e1012dbc3657?w=1200&h=630&fit=crop"],
      source: "curated",
    },
    {
      nameKo: "부산 크리스마스 마켓",
      names: { en: "Busan Christmas Market", ja: "釜山クリスマスマーケット", zh: "釜山圣诞市集", ko: "부산 크리스마스 마켓", es: "Mercado de Navidad de Busan", fr: "Marche de Noel de Busan", de: "Busaner Weihnachtsmarkt", it: "Mercatino di Natale di Busan", id: "Pasar Natal Busan", th: "ตลาดคริสต์มาสปูซาน" },
      description: {
        en: "A festive Christmas market at Haeundae featuring holiday decorations, handmade crafts, seasonal treats, mulled wine, and live caroling performances.",
        ja: "海雲台で開催されるクリスマスマーケット。ホリデーデコレーション、手作り雑貨、季節のグルメ、ホットワインが楽しめます。",
        zh: "在海云台举办的圣诞市集，设有节日装饰、手工艺品、季节美食、热红酒和现场圣歌表演。",
        ko: "해운대에서 열리는 크리스마스 마켓으로, 홀리데이 장식, 수공예품, 시즌 간식, 와인 등이 가득합니다.",
        es: "Un festivo mercado navideno en Haeundae con decoraciones, artesanias, dulces de temporada, vino caliente y actuaciones de villancicos en vivo.",
        fr: "Un marche de Noel festif a Haeundae avec des decorations de fetes, de l'artisanat, des gourmandises de saison, du vin chaud et des chants de Noel en direct.",
        de: "Ein festlicher Weihnachtsmarkt in Haeundae mit Weihnachtsdekorationen, Kunsthandwerk, saisonalen Leckereien, Gluhwein und Live-Weihnachtsliedern.",
        it: "Un festoso mercatino di Natale a Haeundae con decorazioni natalizie, artigianato, dolci di stagione, vin brule e canti natalizi dal vivo.",
        id: "Pasar Natal yang meriah di Haeundae dengan dekorasi liburan, kerajinan tangan, camilan musiman, anggur panas, dan pertunjukan lagu Natal langsung.",
        th: "ตลาดคริสต์มาสที่รื่นเริงในแฮอุนแด มีของตกแต่งวันหยุด งานฝีมือ ขนมตามฤดูกาล ไวน์อุ่น และการแสดงเพลงคริสต์มาสสด",
      },
      category: "exhibition",
      venueName: { en: "Haeundae Square", ja: "海雲台広場", zh: "海云台广场", ko: "해운대 광장", es: "Plaza Haeundae", fr: "Place de Haeundae", de: "Haeundae Platz", it: "Piazza Haeundae", id: "Alun-alun Haeundae", th: "ลานแฮอุนแด" },
      addressKo: "부산 해운대구 구남로 41",
      latitude: "35.1592",
      longitude: "129.1598",
      startsAt: new Date("2026-12-15T11:00:00+09:00"),
      endsAt: new Date("2026-12-31T21:00:00+09:00"),
      priceInfo: { en: "Free admission", ja: "入場無料", zh: "免费入场", ko: "무료 입장", es: "Entrada gratuita", fr: "Entree libre", de: "Eintritt frei", it: "Ingresso gratuito", id: "Gratis masuk", th: "เข้าชมฟรี" },
      images: ["https://images.unsplash.com/photo-1761273075575-b006f7e43e06?w=1200&h=630&fit=crop"],
      source: "curated",
    },
  ]);

  // ── Flows ──
  console.log("Seeding flows...");
  const [transitFlow] = await db.insert(flows).values([
    { name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索", zh: "查找路线", ko: "길찾기", es: "Buscar Ruta", fr: "Trouver un Itineraire", de: "Route Finden", it: "Trova Percorso", id: "Cari Rute", th: "ค้นหาเส้นทาง" }, sortOrder: 1 },
    { name: "tourism", icon: "🏖", displayNames: { en: "Tourist Spots", ja: "観光地", zh: "旅游景点", ko: "관광지/맛집", es: "Lugares Turisticos", fr: "Lieux Touristiques", de: "Sehenswurdigkeiten", it: "Luoghi Turistici", id: "Tempat Wisata", th: "สถานที่ท่องเที่ยว" }, sortOrder: 2 },
    { name: "booking", icon: "🎫", displayNames: { en: "Book Activity", ja: "予約", zh: "预订", ko: "예약하기", es: "Reservar Actividad", fr: "Reserver une Activite", de: "Aktivitat Buchen", it: "Prenota Attivita", id: "Pesan Aktivitas", th: "จองกิจกรรม" }, sortOrder: 3 },
  ]).returning();

  if (transitFlow) {
    const steps = await db.insert(flowSteps).values([
      { flowId: transitFlow.id, stepOrder: 1, type: "text_input", messages: { en: "Where are you now?", ja: "今どこにいますか？", zh: "您现在在哪里？", ko: "현재 위치가 어디인가요?", es: "Donde estas ahora?", fr: "Ou etes-vous actuellement ?", de: "Wo sind Sie gerade?", it: "Dove ti trovi adesso?", id: "Di mana Anda sekarang?", th: "คุณอยู่ที่ไหนตอนนี้?" } },
      { flowId: transitFlow.id, stepOrder: 2, type: "text_input", messages: { en: "Where would you like to go?", ja: "どこに行きたいですか？", zh: "您想去哪里？", ko: "어디로 가고 싶으세요?", es: "Adonde te gustaria ir?", fr: "Ou souhaitez-vous aller ?", de: "Wohin mochten Sie gehen?", it: "Dove vorresti andare?", id: "Ke mana Anda ingin pergi?", th: "คุณอยากไปที่ไหน?" } },
      { flowId: transitFlow.id, stepOrder: 3, type: "api_call", messages: {}, apiAction: "search_transit_route" },
      { flowId: transitFlow.id, stepOrder: 4, type: "result", messages: { en: "Here are your route options:", ja: "ルートオプション：", zh: "路线选项：", ko: "경로 옵션:", es: "Aqui estan tus opciones de ruta:", fr: "Voici vos options d'itineraire :", de: "Hier sind Ihre Routenoptionen:", it: "Ecco le opzioni di percorso:", id: "Berikut pilihan rute Anda:", th: "ตัวเลือกเส้นทางของคุณ:" } },
    ]).returning();

    if (steps[1]) {
      await db.insert(flowOptions).values([
        { stepId: steps[1].id, labels: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台", ko: "해운대 해수욕장", es: "Playa Haeundae", fr: "Plage de Haeundae", de: "Haeundae Strand", it: "Spiaggia di Haeundae", id: "Pantai Haeundae", th: "หาดแฮอุนแด" }, value: "haeundae", sortOrder: 1 },
        { stepId: steps[1].id, labels: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里", ko: "광안리 해수욕장", es: "Playa Gwangalli", fr: "Plage de Gwangalli", de: "Gwangalli Strand", it: "Spiaggia di Gwangalli", id: "Pantai Gwangalli", th: "หาดกวางอัลลี" }, value: "gwangalli", sortOrder: 2 },
        { stepId: steps[1].id, labels: { en: "Jagalchi Market", ja: "チャガルチ市場", zh: "扎嘎其市场", ko: "자갈치시장", es: "Mercado Jagalchi", fr: "Marche Jagalchi", de: "Jagalchi Markt", it: "Mercato Jagalchi", id: "Pasar Jagalchi", th: "ตลาดจากัลชี" }, value: "jagalchi", sortOrder: 3 },
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
