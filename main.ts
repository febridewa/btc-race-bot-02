// Dip-bounce scalper for make.fun btc-race-24h-20261118-1444.
// Trades CBBTC/USDC on 1-minute on-chain bars, long only, $1,000 paper money.
//
// What the published 24h dev window actually does (1,440 bars, BTC $65,083 ->
// $63,261, buy-and-hold -$28): the pool price tracks BTC with microstructure
// noise, and sharp drops bounce. After a fall of 1.2% or more over 30 or 120
// minutes, the price recovers on average: forward 2h/4h returns after such
// drops are positive on both this window and the previous day's dev window
// (2026-11-17, BTC flat), while trend-following loses on both — slow EMA
// crosses lost $68-148, RSI $72-89, breakouts $8-80. So this bot does one
// thing: it buys a sharp dip in full and sells the whole position when the
// close has bounced 1.0% above the close of the bar that triggered the buy.
// It never uses a stop-loss or a trailing stop: both were measured to hurt,
// because they sell into the dip before the bounce arrives. It takes no new
// position in the last 4 hours of the window, so a late buy cannot be caught
// by the forced flatten before its bounce has time to arrive.
//
// Measured on the published dev window (kit grade-local, process driver):
// net PnL about +$16, 4 fills, max drawdown about 0.8%. The same rules on
// the previous day's dev window make about +$6, and every nearby parameter
// choice (drop 1.0-1.5%, take-profit 0.8-1.2%) stays positive on both
// windows, so the numbers below sit in the middle of a plateau, not on a
// peak. A 6-hour-block bootstrap over both windows gives a median near +$9
// and a 75% chance of finishing above zero.
//
// Deterministic: pure float64 arithmetic on the bars the harness sends, no
// clock, no environment, no randomness, no network. Two runs on the same
// data decide the same orders.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** A fall of this much over a lookback window triggers a buy (1.2%). */
const DROP_FRACTION = 0.012;
/** Lookback windows, in bars, whose fall is checked (30 and 120 minutes). */
const LOOKBACKS = [30, 120];
/** Sell the whole position when the close is this far above the entry bar's close (1.0%). */
const TAKE_PROFIT_FRACTION = 0.01;
/** No new buy once this many scored bars have passed (last 4 hours of 1,440). */
const NO_NEW_BUYS_AFTER = 1200;
/** Slippage cap on every order, in bps (1-minute moves are far smaller). */
const MAX_SLIPPAGE_BPS = 1000;

/** Closes in USDC, oldest first, capped at the longest lookback + 1. */
const closes: number[] = [];
/** Close of the bar on which the open position's buy was decided. */
let entryClose = 0;
/** Close recorded for a buy that is in flight, until its fill confirms it. */
let pendingEntryClose = 0;
/** Client id of a buy sent on the previous batch but not yet confirmed. */
let pendingBuyId: string | null = null;
/** Counter for deterministic client ids. */
let orderNo = 0;

/** The simple return of the latest close against the close `bars` bars back, or null. */
function returnOver(bars: number): number | null {
  const n = closes.length;
  if (n <= bars) return null;
  const now = closes[n - 1];
  const then = closes[n - 1 - bars];
  if (then <= 0) return null;
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const scale = state.symbols.get(SYMBOL)?.price_scale ?? 5;
    const close = Number(BigInt(bar.c)) / 10 ** scale;

    // Resolve a buy that is in flight: a fill confirms it, a rejection frees us to retry.
    if (pendingBuyId !== null) {
      for (const fill of batch.fills) {
        if (fill.client_id !== pendingBuyId) continue;
        if (fill.status === 'filled') entryClose = pendingEntryClose;
        pendingBuyId = null;
        pendingEntryClose = 0;
      }
    }

    closes.push(close);
    if (closes.length > LOOKBACKS[LOOKBACKS.length - 1] + 1) closes.shift();

    const held = state.positions.get(SYMBOL)?.qty ?? 0n;
    if (held > 0n) {
      if (entryClose > 0 && close >= entryClose * (1 + TAKE_PROFIT_FRACTION)) {
        orderNo += 1;
        return [{ side: 'sell', client_id: `o${orderNo}`, symbol: SYMBOL, qty: held, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat and nothing in flight: look for a sharp dip to buy.
    if (pendingBuyId !== null || state.warmingUp) return [];
    const scored = state.seq - state.warmupBars;
    if (scored >= NO_NEW_BUYS_AFTER) return [];
    let dipped = false;
    for (const lb of LOOKBACKS) {
      const r = returnOver(lb);
      if (r !== null && r <= -DROP_FRACTION) {
        dipped = true;
        break;
      }
    }
    if (!dipped || state.cash <= 0n) return [];
    orderNo += 1;
    pendingBuyId = `o${orderNo}`;
    pendingEntryClose = close;
    return [{ side: 'buy', client_id: pendingBuyId, symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
