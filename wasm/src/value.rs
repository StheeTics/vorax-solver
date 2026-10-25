// The board value (src/strategy/value.ts): a board's predicted final score counted up to 840,000, the weighted sum of its
// features with the round's weights. Summed in the JavaScript's order, so both give the same number to the last bit.
// The weights are loaded at start (boardValue.json), so a newly trained board value needs no rebuild.
use crate::engine::*;

const TARGET: f64 = 840_000.0;
const FEATURE_CAP: f64 = 950_000.0;
pub const FEATURES: usize = 656;
pub const ROUNDS: usize = 13;
/** where the instruments' blocks start, and each block's length */
const HEAD: usize = 31;
const BLOCK: usize = 13;
const INSTRUMENTS: usize = 25;

pub struct Model { pub rounds: Vec<Vec<f64>> }

fn pair_at(i: usize, j: usize) -> usize { HEAD + INSTRUMENTS * BLOCK + i * INSTRUMENTS - (i * (i + 1)) / 2 + (j - i - 1) }

pub fn board_value(m: &Model, s: &State) -> f64 {
  let ua = s.ua() as f64;
  if s.phase == Phase::GameOver { return ua.min(TARGET); }
  let w = &m.rounds[(s.round as usize).min(m.rounds.len()) - 1];
  let ms: Small<Monster, TANKS> = s.tanks.iter().flatten().copied().collect();
  let share = |ok: &dyn Fn(&Monster) -> bool| ms.iter().filter(|m| ok(m)).count() as f64 / 6.0;
  let log_score = ua.ln_1p() / 14.0;
  let paired = [
    share(&|m| m.arch == PEST), share(&|m| m.arch == AEMBERON), share(&|m| m.arch == BONE), share(&|m| m.arch == AGITO),
    share(&|m| m.rarity == NORMAL), share(&|m| m.rarity == MAGIC), share(&|m| m.rarity == RARE), share(&|m| m.rarity == BOSS),
    share(&|m| m.act > 150 && m.qty > 150), share(&|m| m.qty > 275), share(&|m| m.act > 255),
  ];
  let max0 = |f: &dyn Fn(&Monster) -> f64| ms.iter().fold(0.0f64, |a, m| a.max(f(m)));
  let head = [
    1.0, log_score, ua / 1e6, ua.min(FEATURE_CAP) / 1e6, ua.sqrt() / 1000.0, if ua >= FEATURE_CAP { 1.0 } else { 0.0 },
    ms.iter().fold(0.0, |t, m| t + m.act as f64) / 1000.0, ms.iter().fold(0.0, |t, m| t + m.qty as f64) / 3000.0,
    max0(&|m| m.act as f64) / 1000.0, max0(&|m| m.qty as f64) / 3000.0,
    max0(&|m| (m.act * m.qty) as f64) / 3e5, ms.len() as f64 / 6.0,
    paired[0], paired[1], paired[2], paired[3], paired[4], paired[5], paired[6], paired[7], paired[8], paired[9], paired[10],
    s.potion_refreshes as f64 / 3.0, s.instrument_refreshes as f64 / 2.0, s.instruments.len() as f64 / 3.0, s.pending as f64,
    if s.t8000 { 1.0 } else { 0.0 }, if s.t28000 { 1.0 } else { 0.0 },
    if s.phase == Phase::InstrumentSelect { 1.0 } else { 0.0 }, if s.phase == Phase::RoundEnd { 1.0 } else { 0.0 },
  ];
  let mut v = 0.0;
  for i in 0..head.len().min(w.len()) { v += w[i] * head[i]; }
  // owned instruments by their place in the list (id 1 is first), each once, in order
  let mut owned: Small<usize, 3> = Small::new();
  for &(id, _) in s.instruments.iter() {
    let i = id as usize - 1;
    if !owned.contains(&i) { owned.push(i); }
  }
  owned.sort();
  for &i in owned.iter() {
    let o = HEAD + i * BLOCK;
    if o >= w.len() { continue; }
    v += w[o];
    for k in 0..paired.len() { v += w[o + 1 + k] * paired[k]; }
    v += w[o + 1 + paired.len()] * log_score;
  }
  for a in 0..owned.len() {
    for b in a + 1..owned.len() {
      let at = pair_at(owned[a], owned[b]);
      if at < w.len() { v += w[at]; }
    }
  }
  (v * 1e6).min(TARGET).max(0.0)
}
