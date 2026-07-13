import express from "express";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { x402ResourceServer } from "@okxweb3/x402-express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "4021");
const XLAYER_ADDRESS = "0x5ec145b3bad6a80d3a96e2b65b3e13fbab3be431";
const PRICE = "5000000"; // 5 USDT in smallest unit

// Hardcoded OKX credentials
const OKX_API_KEY = "7bdbe763-b178-4506-974c-c6d358670f2e";
const OKX_SECRET_KEY = "272D490653106A716B0B8562370D434D";
const OKX_PASSPHRASE = "Yangchaowang918$";

const facilitatorClient = new OKXFacilitatorClient({
  apiKey: OKX_API_KEY,
  secretKey: OKX_SECRET_KEY,
  passphrase: OKX_PASSPHRASE,
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:196",
  new ExactEvmScheme()
);

const paymentOptions = {
  "POST /mcp/us-yield-hunter": {
    accepts: {
      scheme: "exact",
      price: PRICE,
      network: "eip155:196",
      payTo: XLAYER_ADDRESS,
    },
    description: "US stock yield & bottleneck scan — Serenity supply-chain analysis + hidden dividend picks + portfolio construction. Chinese/English.",
    mimeType: "application/json",
  },
};

app.post("/mcp/us-yield-hunter", async (req, res) => {
  try {
    // Check payment using the resource server
    const paymentResult = await resourceServer.verify(req, paymentOptions);
    
    if (!paymentResult.isValid) {
      // Return 402 with UPPERCASE header (OKX validator requires this)
      const challenge = await resourceServer.createChallenge(req, paymentOptions);
      
      res.setHeader("PAYMENT-REQUIRED", challenge);  // ← 大写！
      return res.status(402).json({});
    }

    // Payment valid → run analysis
    const { focus_sectors, style, language = "zh" } = req.body || {};
    
    const report = `Serenity 美股瓶颈与收益研报（占位）

用户请求: ${JSON.stringify({ focus_sectors, style, language })}

（正式版本会调用 Hermes 后端生成完整 3000+ 字报告）

当前为 Railway 验证通过版本。`;

    res.json({ report });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", agent: "US Yield & Bottleneck Hunter", agentId: "5149" });
});

app.listen(PORT, () => {
  console.log(`🔬 US Yield & Bottleneck Hunter - x402 MCP Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Endpoint: POST /mcp/us-yield-hunter`);
  console.log(`   Price: $5 USDT on XLayer`);
  console.log(`   Pay to: ${XLAYER_ADDRESS}`);
});
