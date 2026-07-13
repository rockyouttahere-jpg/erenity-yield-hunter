import express from "express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "4021");
const CHALLENGE = "eyJ4ND...fV19";

app.post("/mcp/us-yield-hunter", (req, res) => {
  res.writeHead(402, {
    "Content-Type": "application/json",
    "PAYMENT-REQUIRED": CHALLENGE
  });
  res.end("{}");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", agent: "US Yield & Bottleneck Hunter", agentId: "5149" });
});

app.listen(PORT, () => {
  console.log("🔬 US Yield & Bottleneck Hunter - x402 MCP Server");
});
