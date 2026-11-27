import {test} from "node:test";
import assert from "node:assert/strict";
import { makeIndexNowPayload,submitIndexNow } from "./indexnow.mjs";
const publicPaths=new Set(["/","/products","/ar/turkish-products"]);
test("accepts only canonical public URLs, deduplicates and preserves localized paths",()=>{
 const payload=makeIndexNowPayload("valid-key-123",["/","/products","https://www.lou-rex.com/products/","/ar/turkish-products","/products/"+encodeURIComponent("منتج")],publicPaths);
 assert.equal(payload.urlList.length,4);assert.equal(payload.host,"www.lou-rex.com");assert.equal(payload.keyLocation,"https://www.lou-rex.com/valid-key-123.txt");
});
test("rejects external, private, tracking, malformed and query-bearing URLs",()=>{
 for(const url of ["https://other.example/","/dashboard","/track","/request?email=x","/products/%2Fprivate","/products/%00","/products/abc#x"])assert.throws(()=>makeIndexNowPayload("valid-key-123",[url],publicPaths));
 assert.throws(()=>makeIndexNowPayload("../bad",["/"],publicPaths));
});
test("does not submit without matching live ownership proof",async()=>{
 let calls=0;
 const payload=makeIndexNowPayload("valid-key-123",["/"],publicPaths);
 await assert.rejects(()=>submitIndexNow(payload,{fetchImpl:async()=>{calls++;return new Response("wrong");}}));
 assert.equal(calls,1);
});
test("only sends canonical payload to IndexNow after proof",async()=>{
 const payload=makeIndexNowPayload("valid-key-123",["/"],publicPaths);
 const calls=[];
 const status=await submitIndexNow(payload,{fetchImpl:async(url,opts)=>{calls.push([url,opts]);return calls.length===1?new Response(payload.key):new Response(null,{status:202});}});
 assert.equal(status,202);assert.equal(calls[1][0],"https://api.indexnow.org/indexnow");assert.deepEqual(JSON.parse(calls[1][1].body),payload);
});
