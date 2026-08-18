"use client";

import { useEffect, useMemo, useState } from "react";
import {
  airportById,
  airports,
  defaultStops,
  placeById,
  places,
  type RouteStop,
} from "./data";
import {
  buildTextSummary,
  buildWarnings,
  calculateStats,
  compareCarReturn,
  generateDays,
} from "./planner";
import RouteMap, { type RoadRouteEstimate } from "./route-map";

type CarMode = "compare" | "same" | "oneway";

type SavedPlan = {
  id: string;
  name: string;
  updatedAt: string;
  startId: string;
  endId: string;
  startDate: string;
  endDate: string;
  carMode: CarMode;
  arrivalNights?: number;
  departureNights?: number;
  stops: RouteStop[];
};

const storageKey = "xinjiang-route-builder-v1";

const regionOptions = ["全部", "阿勒泰", "伊犁", "乌鲁木齐周边"] as const;

function makeStop(placeId: string): RouteStop {
  const place = placeById[placeId];
  return {
    uid: "stop-" + placeId + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    placeId,
    days: place.recommendedDays,
    nights: place.defaultNights,
  };
}

function formatUpdate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [startId, setStartId] = useState("aat");
  const [endId, setEndId] = useState("aat");
  const [startDate, setStartDate] = useState("2026-09-12");
  const [endDate] = useState("2026-09-20");
  const [arrivalNights, setArrivalNights] = useState(1);
  const [departureNights, setDepartureNights] = useState(0);
  const [stops, setStops] = useState<RouteStop[]>(defaultStops);
  const [carMode, setCarMode] = useState<CarMode>("compare");
  const [region, setRegion] = useState<(typeof regionOptions)[number]>("全部");
  const [showMoreAirports, setShowMoreAirports] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState("我的新疆拼盘");
  const [toast, setToast] = useState("");
  const [dayExpanded, setDayExpanded] = useState(true);
  const [mapMode, setMapMode] = useState<"explore" | "route">("explore");
  const [roadEstimate, setRoadEstimate] = useState<RoadRouteEstimate | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) setSavedPlans(JSON.parse(raw) as SavedPlan[]);
      } catch {
        setToast("本地方案读取失败，可继续编辑当前路线");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persistPlans = (next: SavedPlan[]) => {
    setSavedPlans(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setToast("浏览器未允许本地保存");
    }
  };

  const stats = useMemo(
    () => calculateStats(startId, stops, endId, startDate, endDate, arrivalNights, departureNights),
    [startId, stops, endId, startDate, endDate, arrivalNights, departureNights],
  );
  const warnings = useMemo(
    () => buildWarnings(stats, stops, startId, endId),
    [stats, stops, startId, endId],
  );
  const carComparison = useMemo(() => compareCarReturn(startId, endId), [startId, endId]);
  const routeLegModes = useMemo(() => stats.legs.map((leg) => leg.mode), [stats.legs]);
  const days = useMemo(
    () => generateDays(startId, stops, endId, startDate, endDate, arrivalNights, departureNights),
    [startId, stops, endId, startDate, endDate, arrivalNights, departureNights],
  );

  const coreAirports = airports.filter((airport) => airport.core);
  const extraAirports = airports.filter((airport) => !airport.core);
  const visibleAirports = showMoreAirports ? airports : coreAirports;
  const filteredPlaces = region === "全部" ? places : places.filter((place) => place.region === region);
  const selectedPlaceIds = new Set(stops.map((stop) => stop.placeId));
  const detail = detailId ? placeById[detailId] : null;

  const routeNodes = useMemo(
    () => [
      { ...airportById[startId], kind: "airport" as const },
      ...stops.map((stop) => ({ ...placeById[stop.placeId], kind: "place" as const })),
      { ...airportById[endId], kind: "airport" as const },
    ],
    [startId, stops, endId],
  );

  const routeLabel = routeNodes
    .map((node) => ("code" in node ? node.city + "机场" : node.name))
    .join(" → ");
  const roadEstimateMatches = Boolean(
    roadEstimate &&
      roadEstimate.legs.length === stats.legs.length &&
      roadEstimate.legs.every(
        (leg, index) =>
          leg.fromId === stats.legs[index]?.fromId && leg.toId === stats.legs[index]?.toId,
      ),
  );
  const mapTotalKm = roadEstimateMatches && roadEstimate ? roadEstimate.totalKm : stats.totalKm;
  const displayedKm =
    stats.totalKm + (carMode === "same" ? carComparison.sameReturn.extraKm : 0);
  const displayedRealHours =
    stats.realTransferHours + (carMode === "same" ? carComparison.sameReturn.extraHours : 0);
  const displayedPlannedHours =
    Math.round((stats.plannedHours + (carMode === "same" ? carComparison.sameReturn.extraHours : 0)) * 10) / 10;
  const displayedBufferDays =
    Math.round(((stats.capacityHours - displayedPlannedHours) / 10) * 10) / 10;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const addPlace = (placeId: string) => {
    if (selectedPlaceIds.has(placeId)) {
      setDetailId(placeId);
      return;
    }
    setStops((current) => [...current, makeStop(placeId)]);
    notify(placeById[placeId].name + " 已加到路线末尾");
  };

  const removeStop = (uid: string) => {
    setStops((current) => current.filter((stop) => stop.uid !== uid));
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    setStops((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const updateStop = (uid: string, key: "days" | "nights", delta: number) => {
    setStops((current) =>
      current.map((stop) => {
        if (stop.uid !== uid) return stop;
        if (key === "days") {
          return { ...stop, days: Math.max(0, Math.min(4, Math.round((stop.days + delta) * 2) / 2)) };
        }
        return { ...stop, nights: Math.max(0, Math.min(4, stop.nights + delta)) };
      }),
    );
  };

  const toggleStopMode = (uid: string) => {
    setStops((current) =>
      current.map((stop) => {
        if (stop.uid !== uid) return stop;
        if (stop.days === 0) {
          return { ...stop, days: placeById[stop.placeId].recommendedDays };
        }
        return { ...stop, days: 0, nights: Math.max(1, stop.nights) };
      }),
    );
  };

  const reverseRoute = () => {
    setStops((current) => [...current].reverse());
    setStartId(endId);
    setEndId(startId);
    notify("已反转地点顺序并交换进出机场");
  };

  const applyPreset = (preset: "altay" | "cross") => {
    setArrivalNights(1);
    setDepartureNights(0);
    if (preset === "altay") {
      setStartId("aat");
      setEndId("aat");
      setStops([
        { ...makeStop("burqin"), days: 0.5, nights: 1 },
        { ...makeStop("hemu"), days: 1.5, nights: 2 },
        { ...makeStop("kanas"), days: 1.5, nights: 2 },
        { ...makeStop("baihaba"), days: 0.5, nights: 0 },
      ]);
      setCarMode("compare");
      notify("已载入阿勒泰往返秋色示例");
    } else {
      setStartId("yin");
      setEndId("aat");
      setStops([
        { ...makeStop("sayram"), days: 1, nights: 1 },
        { ...makeStop("xiata"), days: 1, nights: 1 },
        { ...makeStop("nalati"), days: 1, nights: 1 },
      ]);
      setCarMode("compare");
      notify("已载入伊宁进、阿勒泰出压力测试");
    }
  };

  const savePlan = () => {
    const now = new Date().toISOString();
    const saved: SavedPlan = {
      id: "plan-" + Date.now(),
      name: planName.trim() || "未命名方案",
      updatedAt: now,
      startId,
      endId,
      startDate,
      endDate,
      carMode,
      arrivalNights,
      departureNights,
      stops,
    };
    persistPlans([saved, ...savedPlans]);
    setSavedOpen(true);
    notify("方案已保存在这台设备");
  };

  const loadPlan = (plan: SavedPlan) => {
    setStartId(plan.startId);
    setEndId(plan.endId);
    setStartDate(plan.startDate);
    setCarMode(plan.carMode);
    setArrivalNights(plan.arrivalNights ?? 1);
    setDepartureNights(plan.departureNights ?? 0);
    setStops(plan.stops.map((stop) => ({ ...stop, uid: stop.uid + "-load-" + Date.now() })));
    setPlanName(plan.name);
    setSavedOpen(false);
    notify("已载入 " + plan.name);
  };

  const duplicatePlan = (plan: SavedPlan) => {
    const copy = {
      ...plan,
      id: "plan-" + Date.now(),
      name: plan.name + " · 副本",
      updatedAt: new Date().toISOString(),
      arrivalNights: plan.arrivalNights ?? 1,
      departureNights: plan.departureNights ?? 0,
      stops: plan.stops.map((stop) => ({ ...stop, uid: stop.uid + "-copy-" + Date.now() })),
    };
    persistPlans([copy, ...savedPlans]);
    notify("已复制方案");
  };

  const renamePlan = (plan: SavedPlan) => {
    const nextName = window.prompt("输入新的方案名", plan.name);
    if (!nextName || !nextName.trim()) return;
    persistPlans(
      savedPlans.map((item) =>
        item.id === plan.id
          ? { ...item, name: nextName.trim(), updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  };

  const deletePlan = (plan: SavedPlan) => {
    if (!window.confirm("删除“" + plan.name + "”？此操作只影响本机保存。")) return;
    persistPlans(savedPlans.filter((item) => item.id !== plan.id));
  };

  const copySummary = async () => {
    const summary = buildTextSummary(startId, stops, endId, stats, days);
    try {
      await navigator.clipboard.writeText(summary);
      notify("逐日摘要已复制");
    } catch {
      notify("复制失败，请使用浏览器的打印功能");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-mark">疆</span>
          <span>
            新疆自由拼盘
            <small>Route Builder · V2</small>
          </span>
        </a>
        <nav className="top-actions" aria-label="方案操作">
          <button className="button ghost compact" type="button" onClick={() => setSavedOpen(true)}>
            我的方案 <span className="count-badge">{savedPlans.length}</span>
          </button>
          <button className="button dark compact" type="button" onClick={savePlan}>保存当前</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">2026-09-11/12 — 09-20 · 西安往返 · 两人自驾</p>
          <h1>不套环线，<br />自己拼一条能落地的路线。</h1>
          <p>
            先定进出机场，再按顺序加地点。系统把导航估算、区间车、休息吃饭、
            住宿与缓冲放在同一张时间账里。
          </p>
          <div className="hero-actions">
            <a className="button lime" href="#builder">开始拼路线</a>
            <button className="button glass" type="button" onClick={() => applyPreset("altay")}>看阿勒泰示例</button>
          </div>
        </div>
        <div className="hero-guide" aria-label="使用步骤">
          {[
            ["01", "选机场", "乌鲁木齐、伊宁、阿勒泰优先显示"],
            ["02", "点地点", "按加入顺序自动连线"],
            ["03", "调时间", "每处 ±0.5 天 / ±1 晚"],
            ["04", "看日程", "自动形成 Day 1—Day N"],
          ].map((item) => (
            <div className="guide-row" key={item[0]}>
              <span>{item[0]}</span>
              <strong>{item[1]}</strong>
              <small>{item[2]}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="truth-strip" aria-label="数据边界">
        <strong>当前是规划估算模式</strong>
        <span>未接入实时航班、导航或租车 API</span>
        <span>里程/车程需临行用地图复核</span>
        <span>票务、景交、开放与异地费均待订单确认</span>
        <time>数据整理：2026-08-17</time>
      </section>

      <section className="builder-grid" id="builder">
        <div className="main-column">
          <section className="panel airport-section">
            <div className="section-head">
              <div>
                <p className="section-kicker">STEP 1 · 机场</p>
                <h2>任意选择进疆与离疆机场</h2>
                <p>机场只是首尾节点，不预设乌鲁木齐环线，也不预设同地还车。</p>
              </div>
              <button className="text-button" type="button" onClick={() => setShowMoreAirports((value) => !value)}>
                {showMoreAirports ? "收起其他机场" : "展开其他机场"}
              </button>
            </div>

            <div className="date-airport-row">
              <label className="field">
                <span>出发日期</span>
                <select value={startDate} onChange={(event) => setStartDate(event.target.value)}>
                  <option value="2026-09-12">09-12 · 9 天</option>
                  <option value="2026-09-11">09-11 晚弹性出发 · 10 天</option>
                </select>
              </label>
              <label className="field">
                <span>进疆机场</span>
                <select value={startId} onChange={(event) => setStartId(event.target.value)}>
                  <optgroup label="核心入口">
                    {coreAirports.map((airport) => (
                      <option key={airport.id} value={airport.id}>{airport.city} {airport.code}</option>
                    ))}
                  </optgroup>
                  <optgroup label="其他可展开入口">
                    {extraAirports.map((airport) => (
                      <option key={airport.id} value={airport.id}>{airport.city} {airport.code}</option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <span className="airport-arrow" aria-hidden="true">→</span>
              <label className="field">
                <span>离疆机场 · 09-20</span>
                <select value={endId} onChange={(event) => setEndId(event.target.value)}>
                  <optgroup label="核心出口">
                    {coreAirports.map((airport) => (
                      <option key={airport.id} value={airport.id}>{airport.city} {airport.code}</option>
                    ))}
                  </optgroup>
                  <optgroup label="其他可展开出口">
                    {extraAirports.map((airport) => (
                      <option key={airport.id} value={airport.id}>{airport.city} {airport.code}</option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>

            <div className="airport-cards">
              {visibleAirports.map((airport) => (
                <article
                  className={[
                    "airport-card",
                    startId === airport.id ? "is-start" : "",
                    endId === airport.id ? "is-end" : "",
                  ].join(" ")}
                  key={airport.id}
                >
                  <div>
                    <span className="airport-code">{airport.code}</span>
                    <strong>{airport.city}</strong>
                    <small>{airport.core ? "核心机场" : "其他机场"}</small>
                  </div>
                  <p>{airport.note}</p>
                  <div className="airport-card-actions">
                    <button type="button" onClick={() => setStartId(airport.id)}>设为起点</button>
                    <button type="button" onClick={() => setEndId(airport.id)}>设为终点</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel map-section">
            <div className="section-head">
              <div>
                <p className="section-kicker">STEP 2 · 地图点选</p>
                <h2>北疆真实公路地图 · 按顺序加点</h2>
                <p>地点按真实经纬度定位，橙线沿公路绘制；可缩放查看国道、省道和景区入口。</p>
              </div>
              <div className="legend">
                <span><i className="legend-dot airport-dot" />进出机场</span>
                <span><i className="legend-dot place-dot" />可加地点</span>
                <span><i className="legend-line" />自驾公路</span>
                <span><i className="legend-line mixed" />景交/接驳</span>
              </div>
            </div>

            <div className="map-control-row">
              <div className="region-tabs map-region-tabs" aria-label="地图区域筛选">
                {regionOptions.map((option) => (
                  <button
                    className={region === option ? "active" : ""}
                    key={option}
                    type="button"
                    onClick={() => setRegion(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="map-mode-switch" aria-label="地图显示模式">
                <button
                  className={mapMode === "explore" ? "active" : ""}
                  type="button"
                  onClick={() => setMapMode("explore")}
                >
                  全部可选
                </button>
                <button
                  className={mapMode === "route" ? "active" : ""}
                  type="button"
                  onClick={() => setMapMode("route")}
                >
                  只看已选路线
                </button>
              </div>
            </div>

            <div className="map-route-overview" aria-label="当前路线顺序">
              <span className="route-overview-title">
                当前路线
                <small>
                  {stops.length} 个游玩节点 · {roadEstimateMatches ? "公路约" : "资料约"} {mapTotalKm} km
                </small>
              </span>
              <ol>
                <li className="airport-step"><b>进</b>{airportById[startId].city}</li>
                {stops.map((stop, index) => (
                  <li key={stop.uid}><b>{index + 1}</b>{placeById[stop.placeId].name}</li>
                ))}
                <li className="airport-step end"><b>出</b>{airportById[endId].city}</li>
              </ol>
            </div>

            <RouteMap
              airports={airports}
              places={places}
              routeNodes={routeNodes}
              legModes={routeLegModes}
              region={region}
              mode={mapMode}
              onAirportSelect={(airportId) => {
                setStartId(airportId);
                notify(airportById[airportId].city + "已设为进疆机场");
              }}
              onPlaceSelect={(placeId) =>
                selectedPlaceIds.has(placeId) ? setDetailId(placeId) : addPlace(placeId)
              }
              onRouteEstimate={setRoadEstimate}
            />

            <div className="map-leg-strip" aria-label="当前路线分段车程">
              {stats.legs.map((leg, index) => {
                const roadLeg = roadEstimateMatches ? roadEstimate?.legs[index] : null;
                return (
                  <article className={!roadLeg && leg.fallback ? "needs-check" : ""} key={leg.fromId + "-" + leg.toId + "-" + index}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{leg.fromName} → {leg.toName}</strong>
                      <small>
                        {roadLeg
                          ? `${roadLeg.km} km · 公路模型 ${roadLeg.hours}h · 行程预留约 ${leg.realHours}h`
                          : `${leg.km} km · 纯驾驶 ${leg.driveHours}h · 现实转场约 ${leg.realHours}h`}
                      </small>
                      {roadLeg && (
                        <small className="road-refs">
                          主要道路：{roadLeg.roads.length ? roadLeg.roads.join(" · ") : "道路编号未标注"}
                        </small>
                      )}
                    </div>
                    <em>{roadLeg ? "公路拟合" : leg.fallback ? "待导航" : "资料估算"}</em>
                  </article>
                );
              })}
            </div>

            <div className="place-library">
              {filteredPlaces.map((place) => {
                const selected = selectedPlaceIds.has(place.id);
                return (
                  <article className={["place-tile", selected ? "selected" : ""].join(" ")} key={place.id}>
                    <button className="place-info" type="button" onClick={() => setDetailId(place.id)}>
                      <span className="place-region">{place.region}</span>
                      <strong>{place.name}</strong>
                      <small>建议 {place.recommendedDays} 天 · {place.defaultNights} 晚</small>
                    </button>
                    <button
                      className={selected ? "tile-action selected" : "tile-action"}
                      type="button"
                      onClick={() => (selected ? setDetailId(place.id) : addPlace(place.id))}
                    >
                      {selected ? "已加入" : "+ 加入"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel editor-section">
            <div className="section-head">
              <div>
                <p className="section-kicker">STEP 3 · 顺序与停留</p>
                <h2>先把每一晚落下，再生成每天行程</h2>
                <p>自然日、住宿和 Day 1—Day N 共用同一条时间轴；没有安排的夜晚会直接标出。</p>
              </div>
              <div className="inline-actions">
                <button className="button ghost compact" type="button" onClick={reverseRoute}>⇄ 反转整条路线</button>
                <button className="button ghost compact" type="button" onClick={() => setStops([])}>清空地点</button>
              </div>
            </div>

            <div className={["night-ledger", stats.nightBalance === 0 ? "aligned" : "needs-work"].join(" ")}>
              <div className="night-ledger-head">
                <div>
                  <span>住宿总账</span>
                  <strong>{stats.naturalDays} 天固定 {stats.requiredNights} 晚</strong>
                </div>
                <p>
                  已安排 <b>{stats.plannedNights} / {stats.requiredNights} 晚</b>
                  {stats.nightBalance === 0
                    ? " · 已对齐"
                    : stats.nightBalance < 0
                      ? ` · 还缺 ${Math.abs(stats.nightBalance)} 晚`
                      : ` · 多出 ${stats.nightBalance} 晚`}
                </p>
              </div>
              <div className="night-progress" aria-hidden="true">
                <span
                  style={{
                    width:
                      (stats.requiredNights
                        ? Math.min(100, (stats.plannedNights / stats.requiredNights) * 100)
                        : 100) + "%",
                  }}
                />
              </div>
              <div className="night-slots" aria-label="逐晚住宿安排">
                {days.slice(0, stats.requiredNights).map((day) => (
                  <span
                    className={day.nightStatus === "assigned" ? "night-slot assigned" : "night-slot missing"}
                    key={day.day}
                  >
                    <b>第 {day.nightNumber} 晚</b>
                    <em>{day.nightStatus === "assigned" ? day.nightLocation : "住宿待定"}</em>
                  </span>
                ))}
              </div>
            </div>

            <div className="endpoint-stays" aria-label="机场城市住宿设置">
              <article className="endpoint-stay-card arrival">
                <div>
                  <span>抵达住宿</span>
                  <strong>{airportById[startId].city}</strong>
                  <small>默认把 Day 1 当晚落在进疆机场城市</small>
                </div>
                <div className="endpoint-stepper" aria-label={airportById[startId].city + "抵达住宿晚数"}>
                  <button type="button" onClick={() => setArrivalNights((value) => Math.max(0, value - 1))}>−</button>
                  <strong>{arrivalNights} 晚</strong>
                  <button type="button" onClick={() => setArrivalNights((value) => Math.min(4, value + 1))}>＋</button>
                </div>
              </article>
              <article className="endpoint-stay-card departure">
                <div>
                  <span>返程前住宿</span>
                  <strong>{airportById[endId].city}</strong>
                  <small>早班机或末段较远时，可在离疆城市留宿</small>
                </div>
                <div className="endpoint-stepper" aria-label={airportById[endId].city + "返程前住宿晚数"}>
                  <button type="button" onClick={() => setDepartureNights((value) => Math.max(0, value - 1))}>−</button>
                  <strong>{departureNights} 晚</strong>
                  <button type="button" onClick={() => setDepartureNights((value) => Math.min(4, value + 1))}>＋</button>
                </div>
              </article>
            </div>

            <div className="route-chain" aria-label="当前路线">
              <span className="chain-airport">{airportById[startId].code}<small>取车</small></span>
              {stops.map((stop, index) => {
                const place = placeById[stop.placeId];
                return (
                  <article className={stop.days === 0 ? "stop-card is-layover" : "stop-card"} key={stop.uid}>
                    <div className="stop-top">
                      <button className="stop-name" type="button" onClick={() => setDetailId(place.id)}>
                        <span>{index + 1}</span>
                        <strong>{place.name}</strong>
                        <small>{place.region}</small>
                      </button>
                      <div className="reorder-actions">
                        <button type="button" disabled={index === 0} onClick={() => moveStop(index, -1)} aria-label={"上移" + place.name}>↑</button>
                        <button type="button" disabled={index === stops.length - 1} onClick={() => moveStop(index, 1)} aria-label={"下移" + place.name}>↓</button>
                        <button type="button" onClick={() => removeStop(stop.uid)} aria-label={"删除" + place.name}>×</button>
                      </div>
                    </div>
                    <div className="stepper-grid">
                      <div className="stepper">
                        <span>景区游玩</span>
                        <div>
                          <button type="button" onClick={() => updateStop(stop.uid, "days", -0.5)}>−</button>
                          <strong>{stop.days} 天</strong>
                          <button type="button" onClick={() => updateStop(stop.uid, "days", 0.5)}>＋</button>
                        </div>
                      </div>
                      <div className="stepper">
                        <span>住宿</span>
                        <div>
                          <button type="button" onClick={() => updateStop(stop.uid, "nights", -1)}>−</button>
                          <strong>{stop.nights} 晚</strong>
                          <button type="button" onClick={() => updateStop(stop.uid, "nights", 1)}>＋</button>
                        </div>
                      </div>
                    </div>
                    <div className={stop.days === 0 ? "stop-mode-row layover" : "stop-mode-row"}>
                      <span>{stop.days === 0 ? "仅中转落脚" : "游玩停留"}</span>
                      <button type="button" onClick={() => toggleStopMode(stop.uid)}>
                        {stop.days === 0 ? "恢复建议游玩" : "设为仅落脚"}
                      </button>
                    </div>
                    <p className="stop-decision">
                      {stop.days === 0
                        ? stop.nights > 0
                          ? "中转落脚：只休息和补给，次日继续走，不计景区游玩时间"
                          : "仅途经：不游玩也不住宿，只保留为路线节点"
                        : stop.days < place.recommendedDays
                          ? "压缩玩法：需主动舍弃部分内容"
                          : stop.nights >= 2
                            ? "连住型：有早晚光线或天气容错"
                            : "标准停留：按区间车与排队再复核"}
                    </p>
                  </article>
                );
              })}
              <span className="chain-airport end">{airportById[endId].code}<small>还车/离疆</small></span>
            </div>
          </section>

          <section className="panel car-section">
            <div className="section-head">
              <div>
                <p className="section-kicker">STEP 4 · 取还车</p>
                <h2>同地回头值不值，和异地费一起看</h2>
                <p>原型只比较路线代价，不虚构租车库存与金额。</p>
              </div>
            </div>

            <div className="mode-tabs" role="radiogroup" aria-label="取还车模式">
              {[
                ["compare", "同时比较"],
                ["same", "同地取还"],
                ["oneway", "异地还车"],
              ].map((option) => (
                <button
                  className={carMode === option[0] ? "active" : ""}
                  key={option[0]}
                  type="button"
                  role="radio"
                  aria-checked={carMode === option[0]}
                  onClick={() => setCarMode(option[0] as CarMode)}
                >
                  {option[1]}
                </button>
              ))}
            </div>

            <div className="car-compare">
              {(carMode === "compare" || carMode === "same") && (
                <article className={carMode === "same" ? "car-card chosen" : "car-card"}>
                  <span className="car-tag">同地取还</span>
                  <h3>{carComparison.sameReturn.title}</h3>
                  <p>{carComparison.sameReturn.detail}</p>
                  <dl>
                    <div><dt>额外回原地</dt><dd>{carComparison.sameReturn.extraKm} km</dd></div>
                    <div><dt>额外现实时间</dt><dd>{carComparison.sameReturn.extraHours} h</dd></div>
                  </dl>
                  {startId !== endId && <small>注意：回原地还车后，离疆机场也需同步重算。</small>}
                </article>
              )}
              {(carMode === "compare" || carMode === "oneway") && (
                <article className={carMode === "oneway" ? "car-card chosen" : "car-card"}>
                  <span className="car-tag coral">异地还车</span>
                  <h3>{carComparison.oneWay.title}</h3>
                  <p>{carComparison.oneWay.detail}</p>
                  <dl>
                    <div><dt>可用性</dt><dd>{carComparison.oneWay.availability}</dd></div>
                    <div><dt>异地费用</dt><dd>{carComparison.oneWay.fee}</dd></div>
                  </dl>
                  <small>比较顺序：先查能否下单，再把异地费与回原地油费/时间一起算。</small>
                </article>
              )}
            </div>
          </section>

          <section className="panel days-section" id="days">
            <div className="section-head">
              <div>
                <p className="section-kicker">自动生成 · 可打印</p>
                <h2>Day 1—Day {stats.naturalDays} 逐日行程</h2>
                <p>每张卡片直接读取上面的住宿时间轴；Day 1 当晚、缺住哪晚和最后返程日都会一一对应。</p>
              </div>
              <div className="inline-actions no-print">
                <button className="button ghost compact" type="button" onClick={copySummary}>复制文本</button>
                <button className="button dark compact" type="button" onClick={() => window.print()}>打印 / PDF</button>
              </div>
            </div>

            <button className="day-toggle no-print" type="button" onClick={() => setDayExpanded((value) => !value)}>
              {dayExpanded ? "收起逐日卡片" : "展开逐日卡片"}
              <span>{dayExpanded ? "−" : "+"}</span>
            </button>

            {dayExpanded && (
              <div className="day-list">
                {days.map((day) => (
                  <article
                    className={[
                      "day-card",
                      day.overflow ? "overflow" : "",
                      day.nightStatus === "unassigned" ? "missing-night" : "",
                    ].join(" ")}
                    key={day.day}
                  >
                    <div className="day-date">
                      <strong>Day {day.day}</strong>
                      <span>{day.date}</span>
                      <small>{day.weekday}</small>
                    </div>
                    <div className="day-body">
                      <div className="day-heading">
                        <h3>{day.title}</h3>
                        <div className="day-alerts">
                          {day.nightStatus === "unassigned" && <span className="missing-chip">住宿待定</span>}
                          {day.overflow && <span className="danger-chip">当日超载</span>}
                        </div>
                      </div>
                      <ul>
                        {day.events.map((event, index) => <li key={index}>{event}</li>)}
                      </ul>
                      <div className="day-meta">
                        <span>里程 <strong>{day.km} km</strong></span>
                        <span>纯驾 <strong>{day.driveHours} h</strong></span>
                        <span>当日负荷 <strong>{day.loadHours} h</strong></span>
                        <span>
                          {day.nightNumber ? `第 ${day.nightNumber} 晚` : "返程住宿"}
                          <strong>{day.hotel}</strong>
                        </span>
                      </div>
                      <div className="tag-row">
                        {day.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="summary-column">
          <section className="summary-card">
            <p className="section-kicker">实时总账</p>
            <h2>{airportById[startId].code} → {airportById[endId].code}</h2>
            <p className="route-label">{routeLabel}</p>

            <div className="summary-stats">
              <div><strong>{stats.naturalDays}</strong><span>自然日</span></div>
              <div>
                <strong>{stats.plannedNights}/{stats.requiredNights}</strong>
                <span>已排/应住晚</span>
              </div>
              <div><strong>{displayedKm}</strong><span>规划 km</span></div>
              <div><strong>{stats.driveHours}</strong><span>纯驾 h</span></div>
              <div><strong>{displayedRealHours}</strong><span>现实转场 h</span></div>
              <div><strong>{stats.playDays}</strong><span>游玩天</span></div>
            </div>

            <div className={["buffer-meter", displayedBufferDays < 0 ? "danger" : displayedBufferDays < 1 ? "warn" : ""].join(" ")}>
              <div>
                <span>全程时间总量余量</span>
                <strong>
                  {displayedBufferDays >= 0 ? "+" + displayedBufferDays : "−" + Math.abs(displayedBufferDays)} 天
                </strong>
              </div>
              <div className="meter-track">
                <span
                  style={{
                    width:
                      Math.max(4, Math.min(100, (displayedPlannedHours / stats.capacityHours) * 100)) + "%",
                  }}
                />
              </div>
              <small>
                已用约 {displayedPlannedHours} / {stats.capacityHours} h：现实转场 {displayedRealHours} h
                ＋游玩/连住占用 {stats.stayHours} h＋机场流程 {stats.airportHours} h。
              </small>
              <p>住宿只决定睡在哪里，不会按“一晚＝一天”重复扣时；同地第 2 晚起形成的完整停留日才占用时间。</p>
            </div>

            <div className="warning-list">
              <div className="warning-head">
                <strong>风险与删减提示</strong>
                <span>{warnings.length}</span>
              </div>
              {warnings.map((warning, index) => (
                <article className={"warning " + warning.level} key={warning.title + index}>
                  <i aria-hidden="true">{warning.level === "high" ? "!" : warning.level === "medium" ? "△" : "i"}</i>
                  <div>
                    <strong>{warning.title}</strong>
                    <p>{warning.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="plan-name">
              <label htmlFor="plan-name">方案名称</label>
              <input id="plan-name" value={planName} onChange={(event) => setPlanName(event.target.value)} />
            </div>
            <button className="button lime full" type="button" onClick={savePlan}>保存当前方案</button>
            <a className="button dark full" href="#days">查看逐日行程</a>
          </section>

          <section className="scenario-card">
            <p className="section-kicker">验收示例</p>
            <h3>一键切换两种极端方案</h3>
            <button type="button" onClick={() => applyPreset("altay")}>
              <strong>AAT 往返</strong>
              <span>布尔津 → 禾木 → 喀纳斯 → 白哈巴</span>
            </button>
            <button type="button" onClick={() => applyPreset("cross")}>
              <strong>YIN 进 / AAT 出</strong>
              <span>赛湖 → 夏塔 → 那拉提 · 跨区压力测试</span>
            </button>
          </section>
        </aside>
      </section>

      <footer>
        <div>
          <strong>新疆自由拼盘 · 首版原型</strong>
          <p>它负责暴露时间冲突，不替你虚构一个看起来完美的行程。</p>
        </div>
        <p>航班 / 导航 / 景区 / 租车：均须临近出发复核</p>
      </footer>

      {detail && (
        <div className="overlay">
          <button className="overlay-backdrop" type="button" onClick={() => setDetailId(null)} aria-label="关闭地点详情" />
          <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label={detail.name + "详情"}>
            <button className="sheet-close" type="button" onClick={() => setDetailId(null)} aria-label="关闭详情">×</button>
            <figure>
              <img src={detail.image} alt={detail.imageAlt} />
              <figcaption>
                代表图，不代表 2026-09 实况 · <a href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.sourceLabel}</a>
              </figcaption>
            </figure>
            <div className="sheet-content">
              <p className="section-kicker">{detail.region} · {detail.verification}</p>
              <h2>{detail.name}</h2>
              <p className="detail-lead">{detail.season}</p>
              <div className="duration-options">
                <span>可选时长</span>
                {detail.durationOptions.map((option) => <b key={option}>{option} 天</b>)}
              </div>
              <dl className="decision-list">
                <div><dt>怎么玩</dt><dd>{detail.play}</dd></div>
                <div><dt>住哪里</dt><dd>{detail.stay}</dd></div>
                <div><dt>吃什么</dt><dd>{detail.food}</dd></div>
                <div><dt>加油补给</dt><dd>{detail.supply}</dd></div>
                <div><dt>停车 / 景交</dt><dd>{detail.access}</dd></div>
                <div><dt>9 月风险</dt><dd>{detail.risk}</dd></div>
              </dl>
              <button
                className="button lime full"
                type="button"
                onClick={() => {
                  if (!selectedPlaceIds.has(detail.id)) addPlace(detail.id);
                  setDetailId(null);
                }}
              >
                {selectedPlaceIds.has(detail.id) ? "已在路线中" : "加入路线末尾"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {savedOpen && (
        <div className="overlay">
          <button className="overlay-backdrop" type="button" onClick={() => setSavedOpen(false)} aria-label="关闭我的方案" />
          <aside className="saved-sheet" role="dialog" aria-modal="true" aria-label="我的方案">
            <div className="saved-head">
              <div>
                <p className="section-kicker">本机保存</p>
                <h2>我的方案</h2>
              </div>
              <button className="sheet-close static" type="button" onClick={() => setSavedOpen(false)} aria-label="关闭我的方案">×</button>
            </div>
            <p className="saved-note">方案保存在当前浏览器 localStorage，不会上传，也不会在其他设备自动出现。</p>
            {savedPlans.length === 0 ? (
              <div className="empty-state">
                <strong>还没有保存的方案</strong>
                <p>关闭此面板，给当前路线命名后点击“保存当前方案”。</p>
              </div>
            ) : (
              <div className="saved-list">
                {savedPlans.map((plan) => (
                  <article key={plan.id}>
                    <div>
                      <strong>{plan.name}</strong>
                      <span>{airportById[plan.startId].code} → {airportById[plan.endId].code} · {plan.stops.length} 个地点</span>
                      <small>更新于 {formatUpdate(plan.updatedAt)}</small>
                    </div>
                    <div className="saved-actions">
                      <button type="button" onClick={() => loadPlan(plan)}>载入</button>
                      <button type="button" onClick={() => duplicatePlan(plan)}>复制</button>
                      <button type="button" onClick={() => renamePlan(plan)}>重命名</button>
                      <button className="danger-text" type="button" onClick={() => deletePlan(plan)}>删除</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
