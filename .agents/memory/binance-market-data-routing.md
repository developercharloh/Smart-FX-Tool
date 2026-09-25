---
name: Binance public market-data routing
description: Environment-specific Binance Spot and USDⓈ-M public API access constraints.
---

Use Binance's official `data-api.binance.vision` host for public Spot market-data calls. Standard Spot hosts and the USDⓈ-M Futures host returned Binance's HTTP 451 restricted-location response from this development environment, while the official Spot data-only host returned live exchange metadata, tickers, candles, and order-book depth.

**Why:** This environment's outbound network is restricted for Binance's standard and futures endpoints, but Binance's documented Spot market-data-only endpoint remains reachable.

**How to apply:** Keep Spot and Futures routing separate. Show Binance's Futures restriction as an explicit feed error; do not route through an unapproved third party or substitute simulated values.