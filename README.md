# btc-race-bot-02

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/febridewa/btc-race-bot-02/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/febridewa/btc-race-bot-02/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-bounce scalper that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain bars with $1,000 of paper money, entered in make.fun's "Race a BTC trading bot live for 24 hours" bounty ($250 in USDC). It buys in full when cbBTC has fallen 1.2% or more over 30 or 120 minutes, and sells the whole position when the close has bounced 1.0% above the entry bar's close. No stop-loss, no trailing stop, no new entries in the last 4 hours of the window. Validated on the published dev window (net PnL about +$16, max drawdown about 0.8%) and on the previous day's dev window (about +$6), with every nearby parameter choice staying positive on both.

## Run it

```sh
node cli/makefun.mjs grade-local --kit <path-to-kit> --bot . --driver process
```

The bot is `main.ts` (Node 22, standard library only plus the vendored `vendor/makefun-bars.ts` shim). It speaks the `agent-fun/bars-replay/v1` protocol on stdin/stdout and is fully deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=6etrfz79&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
