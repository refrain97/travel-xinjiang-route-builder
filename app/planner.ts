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
  requiredNights: number;
  plannedNights: number;
  nightBalance: number;
  totalKm: number;
  driveHours: number;
  realTransferHours: number;
  playDays: number;
  nights: number;
  hotelChanges: number;
  capacityHours: number;
  plannedHours: number;
  stayHours: number;
  airportHours: number;
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
  nightNumber: number | null;
  nightStatus: "assigned" | "unassigned" | "none";
  nightLocation: string;
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
const effectiveDayHours = 10;
const arrivalProcessHours = 3.5;
const departureProcessHours = 3;

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
  arrivalNights: number,
  departureNights: number,
): TripStats {
  const legs = routeLegs(startId, stops, endId);
  const totalKm = legs.reduce((sum, leg) => sum + leg.km, 0);
  const driveHours = legs.reduce((sum, leg) => sum + leg.driveHours, 0);
  const realTransferHours = legs.reduce((sum, leg) => sum + leg.realHours, 0);
  const playDays = stops.reduce((sum, stop) => sum + stop.days, 0);
  const naturalDays = naturalDayCount(startDate, endDate);
  const requiredNights = Math.max(0, naturalDays - 1);
  const stopNights = stops.reduce((sum, stop) => sum + stop.nights, 0);
  const nights = Math.max(0, arrivalNights) + stopNights + Math.max(0, departureNights);
  const stayLocations = [
    ...(arrivalNights > 0 ? [airportById[startId].city] : []),
    ...stops.filter((stop) => stop.nights > 0).map((stop) => placeById[stop.placeId].name),
    ...(departureNights > 0 ? [airportById[endId].city] : []),
  ].filter((location, index, values) => index === 0 || location !== values[index - 1]);
  const hotelChanges = Math.max(0, stayLocations.length - 1);
  const stopStayHours = stops.reduce(
    (sum, stop) =>
      sum +
      Math.max(
        stop.days * 8,
        Math.max(0, stop.nights - 1) * effectiveDayHours,
      ),
    0,
  );
  const endpointStayHours =
    (Math.max(0, arrivalNights - 1) + Math.max(0, departureNights - 1)) *
    effectiveDayHours;
  const stayHours = roundOne(stopStayHours + endpointStayHours);
  const airportHours = roundOne(arrivalProcessHours + departureProcessHours);
  const capacityHours = roundOne(naturalDays * effectiveDayHours);
  const plannedHours = roundOne(realTransferHours + stayHours + airportHours);
  const allocatedDays = roundOne(plannedHours / effectiveDayHours);
  const bufferDays = roundOne((capacityHours - plannedHours) / effectiveDayHours);

  return {
    naturalDays,
    requiredNights,
    plannedNights: nights,
    nightBalance: nights - requiredNights,
    totalKm,
    driveHours: roundOne(driveHours),
    realTransferHours: roundOne(realTransferHours),
    playDays: roundOne(playDays),
    nights,
    hotelChanges,
    capacityHours,
    plannedHours,
    stayHours,
    airportHours,
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

  if (stats.nightBalance < 0) {
    warnings.push({
      level: "high",
      title: "还有 " + Math.abs(stats.nightBalance) + " 晚住宿没有落点",
      detail:
        stats.naturalDays +
        " 个自然日固定对应 " +
        stats.requiredNights +
        " 晚；逐日行程会把缺少的夜晚明确标成“住宿待定”。",
    });
  } else if (stats.nightBalance > 0) {
    warnings.push({
      level: "high",
      title: "住宿比旅行窗口多出 " + stats.nightBalance + " 晚",
      detail:
        "当前已排 " + stats.plannedNights + " 晚，但日期内只能容纳 " + stats.requiredNights + " 晚；需减少住宿或延长返程日期。",
    });
  }

  if (stats.bufferDays < 0) {
    warnings.push({
      level: "high",
      title: "全程时间总量已经超出",
      detail:
        "驾驶、游玩/连住和机场流程合计超出约 " +
        Math.abs(stats.bufferDays) +
        " 天。住宿一晚本身没有重复扣白天。",
    });
  } else if (stats.bufferDays < 0.6) {
    warnings.push({
      level: "high",
      title: "全程总量几乎没有余量",
      detail: "这是全程合计值；逐日是否能落下，还要继续看下方是否出现红色超载卡片。",
    });
  } else if (stats.bufferDays < 1.2) {
    warnings.push({
      level: "medium",
      title: "全程总量余量不足约一天",
      detail: "建议先明确一个天气差时可主动删除的游玩节点；仅中转落脚点不必删除。",
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
    if (stop.days > 0 && stop.days < place.recommendedDays) {
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
    nightNumber: null,
    nightStatus: "none",
    nightLocation: "",
    km: 0,
    driveHours: 0,
    realHours: 0,
    loadHours: 0,
    tags: [],
    overflow: false,
  };
}

type NightAssignment = {
  sourceId: string;
  nodeId: string;
  location: string;
  hotel: string;
};

function repeatNight(assignment: NightAssignment, nights: number) {
  return Array.from({ length: Math.max(0, nights) }, () => assignment);
}

function buildNightAssignments(
  startId: string,
  stops: RouteStop[],
  endId: string,
  requiredNights: number,
  arrivalNights: number,
  departureNights: number,
) {
  const startAirport = airportById[startId];
  const endAirport = airportById[endId];
  const frontAssignments: NightAssignment[] = [
    ...repeatNight(
      {
        sourceId: "arrival",
        nodeId: startId,
        location: startAirport.city,
        hotel: startAirport.city + "机场/市区 · 抵达住宿",
      },
      arrivalNights,
    ),
    ...stops.flatMap((stop) => {
      const place = placeById[stop.placeId];
      return repeatNight(
        {
          sourceId: "stop:" + stop.uid,
          nodeId: stop.placeId,
          location: place.name,
          hotel: place.name + " · " + place.stay.split("；")[0],
        },
        stop.nights,
      );
    }),
  ];
  const reservedDepartureNights = Math.min(Math.max(0, departureNights), requiredNights);
  const frontCapacity = Math.max(0, requiredNights - reservedDepartureNights);
  const scheduledFront = frontAssignments.slice(0, frontCapacity);
  const missingNights = Math.max(0, frontCapacity - scheduledFront.length);
  const departureAssignments = repeatNight(
    {
      sourceId: "departure",
      nodeId: endId,
      location: endAirport.city,
      hotel: endAirport.city + "机场/市区 · 返程前住宿",
    },
    reservedDepartureNights,
  );

  return [
    ...scheduledFront,
    ...Array.from({ length: missingNights }, () => null),
    ...departureAssignments,
  ] as Array<NightAssignment | null>;
}

export function generateDays(
  startId: string,
  stops: RouteStop[],
  endId: string,
  startDate: string,
  endDate: string,
  arrivalNights: number,
  departureNights: number,
): DayPlan[] {
  const naturalDays = naturalDayCount(startDate, endDate);
  const requiredNights = Math.max(0, naturalDays - 1);
  const days: DayPlan[] = Array.from({ length: naturalDays }, (_, index) => createDay(startDate, index));
  const startAirport = airportById[startId];
  const endAirport = airportById[endId];
  const nightAssignments = buildNightAssignments(
    startId,
    stops,
    endId,
    requiredNights,
    arrivalNights,
    departureNights,
  );
  const plannedNights =
    Math.max(0, arrivalNights) +
    stops.reduce((sum, stop) => sum + stop.nights, 0) +
    Math.max(0, departureNights);

  nightAssignments.forEach((assignment, index) => {
    const day = days[index];
    day.nightNumber = index + 1;
    if (assignment) {
      day.nightStatus = "assigned";
      day.nightLocation = assignment.location;
      day.hotel = assignment.hotel;
      day.tags.push("第" + (index + 1) + "晚");
    } else {
      day.nightStatus = "unassigned";
      day.hotel = "第" + (index + 1) + "晚 · 住宿待定";
      day.tags.push("住宿待定");
    }
  });
  const finalDay = days[naturalDays - 1];
  finalDay.nightNumber = null;
  finalDay.nightStatus = "none";
  finalDay.hotel = "返程日 · 不占住宿晚数";

  const firstDayBySource = new Map<string, number>();
  const lastDayBySource = new Map<string, number>();
  nightAssignments.forEach((assignment, index) => {
    if (assignment && !firstDayBySource.has(assignment.sourceId)) {
      firstDayBySource.set(assignment.sourceId, index);
    }
    if (assignment) lastDayBySource.set(assignment.sourceId, index);
  });
  const endArrivalDay = Math.min(
    naturalDays - 1,
    firstDayBySource.get("departure") ?? naturalDays - 1,
  );
  let previousArrivalDay = 0;
  let lastStructuredDay = lastDayBySource.get("arrival") ?? 0;
  const stopArrivalDays = stops.map((stop, index) => {
    const sourceId = "stop:" + stop.uid;
    const exact = firstDayBySource.get(sourceId);
    let target: number;
    if (exact !== undefined) {
      target = exact;
    } else {
      let nextAssignedDay = firstDayBySource.get("departure") ?? naturalDays - 1;
      for (let nextIndex = index + 1; nextIndex < stops.length; nextIndex += 1) {
        const next = firstDayBySource.get("stop:" + stops[nextIndex].uid);
        if (next !== undefined) {
          nextAssignedDay = next;
          break;
        }
      }
      target = Math.min(nextAssignedDay, lastStructuredDay + 1);
    }
    const resolved = Math.max(previousArrivalDay, Math.min(naturalDays - 1, target));
    previousArrivalDay = resolved;
    lastStructuredDay = lastDayBySource.get(sourceId) ?? resolved;
    return resolved;
  });

  let currentId = startId;
  days[0].title = "西安 → " + startAirport.city + " · 进疆";
  days[0].events.push(
    "西安飞 " + startAirport.code + "：具体航班、时刻与票价未接入，按出票结果回填。",
    "落地后按 2.5—3.5 小时预留取行李、取车、验车、午餐/补水。",
  );
  days[0].loadHours = 3.5;
  days[0].tags.push("航班待核", "取车日");

  const addTransfer = (dayIndex: number, fromId: string, toId: string) => {
    const day = days[Math.max(0, Math.min(naturalDays - 1, dayIndex))];
    const leg = estimateLeg(fromId, toId);
    if (leg.km === 0) return;
    if (day.title === "待安排") day.title = leg.fromName + " → " + leg.toName;
    day.events.push(
      "转场 " + leg.fromName + " → " + leg.toName + "：约 " + leg.km + " km / 纯驾 " + leg.driveHours + " h；现实占用约 " + leg.realHours + " h。",
      "途中按时休息、加油/正餐；" + leg.note + "。",
    );
    day.km += leg.km;
    day.driveHours = roundOne(day.driveHours + leg.driveHours);
    day.realHours = roundOne(day.realHours + leg.realHours);
    day.loadHours = roundOne(day.loadHours + leg.realHours);
    day.tags.push(leg.verification, leg.mode === "car" ? "自驾" : "含景交");
  };

  stops.forEach((stop, index) => {
    const place = placeById[stop.placeId];
    const arrivalDay = stopArrivalDays[index];
    const nextArrivalDay = stopArrivalDays[index + 1] ?? endArrivalDay;
    addTransfer(arrivalDay, currentId, stop.placeId);
    if (stop.days === 0) {
      const arrival = days[arrivalDay];
      if (arrival.title === "待安排") arrival.title = place.name + " · 中转落脚";
      arrival.events.push(
        stop.nights > 0
          ? place.name + "仅作为中转住宿：到达后休息、补给，次日继续出发，不计景区游玩时间。"
          : place.name + "仅作为途经节点：不安排景区游玩，也不在此住宿。",
      );
      arrival.tags.push(stop.nights > 0 ? "仅落脚" : "仅途经");
    }
    let playHours = stop.days * 8;
    const finalPlayDay = Math.max(arrivalDay, Math.min(naturalDays - 1, nextArrivalDay));
    for (let playDay = arrivalDay; playDay <= finalPlayDay && playHours > 0; playDay += 1) {
      const day = days[playDay];
      const room = Math.max(0, 10 - day.loadHours);
      const chunk = Math.min(playHours, Math.min(8, room));
      if (chunk < 0.5) continue;
      if (day.title === "待安排") day.title = place.name + " · 游玩";
      day.events.push(
        place.name + " 实际游玩约 " + roundOne(chunk) + " h：" + place.play,
      );
      day.loadHours = roundOne(day.loadHours + chunk);
      day.tags.push("游玩 " + roundOne(chunk) + "h");
      playHours = roundOne(playHours - chunk);
    }
    if (playHours > 0) {
      const overflowDay = days[finalPlayDay];
      overflowDay.events.push(
        place.name + " 仍有约 " + roundOne(playHours) + " h 游玩量无法落进当前日期与住宿顺序，需要减量或增加停留晚数。",
      );
      overflowDay.loadHours = roundOne(overflowDay.loadHours + playHours);
      overflowDay.tags.push("游玩未落位");
    }
    currentId = stop.placeId;
  });

  addTransfer(endArrivalDay, currentId, endId);
  finalDay.title = endAirport.city + " → 西安 · 离疆";
  finalDay.events.push(
    "在 " + endAirport.code + " 还车并飞回西安：具体航班、值机截止与票价待实时查询。",
    "国内航班建议至少预留 2.5—3 小时完成加油、还车、接驳、托运与安检。",
  );
  finalDay.loadHours = roundOne(finalDay.loadHours + 3);
  finalDay.tags.push("航班待核", startId === endId ? "同地还车" : "异地还车待核");

  if (plannedNights > requiredNights) {
    finalDay.events.unshift(
      "当前住宿比日期容量多出 " + (plannedNights - requiredNights) + " 晚，这部分无法放进 Day 1—Day " + naturalDays + "。",
    );
    finalDay.tags.push("住宿超出");
  }

  return days.map((day) => {
    if (day.nightStatus === "unassigned") {
      day.events.push(
        "今晚住宿尚未分配：请在上方增加抵达住宿、景点住宿或返程前住宿，不能把这一晚自动藏掉。",
      );
    }
    if (day.events.length === 0) {
      if (day.nightStatus === "assigned") {
        day.title = day.nightLocation + " · 连住/天气缓冲";
        day.events.push("今晚继续住在 " + day.nightLocation + "，白天保留给休息、天气补偿或把当前景点玩慢一点。");
        day.loadHours = 2;
        day.tags.push("缓冲日");
      } else {
        day.title = "第" + day.nightNumber + "晚住宿待定";
      }
    } else if (day.title === "待安排") {
      day.title = day.nightStatus === "assigned" ? day.nightLocation + " · 当日安排" : "住宿待定 · 当日安排";
    }
    return {
      ...day,
      overflow: day.loadHours > 10 || (plannedNights > requiredNights && day.day === naturalDays),
      tags: Array.from(new Set(day.tags)),
    };
  });
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
    "住宿：已安排 " + stats.plannedNights + " / " + stats.requiredNights + " 晚" + (stats.nightBalance === 0 ? "（已对齐）" : stats.nightBalance < 0 ? "（缺 " + Math.abs(stats.nightBalance) + " 晚）" : "（多 " + stats.nightBalance + " 晚）"),
    "时间总量：已用约 " + stats.plannedHours + " / " + stats.capacityHours + " 小时，余量约 " + stats.bufferDays + " 天；单纯住宿一晚不另扣白天。",
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
