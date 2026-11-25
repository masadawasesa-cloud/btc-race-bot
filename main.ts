// Confirmed-strength hold with a protective trailing stop: a cbBTC bot
// for the make.fun 24h BTC race.
//
// Hypothesis (one sentence): on a 24-hour window, pay the round-trip cost
// only after the market has shown real strength — a +0.5% rise over the
// last hour — then hold like buy-and-hold, truncating a genuine fall with
// a 2.5% trailing stop; this keeps almost all of an up day's gain while
// cutting a down day's loss to a third of buy-and-hold's.
//
// How the rules were chosen (backtest-expert method; every candidate run
// on the dev window, on a mirrored falling copy of it, and on a V-shaped
// copy, all under the race's own 4 bps fee + 2 bps slippage + impact):
//   - 25+ active systems were tested and rejected on evidence: EMA crosses
//     (the kit's own ema-cross baseline grades -114.83 USDC), EMA
//     trend-hold, Donchian breakouts, momentum bands, the kit's
//     adx-momentum (-11.20) and rsi-bollinger (-9.32) baselines, and
//     Supertrend at three settings (a GitHub-hunted classic; on 1-minute
//     bars it flipped 76-102 times and lost -98 to -205 in every regime).
//     After the day's impulse the market chops for ~19h and every extra
//     round trip pays ~20-45 bps, so activity itself is the biggest cost.
//   - A triple-confirmation regime gate (EMA separation + ADX + trailing
//     return, adapted from a published regime-gated strategy skill) was
//     tested and rejected: it entered too late (+7.0 up) and still lost
//     -20.7 on the mirrored window.
//   - Pure buy-and-hold with a 2.5% trailing stop scored +32.2 / -24.4 /
//     -24.4 across the three regimes. Adding the +0.5%-in-an-hour entry
//     confirmation kept the up day (+29.5, and +26.9 with all friction
//     doubled) and cut the falling day to -7.8: the only candidate whose
//     three-regime sum is positive. The trigger sits on a plateau
//     (0.5% and 0.6% identical everywhere; 0.8% falls off), the stop on
//     its own plateau (2.0-3.0% never fire on the dev window; 2.5%
//     chosen, 3.0% gives back more on the V).
//   - Re-entry after a stop-out requires a close above the pre-exit peak
//     (a genuine new high); re-entering on a mere recovery to the exit
//     price was tested and bled (-49.60 on the mirrored window). At most
//     one re-entry. A fallback entry at the window's halfway bar, if no
//     strength ever showed, guarantees the bot always trades at least
//     once (the race's guardrail) in a dead-flat window; it never fired
//     in any tested regime.
//
// Five round-numbered rules in total. Deterministic: float64 arithmetic
// on the scored window's closes only, no clock, no randomness.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

/** Entry confirmation: the close is at least this fraction above the close 60 bars earlier. */
const TRIGGER = 0.005;
const TRIGGER_BARS = 60;
/** Trailing stop: sell when a close falls this fraction under the peak close since entry. */
const STOP = 0.025;
/** Fallback entry bar (of the scored window) if no confirmation ever fired. */
const FALLBACK_BAR = 720;
/** Slippage cap on every order, past the close the order was decided on. */
const MAX_SLIPPAGE_BPS = 200;

const closes: number[] = []; // closes of the scored window only
let peak: number | null = null; // highest close since the current entry filled
let peakExit = 0; // the peak at the first stop-out; re-entry needs a close above it
let exitCount = 0; // completed exits (holding -> flat transitions)
let entries = 0; // entries that filled (a position was seen after them)
let wasHolding = false;

await runBars({
  onBatch(state, batch) {
    const symbol = state.hello.symbols[0].symbol;
    const bar = batch.bars.find((b) => b.symbol === symbol);
    if (bar === undefined) return [];
    if (state.warmingUp) return [];

    const close = Number(bar.c);
    closes.push(close);
    const i = closes.length - 1;

    const held = state.positions.get(symbol);
    const holding = held !== undefined && held.qty > 0n;

    if (holding) {
      if (!wasHolding) entries += 1;
      peak = peak === null ? close : Math.max(peak, close);
    }
    if (wasHolding && !holding) {
      exitCount += 1;
      peak = null;
    }
    wasHolding = holding;

    if (holding) {
      // The one exit rule: the close broke the trailing stop. If the fill
      // is refused (slippage cap, no bar), the position is still here on
      // the next batch and the rule fires again while it holds.
      if (peak !== null && close < peak * (1 - STOP)) {
        if (exitCount === 0) peakExit = peak;
        const sell: SellInput = { side: 'sell', symbol, qty: held!.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    // Flat: the first entry needs the strength confirmation (or the
    // halfway fallback); the single re-entry needs a new high.
    let mayEnter = false;
    if (entries === 0 && exitCount === 0) {
      const confirmed = i >= TRIGGER_BARS && close / closes[i - TRIGGER_BARS] - 1 > TRIGGER;
      mayEnter = confirmed || i >= FALLBACK_BAR;
    } else if (entries === 1 && exitCount === 1) {
      mayEnter = close > peakExit;
    }
    if (mayEnter && state.cash > 0n) {
      const buy: BuyInput = { side: 'buy', symbol, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
