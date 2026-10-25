// The advice's futures as WebAssembly: the page writes a board and its options into BUF, calls potion_futures or
// instrument_futures, and reads each option's totals back (goal, reached, n). Layout in src/strategy/wasmFutures.ts.
pub mod bot;
pub mod data;
pub mod engine;

use bot::*;
use engine::*;

const SIZE: usize = 8192;
static mut BUF: [f64; SIZE] = [0.0; SIZE];
/** where the options start, and where the totals go */
const OPTS: usize = 64;
const OUT: usize = 4096;

#[no_mangle]
pub extern "C" fn buf() -> *mut f64 { core::ptr::addr_of_mut!(BUF) as *mut f64 }

fn read_state(b: &[f64]) -> State {
  let mut tanks = [None; TANKS];
  for i in 0..TANKS {
    let o = i * 5;
    if b[o] != 0.0 { tanks[i] = Some(Monster { arch: b[o + 1] as u8, rarity: b[o + 2] as u8, act: b[o + 3] as i64, qty: b[o + 4] as i64 }); }
  }
  let instruments = Small::from(&(0..b[30] as usize).map(|i| (b[31 + i * 2] as u8, b[32 + i * 2] as u32)).collect::<Vec<_>>());
  let phase = [Phase::InstrumentSelect, Phase::PotionSelect, Phase::RoundEnd, Phase::GameOver][b[38] as usize];
  let hand = Small::from(&(0..b[39] as usize).map(|i| if b[40 + i * 2] == 0.0 { Card::Potion(b[41 + i * 2] as u8) } else { Card::Instrument(b[41 + i * 2] as u8) }).collect::<Vec<_>>());
  State {
    tanks,
    instruments,
    round: b[37] as u32,
    phase,
    hand,
    open_box: if b[50] < 0.0 { None } else { Some(b[50] as u8) },
    selected: if b[51] < 0.0 { None } else { Some(b[51] as usize) },
    targets: Small::from(&(0..b[52] as usize).map(|i| b[53 + i] as usize).collect::<Vec<_>>()),
    potion_refreshes: b[55] as i32,
    instrument_refreshes: b[56] as i32,
    t8000: b[57] != 0.0,
    t28000: b[58] != 0.0,
    pending: b[59] as u32,
    rng: b[60] as u32,
  }
}

fn write_tallies(b: &mut [f64], ts: &[Tally]) {
  for (i, t) in ts.iter().enumerate() {
    b[OUT + i * 3] = t.goal;
    b[OUT + i * 3 + 1] = t.reached as f64;
    b[OUT + i * 3 + 2] = t.n as f64;
  }
}

#[allow(static_mut_refs)]
fn the_buf() -> &'static mut [f64; SIZE] { unsafe { &mut BUF } }

/** options at OPTS: their count, then each one's length and (kind, argument) per action */
#[no_mangle]
pub extern "C" fn potion_futures(seed: u32, samples: u32, from: u32, to: u32) -> u32 {
  let b = the_buf();
  let s = read_state(&b[..]);
  let n = b[OPTS] as usize;
  let mut at = OPTS + 1;
  let mut opts = Vec::with_capacity(n);
  for _ in 0..n {
    let len = b[at] as usize;
    at += 1;
    let mut o = Vec::with_capacity(len);
    for _ in 0..len {
      let arg = b[at + 1] as usize;
      o.push(match b[at] as u32 { 0 => Action::Select(arg), 1 => Action::Toggle(arg), 2 => Action::Confirm, _ => Action::Refresh });
      at += 2;
    }
    opts.push(o);
  }
  let ts = potion_futures_of(&s, seed, samples, &opts, from, to);
  write_tallies(b, &ts);
  n as u32
}
fn potion_futures_of(s: &State, seed: u32, samples: u32, opts: &[Vec<Action>], from: u32, to: u32) -> Vec<Tally> { bot::potion_futures(s, seed, samples, opts, from, to) }

/** choices at OPTS: their count, then each one's hand index, or -1 for a refresh */
#[no_mangle]
pub extern "C" fn instrument_futures(seed: u32, samples: u32, from: u32, to: u32) -> u32 {
  let b = the_buf();
  let s = read_state(&b[..]);
  let n = b[OPTS] as usize;
  let choices: Vec<Option<usize>> = (0..n).map(|i| { let c = b[OPTS + 1 + i]; if c < 0.0 { None } else { Some(c as usize) } }).collect();
  let ts = bot::instrument_futures(&s, seed, samples, &choices, from, to);
  write_tallies(b, &ts);
  n as u32
}
