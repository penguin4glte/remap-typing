// 単一ファイル版のビルド（依存ゼロ・Node標準のみ）
//   node build.mjs
// 出力:
//   dist/app-body.html … <title>+<style>+本文+<script> のみ（claude.ai Artifact用）
//   dist/index.html    … 完全なHTML（オフライン配布・file://でも開ける単体ファイル）
//
// 仕組み: js/ 以下のESモジュールを依存順に連結し、import行の削除と `export ` 接頭辞の
// 除去だけで1つのクラシックスクリプトにする。モジュール間で名前が一意であることが前提。
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));

// 依存順（後のファイルは前のファイルの名前を参照できる）
const JS_ORDER = ['keycodes.js','kle.js','charmap.js','textgen.js','snippets.js','via.js','registry.js','demo.js','app.js'];

function stripModuleSyntax(src){
  return src
    .split('\n')
    .filter(l => !/^\s*import\s/.test(l))
    .map(l => l.replace(/^export\s+(?=(const|let|function|async\s+function)\b)/, ''))
    .join('\n');
}

const js = JS_ORDER
  .map(f => `/* ===== js/${f} ===== */\n` + stripModuleSyntax(readFileSync(join(root,'js',f),'utf8')))
  .join('\n');

const css = readFileSync(join(root,'css','style.css'),'utf8');
const html = readFileSync(join(root,'index.html'),'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/\s*<script type="module"[^>]*><\/script>\s*/, '\n');

const appBody = `${title}
<style>
${css}</style>
${body.trim()}
<script>
'use strict';
${js}</script>
`;

const fullDoc = `<!DOCTYPE html>
<html lang="ja">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${appBody}</html>
`;

mkdirSync(join(root,'dist'), {recursive:true});
writeFileSync(join(root,'dist','app-body.html'), appBody);
writeFileSync(join(root,'dist','index.html'), fullDoc);

// 簡易チェック: 連結後のJSが構文的に妥当か
new Function(js);
console.log('built: dist/app-body.html, dist/index.html');
