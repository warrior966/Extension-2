"use strict";

const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { csrfSync } = require("csrf-sync");
const { z } = require("zod");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const production = process.env.NODE_ENV === "production";
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3030);
const databasePath = path.resolve(process.env.DATABASE_PATH || "./.data/focusguard.sqlite");
const sessionSecret = process.env.SESSION_SECRET || "";

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT no válido.");
if (production && (sessionSecret.length < 32 || host === "0.0.0.0" || host === "::")) {
  throw new Error("En producción configura SESSION_SECRET (32+ caracteres) y escucha solo en localhost detrás de un proxy HTTPS.");
}
if (!production && sessionSecret.length < 32) {
  console.warn("AVISO: define SESSION_SECRET (32+ caracteres) antes de usar esta API fuera de pruebas locales.");
}
const effectiveSecret = sessionSecret.length >= 32 ? sessionSecret : "development-only-change-this-secret-before-deploying-000000";

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','operator','viewer')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'Windows',
    status TEXT NOT NULL CHECK(status IN ('Activo','Mantenimiento','Retirado')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_group TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_devices_room ON devices(room);
  CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
  CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit(created_at);
`);

const bootstrapUser = (process.env.BOOTSTRAP_ADMIN_USERNAME || "").trim();
const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count === 0) {
  if (!bootstrapUser || bootstrapPassword.length < 12) {
    console.warn("No existe ningún usuario. Define BOOTSTRAP_ADMIN_USERNAME y BOOTSTRAP_ADMIN_PASSWORD (mínimo 12 caracteres) para crear el administrador inicial.");
  } else {
    const hash = bcrypt.hashSync(bootstrapPassword, 12);
    db.prepare("INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)")
      .run(bootstrapUser, hash, "admin", new Date().toISOString());
    console.log("Usuario administrador inicial creado. Cambia la contraseña tras el primer acceso.");
  }
}

const SQLiteStore = SQLiteStoreFactory(session);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
  imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"],
  baseUri: ["'self'"], frameAncestors: ["'none'"]
}}}));
app.use(express.json({ limit: "32kb", strict: true }));
app.use(session({
  name: "fg.sid",
  secret: effectiveSecret,
  store: new SQLiteStore({ db: "sessions.sqlite", dir: path.dirname(databasePath) }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: production, sameSite: "strict", maxAge: 30 * 60 * 1000 }
}));

const { generateToken, csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: req => req.headers["x-csrf-token"]
});
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false });

const DeviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  room: z.string().trim().min(1).max(100),
  owner: z.string().trim().max(100).default(""),
  platform: z.enum(["Windows","ChromeOS","macOS","Linux","Otro"]).default("Windows"),
  status: z.enum(["Activo","Mantenimiento","Retirado"]).default("Activo"),
  notes: z.string().trim().max(1000).default("")
}).strict();
const PolicySchema = z.object({
  name: z.string().trim().min(1).max(100),
  target_group: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(2000).default("")
}).strict();

function audit(actor, action, detail) {
  db.prepare("INSERT INTO audit(actor,action,detail,created_at) VALUES(?,?,?,?)")
    .run(actor, action, String(detail).slice(0, 500), new Date().toISOString());
}
function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Autenticación requerida." });
  next();
}
function roles(...allowed) {
  return (req, res, next) => allowed.includes(req.session.user.role)
    ? next() : res.status(403).json({ error: "Permisos insuficientes." });
}
function parse(schema, value, res) {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({ error: "Datos no válidos.", details: result.error.issues.map(i => ({field:i.path.join("."),message:i.message})) });
    return null;
  }
  return result.data;
}
function newId(prefix) { return prefix + "-" + require("node:crypto").randomUUID(); }

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "focus-guard-school-api", deviceConnectivity: "not-integrated" }));
app.get("/api/csrf", (req, res) => res.json({ csrfToken: generateToken(req) }));

app.post("/api/auth/login", loginLimiter, csrfSynchronisedProtection, (req, res) => {
  const input = z.object({username:z.string().trim().min(1).max(100),password:z.string().min(1).max(200)}).safeParse(req.body);
  if (!input.success) return res.status(400).json({error:"Credenciales no válidas."});
  const user = db.prepare("SELECT id,username,password_hash,role FROM users WHERE username=?").get(input.data.username);
  if (!user || !bcrypt.compareSync(input.data.password, user.password_hash)) {
    audit("anonymous", "login_failed", "Intento de inicio de sesión fallido");
    return res.status(401).json({error:"Usuario o contraseña incorrectos."});
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({error:"No se pudo iniciar la sesión."});
    req.session.user = {id:user.id,username:user.username,role:user.role};
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({error:"No se pudo guardar la sesión."});
      audit(user.username, "login", "Inicio de sesión correcto");
      return res.json({user:req.session.user, csrfToken:generateToken(req)});
    });
  });
});
app.post("/api/auth/logout", auth, csrfSynchronisedProtection, (req,res) => {
  const username=req.session.user.username;
  req.session.destroy(err => {
    if(err) return res.status(500).json({error:"No se pudo cerrar la sesión."});
    res.clearCookie("fg.sid",{httpOnly:true,sameSite:"strict",secure:production});
    audit(username,"logout","Cierre de sesión");
    res.status(204).end();
  });
});
app.get("/api/auth/me", auth, (req,res)=>res.json({user:req.session.user}));

app.use("/api", (req,res,next) => {
  if (req.path.startsWith("/auth/") || req.path === "/csrf" || req.path === "/health") return next();
  auth(req,res,()=> {
    if (["POST","PUT","PATCH","DELETE"].includes(req.method)) return csrfSynchronisedProtection(req,res,next);
    next();
  });
});
app.use("/api", writeLimiter);

app.get("/api/devices", (req,res) => {
  const q=String(req.query.q||"").slice(0,100);
  const status=String(req.query.status||"");
  const rows=db.prepare(`SELECT * FROM devices WHERE (name LIKE @q OR room LIKE @q OR owner LIKE @q OR id LIKE @q) AND (@status='' OR status=@status) ORDER BY room,name LIMIT 500`)
    .all({q:"%"+q.replace(/[%_]/g,"")+"%",status});
  res.json({items:rows,connectivity:"inventory-only"});
});
app.post("/api/devices", roles("admin","operator"), (req,res) => {
  const d=parse(DeviceSchema,req.body,res);if(!d)return;
  const id=newId("WIN");
  const now=new Date().toISOString();
  db.prepare("INSERT INTO devices(id,name,room,owner,platform,status,notes,created_at,updated_at) VALUES(@id,@name,@room,@owner,@platform,@status,@notes,@now,@now)")
    .run({...d,id,now});
  audit(req.session.user.username,"device_created",id+" · "+d.name);
  res.status(201).json({item:db.prepare("SELECT * FROM devices WHERE id=?").get(id)});
});
app.patch("/api/devices/:id", roles("admin","operator"), (req,res) => {
  const d=parse(DeviceSchema.partial().strict(),req.body,res);if(!d)return;
  if(!Object.keys(d).length)return res.status(400).json({error:"No hay campos para actualizar."});
  const old=db.prepare("SELECT * FROM devices WHERE id=?").get(req.params.id);
  if(!old)return res.status(404).json({error:"Equipo no encontrado."});
  const merged=DeviceSchema.parse({name:old.name,room:old.room,owner:old.owner,platform:old.platform,status:old.status,notes:old.notes,...d});
  db.prepare("UPDATE devices SET name=@name,room=@room,owner=@owner,platform=@platform,status=@status,notes=@notes,updated_at=@now WHERE id=@id")
    .run({...merged,id:old.id,now:new Date().toISOString()});
  audit(req.session.user.username,"device_updated",old.id+" · "+merged.name);
  res.json({item:db.prepare("SELECT * FROM devices WHERE id=?").get(old.id)});
});
app.delete("/api/devices/:id", roles("admin"), (req,res) => {
  const d=db.prepare("SELECT id,name FROM devices WHERE id=?").get(req.params.id);
  if(!d)return res.status(404).json({error:"Equipo no encontrado."});
  db.prepare("DELETE FROM devices WHERE id=?").run(d.id);
  audit(req.session.user.username,"device_deleted",d.id+" · "+d.name);
  res.status(204).end();
});

app.get("/api/policies", (_req,res)=>res.json({items:db.prepare("SELECT * FROM policies ORDER BY name LIMIT 500").all(),deployment:"not-integrated"}));
app.post("/api/policies", roles("admin","operator"), (req,res) => {
  const p=parse(PolicySchema,req.body,res);if(!p)return;
  const id=newId("POL"),now=new Date().toISOString();
  db.prepare("INSERT INTO policies(id,name,target_group,notes,created_at,updated_at) VALUES(@id,@name,@target_group,@notes,@now,@now)").run({...p,id,now});
  audit(req.session.user.username,"policy_created",id+" · "+p.name);
  res.status(201).json({item:db.prepare("SELECT * FROM policies WHERE id=?").get(id),deployment:"not-integrated"});
});
app.delete("/api/policies/:id", roles("admin"), (req,res) => {
  const p=db.prepare("SELECT id,name FROM policies WHERE id=?").get(req.params.id);
  if(!p)return res.status(404).json({error:"Perfil no encontrado."});
  db.prepare("DELETE FROM policies WHERE id=?").run(p.id);
  audit(req.session.user.username,"policy_deleted",p.id+" · "+p.name);
  res.status(204).end();
});
app.get("/api/audit", roles("admin","operator"), (req,res) => {
  const limit=Math.max(1,Math.min(200,Number(req.query.limit)||100));
  res.json({items:db.prepare("SELECT id,actor,action,detail,created_at FROM audit ORDER BY id DESC LIMIT ?").all(limit)});
});

app.use((err,req,res,_next)=>{
  if(err && (err.code==="EBADCSRFTOKEN" || /csrf/i.test(err.message||""))) return res.status(403).json({error:"Token CSRF ausente o no válido. Solicita uno nuevo y repite la operación."});
  if(err && err.type==="entity.parse.failed") return res.status(400).json({error:"JSON no válido."});
  console.error("Error de API:",err.message);
  res.status(500).json({error:"Error interno."});
});

const server=app.listen(port,host,()=>console.log(`Focus Guard API escuchando en http://${host}:${port} (solo inventario; sin agente conectado)`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});}
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
module.exports={app,db};
