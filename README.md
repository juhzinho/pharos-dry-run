# Pharos Dry Run

A separate page from Pharos Desk. It simulates a Pacific transaction in a 3D scene before anything is signed.

Read-only. Chain MCP `eth_call` and `estimate_gas`. The server never broadcasts.

| Sample | What moves on screen |
|---|---|
| pass | Rings stay open. Balances step forward. An unsigned transaction appears |
| revert | The scene shakes and turns red. Balances stay put. No transaction is prepared |
| gas | An amber shutter closes. The contract call would pass, but the sender cannot pay the fee |

```bash
npm install
npm test
npm run dry-run -- --sample pass
npm run web
```

Live: https://pharos-dry-run.vercel.app

Local: `http://localhost:3010`
