import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "4021");

// OKX API credentials
const OKX_API_KEY = process.env.OKX_API_KEY || "7bdbe763-b178-4506-974c-c6d358670f2e";
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY || "272D490653106A716B0B8562370D434D";
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE || "Yangchaowang918$";
const XLAYER_ADDRESS = process.env.XLAYER_ADDRESS || "0x5ec145b3bad6a80d3a96e2b65b3e13fbab3be431";

// Analysis API keys
const CLAWBY_API_KEY = process.env.CLAWBY_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// Init facilitator client
const facilitatorClient = new OKXFacilitatorClient({
  apiKey: OKX_API_KEY,
  secretKey: OKX_SECRET_KEY,
  passphrase: OKX_PASSPHRASE,
});

// Register exact EVM scheme on XLayer mainnet
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:196",
  new ExactEvmScheme()
);

// Payment middleware
app.use(
  paymentMiddleware(
    {
      "POST /mcp/us-yield-hunter": {
        accepts: {
          scheme: "exact",
          price: "$1",
          network: "eip155:196",
          payTo: XLAYER_ADDRESS,
        },
        description: "US Yield & Bottleneck Hunter — Serenity deep supply-chain analysis for overlooked yield assets (ETFs, BDCs, MLPs, CEFs, REITs)",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

// ============================================================
// ANALYSIS PIPELINE
// ============================================================

interface AnalysisParams {
  focusSectors: string;
  style: "conservative" | "balanced" | "aggressive";
  yieldMin: number;
  language: "zh" | "en";
}

interface MarketSnapshot {
  indices: any[];
  sectors: any[];
  vix: string;
  tenYear: string;
  yieldAssets: any[];
}

async function clawbyScreener(symbols: string[], cols: string): Promise<any[]> {
  const payload = JSON.stringify({
    name: "Screen thousands of stocks on numerous fields",
    params: {
      symbol: symbols.join(","),
      view_cols: cols,
      region: "US",
      per_page: 50,
    },
  });

  const resp = await fetch("https://api.openclawby.com/api/relay", {
    method: "POST",
    headers: {
      "X-API-Key": CLAWBY_API_KEY,
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (!resp.ok) {
    console.error(`Clawby screener failed: ${resp.status}`);
    return [];
  }

  const data: any = await resp.json();
  // Response shape: { data: { data: [...] } } or { data: [...] }
  if (data?.data?.data) return data.data.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

async function fetchVIXAnd10Y(): Promise<{ vix: string; tenYear: string }> {
  let vix = "N/A";
  let tenYr = "N/A";
  try {
    // Yahoo Finance v8 chart API
    const vixResp = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d"
    );
    if (vixResp.ok) {
      const vixData: any = await vixResp.json();
      const quote = vixData?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (quote?.close?.length) {
        vix = quote.close[quote.close.length - 1].toFixed(2);
      }
    }
  } catch (e) {
    console.error("VIX fetch failed:", e);
  }

  try {
    const tnxResp = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=5d"
    );
    if (tnxResp.ok) {
      const tnxData: any = await tnxResp.json();
      const quote = tnxData?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (quote?.close?.length) {
        tenYr = quote.close[quote.close.length - 1].toFixed(2);
      }
    }
  } catch (e) {
    console.error("10Y fetch failed:", e);
  }

  return { vix, tenYear: tenYr };
}

const SCREENER_COLS =
  "display,reg_price,reg_change_pct,1_week_change_pct,1_month_change_pct,3_month_change_pct,ytd_change_pct,market_cap,sma_50_day,sma_200_day";

async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  // Batch 1: Major indices
  const indices = await clawbyScreener(
    ["SPY", "QQQ", "IWM", "DIA"],
    SCREENER_COLS
  );

  // Batch 2: 11 Sector ETFs + macro
  const sectors = await clawbyScreener(
    ["XLF", "XLE", "XLK", "XLV", "XLI", "XLP", "XLY", "XLB", "XLU", "XLRE", "XLC"],
    SCREENER_COLS
  );

  // Batch 3: VIX + 10Y
  const { vix, tenYear } = await fetchVIXAnd10Y();

  // Batch 4-6: Yield assets
  const ultraShort = await clawbyScreener(
    ["SGOV", "BIL", "BILS"],
    SCREENER_COLS
  );

  const coveredCall = await clawbyScreener(
    ["JEPQ", "JEPI", "QYLD", "XYLD", "DIVO", "SVOL"],
    SCREENER_COLS
  );

  const bdcMlp = await clawbyScreener(
    ["ARCC", "CSWC", "MAIN", "HTGC", "PBDC", "ET", "EPD", "MPLX", "AM", "AMLP"],
    SCREENER_COLS
  );

  const cloCef = await clawbyScreener(
    ["JBBB", "CLOX", "PDI", "GOF", "UTF", "UTG", "RQI", "JFR"],
    SCREENER_COLS
  );

  const reits = await clawbyScreener(
    ["SPG", "O", "ADC", "STAG", "VICI"],
    SCREENER_COLS
  );

  const yieldAssets = [
    ...ultraShort,
    ...coveredCall,
    ...bdcMlp,
    ...cloCef,
    ...reits,
  ];

  return { indices, sectors, vix, tenYear, yieldAssets };
}

function buildSerenitySystemPrompt(lang: "zh" | "en"): string {
  if (lang === "zh") {
    return `你是 Serenity，一位专业的美国市场供应链瓶颈与收益分析师。你专注于发现被忽视的收益型资产（高息股、ETF、BDC、MLP、CEF、REITs、CLO），而不是推荐 NVDA/AAPL 等共识股。

## 分析框架

### 报告结构
1. **市场定调** — 基于 VIX、10Y 利率、指数表现判断当前是 Risk-On/Neutral/Risk-Off
2. **板块轮动** — 11 个板块 ETF 的近期动量排名，识别轮动信号
3. **供应链瓶颈深度分析** — 选择 2-3 个当前最值得关注的瓶颈方向，每个做完整的价值链拆解
4. **隐藏收益标的** — 按保守/均衡/进取三档，每档推荐 4-7 个标的
5. **模型组合** — 构建符合风险偏好的投资组合
6. **监控清单** — 核心风险 + 验证任务

### 瓶颈分析要求
每个瓶颈方向必须包含：
- **系统变化**: 什么具体的技术/经济变化驱动了需求？不要泛泛而谈
- **价值链拆解**: 至少 5 层（下游需求→系统集成→模块→核心工艺→设备→材料→基础设施）
- **稀缺层证据**: 至少 3 个独立证据点，引用具体来源
- **上市公司**: 在稀缺层布局的公司，含证据强度
- **反面论证**: 至少 200 字描述什么情况下这个分析会失败

### 输出风格
- 数据驱动，每个判断附数字
- 表格用于对比，文章用于深度分析
- 用中文，直接不废话
- 最后附成本披露（Clawby API 调用次数、模型信息）

你收到的数据来自 Clawby Data 实时行情接口。`;
  }

  return `You are Serenity, a professional US market supply-chain bottleneck and yield analyst...`;
}

function buildUserPrompt(data: MarketSnapshot, params: AnalysisParams): string {
  const lang = params.language;
  const styleLabel =
    params.style === "conservative"
      ? "保守"
      : params.style === "aggressive"
        ? "进取"
        : "均衡";

  let prompt = "";

  if (lang === "zh") {
    prompt = `## 分析参数
- 风险偏好: ${styleLabel}
- 关注行业: ${params.focusSectors || "全市场"}
- 最低股息率: ${params.yieldMin}%

## 市场数据

### 主要指数
${JSON.stringify(data.indices, null, 2)}

### 板块 ETF
${JSON.stringify(data.sectors, null, 2)}

### 宏观指标
- VIX: ${data.vix}
- 10Y 美债收益率: ${data.tenYear}%

### 收益型资产池
${JSON.stringify(data.yieldAssets, null, 2)}

---

请按照 Serenity 方法论生成完整的分析报告。报告用中文，数据驱动，深度分析至少 2 个供应链瓶颈方向。

感谢 Clawby Data (openclawby.com) 提供实时行情数据。`;
  } else {
    prompt = `## Parameters
- Risk: ${params.style}
- Focus: ${params.focusSectors || "All sectors"}
- Min yield: ${params.yieldMin}%

## Market Data

### Indices
${JSON.stringify(data.indices, null, 2)}

### Sectors
${JSON.stringify(data.sectors, null, 2)}

### Macro
- VIX: ${data.vix}
- 10Y Treasury: ${data.tenYear}%

### Yield Assets
${JSON.stringify(data.yieldAssets, null, 2)}

---

Generate the full Serenity analysis report in English.`;
  }

  return prompt;
}

async function generateReport(
  data: MarketSnapshot,
  params: AnalysisParams
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return "Error: DEEPSEEK_API_KEY not configured on server.";
  }

  const systemPrompt = buildSerenitySystemPrompt(params.language);
  const userPrompt = buildUserPrompt(data, params);

  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`DeepSeek API error: ${resp.status} ${errText}`);
    throw new Error(`DeepSeek API returned ${resp.status}`);
  }

  const result: any = await resp.json();
  const content = result?.choices?.[0]?.message?.content || "";
  return content;
}

// ============================================================
// BUSINESS LOGIC ENDPOINT
// ============================================================

app.post("/mcp/us-yield-hunter", async (req, res) => {
  const startTime = Date.now();
  try {
    // Extract parameters from MCP-style or direct JSON body
    const args =
      req.body?.params?.arguments ||
      req.body?.arguments ||
      {};

    const params: AnalysisParams = {
      focusSectors: args.focus_sectors || "",
      style: args.style || "balanced",
      yieldMin: parseFloat(args.yield_min || "3"),
      language: args.language || "zh",
    };

    console.log(`[Analysis] Starting for style=${params.style}, focus=${params.focusSectors || "all"}`);

    // Step 1: Fetch market data from Clawby + Yahoo Finance
    console.log("[Analysis] Fetching market snapshot...");
    const marketData = await fetchMarketSnapshot();
    console.log(`[Analysis] Got ${marketData.indices.length} indices, ${marketData.sectors.length} sectors, ${marketData.yieldAssets.length} yield assets`);

    // Step 2: Generate report via DeepSeek
    console.log("[Analysis] Generating report via DeepSeek...");
    const report = await generateReport(marketData, params);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Analysis] Done in ${elapsed}s`);

    // Step 3: Return structured response
    res.json({
      success: true,
      agentId: "5149",
      agent: "US Yield & Bottleneck Hunter",
      params,
      report,
      marketData: {
        indices: marketData.indices,
        sectors: marketData.sectors,
        vix: marketData.vix,
        tenYear: marketData.tenYear,
        yieldAssetCount: marketData.yieldAssets.length,
      },
      meta: {
        elapsedSeconds: parseFloat(elapsed),
        dataSource: "Clawby Data (openclawby.com)",
        model: "DeepSeek Chat",
      },
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Analysis failed",
      agentId: "5149",
    });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    agent: "US Yield & Bottleneck Hunter",
    agentId: "5149",
    ready: Boolean(CLAWBY_API_KEY && DEEPSEEK_API_KEY),
  });
});

app.listen(PORT, () => {
  console.log("🔬 US Yield & Bottleneck Hunter — x402 MCP Server");
  console.log(`   Port: ${PORT}`);
  console.log(`   Endpoint: POST /mcp/us-yield-hunter`);
  console.log(`   Payment: $1 USDT on XLayer (eip155:196)`);
  console.log(`   PayTo:  ${XLAYER_ADDRESS}`);
  console.log(`   Clawby: ${CLAWBY_API_KEY ? "✓" : "✗ NOT SET"}`);
  console.log(`   DeepSeek: ${DEEPSEEK_API_KEY ? "✓" : "✗ NOT SET"}`);
});
