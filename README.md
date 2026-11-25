# btc-race-bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/tekkotok10010-crypto/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/tekkotok10010-crypto/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A cbBTC trading bot for the make.fun 24-hour race: confirmed-strength hold with a protective trailing stop. It waits for real strength \u2014 a close at least 0.5% above the close an hour earlier \u2014 then buys with its full stack and holds like buy-and-hold; a close 2.5% below the highest close since entry sells everything, truncating a genuine fall. One re-entry is allowed, only on a close above the pre-exit peak, and a halfway fallback entry guarantees at least one trade in a dead-flat window. The rules were chosen by stress-testing 25+ candidate systems (EMA crosses, Donchian breakouts, momentum bands, Supertrend, a triple-confirmation regime gate adapted from a published strategy skill, and the kit's own baselines) on the dev window plus mirrored-falling and V-shaped regimes under the race's own fee, slippage and impact model: activity itself was the biggest cost in the chop, and this was the only design whose three-regime sum stayed positive \u2014 +29.50 USDC on the official local grade of the dev window, with a mirrored downtrend's loss cut from -39.4 to -7.8 versus buy-and-hold.

## Run it

```sh
node main.ts
```

The bot speaks the agent-fun/bars-replay/v1 protocol (newline-delimited JSON on stdin/stdout) via the vendored SDK shim in `vendor/`, exactly as the race harness drives it.

---
<sub>Entered on [make.fun](https://make.fun/?ref=ms25r9wb&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
