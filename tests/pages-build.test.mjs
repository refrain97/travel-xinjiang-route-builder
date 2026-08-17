import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("builds a self-contained GitHub Pages entry", async () => {
  const html = await readFile(new URL("../pages-dist/index.html", import.meta.url), "utf8");
  const assets = await readdir(new URL("../pages-dist/assets/", import.meta.url));

  assert.match(html, /新疆自由拼盘/);
  assert.match(html, /\.\/assets\//);
  assert.ok(assets.some((name) => name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
  await access(new URL("../pages-dist/og.png", import.meta.url));
});
