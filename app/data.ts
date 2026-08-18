export type Verification = "资料估算" | "待导航核验" | "动态待核验";

export type Airport = {
  id: string;
  code: string;
  name: string;
  city: string;
  core: boolean;
  lat: number;
  lon: number;
  mapAnchor?: string;
  note: string;
};

export type Place = {
  id: string;
  name: string;
  region: "阿勒泰" | "伊犁" | "乌鲁木齐周边";
  lat: number;
  lon: number;
  mapAnchor?: string;
  recommendedDays: number;
  defaultNights: number;
  durationOptions: number[];
  stay: string;
  season: string;
  play: string;
  food: string;
  supply: string;
  access: string;
  risk: string;
  image: string;
  imageAlt: string;
  sourceLabel: string;
  sourceUrl: string;
  verification: Verification;
};

export type RouteStop = {
  uid: string;
  placeId: string;
  days: number;
  nights: number;
};

export type SeedLeg = {
  from: string;
  to: string;
  km: number;
  driveHours: number;
  extraHours?: number;
  mode?: "car" | "shuttle" | "mixed";
  note: string;
  verification: Verification;
};

export const airports: Airport[] = [
  {
    id: "aat",
    code: "AAT",
    name: "阿勒泰雪都机场",
    city: "阿勒泰",
    core: true,
    lat: 47.748337,
    lon: 88.089483,
    note: "离喀纳斯方向最近的常规入口；西安直飞班次与租车库存需按日期复核。",
  },
  {
    id: "yin",
    code: "YIN",
    name: "伊宁机场",
    city: "伊宁",
    core: true,
    lat: 43.955855,
    lon: 81.327733,
    note: "伊犁河谷的高效率入口；跨区到阿勒泰会形成很长的北上转场。",
  },
  {
    id: "urc",
    code: "URC",
    name: "乌鲁木齐天山国际机场",
    city: "乌鲁木齐",
    core: true,
    lat: 43.914112,
    lon: 87.47584,
    note: "航班与租车选择通常更丰富，但进入阿勒泰或伊犁都会先付出长途转场。",
  },
  {
    id: "bpl",
    code: "BPL",
    name: "博乐阿拉山口机场",
    city: "博乐",
    core: false,
    lat: 44.898279,
    lon: 82.285304,
    note: "靠近赛里木湖，适合用作伊犁西端入口；直飞与租车能力需单独核验。",
  },
  {
    id: "kry",
    code: "KRY",
    name: "克拉玛依古海机场",
    city: "克拉玛依",
    core: false,
    lat: 45.465201,
    lon: 84.957374,
    note: "位于乌鲁木齐与阿勒泰之间，可减少部分陆路；航班和异地还车需核验。",
  },
  {
    id: "kji",
    code: "KJI",
    name: "喀纳斯机场",
    city: "布尔津·喀纳斯",
    core: false,
    lat: 48.221712,
    lon: 86.998456,
    note: "季节性与天气敏感入口；不能把航班稳定性或当地租车库存当成既定条件。",
  },
];

const kanasImage = "https://arabic.news.cn/2020-09/21/139382114_16005812413691n.jpg";
const hemuImage = "https://govt.chinadaily.com.cn/images/202209/23/632d58b6498ea27454b5735a.jpeg";
const sayramImage = "https://nfassetoss.southcn.com/__asset/07d91a9feb/d647b78c6f.png";
const xiataImage = "https://cds.chinadaily.com.cn/dams/capital/image/202307/27/64c1c8aee4b0736d76fc910c_m.jpg";
const nalatiImage = "https://www.xj.news.cn/20240816/bc6bf6b48b4d429cb0e0bcee735b34ed/20240816bc6bf6b48b4d429cb0e0bcee735b34ed_202408160fcd806f8b624d968b845a5a7580f1f0.jpg";

export const places: Place[] = [
  {
    id: "burqin",
    name: "布尔津",
    region: "阿勒泰",
    lat: 47.700617,
    lon: 86.872219,
    mapAnchor: "布尔津县城中心",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1],
    stay: "县城住 1 晚最实用：补给、洗衣、加油和次日早出都方便。",
    season: "9 月中旬昼夜温差大；它更像阿勒泰景区群的补给枢纽，不必强行凑景点。",
    play: "河堤散步、老街或夜市轻量体验，核心价值是休整。",
    food: "晚饭可找烤鱼、抓饭或家常新疆菜；旺季热门店需排队。",
    supply: "县城集中完成油箱补满、零食水、药品与充电。",
    access: "普通公路可达；进入喀纳斯/禾木前应在此确认道路和景区公告。",
    risk: "若当天航班晚点，优先保留睡眠，删掉夜间逛街。",
    image: hemuImage,
    imageAlt: "阿勒泰秋季村落与金色树林代表图",
    sourceLabel: "中国日报地方频道 · 禾木代表图",
    sourceUrl: "https://govt.chinadaily.com.cn/s/202209/23/WS632d58b6498ea274927a41e9/hemu-village-xinjiang-uygur-autonomous-region.html",
    verification: "资料估算",
  },
  {
    id: "hemu",
    name: "禾木",
    region: "阿勒泰",
    lat: 48.569206,
    lon: 87.430372,
    mapAnchor: "禾木村",
    recommendedDays: 1.5,
    defaultNights: 2,
    durationOptions: [0.5, 1, 1.5, 2],
    stay: "景区内连住 2 晚，才有一个完整清晨和天气容错；只住 1 晚是压缩版。",
    season: "9 月中旬可能已见金黄，也可能受降温、雨雪和叶色进度影响；不承诺峰值。",
    play: "村内慢走、禾木河、观景台日出；不必把每个机位都打卡。",
    food: "村内餐饮选择有限且旺季溢价，早餐与热水条件要提前问住宿。",
    supply: "进入景区前备好常用药、能量食品和保温水；村内补给成本更高。",
    access: "通常涉及停车场、区间车与步行；自驾是否可进入以当日官方公告为准。",
    risk: "区间车排队、早晚低温、住宿取消规则和夜间道路是主要不确定项。",
    image: hemuImage,
    imageAlt: "禾木村秋季木屋与金色树林",
    sourceLabel: "中国日报地方频道",
    sourceUrl: "https://govt.chinadaily.com.cn/s/202209/23/WS632d58b6498ea274927a41e9/hemu-village-xinjiang-uygur-autonomous-region.html",
    verification: "动态待核验",
  },
  {
    id: "kanas",
    name: "喀纳斯",
    region: "阿勒泰",
    lat: 48.491663,
    lon: 87.145955,
    mapAnchor: "自驾锚点：贾登峪入口",
    recommendedDays: 1.5,
    defaultNights: 2,
    durationOptions: [0.5, 1, 1.5, 2],
    stay: "优先景区内或贾登峪按玩法取舍；连住 2 晚可减少每天反复进出。",
    season: "秋色窗口通常集中但年际差异大，9 月中旬需同时防雨雪、晨雾和拥堵。",
    play: "三湾慢走、喀纳斯湖与观鱼台择重点；半日只能完成一个小模块。",
    food: "景区餐饮贵且高峰拥挤，可自备一顿简餐但注意垃圾带走。",
    supply: "布尔津补满油；景区内将保暖、雨具和移动电源随身携带。",
    access: "景区交通高度依赖区间车，排队和换乘应单列时间，不能只看导航。",
    risk: "门票预约、区间车组织、道路天气和观鱼台开放状态均需临行复核。",
    image: kanasImage,
    imageAlt: "喀纳斯湖秋季金色森林与蓝色湖水",
    sourceLabel: "新华社图片 · 2020-09-18 秋色",
    sourceUrl: "https://arabic.news.cn/2020-09/21/c_139382114.htm",
    verification: "动态待核验",
  },
  {
    id: "baihaba",
    name: "白哈巴",
    region: "阿勒泰",
    lat: 48.693202,
    lon: 86.781606,
    mapAnchor: "白哈巴村；景区交通规则另核验",
    recommendedDays: 0.5,
    defaultNights: 0,
    durationOptions: [0.5, 1],
    stay: "首版默认从喀纳斯日游不换宿；若要住村内，需重查住宿与边境管理要求。",
    season: "秋季观感与喀纳斯同属一个天气系统，叶色和能见度不保证。",
    play: "村落与观景点轻量游；时间不足时它是第一优先级可删项之一。",
    food: "以景区简餐为主，建议从喀纳斯带水和能量食品。",
    supply: "不把这里当作可靠补给点；证件原件随身。",
    access: "常见方式为景区交通往返，边境通行与购票规则必须按当年官方要求核验。",
    risk: "排队会把半日迅速拉长；若当天还要转场，应主动删除。",
    image: kanasImage,
    imageAlt: "喀纳斯区域秋色代表图",
    sourceLabel: "新华社图片 · 喀纳斯区域代表图",
    sourceUrl: "https://arabic.news.cn/2020-09/21/c_139382114.htm",
    verification: "动态待核验",
  },
  {
    id: "urho",
    name: "乌尔禾·世界魔鬼城",
    region: "阿勒泰",
    lat: 46.115754,
    lon: 85.750008,
    mapAnchor: "世界魔鬼城景区",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1],
    stay: "可住乌尔禾或克拉玛依，取决于次日方向；不建议游完再长距离夜驾。",
    season: "9 月风大、日晒仍可能强，日落氛围好但与夜驾风险冲突。",
    play: "雅丹地貌与景区小火车；2—3 小时通常足够。",
    food: "乌尔禾镇解决正餐，景区内不作为主要用餐点。",
    supply: "克拉玛依或乌尔禾完成加油补水。",
    access: "普通公路抵达，景区内部交通和闭园时间需查当天公告。",
    risk: "若当天从阿勒泰南下，抵达过晚就跳过日落，直接休息。",
    image: kanasImage,
    imageAlt: "北疆秋季自然景观代表图",
    sourceLabel: "新华社图片 · 北疆代表图",
    sourceUrl: "https://arabic.news.cn/2020-09/21/c_139382114.htm",
    verification: "动态待核验",
  },
  {
    id: "bole",
    name: "博乐",
    region: "伊犁",
    lat: 44.852877,
    lon: 82.050459,
    mapAnchor: "博乐市区中心",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1],
    stay: "作为赛里木湖西侧机场/补给过渡夜，比景区内住宿更稳妥。",
    season: "9 月中旬城市本身不是季节性核心，价值在衔接与容错。",
    play: "以休整、补给为主；时间富余再安排城市散步。",
    food: "城市餐饮选择比景区丰富，可在此解决正餐。",
    supply: "补满油、买水和保暖用品，再进入赛湖。",
    access: "城市道路；与机场租车网点之间的营业时间需单独核验。",
    risk: "不要因‘顺路’增加无价值打卡，晚到就只住宿。",
    image: sayramImage,
    imageAlt: "赛里木湖与天山代表图",
    sourceLabel: "南方新闻网 · 赛里木湖代表图",
    sourceUrl: "https://www.newsgd.com/node_e9dced8600/3b334c1967.shtml",
    verification: "资料估算",
  },
  {
    id: "sayram",
    name: "赛里木湖",
    region: "伊犁",
    lat: 44.601102,
    lon: 81.390681,
    mapAnchor: "自驾锚点：赛里木湖东门游客中心",
    recommendedDays: 1,
    defaultNights: 1,
    durationOptions: [0.5, 1, 1.5, 2],
    stay: "住湖区附近 1 晚可覆盖傍晚和次日上午；若天气差，可加到 2 晚。",
    season: "9 月已是偏秋景观，不应套用盛夏花海宣传；风、雨雪和低温需预案。",
    play: "环湖择点停留，不追求每个机位；给风景和临时停车留时间。",
    food: "湖区餐饮分散，正餐最好在博乐或清水河一带统筹。",
    supply: "进湖前加油补水；车内备防风外套和简餐。",
    access: "环湖与自驾政策、入口方向、营业时段均按 2026 官方公告复核。",
    risk: "大风和低能见度会显著降低体验；可换成伊宁休整或直接转场。",
    image: sayramImage,
    imageAlt: "赛里木湖蓝色湖面与远山",
    sourceLabel: "南方新闻网",
    sourceUrl: "https://www.newsgd.com/node_e9dced8600/3b334c1967.shtml",
    verification: "动态待核验",
  },
  {
    id: "yining",
    name: "伊宁",
    region: "伊犁",
    lat: 43.905203,
    lon: 81.27478,
    mapAnchor: "伊宁市区中心",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1, 1.5],
    stay: "适合作为伊犁基地连住 2—3 晚，用日游换取少换酒店和天气容错。",
    season: "9 月中旬城市与河谷适合慢走，但草原盛夏观感已退，不把它包装成花季。",
    play: "六星街、喀赞其或河边择一，保留一顿慢餐。",
    food: "适合集中体验手抓肉、面食、冰淇淋与当地早餐，避开满排打卡。",
    supply: "城市内处理洗衣、采购、加油和车辆问题。",
    access: "城市道路拥堵时间需预留；机场取还车网点营业时间待订单核验。",
    risk: "从赛湖或昭苏晚到时，删城市打卡，优先睡眠。",
    image: sayramImage,
    imageAlt: "伊犁地区湖泊与天山代表图",
    sourceLabel: "南方新闻网 · 伊犁代表图",
    sourceUrl: "https://www.newsgd.com/node_e9dced8600/3b334c1967.shtml",
    verification: "资料估算",
  },
  {
    id: "zhaosu",
    name: "昭苏",
    region: "伊犁",
    lat: 43.152726,
    lon: 81.127103,
    mapAnchor: "昭苏县城中心",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1],
    stay: "作为夏塔前后基地住 1—2 晚；住县城比每天从伊宁往返更省驾驶。",
    season: "9 月中旬油菜花季已过，核心是高原秋意、天气与夏塔衔接。",
    play: "县城休整、沿途景观；不为填满半天强加低价值点。",
    food: "县城正餐与早餐比夏塔景区稳定，次日早出可预备简餐。",
    supply: "加油、补水、雨具和能量食品在县城一次完成。",
    access: "伊昭公路开放状态、限行和天气需当天查；关闭时必须走替代线路。",
    risk: "把伊昭公路当必走会放大风险；编辑器中的时间按普通规划估算。",
    image: xiataImage,
    imageAlt: "昭苏夏塔雪山、森林与木栈道",
    sourceLabel: "中国日报网 · 夏塔代表图",
    sourceUrl: "https://tech.chinadaily.com.cn/a/202307/27/WS64c1c215a3109d7585e46a86.html",
    verification: "动态待核验",
  },
  {
    id: "xiata",
    name: "夏塔",
    region: "伊犁",
    lat: 42.667981,
    lon: 80.586929,
    mapAnchor: "自驾锚点：夏塔游客中心",
    recommendedDays: 1,
    defaultNights: 1,
    durationOptions: [0.5, 1, 1.5, 2],
    stay: "昭苏或景区附近住；想认真徒步至少留完整白天，避免当天再赶远路。",
    season: "9 月中旬天气转冷且雪山能见度波动；夏季宣传图不代表本次日期实况。",
    play: "区间车后徒步，按体力选择将军桥或更短路线；同行人节奏优先。",
    food: "带便携午餐和热水，晚餐回住宿地解决。",
    supply: "昭苏补满油和徒步用品，景区不作为可靠补给点。",
    access: "区间车、排队、徒步和返程末班时间必须一起计入；不是‘导航到门口就开玩’。",
    risk: "降雨、降雪、道路与区间车停运都可能导致整日取消，应准备伊宁/昭苏休整替代。",
    image: xiataImage,
    imageAlt: "夏塔古道木栈道、森林与远处雪山",
    sourceLabel: "中国日报网",
    sourceUrl: "https://tech.chinadaily.com.cn/a/202307/27/WS64c1c215a3109d7585e46a86.html",
    verification: "动态待核验",
  },
  {
    id: "nalati",
    name: "那拉提",
    region: "伊犁",
    lat: 43.318176,
    lon: 84.026584,
    mapAnchor: "自驾锚点：那拉提景区游客中心",
    recommendedDays: 1,
    defaultNights: 1,
    durationOptions: [0.5, 1, 1.5, 2],
    stay: "镇上或景区附近住 1—2 晚；若只安排半天，先明确主动舍弃的线路。",
    season: "9 月中旬是秋草与河谷色调，不是盛夏翠绿花海；价值取决于天气与个人偏好。",
    play: "空中草原、河谷草原不要贪全；半日选一条，一日再组合。",
    food: "镇上解决早晚餐，景区游玩时准备水与简餐。",
    supply: "镇上加油、补水和检查胎压，再进入山地道路。",
    access: "景区自驾/区间车规则与票务产品可能调整，按 2026 官方公告确认。",
    risk: "若草色与天气一般，它应低于喀纳斯秋色的保留优先级。",
    image: nalatiImage,
    imageAlt: "那拉提草原日出与河谷",
    sourceLabel: "新华网新疆频道",
    sourceUrl: "https://www.xj.news.cn/20240816/bc6bf6b48b4d429cb0e0bcee735b34ed/c.html",
    verification: "动态待核验",
  },
  {
    id: "anjihai",
    name: "安集海大峡谷",
    region: "乌鲁木齐周边",
    lat: 44.105367,
    lon: 85.100054,
    mapAnchor: "安集海大峡谷观景区域",
    recommendedDays: 0.5,
    defaultNights: 0,
    durationOptions: [0.5, 1],
    stay: "通常不为它单独换宿，可从乌鲁木齐/奎屯一带衔接。",
    season: "地貌型景观季节依赖较低，但开放边界与安全管理更重要。",
    play: "观景与摄影 1—2 小时，明确遵守围栏与现场管控。",
    food: "不在观景点解决正餐，沿途城市统筹。",
    supply: "出城前加油补水；现场服务不可预设。",
    access: "开放状态、可达道路和停车规则必须临行核验，编辑器不承诺可进入。",
    risk: "若无明确开放信息，直接删除，不冒险绕行或越界。",
    image: nalatiImage,
    imageAlt: "新疆山地景观代表图",
    sourceLabel: "新华网新疆频道 · 新疆山地代表图",
    sourceUrl: "https://www.xj.news.cn/20240816/bc6bf6b48b4d429cb0e0bcee735b34ed/c.html",
    verification: "动态待核验",
  },
  {
    id: "urumqi",
    name: "乌鲁木齐",
    region: "乌鲁木齐周边",
    lat: 43.824407,
    lon: 87.613904,
    mapAnchor: "乌鲁木齐市区中心",
    recommendedDays: 0.5,
    defaultNights: 1,
    durationOptions: [0.5, 1, 1.5],
    stay: "早班机前或长途后住机场/市区一晚，按下一段方向选择，不为网红店横穿城市。",
    season: "9 月适合城市休整，路线价值主要是航班、租车与补给。",
    play: "博物馆或城市餐饮二选一；若长途抵达则只休息。",
    food: "集中解决一顿想吃的新疆菜，给排队留时间。",
    supply: "车辆交接、药品、装备和返程打包均可在此处理。",
    access: "机场与市区通勤受拥堵影响；还车需按网点营业时间额外留缓冲。",
    risk: "末日从远地赶航班风险高，应把乌鲁木齐前置为最后一晚。",
    image: sayramImage,
    imageAlt: "新疆天山与湖泊代表图",
    sourceLabel: "南方新闻网 · 新疆代表图",
    sourceUrl: "https://www.newsgd.com/node_e9dced8600/3b334c1967.shtml",
    verification: "资料估算",
  },
];

export const seedLegs: SeedLeg[] = [
  { from: "aat", to: "burqin", km: 108, driveHours: 2, note: "机场至布尔津县城规划值", verification: "资料估算" },
  { from: "aat", to: "hemu", km: 209, driveHours: 4.5, extraHours: 1.5, mode: "mixed", note: "含进景区停车/换乘预留", verification: "资料估算" },
  { from: "aat", to: "kanas", km: 240, driveHours: 4.7, extraHours: 2, mode: "mixed", note: "含贾登峪停车、购票与区间车预留", verification: "资料估算" },
  { from: "burqin", to: "hemu", km: 170, driveHours: 3.5, extraHours: 1.5, mode: "mixed", note: "含停车与区间车，不含旺季极端排队", verification: "资料估算" },
  { from: "burqin", to: "kanas", km: 140, driveHours: 3, extraHours: 2, mode: "mixed", note: "含贾登峪换乘区间车", verification: "资料估算" },
  { from: "hemu", to: "kanas", km: 68, driveHours: 1.75, extraHours: 2.5, mode: "mixed", note: "景区接驳与排队可能高于公路驾驶", verification: "资料估算" },
  { from: "kanas", to: "baihaba", km: 35, driveHours: 1.5, extraHours: 1, mode: "shuttle", note: "按景区交通往返思路，边境与班次待核", verification: "动态待核验" },
  { from: "kji", to: "kanas", km: 50, driveHours: 1.2, extraHours: 1.5, mode: "mixed", note: "季节机场到景区接驳，班次待核", verification: "动态待核验" },
  { from: "kji", to: "hemu", km: 80, driveHours: 2, extraHours: 1.5, mode: "mixed", note: "机场接驳与景区交通均待核", verification: "动态待核验" },
  { from: "kry", to: "urho", km: 110, driveHours: 1.5, note: "克拉玛依至乌尔禾规划值", verification: "资料估算" },
  { from: "urho", to: "burqin", km: 225, driveHours: 3.25, note: "乌尔禾至布尔津规划值", verification: "资料估算" },
  { from: "urho", to: "sayram", km: 550, driveHours: 6.75, note: "跨区长转场，另加两次休息和正餐", verification: "资料估算" },
  { from: "bpl", to: "bole", km: 25, driveHours: 0.5, note: "机场至博乐城区规划值", verification: "资料估算" },
  { from: "bpl", to: "sayram", km: 105, driveHours: 1.7, note: "博乐机场至赛湖入口方向规划值", verification: "资料估算" },
  { from: "bole", to: "sayram", km: 90, driveHours: 1.5, note: "博乐至赛湖规划值", verification: "资料估算" },
  { from: "sayram", to: "yin", km: 160, driveHours: 2.75, note: "赛湖至伊宁机场方向规划值", verification: "资料估算" },
  { from: "sayram", to: "yining", km: 155, driveHours: 2.6, note: "赛湖至伊宁市区规划值", verification: "资料估算" },
  { from: "yin", to: "yining", km: 7, driveHours: 0.3, note: "机场至市区不含拥堵", verification: "资料估算" },
  { from: "yining", to: "zhaosu", km: 140, driveHours: 3.5, note: "路线可能受伊昭公路开放状态影响", verification: "动态待核验" },
  { from: "zhaosu", to: "xiata", km: 75, driveHours: 1.5, extraHours: 1.5, mode: "mixed", note: "含景区停车、区间车与排队基础预留", verification: "资料估算" },
  { from: "zhaosu", to: "nalati", km: 280, driveHours: 5.5, note: "山地长转场，需中途休息与补给", verification: "待导航核验" },
  { from: "xiata", to: "nalati", km: 350, driveHours: 6.7, note: "高强度山地转场，不建议与完整游玩同日", verification: "待导航核验" },
  { from: "nalati", to: "yin", km: 260, driveHours: 4, note: "那拉提至伊宁机场方向规划值", verification: "资料估算" },
  { from: "nalati", to: "yining", km: 255, driveHours: 4, note: "那拉提至伊宁市区规划值", verification: "资料估算" },
  { from: "urc", to: "urumqi", km: 20, driveHours: 0.6, note: "机场至市区不含高峰拥堵", verification: "资料估算" },
  { from: "urc", to: "kry", km: 320, driveHours: 4, note: "乌鲁木齐至克拉玛依规划值", verification: "资料估算" },
  { from: "urc", to: "aat", km: 540, driveHours: 6.5, note: "机场间长转场，另加休息与正餐", verification: "资料估算" },
  { from: "urc", to: "anjihai", km: 250, driveHours: 3.5, note: "可达与开放边界均需临行复核", verification: "动态待核验" },
  { from: "anjihai", to: "nalati", km: 430, driveHours: 7, note: "跨山地长转场，仅作粗估", verification: "待导航核验" },
  { from: "yin", to: "aat", km: 930, driveHours: 12.5, note: "跨区极长转场，不应在普通单日内完成", verification: "待导航核验" },
  { from: "urc", to: "yin", km: 690, driveHours: 8.5, note: "机场间长转场，需拆日或全天转场", verification: "待导航核验" },
  { from: "kry", to: "aat", km: 440, driveHours: 5.5, note: "克拉玛依至阿勒泰规划值", verification: "待导航核验" },
];

export const placeById = Object.fromEntries(places.map((place) => [place.id, place]));
export const airportById = Object.fromEntries(airports.map((airport) => [airport.id, airport]));

export const defaultStops: RouteStop[] = [
  { uid: "stop-burqin", placeId: "burqin", days: 0.5, nights: 1 },
  { uid: "stop-hemu", placeId: "hemu", days: 1.5, nights: 2 },
  { uid: "stop-kanas", placeId: "kanas", days: 1.5, nights: 2 },
  { uid: "stop-baihaba", placeId: "baihaba", days: 0.5, nights: 0 },
];
