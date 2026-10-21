#!/usr/bin/env node
/*
 * Servidor do Livro de Procurações — roda na rede interna do cartório.
 * Sem dependências: só Node.js 18 ou mais novo.
 *
 *   node servidor.js                  inicia (na primeira vez pede a senha)
 *   node servidor.js --definir-senha  troca a senha e desconecta todos
 *
 * Variáveis opcionais: PORTA (padrão 8080) e DADOS (pasta dos dados).
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const readline = require("readline");

const PORTA = parseInt(process.env.PORTA || "8080", 10);
const APP = path.resolve(__dirname, "..");
const DADOS = path.resolve(process.env.DADOS || path.join(__dirname, "dados"));
const DIR_PROC = path.join(DADOS, "procuracoes");
const DIR_LIXO = path.join(DADOS, "lixeira");
const ARQ_CONFIG = path.join(DADOS, "config.json");
const ARQ_SESSOES = path.join(DADOS, "sessoes.json");
const ARQ_CARTORIO = path.join(DADOS, "cartorio.json");
const VALIDADE_SESSAO = 30 * 24 * 3600 * 1000; // 30 dias
const LIMITE_CORPO = 1024 * 1024;

// Só estes arquivos do app são servidos; nada da pasta de dados sai daqui.
const PUBLICOS = {
  "/login": ["login.html", "text/html; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
  "/icone-192.png": ["icone-192.png", "image/png"],
  "/icone-512.png": ["icone-512.png", "image/png"],
};
const PROTEGIDOS = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/vendor/jszip.min.js": ["vendor/jszip.min.js", "text/javascript; charset=utf-8"],
};

for (const d of [DADOS, DIR_PROC, DIR_LIXO]) fs.mkdirSync(d, { recursive: true });

/* ---------- arquivos ---------- */
function lerJSON(arq, padrao) {
  try { return JSON.parse(fs.readFileSync(arq, "utf8")); } catch (e) { return padrao; }
}
function gravarJSON(arq, dado) {
  const tmp = arq + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(dado, null, 1));
  fs.renameSync(tmp, arq); // troca atômica: nunca deixa arquivo pela metade
}

/* ---------- senha ---------- */
function hashSenha(senha, sal) {
  sal = sal || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(senha, sal, 64).toString("hex");
  return { sal, h };
}
function confere(senha, cfg) {
  if (!cfg || !cfg.sal || !cfg.h) return false;
  const a = Buffer.from(hashSenha(senha, cfg.sal).h, "hex");
  const b = Buffer.from(cfg.h, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// uma única leitura do teclado para todas as perguntas (funciona também com entrada redirecionada)
let rl = null; const linhas = []; const esperando = [];
function perguntar(texto) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, terminal: false });
    rl.on("line", l => { const r = esperando.shift(); if (r) r(l); else linhas.push(l); });
  }
  process.stdout.write(texto);
  return new Promise(res => { if (linhas.length) res(linhas.shift()); else esperando.push(res); });
}
async function definirSenha() {
  try { return await pedirSenha(); } finally { if (rl) { rl.close(); rl = null; } }
}
async function pedirSenha() {
  for (;;) {
    const s1 = await perguntar("Digite a nova senha do cartório (mínimo 8 caracteres): ");
    if (s1.length < 8) { console.log("A senha precisa ter pelo menos 8 caracteres."); continue; }
    const s2 = await perguntar("Repita a senha: ");
    if (s1 !== s2) { console.log("As senhas não conferem. Tente de novo."); continue; }
    gravarJSON(ARQ_CONFIG, Object.assign(lerJSON(ARQ_CONFIG, {}), hashSenha(s1)));
    gravarJSON(ARQ_SESSOES, {});
    console.log("Senha definida. Todos os computadores precisarão entrar de novo.");
    return;
  }
}

/* ---------- sessões ---------- */
let sessoes = lerJSON(ARQ_SESSOES, {});
function novaSessao() {
  const t = crypto.randomBytes(32).toString("hex");
  sessoes[t] = Date.now() + VALIDADE_SESSAO;
  gravarJSON(ARQ_SESSOES, sessoes);
  return t;
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
function autenticado(req) {
  const t = cookies(req).sessao;
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return false;
  const exp = sessoes[t];
  if (!exp) return false;
  if (exp < Date.now()) { delete sessoes[t]; gravarJSON(ARQ_SESSOES, sessoes); return false; }
  return t;
}
const COOKIE = (t, idade) => `sessao=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${idade}`;

// Freio contra tentativas repetidas de senha: 10 erros por IP a cada 15 minutos.
const tentativas = new Map();
function bloqueado(ip) {
  const t = tentativas.get(ip);
  if (!t) return false;
  if (Date.now() - t.inicio > 15 * 60 * 1000) { tentativas.delete(ip); return false; }
  return t.n >= 10;
}
function errou(ip) {
  const t = tentativas.get(ip) || { n: 0, inicio: Date.now() };
  t.n++; tentativas.set(ip, t);
}

/* ---------- eventos ao vivo (SSE) ---------- */
const ouvintes = new Set();
function avisar(dado) {
  const msg = `data: ${JSON.stringify(dado)}\n\n`;
  for (const r of ouvintes) { try { r.write(msg); } catch (e) { ouvintes.delete(r); } }
}
setInterval(() => { for (const r of ouvintes) { try { r.write(": ping\n\n"); } catch (e) { ouvintes.delete(r); } } }, 25000);

/* ---------- respostas ---------- */
const SEGURANCA = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
};
function enviar(res, status, corpo, tipo, extra) {
  const h = Object.assign({ "Content-Type": tipo || "application/json; charset=utf-8", "Cache-Control": "no-store" }, SEGURANCA, extra || {});
  res.writeHead(status, h);
  res.end(typeof corpo === "string" || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}
// index.html é escrito como página de artifact (sem <head>); aqui ganha o esqueleto de documento.
const ESQUELETO_INICIO = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fffdf8"><link rel="icon" href="/icone-192.png"><style>[hidden]{display:none!important}</style></head><body>';
function arquivo(res, rel, tipo) {
  fs.readFile(path.join(APP, rel), (err, buf) => {
    if (err) return enviar(res, 404, { erro: "não encontrado" });
    if (rel === "index.html") buf = ESQUELETO_INICIO + buf.toString("utf8") + "</body></html>";
    enviar(res, 200, buf, tipo);
  });
}
function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let tam = 0; const partes = [];
    req.on("data", c => { tam += c.length; if (tam > LIMITE_CORPO) { falha(new Error("grande demais")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : null); } catch (e) { falha(e); } });
    req.on("error", falha);
  });
}
const ID_OK = /^[a-z0-9]{1,40}$/i;

/* ---------- CEP ---------- */
const cacheCep = new Map();
async function obter(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "LivroProcuracoes/1.0" } });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}
async function buscarCep(cep) {
  if (cacheCep.has(cep)) return cacheCep.get(cep);
  let d;
  try {
    const j = await obter(`https://viacep.com.br/ws/${cep}/json/`);
    if (j.erro) throw new Error("não encontrado");
    d = { logr: j.logradouro || "", bairro: j.bairro || "", cidade: j.localidade || "", uf: j.uf || "" };
  } catch (e) {
    const j = await obter(`https://brasilapi.com.br/api/cep/v1/${cep}`);
    d = { logr: j.street || "", bairro: j.neighborhood || "", cidade: j.city || "", uf: j.state || "" };
  }
  cacheCep.set(cep, d);
  return d;
}

/* ---------- rotas ---------- */
async function tratar(req, res) {
  const url = new URL(req.url, "http://local");
  const rota = url.pathname;
  const ip = req.socket.remoteAddress || "";

  if (req.method === "GET" && PUBLICOS[rota]) return arquivo(res, ...PUBLICOS[rota]);

  if (rota === "/api/entrar" && req.method === "POST") {
    if (bloqueado(ip)) return enviar(res, 429, { erro: "Muitas tentativas. Aguarde 15 minutos." });
    let corpo; try { corpo = await lerCorpo(req); } catch (e) { return enviar(res, 400, { erro: "pedido inválido" }); }
    if (!corpo || typeof corpo.senha !== "string" || !confere(corpo.senha, lerJSON(ARQ_CONFIG, null))) {
      errou(ip); return enviar(res, 401, { erro: "Senha incorreta." });
    }
    tentativas.delete(ip);
    return enviar(res, 200, { ok: true }, null, { "Set-Cookie": COOKIE(novaSessao(), VALIDADE_SESSAO / 1000) });
  }

  const sessao = autenticado(req);
  if (!sessao) {
    if (rota.startsWith("/api/")) return enviar(res, 401, { erro: "Entre com a senha do cartório." });
    if (req.method === "GET" && PROTEGIDOS[rota]) return enviar(res, 302, "", "text/plain", { Location: "/login" });
    return enviar(res, 404, { erro: "não encontrado" });
  }

  if (req.method === "GET" && PROTEGIDOS[rota]) return arquivo(res, ...PROTEGIDOS[rota]);

  // Toda escrita exige o cabeçalho do app (proteção contra envio de outro site).
  if (req.method !== "GET" && req.headers["x-livro"] !== "1") return enviar(res, 403, { erro: "pedido recusado" });

  if (rota === "/api/sessao" && req.method === "GET") return enviar(res, 200, { ok: true });

  if (rota === "/api/sair" && req.method === "POST") {
    delete sessoes[sessao]; gravarJSON(ARQ_SESSOES, sessoes);
    return enviar(res, 200, { ok: true }, null, { "Set-Cookie": COOKIE("", 0) });
  }

  if (rota === "/api/eventos" && req.method === "GET") {
    res.writeHead(200, Object.assign({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" }, SEGURANCA));
    res.write("retry: 3000\n\n");
    ouvintes.add(res);
    req.on("close", () => ouvintes.delete(res));
    return;
  }

  if (rota === "/api/procuracoes" && req.method === "GET") {
    const todos = {};
    for (const f of fs.readdirSync(DIR_PROC)) {
      if (!f.endsWith(".json")) continue;
      const d = lerJSON(path.join(DIR_PROC, f), null);
      if (d) todos[f.slice(0, -5)] = d;
    }
    return enviar(res, 200, todos);
  }

  const m = /^\/api\/procuracoes\/([^/]+)$/.exec(rota);
  if (m) {
    const id = m[1];
    if (!ID_OK.test(id)) return enviar(res, 400, { erro: "identificador inválido" });
    const arq = path.join(DIR_PROC, id + ".json");
    if (req.method === "PUT") {
      let corpo; try { corpo = await lerCorpo(req); } catch (e) { return enviar(res, 400, { erro: "pedido inválido" }); }
      if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return enviar(res, 400, { erro: "pedido inválido" });
      gravarJSON(arq, corpo);
      avisar({ tipo: "procuracao", id });
      return enviar(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      // não apaga de vez: guarda na lixeira com a data, para recuperar se preciso
      if (fs.existsSync(arq)) fs.renameSync(arq, path.join(DIR_LIXO, id + "-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json"));
      avisar({ tipo: "procuracao", id });
      return enviar(res, 200, { ok: true });
    }
  }

  // busca de endereço pelo CEP (ViaCEP, com BrasilAPI de reserva); o navegador não precisa sair da rede
  const mc = /^\/api\/cep\/(\d{8})$/.exec(rota);
  if (mc && req.method === "GET") {
    try { return enviar(res, 200, await buscarCep(mc[1])); }
    catch (e) { return enviar(res, 404, { erro: "CEP não encontrado" }); }
  }

  if (rota === "/api/cartorio") {
    if (req.method === "GET") return enviar(res, 200, lerJSON(ARQ_CARTORIO, { escreventes: [] }));
    if (req.method === "PUT") {
      let corpo; try { corpo = await lerCorpo(req); } catch (e) { return enviar(res, 400, { erro: "pedido inválido" }); }
      if (!corpo || !Array.isArray(corpo.escreventes)) return enviar(res, 400, { erro: "pedido inválido" });
      const atual = lerJSON(ARQ_CARTORIO, {});
      const padroes = corpo.padroes && typeof corpo.padroes === "object" && !Array.isArray(corpo.padroes) ? corpo.padroes : (atual.padroes || {});
      gravarJSON(ARQ_CARTORIO, { escreventes: corpo.escreventes, padroes });
      avisar({ tipo: "cartorio" });
      return enviar(res, 200, { ok: true });
    }
  }

  return enviar(res, 404, { erro: "não encontrado" });
}

/* ---------- partida ---------- */
function enderecos() {
  const out = [];
  for (const lista of Object.values(os.networkInterfaces())) for (const a of lista || []) if (a.family === "IPv4" && !a.internal) out.push(a.address);
  return out;
}

(async () => {
  if (process.argv.includes("--definir-senha")) { await definirSenha(); process.exit(0); }
  if (!lerJSON(ARQ_CONFIG, {}).h) {
    console.log("Primeira execução: defina a senha que os funcionários usarão para entrar.");
    await definirSenha();
  }
  const servidor = http.createServer((req, res) => {
    tratar(req, res).catch(err => { console.error(err); try { enviar(res, 500, { erro: "erro interno" }); } catch (e) {} });
  });
  servidor.on("error", err => {
    if (err.code === "EADDRINUSE") console.error(`A porta ${PORTA} já está em uso. Feche o outro servidor ou use outra porta (PORTA=8081).`);
    else console.error(err);
    process.exit(1);
  });
  servidor.listen(PORTA, "0.0.0.0", () => {
    console.log("\nLivro de Procurações no ar.");
    console.log(`  Neste computador:   http://localhost:${PORTA}`);
    for (const ip of enderecos()) console.log(`  Na rede do cartório: http://${ip}:${PORTA}`);
    console.log(`  Dados em: ${DADOS}`);
    console.log("\nDeixe esta janela aberta enquanto o cartório estiver usando o sistema.");
  });
})();
