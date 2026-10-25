// The advice's futures (src/strategy/bot.ts): each round the move whose fresh outcomes leave the best board (by the board
// value: the smarter player; without one, by the score now: greedy), instruments by the board they leave, a hand
// refreshed while nothing in it beats the board. Seeded as the JavaScript seeds them, so both play the same futures.
use crate::engine::*;
use crate::value::{board_value, Model};

/** The player inside the futures: `samples` fresh outcomes per move, and boards judged by the board value when there's
 *  one (the smarter player), else by their score (greedy). */
#[derive(Clone, Copy)]
pub struct Player<'a> { pub samples: u32, pub model: Option<&'a Model> }
impl Player<'_> {
  fn worth(&self, s: &State) -> f64 { match self.model { Some(m) => board_value(m, s), None => s.ua() as f64 } }
}

pub const TARGET: i64 = 840_000;

pub fn mix(a: u32, b: u32) -> u32 { (a ^ b.wrapping_add(0x9e3779b9)).wrapping_mul(0x85ebca6b) ^ (a >> 13) }

pub fn play(s: &State, actions: &[Action]) -> State {
  let mut x = *s;
  for &a in actions { dispatch(&mut x, a); }
  x
}

fn reseed(s: &State, seed: u32) -> State {
  let mut x = *s;
  x.rng = seed;
  x
}

/** every way to play the hand: select, its targets, confirm */
pub fn options(s: &State) -> Vec<Opt> {
  let mut out = Vec::with_capacity(24);
  for i in 0..s.hand.len() {
    let sel = play(s, &[Action::Select(i)]);
    let mode = needs_targets(&sel);
    let tanks: Idx = (0..TANKS).filter(|&k| sel.tanks[k].is_some()).collect();
    match mode {
      None => out.push(Small::from(&[Action::Select(i), Action::Confirm])),
      Some(m) => {
        for &t in &tanks { out.push(Small::from(&[Action::Select(i), Action::Toggle(t), Action::Confirm])); }
        if m == T::OneOrTwo {
          for &a in &tanks { for &b in &tanks { if a < b { out.push(Small::from(&[Action::Select(i), Action::Toggle(a), Action::Toggle(b), Action::Confirm])); } } }
        }
      }
    }
  }
  out
}

/** a state's worth after an open box is played the best way */
fn settle(s: &State, p: Player, seed: u32, depth: u32) -> f64 {
  if s.phase == Phase::PotionSelect && s.open_box.is_some() && depth < 2 {
    let mut best = -1.0f64;
    for o in options(s) { best = best.max(expected(s, &o, p, seed, depth + 1)); }
    return best;
  }
  p.worth(s)
}

fn expected(s: &State, o: &[Action], p: Player, seed: u32, depth: u32) -> f64 {
  let n = if depth == 0 { p.samples } else { 2.max(p.samples >> 2) };
  let mut sum = 0.0;
  for k in 0..n {
    let sk = mix(seed, k + 1 + depth * 101);
    sum += settle(&play(&reseed(s, sk), o), p, sk, depth);
  }
  sum / n as f64
}

/** the best move by this round's outcome, its value, and what it must beat to be played rather than refreshed */
fn choose(s: &State, p: Player, seed: u32) -> (Opt, f64, f64) {
  let mut best = Opt::new();
  let mut bv = f64::NEG_INFINITY;
  for o in options(s) {
    let v = expected(s, &o, p, seed, 0);
    if v > bv { bv = v; best = o; }
  }
  (best, bv, p.worth(s))
}

/** an instrument offer: the card whose board is worth most, or a refresh when none beats the board */
fn pick_instrument(s: &State, p: Player) -> Option<usize> {
  let mut best: Option<usize> = None;
  let mut bv = f64::NEG_INFINITY;
  for i in 0..s.hand.len() {
    let v = p.worth(&play(s, &[Action::Select(i), Action::Confirm]));
    if v > bv { bv = v; best = Some(i); }
  }
  if can_refresh(s) && bv < p.worth(s) { None } else { Some(best.unwrap_or(usize::MAX)) }
}

/** plays the run on to its end */
pub fn finish(mut s: State, seed: u32, p: Player) -> State {
  let mut g = 0u32;
  while g < 300 && s.phase != Phase::GameOver {
    match s.phase {
      Phase::RoundEnd => dispatch(&mut s, Action::Confirm),
      Phase::InstrumentSelect => match pick_instrument(&s, p) {
        None => dispatch(&mut s, Action::Refresh),
        Some(i) => { dispatch(&mut s, Action::Select(i)); dispatch(&mut s, Action::Confirm); }
      },
      _ => {
        let (best, value, stay) = choose(&s, p, mix(seed, g));
        if s.open_box.is_none() && value <= stay && can_refresh(&s) { dispatch(&mut s, Action::Refresh); } else { for a in best { dispatch(&mut s, a); } }
      }
    }
    g += 1;
  }
  s
}

#[derive(Clone, Copy, Default)]
pub struct Tally { pub goal: f64, pub reached: u32, pub n: u32 }

/** futures `from` to `to` of each potion option */
pub fn potion_futures(s: &State, seed: u32, p: Player, opts: &[Vec<Action>], from: u32, to: u32) -> Vec<Tally> {
  opts.iter().map(|o| {
    let mut t = Tally::default();
    for k in from..to {
      let sk = mix(seed, 9000 + k);
      let ua = finish(play(&reseed(s, sk), o), sk, p).ua();
      t.goal += ua.min(TARGET) as f64;
      if ua >= TARGET { t.reached += 1; }
      t.n += 1;
    }
    t
  }).collect()
}

/** futures `from` to `to` of each instrument choice (None: a refresh) */
pub fn instrument_futures(s: &State, seed: u32, p: Player, choices: &[Option<usize>], from: u32, to: u32) -> Vec<Tally> {
  choices.iter().map(|c| {
    let mut t = Tally::default();
    for k in from..to {
      let sk = mix(seed, 7000 + k);
      let x = reseed(s, sk);
      let start = match c { None => play(&x, &[Action::Refresh]), Some(i) => play(&x, &[Action::Select(*i), Action::Confirm]) };
      let ua = finish(start, sk, p).ua();
      t.goal += ua.min(TARGET) as f64;
      if ua >= TARGET { t.reached += 1; }
      t.n += 1;
    }
    t
  }).collect()
}
