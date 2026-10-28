"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");

const DeviceSchema = z.object({
  name:z.string().trim().min(1).max(100),
  room:z.string().trim().min(1).max(100),
  owner:z.string().trim().max(100).default(""),
  platform:z.enum(["Windows","ChromeOS","macOS","Linux","Otro"]).default("Windows"),
  status:z.enum(["Activo","Mantenimiento","Retirado"]).default("Activo"),
  notes:z.string().trim().max(1000).default("")
}).strict();

test("accepts a minimal valid Windows device and applies defaults",()=>{
  assert.deepEqual(DeviceSchema.parse({name:"PC-01",room:"Aula 1"}),{
    name:"PC-01",room:"Aula 1",owner:"",platform:"Windows",status:"Activo",notes:""
  });
});
test("rejects an empty name",()=>{
  assert.equal(DeviceSchema.safeParse({name:" ",room:"Aula 1"}).success,false);
});
test("rejects unknown fields to prevent silently accepted input",()=>{
  assert.equal(DeviceSchema.safeParse({name:"PC-01",room:"Aula 1",command:"run"}).success,false);
});
test("rejects arbitrary device status",()=>{
  assert.equal(DeviceSchema.safeParse({name:"PC-01",room:"Aula 1",status:"Online"}).success,false);
});