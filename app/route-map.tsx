"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Airport, Place } from "./data";

export type MapRegion = "全部" | "阿勒泰" | "伊犁" | "乌鲁木齐周边";

export type GeoRouteNode = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: "airport" | "place";
  code?: string;
  city?: string;
  region?: Place["region"];
  mapAnchor?: string;
};

export type RoadLegEstimate = {
  fromId: string;
  toId: string;
  km: number;
  hours: number;
  roads: string[];
};

export type RoadRouteEstimate = {
  signature: string;
  totalKm: number;
  totalHours: number;
  legs: RoadLegEstimate[];
  maximumSnapMeters: number;
};

type RouteGeometry = RoadRouteEstimate & {
  legCoordinates: Array<Array<[number, number]>>;
};

type OsrmStep = {
  name?: string;
  ref?: string;
  geometry?: { coordinates: Array<[number, number]> };
};

type OsrmLeg = {
  distance: number;
  duration: number;
  steps?: OsrmStep[];
};

type OsrmResponse = {
  code: string;
  message?: string;
  waypoints?: Array<{ distance?: number }>;
  routes?: Array<{
    distance: number;
    duration: number;
    legs: OsrmLeg[];
  }>;
};

type Props = {
  airports: Airport[];
  places: Place[];
  routeNodes: GeoRouteNode[];
  legModes: Array<"car" | "shuttle" | "mixed">;
  region: MapRegion;
  mode: "explore" | "route";
  onAirportSelect: (airportId: string) => void;
  onPlaceSelect: (placeId: string) => void;
  onRouteEstimate: (estimate: RoadRouteEstimate | null) => void;
};

type RoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: RouteGeometry }
  | { status: "error"; message: string };

const routeCache = new Map<string, RouteGeometry>();

const roundOne = (value: number) => Math.round(value * 10) / 10;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeSignature(nodes: GeoRouteNode[]) {
  return nodes
    .map((node) => `${node.id}@${node.lon.toFixed(6)},${node.lat.toFixed(6)}`)
    .join(">");
}

function roadNames(steps: OsrmStep[] | undefined) {
  const values = (steps ?? []).flatMap((step) => {
    const value = step.ref || step.name || "";
    return value.split(/[;,/]/g).map((item) => item.trim());
  });
  return Array.from(new Set(values.filter((value) => value && value.length <= 28))).slice(0, 5);
}

export default function RouteMap({
  airports,
  places,
  routeNodes,
  legModes,
  region,
  mode,
  onAirportSelect,
  onPlaceSelect,
  onRouteEstimate,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const airportSelectRef = useRef(onAirportSelect);
  const placeSelectRef = useRef(onPlaceSelect);
  const estimateRef = useRef(onRouteEstimate);
  const tileErrorCountRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [basemapError, setBasemapError] = useState(false);
  const [roadState, setRoadState] = useState<RoadState>({ status: "idle" });

  const signature = useMemo(() => routeSignature(routeNodes), [routeNodes]);

  useEffect(() => {
    airportSelectRef.current = onAirportSelect;
    placeSelectRef.current = onPlaceSelect;
    estimateRef.current = onRouteEstimate;
  }, [onAirportSelect, onPlaceSelect, onRouteEstimate]);

  useEffect(() => {
    let cancelled = false;
    let localMap: LeafletMap | null = null;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      localMap = L.map(containerRef.current, {
        center: [46.2, 84.6],
        zoom: 5,
        minZoom: 4,
        maxZoom: 17,
        zoomControl: false,
        preferCanvas: true,
      });
      mapRef.current = localMap;

      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => {
        tileErrorCountRef.current += 1;
        if (tileErrorCountRef.current >= 4) setBasemapError(true);
      });
      tiles.addTo(localMap);
      L.control.zoom({ position: "topright" }).addTo(localMap);
      L.control.scale({ position: "bottomleft", metric: true, imperial: false, maxWidth: 130 }).addTo(localMap);
      localMap.attributionControl.setPrefix(false);
      markerLayerRef.current = L.layerGroup().addTo(localMap);
      routeLayerRef.current = L.layerGroup().addTo(localMap);
      window.setTimeout(() => localMap?.invalidateSize(false), 0);
      setReady(true);
    });

    return () => {
      cancelled = true;
      setReady(false);
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      mapRef.current = null;
      leafletRef.current = null;
      localMap?.remove();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (routeNodes.length < 2) {
        setRoadState({ status: "idle" });
        estimateRef.current(null);
        return;
      }

      const cached = routeCache.get(signature);
      if (cached) {
        setRoadState({ status: "ready", data: cached });
        estimateRef.current(cached);
        return;
      }

      setRoadState({ status: "loading" });
      estimateRef.current(null);
      const coordinates = routeNodes.map((node) => `${node.lon},${node.lat}`).join(";");
      const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
        "?alternatives=false&steps=true&geometries=geojson&overview=false&annotations=false";

      void fetch(url, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`公路服务返回 ${response.status}`);
          return (await response.json()) as OsrmResponse;
        })
        .then((payload) => {
          const route = payload.routes?.[0];
          if (payload.code !== "Ok" || !route) {
            throw new Error(payload.message || "未找到连通公路");
          }
          const data: RouteGeometry = {
            signature,
            totalKm: Math.round(route.distance / 1000),
            totalHours: roundOne(route.duration / 3600),
            maximumSnapMeters: Math.round(
              Math.max(0, ...(payload.waypoints ?? []).map((waypoint) => waypoint.distance ?? 0)),
            ),
            legs: route.legs.map((leg, index) => ({
              fromId: routeNodes[index]?.id ?? "",
              toId: routeNodes[index + 1]?.id ?? "",
              km: Math.round(leg.distance / 1000),
              hours: roundOne(leg.duration / 3600),
              roads: roadNames(leg.steps),
            })),
            legCoordinates: route.legs.map((leg) =>
              (leg.steps ?? []).flatMap((step) => step.geometry?.coordinates ?? []),
            ),
          };
          routeCache.set(signature, data);
          setRoadState({ status: "ready", data });
          estimateRef.current(data);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : "公路线路暂时不可用";
          setRoadState({ status: "error", message });
          estimateRef.current(null);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [routeNodes, signature]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!ready || !L || !map || !markerLayer || !routeLayer) return;

    markerLayer.clearLayers();
    routeLayer.clearLayers();

    const selectedIds = new Set(routeNodes.map((node) => `${node.kind}:${node.id}`));
    const visiblePlaces = places.filter((place) => {
      if (mode === "route") return selectedIds.has(`place:${place.id}`);
      return region === "全部" || place.region === region;
    });
    const visibleAirports = airports.filter((airport) => {
      if (mode === "route") return selectedIds.has(`airport:${airport.id}`);
      return true;
    });
    const routeIndices = new Map<string, number[]>();
    routeNodes.forEach((node, index) => {
      const key = `${node.kind}:${node.id}`;
      routeIndices.set(key, [...(routeIndices.get(key) ?? []), index]);
    });

    const markerMeta = (node: GeoRouteNode) => {
      const indices = routeIndices.get(`${node.kind}:${node.id}`) ?? [];
      const first = indices.includes(0);
      const last = indices.includes(routeNodes.length - 1);
      if (node.kind === "airport") {
        if (first && last) return { label: "往返", selected: true };
        if (first) return { label: "进", selected: true };
        if (last) return { label: "出", selected: true };
        return { label: node.code || "机", selected: false };
      }
      const stopOrders = indices.filter((index) => index > 0 && index < routeNodes.length - 1);
      return {
        label: stopOrders.length ? stopOrders.map((index) => index).join("/") : "+",
        selected: stopOrders.length > 0,
      };
    };

    const addMarker = (node: GeoRouteNode) => {
      const meta = markerMeta(node);
      const label = node.kind === "airport" ? node.city || node.name : node.name;
      const labelSide = node.lon > 87.15 ? "label-left" : "label-right";
      const markerClass = [
        "geo-map-pin",
        node.kind === "airport" ? "airport" : "place",
        meta.selected ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const icon = L.divIcon({
        className: "geo-map-marker-host",
        html:
          `<span class="${markerClass}">${escapeHtml(meta.label)}</span>` +
          `<span class="geo-map-label ${labelSide}${meta.selected ? " selected" : ""}">${escapeHtml(label)}</span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const anchor = node.mapAnchor ? `；${node.mapAnchor}` : "";
      const marker = L.marker([node.lat, node.lon], {
        icon,
        keyboard: true,
        riseOnHover: true,
        title: `${node.name}${anchor}`,
        alt: `${node.name}${anchor}`,
      });
      marker.on("click", () => {
        if (node.kind === "airport") airportSelectRef.current(node.id);
        else placeSelectRef.current(node.id);
      });
      marker.addTo(markerLayer);
    };

    visibleAirports.forEach((airport) => addMarker({ ...airport, kind: "airport" }));
    visiblePlaces.forEach((place) => addMarker({ ...place, kind: "place" }));

    if (roadState.status === "ready" && roadState.data.signature === signature) {
      roadState.data.legCoordinates.forEach((coordinates, index) => {
        if (coordinates.length < 2) return;
        const latLngs = coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        const legMode = legModes[index] ?? "car";
        const dashArray = legMode === "shuttle" ? "4 8" : legMode === "mixed" ? "12 6" : undefined;
        L.polyline(latLngs, {
          color: "#fffdf8",
          weight: 10,
          opacity: 0.94,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(routeLayer);
        L.polyline(latLngs, {
          color: "#ef6a52",
          weight: 5,
          opacity: 0.96,
          dashArray,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(routeLayer);
      });
    } else if (routeNodes.length > 1) {
      L.polyline(
        routeNodes.map((node) => [node.lat, node.lon] as [number, number]),
        {
          color: "#ef6a52",
          weight: 3,
          opacity: 0.72,
          dashArray: "7 8",
          interactive: false,
        },
      ).addTo(routeLayer);
    }

    const focusNodes =
      mode === "route"
        ? routeNodes
        : region === "全部"
          ? [...visibleAirports, ...visiblePlaces]
          : visiblePlaces;
    if (focusNodes.length === 1) {
      map.setView([focusNodes[0].lat, focusNodes[0].lon], 8, { animate: false });
    } else if (focusNodes.length > 1) {
      const bounds = L.latLngBounds(focusNodes.map((node) => [node.lat, node.lon] as [number, number]));
      map.fitBounds(bounds.pad(0.13), { animate: false, maxZoom: region === "全部" ? 6 : 8 });
    }
    window.setTimeout(() => map.invalidateSize(false), 0);
  }, [airports, legModes, mode, places, ready, region, roadState, routeNodes, signature]);

  const statusText =
    roadState.status === "ready"
      ? `${roadState.data.totalKm} km · 纯驾驶约 ${roadState.data.totalHours}h`
      : roadState.status === "loading"
        ? "正在沿真实公路计算…"
        : roadState.status === "error"
          ? "公路线路暂未载入"
          : "选择地点后生成公路线路";

  return (
    <div className="geo-map-block">
      <div className="geo-map-shell">
        <div ref={containerRef} className="geo-map" aria-label="按真实经纬度和公路绘制的北疆路线地图" />
        <div className={`geo-map-status status-${roadState.status}`} aria-live="polite">
          <span>{roadState.status === "ready" ? "公路线路已绘制" : "线路状态"}</span>
          <strong>{statusText}</strong>
        </div>
        {basemapError && (
          <div className="geo-map-network-note" role="status">
            道路底图受当前网络影响；地点与线路仍按经纬度保留
          </div>
        )}
      </div>
      <div className="geo-map-caption">
        <span>等比例地图 · 左下角可看公里比例尺 · 实线为自驾，虚线含景交/接驳</span>
        <small>底图：OpenStreetMap；线路：OSRM 公路模型。无实时路况，临行仍需用高德/百度复核。</small>
      </div>
    </div>
  );
}
