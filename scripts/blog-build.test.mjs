import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { articlePreviewUrls, parsePreview } from "../src/lib/link-previews.mjs";
import { blogPostPaths } from "../src/lib/blog-routes.ts";
import { photoFiles, photoName } from "../src/lib/post-media.mjs";

test("body edits, navigation titles, series, translations and refreshed cards invalidate the pages that use them", () => {
  const make = (id, day, series) => ({ id, digest: "v1", data: { title: id, date: new Date(2025, 0, day), series } });
  const posts = [make("a",1,"trip"),make("b",2),make("c",3,"trip"),make("other",4),make("en/a",1)];
  const keys = (p, previews = new Map()) => new Map(blogPostPaths(p, previews).map(r=>[r.params.slug,r.cacheKey]));
  const before = keys(posts);
  const diff = (after) => [...before.keys()].filter(k=>before.get(k)!==after.get(k));
  assert.deepEqual(diff(keys(posts.map(p=>p.id==="a"?{...p,digest:"v2"}:p))),["a"]);
  assert.deepEqual(diff(keys(posts.map(p=>p.id==="a"?{...p,digest:"v2",data:{...p.data,title:"renamed"}}:p))).sort(),["a","b","c"]);
  assert.deepEqual(diff(keys([...posts, make("ja/a",1)])).sort(),["a","en/a"]);
  assert.deepEqual(diff(keys(posts,new Map([["c",["changed metadata"]]]))),["c"]);
  assert.equal(keys(posts,new Map([["c",null]])).get("c"),undefined);
});

test("parse head metadata and literal MDX references", () => {
  assert.deepEqual(parsePreview('<meta content="Hello &amp; bye" property="og:title"><meta content="../hero.png" name="og:image">',"https://example.com/blog/one"),
    {title:"Hello & bye",image:"https://example.com/hero.png",description:null});
  const source = ['import Card from "./LinkPreview.astro"', '', '<Card src="https://example.com/page#heading" />', '', '<Card src={here} />', '', '~~~mdx','<Card src="https://ignored.com/" />','~~~'].join("\n");
  assert.deepEqual(articlePreviewUrls(source),{urls:["https://example.com/page"],dynamic:true});
});

test("one fetch across translations and processes, serve stale metadata after failure, retry a corrupt record", async () => {
  const cwd = process.cwd(), dir = await mkdtemp(join(tmpdir(),"link-preview-test-"));
  const server = createServer();
  let requests=0, fail=false;
  server.on("request", (_req,res) => { requests++; res.writeHead(fail?503:200,{"content-type":"text/html"}); res.end("<head><style>" + " ".repeat(850 * 1024) + "</style><title>Previous title</title></head>"); });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url="http://127.0.0.1:"+server.address().port+"/card";
  try {
    process.chdir(dir);
    const fresh = n=>import("../src/lib/link-previews.mjs?test="+n);
    const m=await fresh(1);
    await Promise.all([m.getLinkPreview(url),m.getLinkPreview(url+"#a")]);
    assert.equal(requests,1);
    assert.equal((await (await fresh(2)).getLinkPreview(url)).title,"Previous title");assert.equal(requests,1);
    const file=join(dir,".cache/link-previews-v1",createHash("sha256").update(url).digest("hex")+".json");
    const record=JSON.parse(await readFile(file,"utf8"));await writeFile(file,JSON.stringify({...record,checkAfter:0}));
    fail=true;
    assert.equal((await (await fresh(3)).getLinkPreview(url)).title,"Previous title");assert.equal(requests,2);
    assert.equal((await (await fresh(4)).getLinkPreview(url)).title,"Previous title");assert.equal(requests,2);
    await writeFile(file,"broken");fail=false;
    assert.equal((await (await fresh(5)).getLinkPreview(url)).title,"Previous title");assert.equal(requests,3);
  } finally { process.chdir(cwd); server.closeAllConnections(); await new Promise(r=>server.close(r)); await rm(dir,{recursive:true,force:true}); }
});

test("photo keys follow content, widths respect original dimensions and local paths stay inside the album", () => {
  const a={source:"a",width:640,height:480,format:"jpg"};
  assert.deepEqual(photoFiles(a).widths,[480,640]);
  assert.notEqual(photoFiles(a).full,photoFiles({...a,source:"b"}).full);
  assert.throws(()=>photoName("../image.jpg"));
});
