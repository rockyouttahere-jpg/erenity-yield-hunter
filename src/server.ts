import express from "express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || "4021");

// Hardcoded OKX credentials
const OKX_API_KEY = "7bdbe763-b178-4506-974c-c6d358670f2e";
const OKX_SECRET_KEY = "272D490653106A716B0B8562370D434D";
const OKX_PASSPHRASE = "Yangchaowang918$";

// Pre-generated valid challenge (from previous successful x402 response)
const CHALLENGE = "eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3IiOiJQYXltZW50IHJlcXVpcmVkIiwicmVzb3VyY2UiOnsidXJsIjoiaHR0cDovL2VyZW5pdHkteWllbGQtaHVudGVyLXByb2R1Y3Rpb24udXAucmFpbHdheS5hcHAvbWNwL3VzLXlpZWxkLWh1bnRlciIsImRlc2NyaXB0aW9uIjoiVVMgc3RvY2sgeWllbGQgJiBib3R0bGVuZWNrIHNjYW4g4oCUIFNlcmVuaXR5IHN1cHBseS1jaGFpbiBhbmFseXNpcyArIGhpZGRlbiBkaXZpZGVuZCBwaWNrcyArIHBvcnRmb2xpbyBjb25zdHJ1Y3Rpb24uIENoaW5lc2UvRW5nbGlzaC4iLCJtaW1lVHlwZSI6ImFwcGxpY2F0aW9uL2pzb24ifSwiYWNjZXB0cyI6W3sic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiZWlwMTU1OjE5NiIsImFtb3VudCI6IjUwMDAwMDAiLCJhc3NldCI6IjB4Nzc5ZGVkMGM5ZTEwMjIyMjVmOGUwNjMwYjM1YTliNTRiZTcxMzczNiIsInBheVRvIjoiMHg1ZWMxNDViM2JhZDZhODBkM2E5NmUyYjY1YjNlMTNmYmFiM2JlNDMxIiwibWF4VGltZW91dFNlY29uZHMiOjMwMCwiZXh0cmEiOnsibmFtZSI6IlVTROKCrjAiLCJ2ZXJzaW9uIjoiMSJ9fV19";

app.post("/mcp/us-yield-hunter", (req, res) => {
  // Manually return 402 with uppercase PAYMENT-REQUIRED header
  res.writeHead(402, {
    "Content-Type": "application/json; charset=utf-8",
    "PAYMENT-REQUIRED": CHALLENGE
  });
  res.end("{}");
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    agent: "US Yield & Bottleneck Hunter", 
    agentId: "5149" 
  });
});

app.listen(PORT, () => {
  console.log("🔬 US Yield & Bottleneck Hunter - x402 MCP Server");
  console.log(`   Port: ${PORT}`);
  console.log(`   Endpoint: POST /mcp/us-yield-hunter`);
});
