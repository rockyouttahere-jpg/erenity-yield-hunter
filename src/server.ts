import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "4021");

// OKX API credentials — env vars take priority, fallback for local dev
const OKX_API_KEY = process.env.OKX_API_KEY || "7bdbe763-b178-4506-974c-c6d358670f2e";
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY || "272D490653106A716B0B8562370D434D";
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE || "Yangchaowang918$";

// XLayer wallet address that receives payments
const XLAYER_ADDRESS = process.env.XLAYER_ADDRESS || "0x5ec145b3bad6a80d3a96e2b65b3e13fbab3be431";

// Init facilitator client (handles payment verification via OKX)
const facilitatorClient = new OKXFacilitatorClient({
  apiKey: OKX_API_KEY,
  secretKey: OKX_SECRET_KEY,
  passphrase: OKX_PASSPHRASE,
});

// Register exact EVM scheme on XLayer mainnet (eip155:196)
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:196",
  new ExactEvmScheme()
);

// Payment middleware — intercepts POST /mcp/us-yield-hunter and handles x402 flow
app.use(
  paymentMiddleware(
    {
      "POST /mcp/us-yield-hunter": {
        accepts: {
          scheme: "exact",
          price: "$5",
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

// === Business logic — only reached after successful x402 payment verification ===

app.post("/mcp/us-yield-hunter", async (req, res) => {
  try {
    // TODO: Implement full Serenity US yield / bottleneck analysis pipeline
    res.json({
      success: true,
      message: "US Yield & Bottleneck Hunter — Payment verified. Full Serenity analysis pipeline coming soon.",
      agentId: "5149",
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check (no payment required — not covered by paymentMiddleware)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    agent: "US Yield & Bottleneck Hunter",
    agentId: "5149",
  });
});

app.listen(PORT, () => {
  console.log("🔬 US Yield & Bottleneck Hunter — x402 MCP Server");
  console.log(`   Port: ${PORT}`);
  console.log(`   Endpoint: POST /mcp/us-yield-hunter`);
  console.log(`   Payment: $5 USDT on XLayer (eip155:196)`);
  console.log(`   PayTo:  ${XLAYER_ADDRESS}`);
});
