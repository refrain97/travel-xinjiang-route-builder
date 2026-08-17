import {
  airportById,
  placeById,
  seedLegs,
  type Airport,
  type Place,
  type RouteStop,
  type Verification,
} from "./data";

export type LegEstimate = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  km: number;
  driveHours: number;
  restHours: number;
  extraHours: number;
  realHours: number;
  mode: "car" | "shuttle" | "mixed";
  note: string;
  verification: Verification;
  fallback: boolean;
};

export type WarningItem = {
  level: "high" | "medium" | "info";
  title: string;
  detail: string;
};

export type TripStats = {
  naturalDays: number;
  totalKm: number;
  driveHours: number;
  realTransferHours: number;
  playDays: number;
  nights: number;
  hotelChanges: number;
  allocatedDays: number;
  bufferDays: number;
  legs: LegEstimate[];
};

export type DayPlan = {
  day: number;
  date: string;
  weekday: string;
  title: string;
  events: string[];
  hotel: string;
  km: number;
  driveHours: number;
  realHours: number;
  loadHours: number;
  tags: string[];
  overflow: boolean;
};

export type CarComparison = {
  sameReturn: {
    title: string;
    detail: string;
    extraKm: number;
    extraHours: number;
  };
  oneWay: {
    title: string;
    detail: string;
    availability: string;
    fee: string;
  };
};

type AnyNode = (Airport | Place) & { kind: "airport" | "place" };

const roundOne = (value: number) => Math.round(value * 10) / 10;

function getNode(id: string): AnyNode {
  if (airportById[id]) return { ...airportById[id], kind: "airport" } as AnyNode;
  if (placeById[id]) return { ...placeById[id], kind: "place" } as AnyNode;
  throw new Error("Unknown route node: " + id);
}

function haversineKm(a: AnyNode, b: AnyNode) {
  const radius = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function restAllowance(driveHours: number) {
  if (driveHours <= 0.8) return 0.2;
  if (driveHours <= 2) return 0.35;
  if (driveHours <= 4) return 0.65;
  if (driveHours <= 6) return 1.25;
  if (driveHours <= 8) return 1.8;
  return 2.5;
}

export function estimateLeg(fromId: string, toId: string): LegEstimate {
  const from = getNode(fromId);
  const to = getNode(toId);
  if (fromId === toId) {
    return {
      fromId,
      toId,
      fromName: from.name,
      toName: to.name,
      km: 0,
      driveHours: 0,
      restHours: 0,
      extraHours: 0,
      realHours: 0,
      mode: "car",
      note: "同一节点",
      verification: "资料估算",
      fallback: false,
    };
  }

  const seed = seedLegs.find(
    (leg) =>
      (leg.from === fromId && leg.to === toId) ||
      (leg.from === toId && leg.to === fromId),
  );

  if (seed) {
    const restHours = restAllowance(seed.driveHours);
    const extraHours = seed.extraHours || 0;
    return {
      fromId,
      toId,
      fromName: from.name,
      toName: to.name,
      km: seed.km,
      driveHours: seed.driveHours,
      restHours,
      extraHours,
      realHours: roundOne(seed.driveHours + restHours + extraHours),
      mode: seed.mode || "car",
      note: seed.note,
      verification: seed.verification,
      fallback: false,
    };
  }

  const straight = haversineKm(from, to);
  const regionalFactor =
    "region" in from && "region" in to && from.region === to.region ? 1.28 : 1.42;
  const km = Math.max(15, Math.round((straight * regionalFactor) / 5) * 5);
  const speed = km < 100 ? 48 : km < 300 ? 58 : 65;
  const driveHours = roundOne(km / speed);
  const restHours = restAllowance(driveHours);

  return {
    fromId,
    toId,
    fromName: from.name,
    toName: to.name,
    km,
    driveHours,
    restHours,
    extraHours: 0,
    realHours: roundOne(driveHours + restHours),
    mode: "car",
    note: "缺少已核验路段，按坐标与道路系数粗估",
    verification: "待导航核验",
    fallback: true,
  };
}

export function routeLegs(startId: string, stops: RouteStop[], endId: string) {
  const ids = [startId, ...stops.map((stop) => stop.placeId), endId];
  return ids.slice(0, -1).map((id, index) => estimateLeg(id, ids[index + 1]));
}

export function naturalDayCount(startDate: string, endDate: string) {
  const start = new Date(startDate + "T12:00:00+08:00");
  const end = new Date(endDate + "T12:00:00+08:00");
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function calculateStats(
  startId: string,
  stops: RouteStop[],
  endId: string,
  startDate: string,
  endDate: string,
): TripStats {
  const legs = routeLegs(startId, stops, endId);
  const totalKm = legs.reduce((sum, leg) => sum + leg.km, 0);
  const driveHours = legs.reduce((sum, leg) => sum + leg.driveHours, 0);
  const realTransferHours = legs.reduce((sum, leg) => sum + leg.realHours, 0);
  const playDays = stops.reduce((sum, stop) => sum + stop.days, 0);
  const nights = stops.reduce((sum, stop) => sum + stop.nights, 0);
  const stayStops = stops.filter((stop) => stop.nights > 0).length;
  const hotelChanges = Math.max(0, stayStops - 1);
  const naturalDays = naturalDayCount(startDate, endDate);
  const stopCalendarDays = stops.reduce(
    (sum, stop) => sum + Math.max(stop.days, stop.nights > 0 ? stop.nights : 0),
    0,
  );
  const allocatedDays = roundOne(1 + stopCalendarDays + realTransferHours / 10);
  const bufferDays = roundOne(naturalDays - allocatedDays);

  return {
    naturalDays,
    totalKm,
    driveHours: roundOne(driveHours),
    realTransferHours: roundOne(realTransferHours),
    playDays: roundOne(playDays),
    nights,
    hotelChanges,
    allocatedDays,
    bufferDays,
    legs,
  };
}

export function buildWarnings(
  stats: TripStats,
  stops: RouteStop[],
  startId: string,
  endId: string,
): WarningItem[] {
  const warnings: WarningItem[] = [];

  if (stats.bufferDays < 0) {
    warnings.push({
      level: "high",
      title: "已经超出可用日期",
      detail: "粗排超出 " + Math.abs(stats.bufferDays) + " 天。先删点、减游玩或改航班日期。",
    });
  } else if (stats.bufferDays < 0.6) {
    warnings.push({
      level: "high",
      title: "几乎没有天气缓冲",
      detail: "北疆 9 月的降温、雨雪、排队或航班变化都可能打乱整条路线。",
    });
  } else if (stats.bufferDays < 1.2) {
    warnings.push({
      level: "medium",
      title: "缓冲只有约半天到一天",
      detail: "建议先明确一个天气差时可主动删除的节点。",
    });
  }

  stats.legs.forEach((leg) => {
    if (leg.realHours > 10) {
      warnings.push({
        level: "high",
        title: leg.fromName + " → " + leg.toName + " 超长转场",
        detail: "现实占用约 " + leg.realHours + " 小时，普通白天无法舒适完成，需拆日或改机场。",
      });
    } else if (leg.realHours > 7) {
      warnings.push({
        level: "medium",
        title: leg.fromName + " → " + leg.toName + " 接近全天转场",
        detail: "已含基础休息/吃饭预留约 " + leg.realHours + " 小时，不宜再塞完整景区。",
      });
    }
    if (leg.fallback) {
      warnings.push({
        level: "info",
        title: leg.fromName + " → " + leg.toName + " 仍是粗估",
        detail: "当前没有核验路段值，必须在高德/百度按真实日期和入口重查。",
      });
    }
  });

  stops.forEach((stop) => {
    const place = placeById[stop.placeId];
    if (stop.days < place.recommendedDays) {
      warnings.push({
        level: "info",
        title: place.name + " 采用压缩玩法",
        detail: "当前 " + stop.days + " 天，建议值约 " + place.recommendedDays + " 天；需要主动舍弃部分玩法。",
      });
    }
    if (stop.days >= 1 && stop.nights === 0) {
      warnings.push({
        level: "medium",
        title: place.name + " 没有配置住宿",
        detail: "完整游玩却不住宿，往往意味着早晚叠加驾驶，需检查是否会夜驾。",
      });
    }
  });

  if (startId !== endId) {
    warnings.push({
      level: "medium",
      title: "异地还车尚未锁单",
      detail: "机场组合可用于路线推演，但车型库存、网点营业和异地费都必须以订单为准。",
    });
  }

  const finalLeg = stats.legs[stats.legs.length - 1];
  if (finalLeg && finalLeg.realHours > 3) {
    warnings.push({
      level: "high",
      title: "末段离机场过远",
      detail: "最后一个节点到离疆机场现实占用约 " + finalLeg.realHours + " 小时，建议前一晚回到机场城市。",
    });
  }

  if (stops.length === 0) {
    warnings.push({ level: "info", title: "还没有加入地点", detail: "从地图或地点库按顺序加入第一站。" });
  }

  return warnings.slice(0, 8);
}

const oneWayAvailability: Record<string, string> = {
  "aat-kry": "部分平台/门店组合可能支持，2026-09 具体订单待核",
  "aat-urc": "跨城市异地还车通常存在，车型与费用待订单核验",
  "kry-urc": "主流城市组合可能支持，仍需按门店营业时间核验",
  "urc-yin": "主流城市组合可能支持，仍需按车型与日期核验",
  "bpl-yin": "同区域组合可能支持，博乐机场门店能力待核",
  "aat-yin": "超长跨区组合，不预设可用；必须先查库存与异地费",
};

export function compareCarReturn(startId: string, endId: string): CarComparison {
  const start = airportById[startId];
  const end = airportById[endId];
  if (startId === endId) {
    return {
      sameReturn: {
        title: "同地取还最清晰",
        detail: "在 " + start.city + " 机场取还，不产生为了还车回原地的额外跨城转场。",
        extraKm: 0,
        extraHours: 0,
      },
      oneWay: {
        title: "无需异地还车",
        detail: "当前进出机场相同，异地还车没有路线收益。",
        availability: "不适用",
        fee: "¥0（路线层面）",
      },
    };
  }

  const returnLeg = estimateLeg(endId, startId);
  const key = [startId, endId].sort().join("-");
  return {
    sameReturn: {
      title: "回原取车点再还车",
      detail:
        "从 " + end.city + " 回 " + start.city + " 预计额外 " + returnLeg.km + " km / " + returnLeg.realHours + " 小时；还要重算离疆机场。",
      extraKm: returnLeg.km,
      extraHours: returnLeg.realHours,
    },
    oneWay: {
      title: start.city + " 取 → " + end.city + " 还",
      detail: "路线不回头，但必须同时核对取还门店、营业时间、车型库存和航班衔接。",
      availability: oneWayAvailability[key] || "未建立可靠可用性结论，需在租车平台按日期询价",
      fee: "异地费待实时报价，不在原型中虚构金额",
    },
  };
}

function dateParts(startDate: string, index: number) {
  const date = new Date(startDate + "T12:00:00+08:00");
  date.setDate(date.getDate() + index);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return { date: month + "-" + day, weekday: weekdays[date.getDay()] };
}

function createDay(startDate: string, index: number): DayPlan {
  const parts = dateParts(startDate, index);
  return {
    day: index + 1,
    date: parts.date,
    weekday: parts.weekday,
    title: "待安排",
    events: [],
    hotel: "待定",
    km: 0,
    driveHours: 0,
    realHours: 0,
    loadHours: 0,
    tags: [],
    overflow: false,
  };
}

export function generateDays(
  startId: string,
  stops: RouteStop[],
  endId: string,
  startDate: string,
  endDate: string,
): DayPlan[] {
  const naturalDays = naturalDayCount(startDate, endDate);
  const days: DayPlan[] = [createDay(startDate, 0)];
  const startAirport = airportById[startId];
  const endAirport = airportById[endId];
  let dayIndex = 0;
  let currentId = startId;

  const currentDay = () => days[dayIndex];
  const nextDay = () => {
    dayIndex += 1;
    if (!days[dayIndex]) days[dayIndex] = createDay(startDate, dayIndex);
    return days[dayIndex];
  };

  currentDay().title = "西安 → " + startAirport.city + " · 进疆";
  currentDay().events.push(
    "西安飞 " + startAirport.code + "：具体航班、时刻与票价未接入，按出票结果回填。",
    "落地后按 2.5—3.5 小时预留取行李、取车、验车、午餐/补水。",
  );
  currentDay().loadHours = 3.5;
  currentDay().tags.push("航班待核", "取车日");

  stops.forEach((stop) => {
    const place = placeById[stop.placeId];
    const leg = estimateLeg(currentId, stop.placeId);

    if (currentDay().loadHours > 3.8 && currentDay().loadHours + leg.realHours > 10) {
      nextDay();
    }

    const arrivalIndex = dayIndex;
    currentDay().title = currentDay().events.length ? currentDay().title : leg.fromName + " → " + place.name;
    currentDay().events.push(
      "转场 " + leg.fromName + " → " + place.name + "：约 " + leg.km + " km / 纯驾 " + leg.driveHours + " h；现实占用约 " + leg.realHours + " h。",
      "途中按时休息、加油/正餐；" + leg.note + "。",
    );
    currentDay().km += leg.km;
    currentDay().driveHours = roundOne(currentDay().driveHours + leg.driveHours);
    currentDay().realHours = roundOne(currentDay().realHours + leg.realHours);
    currentDay().loadHours = roundOne(currentDay().loadHours + leg.realHours);
    currentDay().tags.push(leg.verification, leg.mode === "car" ? "自驾" : "含景交");

    let playHours = stop.days * 8;
    while (playHours > 0) {
      const room = Math.max(0, 10 - currentDay().loadHours);
      if (room < 2) {
        nextDay();
      }
      const usable = Math.max(0, 10 - currentDay().loadHours);
      const chunk = Math.min(playHours, usable);
      if (chunk <= 0) {
        nextDay();
        continue;
      }
      currentDay().title = currentDay().events.length ? currentDay().title : place.name + " · 游玩";
      currentDay().events.push(
        place.name + " 实际游玩约 " + roundOne(chunk) + " h：" + place.play,
      );
      currentDay().loadHours = roundOne(currentDay().loadHours + chunk);
      currentDay().tags.push("游玩 " + roundOne(chunk) + "h");
      playHours = roundOne(playHours - chunk);
    }

    const activityEndIndex = dayIndex;
    const hotelEnd = Math.max(arrivalIndex + stop.nights - 1, activityEndIndex);
    for (let hotelDay = arrivalIndex; hotelDay <= hotelEnd; hotelDay += 1) {
      if (!days[hotelDay]) days[hotelDay] = createDay(startDate, hotelDay);
      days[hotelDay].hotel = place.name + " · " + place.stay.split("；")[0];
    }

    const departureIndex = arrivalIndex + stop.nights;
    while (dayIndex < departureIndex) {
      nextDay();
      if (currentDay().events.length === 0) {
        currentDay().title = place.name + " · 慢住/天气缓冲";
        currentDay().events.push("住宿夜数高于已排游玩量，这一天保留为休息、天气机动或二次游玩。")
        currentDay().hotel = place.name + " · 连住";
        currentDay().tags.push("缓冲日");
        currentDay().loadHours = 2;
      }
    }

    currentId = stop.placeId;
  });

  const finalLeg = estimateLeg(currentId, endId);
  const preferredTransferIndex = Math.max(0, naturalDays - (finalLeg.realHours > 2 ? 2 : 1));

  while (dayIndex < preferredTransferIndex) {
    nextDay();
    if (currentDay().events.length === 0 && dayIndex < preferredTransferIndex) {
      currentDay().title = "机动缓冲 · 由你决定";
      currentDay().events.push("这一天暂不强塞景点，可留给天气补偿、休息或把前一站玩慢一点。")
      currentDay().hotel = dayIndex > 0 ? days[dayIndex - 1].hotel : "待定";
      currentDay().loadHours = 2;
      currentDay().tags.push("可用缓冲");
    }
  }

  if (currentDay().loadHours > 3 && currentDay().loadHours + finalLeg.realHours > 10) {
    nextDay();
  }
  currentDay().title = finalLeg.km > 0 ? finalLeg.fromName + " → " + endAirport.city : endAirport.city + " · 还车准备";
  if (finalLeg.km > 0) {
    currentDay().events.push(
      "去离疆机场：约 " + finalLeg.km + " km / 纯驾 " + finalLeg.driveHours + " h；现实占用约 " + finalLeg.realHours + " h。",
      "到机场城市后加满油、整理行李，按租车订单确认还车网点与营业时间。",
    );
    currentDay().km += finalLeg.km;
    currentDay().driveHours = roundOne(currentDay().driveHours + finalLeg.driveHours);
    currentDay().realHours = roundOne(currentDay().realHours + finalLeg.realHours);
    currentDay().loadHours = roundOne(currentDay().loadHours + finalLeg.realHours);
    currentDay().tags.push(finalLeg.verification);
  }
  currentDay().hotel = endAirport.city + "机场/市区 · 视航班时刻决定";

  while (dayIndex < naturalDays - 1) {
    nextDay();
    currentDay().title = endAirport.city + " · 返程缓冲";
    currentDay().events.push("把这一天留给还车与航班衔接；若前段天气正常，可用于低强度城市活动。")
    currentDay().hotel = "返程日不固定住宿";
    currentDay().tags.push("返程缓冲");
  }

  if (currentDay().loadHours > 7) nextDay();
  currentDay().title = endAirport.city + " → 西安 · 离疆";
  currentDay().events.push(
    "在 " + endAirport.code + " 还车并飞回西安：具体航班、值机截止与票价待实时查询。",
    "国内航班建议至少预留 2.5—3 小时完成加油、还车、接驳、托运与安检。",
  );
  currentDay().loadHours = roundOne(currentDay().loadHours + 3);
  currentDay().tags.push("航班待核", startId === endId ? "同地还车" : "异地还车待核");

  return days.map((day) => ({
    ...day,
    overflow: day.loadHours > 10 || day.day > naturalDays,
    tags: Array.from(new Set(day.tags)),
  }));
}

export function buildTextSummary(
  startId: string,
  stops: RouteStop[],
  endId: string,
  stats: TripStats,
  days: DayPlan[],
) {
  const route = [
    airportById[startId].city + "机场",
    ...stops.map((stop) => placeById[stop.placeId].name),
    airportById[endId].city + "机场",
  ].join(" → ");
  const lines = [
    "新疆自由拼盘路线（规划估算）",
    "路线：" + route,
    "合计：" + stats.naturalDays + " 天 / 约 " + stats.totalKm + " km / 纯驾 " + stats.driveHours + " h / 现实转场 " + stats.realTransferHours + " h",
    "说明：未接入实时航班、导航或租车接口，动态信息须在出发前复核。",
    "",
  ];
  days.forEach((day) => {
    lines.push(
      "Day " + day.day + " · " + day.date + " " + day.weekday + " · " + day.title,
      day.events.map((event) => "- " + event).join("\n"),
      "住宿：" + day.hotel,
      "",
    );
  });
  return lines.join("\n");
}
