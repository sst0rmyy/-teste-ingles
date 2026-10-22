#!/usr/bin/env node
/*
 * Monta a pasta publicar-netlify/ só com o que pode ir para a internet.
 * Nunca copia a pasta servidor/ (senha e dados dos clientes).
 *
 *   node gerar-netlify.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const APP = __dirname;
const SAIDA = path.join(APP, "publicar-netlify");

// index.html é escrito como página de artifact (sem <head>); aqui ganha o documento completo
const INICIO = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="theme-color" content="#fffdf8"><meta name="robots" content="noindex,nofollow">' +
  '<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icone-192.png">' +
  '<link rel="apple-touch-icon" href="/icone-192.png">' +
  '<style>[hidden]{display:none!important}</style></head><body>';
const FIM = "</body></html>\n";

// cabeçalhos de segurança do Netlify; a página nunca fica guardada em cache velho
const HEADERS = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Strict-Transport-Security: max-age=31536000
  X-Robots-Tag: noindex, nofollow

/
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
`;

const LEIA = `LIVRO DE PROCURAÇÕES — PASTA PARA O NETLIFY

COMO PUBLICAR
1) Acesse https://app.netlify.com/drop
2) Arraste ESTA PASTA inteira (publicar-netlify) para a página.
3) Você recebe um endereço https://….netlify.app. Domínio próprio:
   Site configuration > Domain management.
Para atualizar: arraste a pasta nova em Deploys > "Drag and drop".

COMO FUNCIONA NO NETLIFY (modo local)
- Cada computador tem a SUA biblioteca, guardada só naquele navegador.
- Não há senha: quem tiver o endereço abre o sistema, mas só vê o que
  foi salvo no próprio navegador.
- Limpar o histórico do navegador APAGA as procurações daquele computador.
- Não há backup. Para biblioteca compartilhada, senha e backup, use o
  servidor do cartório (pasta servidor, veja LEIA-ME.md).

NUNCA coloque nesta pasta a pasta "servidor" nem "dados".
`;

const COPIAR = ["manifest.webmanifest", "icone-192.png", "icone-512.png", "vendor/jszip.min.js"];

fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, "vendor"), { recursive: true });
fs.writeFileSync(path.join(SAIDA, "index.html"), INICIO + fs.readFileSync(path.join(APP, "index.html"), "utf8") + FIM);
for (const f of COPIAR) fs.copyFileSync(path.join(APP, f), path.join(SAIDA, f));
fs.writeFileSync(path.join(SAIDA, "_headers"), HEADERS);
fs.writeFileSync(path.join(SAIDA, "LEIA-ME.txt"), LEIA);

// conferência: nada de servidor nem dados na pasta publicada
const tudo = [];
(function listar(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = rel ? rel + "/" + f : f;
  if (fs.statSync(p).isDirectory()) listar(p, r); else tudo.push(r); } })(SAIDA, "");
if (tudo.some(f => /servidor|dados|config\.json|sessoes/.test(f))) { console.error("ERRO: arquivo proibido na pasta."); process.exit(1); }
console.log("Pasta pronta: " + SAIDA);
tudo.forEach(f => console.log("  " + f));
