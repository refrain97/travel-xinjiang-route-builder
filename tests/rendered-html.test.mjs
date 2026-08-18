import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(process.pid) + "-" + String(Date.now()));
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Xinjiang route builder", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /新疆自由拼盘/);
  assert.match(html, /任意选择进疆与离疆机场/);
  assert.match(html, /北疆真实公路地图/);
  assert.match(html, /只看已选路线/);
  assert.match(html, /等比例地图/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /Day 1/);
  assert.match(html, /未接入实时航班/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|SkeletonPreview/);
});

test("keeps planning boundaries, real map data, and local plan management in source", async () => {
  const [page, data, planner, routeMap, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/planner.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/route-map.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /localStorage/);
  assert.match(page, /reverseRoute/);
  assert.match(page, /window\.print/);
  assert.match(page, /异地还车/);
  assert.match(data, /动态待核验/);
  assert.match(planner, /generateDays/);
  assert.match(planner, /compareCarReturn/);
  assert.match(routeMap, /tile\.openstreetmap\.org/);
  assert.match(routeMap, /router\.project-osrm\.org/);
  assert.match(routeMap, /control\.scale/);
  assert.match(data, /自驾锚点：贾登峪入口/);
  assert.match(data, /自驾锚点：赛里木湖东门游客中心/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
