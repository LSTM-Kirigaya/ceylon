const fs = require("fs");
const path = require("path");

// 检查 cheerio 是否安装
try {
  const cheerio = require("cheerio");
} catch (e) {
  console.error("请先安装 cheerio: npm install cheerio");
  process.exit(1);
}

const cheerio = require("cheerio");

// 获取命令行参数
const inputFile = process.argv[2] || "icon.svg";
const outputFile = process.argv[3] || "icon-colored.svg";

// 检查输入文件是否存在
if (!fs.existsSync(inputFile)) {
  console.error(`❌ 文件不存在: ${inputFile}`);
  console.log("用法: node colorize-svg.js [输入文件] [输出文件]");
  console.log("示例: node colorize-svg.js icon.svg output.svg");
  process.exit(1);
}

// 读取 SVG
const svg = fs.readFileSync(inputFile, "utf-8");

// 解析
const $ = cheerio.load(svg, { xmlMode: true });

// ===== 1. 添加 defs 渐变 =====
const defs = `
<defs>
  <linearGradient id="bowlGradient" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ff6a2a"/>
    <stop offset="100%" stop-color="#8c1d00"/>
  </linearGradient>

  <linearGradient id="steamGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#f6c7a5" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#e0a57f"/>
  </linearGradient>

  <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
</defs>
`;

// 插入 defs（如果没有）
if ($("defs").length === 0) {
  $("svg").prepend(defs);
} else {
  $("defs").replaceWith(defs);
}

// ===== 2. 给不同 path 上色 =====
const paths = $("path");

if (paths.length < 4) {
  console.warn(`⚠️ 警告: SVG 只有 ${paths.length} 个 path，需要至少 4 个`);
}

// 蒸汽
if (paths[0]) {
  $(paths[0]).attr({
    fill: "none",
    stroke: "url(#steamGradient)",
    "stroke-width": 20,
    "stroke-linecap": "round"
  });
  console.log("✓ Path 1: 蒸汽渐变");
}

if (paths[1]) {
  $(paths[1]).attr({
    fill: "none",
    stroke: "url(#steamGradient)",
    "stroke-width": 20,
    "stroke-linecap": "round"
  });
  console.log("✓ Path 2: 蒸汽渐变");
}

// 高光
if (paths[2]) {
  $(paths[2]).attr({
    fill: "url(#highlightGradient)"
  });
  console.log("✓ Path 3: 高光渐变");
}

// 碗
if (paths[3]) {
  $(paths[3]).attr({
    fill: "url(#bowlGradient)"
  });
  console.log("✓ Path 4: 碗渐变");
}

// ===== 3. 输出 =====
fs.writeFileSync(outputFile, $.xml());

console.log(`\n✅ 完成！输出文件: ${outputFile}`);
console.log(`📊 处理了 ${paths.length} 个 path 元素`);
