// The game engine of src/engine and src/data, for the advice's futures: the same rules rolling the same dice in the
// same order (mulberry32, every call where the JavaScript makes it), so a future here ends exactly as it does there.
// No log and no sandbox: futures never read them.
use crate::data::*;

pub const TANKS: usize = 6;
pub const LAST_ROUND: u32 = 13;
pub const LAST_POTION_ROUND: u32 = 10;
pub const MAX_INSTRUMENTS: usize = 3;

/** Archetypes: pest, aemberon, boneSentry, agito. Rarities: normal, magic, rare, boss. */
pub const PEST: u8 = 0;
pub const AEMBERON: u8 = 1;
pub const BONE: u8 = 2;
pub const AGITO: u8 = 3;
pub const NORMAL: u8 = 0;
pub const MAGIC: u8 = 1;
pub const RARE: u8 = 2;
pub const BOSS: u8 = 3;
const BASE: [(i64, i64); 4] = [(1, 36), (5, 24), (15, 12), (300, 1)];
const AWAKEN_BONUS: [i64; 4] = [0, 60, 120, 120];
const MAX_CHAIN_DEPTH: u32 = 8;

/** The deal's odds: the generated ones (data.rs) until the page hands over the current ones (set_odds), as the
 *  nightly loop updates them without a rebuild. Potions and instruments by id. */
pub struct Odds { pub supreme: f64, pub spawn: [f64; 4], pub potion: [f64; POTIONS], pub boxed: [f64; POTIONS], pub basic: [f64; INSTRUMENTS], pub advanced: [f64; INSTRUMENTS], pub red: [f64; POTIONS] }
pub static mut ODDS: Odds = Odds { supreme: SUPREME_CHANCE, spawn: SPAWN, potion: POTION_OFFER, boxed: BOX_OFFER, basic: BASIC_OFFER, advanced: ADVANCED_OFFER, red: SUPREME_OFFER };
#[allow(static_mut_refs)]
pub fn odds() -> &'static Odds { unsafe { &ODDS } }

#[derive(Clone, Copy, PartialEq)]
pub enum T { Auto, One, OneOrTwo, Box(usize) }
#[derive(Clone, Copy, PartialEq)]
pub enum Ev { Add, Remove, Mutate, Awaken, Fuse, Devour, AddOverflow }
#[derive(Clone, Copy)]
pub enum Timing { End, Every(u32), On(&'static [Ev]) }

#[derive(Clone, Copy, PartialEq, Default)]
pub struct Monster { pub arch: u8, pub rarity: u8, pub act: i64, pub qty: i64 }
impl Monster {
  pub fn total(&self) -> i64 { self.act * self.qty }
}
fn create(a: u8, r: u8, act: i64, qty: i64) -> Monster { Monster { arch: a, rarity: r, act: BASE[r as usize].0 + act, qty: BASE[r as usize].1 + qty } }
fn rare_or_boss(r: u8) -> bool { r == RARE || r == BOSS }
fn next_rarity(r: u8) -> u8 { (r + 1).min(BOSS) }

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Phase { InstrumentSelect, PotionSelect, RoundEnd, GameOver }
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Card { Potion(u8), Instrument(u8) }
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Action { Select(usize), Toggle(usize), Confirm, Refresh }

/** A list of at most N, kept in place: states are copied for every move tried, so nothing in them is on the heap. */
#[derive(Clone, Copy)]
pub struct Small<X: Copy + Default, const N: usize> { len: u8, items: [X; N] }
impl<X: Copy + Default, const N: usize> Small<X, N> {
  pub fn new() -> Self { Small { len: 0, items: [X::default(); N] } }
  pub fn from(xs: &[X]) -> Self { let mut s = Self::new(); for &x in xs { s.push(x); } s }
  pub fn push(&mut self, x: X) { self.items[self.len as usize] = x; self.len += 1; }
  pub fn clear(&mut self) { self.len = 0; }
  pub fn remove(&mut self, i: usize) { let n = self.len as usize; self.items.copy_within(i + 1..n, i); self.len -= 1; }
}
impl<X: Copy + Default, const N: usize> core::ops::Deref for Small<X, N> { type Target = [X]; fn deref(&self) -> &[X] { &self.items[..self.len as usize] } }
impl<X: Copy + Default, const N: usize> core::ops::DerefMut for Small<X, N> { fn deref_mut(&mut self) -> &mut [X] { &mut self.items[..self.len as usize] } }
impl<X: Copy + Default, const N: usize> FromIterator<X> for Small<X, N> {
  fn from_iter<I: IntoIterator<Item = X>>(it: I) -> Self { let mut s = Self::new(); for x in it { s.push(x); } s }
}
impl<X: Copy + Default, const N: usize> IntoIterator for Small<X, N> {
  type Item = X;
  type IntoIter = core::iter::Take<core::array::IntoIter<X, N>>;
  fn into_iter(self) -> Self::IntoIter { let n = self.len as usize; self.items.into_iter().take(n) }
}
impl<'a, X: Copy + Default, const N: usize> IntoIterator for &'a Small<X, N> {
  type Item = &'a X;
  type IntoIter = core::slice::Iter<'a, X>;
  fn into_iter(self) -> Self::IntoIter { self.items[..self.len as usize].iter() }
}
/** tank indexes */
pub type Idx = Small<usize, TANKS>;
impl Default for Action { fn default() -> Self { Action::Confirm } }
/** one way to play a card: select, targets, confirm */
pub type Opt = Small<Action, 4>;
impl Default for Card { fn default() -> Self { Card::Potion(0) } }
pub type Hand = Small<Card, 5>;

#[derive(Clone, Copy)]
pub struct State {
  pub tanks: [Option<Monster>; TANKS],
  /** (id, round acquired), in the order taken */
  pub instruments: Small<(u8, u32), 3>,
  pub round: u32,
  pub phase: Phase,
  pub hand: Hand,
  pub open_box: Option<u8>,
  pub selected: Option<usize>,
  pub targets: Small<usize, 2>,
  pub potion_refreshes: i32,
  pub instrument_refreshes: i32,
  pub t8000: bool,
  pub t28000: bool,
  pub pending: u32,
  pub rng: u32,
}

impl State {
  pub fn ua(&self) -> i64 { self.tanks.iter().map(|t| t.map_or(0, |m| m.total())).sum() }
}

// ---------- dice (src/engine/rng.ts) ----------

pub struct Rng { pub s: u32 }
impl Rng {
  pub fn next(&mut self) -> f64 {
    self.s = self.s.wrapping_add(0x6d2b79f5);
    let mut t = self.s;
    t = (t ^ (t >> 15)).wrapping_mul(t | 1);
    t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
    ((t ^ (t >> 14)) as f64) / 4294967296.0
  }
  pub fn int(&mut self, n: usize) -> usize { (self.next() * n as f64).floor() as usize }
  pub fn chance(&mut self, p: f64) -> bool { self.next() < p }
  pub fn pick<X: Copy>(&mut self, a: &[X]) -> Option<X> { if a.is_empty() { None } else { Some(a[self.int(a.len())]) } }
  /** forward Fisher–Yates over a copy; sample takes the first n, after shuffling the whole list as the JavaScript does */
  pub fn sample<X: Copy + Default>(&mut self, a: &[X], n: usize) -> Small<X, 24> {
    let mut v: Small<X, 24> = Small::from(a);
    let len = v.len();
    if len > 1 {
      for i in 0..len - 1 {
        let j = i + self.int(len - i);
        v.swap(i, j);
      }
    }
    v.len = n.min(len) as u8;
    v
  }
  /** weighted pick: the JavaScript's sum in order, then the walk */
  pub fn weighted<X: Copy>(&mut self, a: &[X], w: impl Fn(X) -> f64) -> X {
    let total = a.iter().fold(0.0, |s, &x| s + w(x).max(0.0));
    let mut r = self.next() * total;
    for &x in a {
      r -= w(x).max(0.0);
      if r < 0.0 { return x; }
    }
    a[a.len() - 1]
  }
  pub fn rarity(&mut self) -> u8 {
    let spawn = &odds().spawn;
    let total = spawn.iter().fold(0.0, |s, w| s + w);
    let roll = self.next() * total;
    let mut acc = 0.0;
    for r in 0..4 {
      acc += spawn[r];
      if roll < acc { return r as u8; }
    }
    BOSS
  }
  pub fn arch(&mut self) -> u8 { self.int(4) as u8 }
}

// ---------- the board's operations and the instruments' reactions (src/engine/context.ts) ----------

#[derive(Clone, Copy)]
enum Event { Add { tank: usize }, Remove { arch: u8 }, Mutate { to: u8 }, Awaken, Fuse, Devour, AddOverflow }
impl Event {
  fn kind(&self) -> Ev {
    match self { Event::Add { .. } => Ev::Add, Event::Remove { .. } => Ev::Remove, Event::Mutate { .. } => Ev::Mutate, Event::Awaken => Ev::Awaken, Event::Fuse => Ev::Fuse, Event::Devour => Ev::Devour, Event::AddOverflow => Ev::AddOverflow }
  }
}

/** A target: a fixed archetype or rarity, or one rolled. */
#[derive(Clone, Copy)]
pub enum Pick { Is(u8), Random }

pub struct Ctx<'a> {
  pub t: &'a mut [Option<Monster>; TANKS],
  pub rng: &'a mut Rng,
  /** reactive instruments in id order */
  reacting: Small<u8, 3>,
  depth: u32,
}

impl<'a> Ctx<'a> {
  fn new(t: &'a mut [Option<Monster>; TANKS], rng: &'a mut Rng, instruments: &[(u8, u32)]) -> Self {
    let mut ids: Small<u8, 3> = instruments.iter().map(|i| i.0).filter(|&id| matches!(TIMING[id as usize], Timing::On(_))).collect();
    ids.sort();
    Ctx { t, rng, reacting: ids, depth: 0 }
  }

  fn emit(&mut self, e: Event) {
    let d = self.depth;
    if d >= MAX_CHAIN_DEPTH { return; }
    let ids = self.reacting;
    for id in ids {
      let Timing::On(on) = TIMING[id as usize] else { continue };
      if !on.contains(&e.kind()) { continue; }
      self.depth = d + 1;
      self.react(id, e);
    }
    self.depth = d;
  }

  pub fn non_empty(&self) -> Idx { (0..TANKS).filter(|&i| self.t[i].is_some()).collect() }
  pub fn by_arch(&self, a: u8) -> Idx { (0..TANKS).filter(|&i| self.t[i].map_or(false, |m| m.arch == a)).collect() }
  pub fn by_rarity(&self, r: u8) -> Idx { (0..TANKS).filter(|&i| self.t[i].map_or(false, |m| m.rarity == r)).collect() }
  fn total(&self, i: usize) -> i64 { self.t[i].map_or(0, |m| m.total()) }
  /** by total, ties to the leftmost; -1 when empty */
  pub fn highest(&self) -> i32 { self.best_by(|a, b| a > b) }
  pub fn lowest(&self) -> i32 { self.best_by(|a, b| a < b) }
  fn best_by(&self, better: impl Fn(i64, i64) -> bool) -> i32 {
    let idx = self.non_empty();
    if idx.is_empty() { return -1; }
    let mut best = idx[0];
    for &i in &idx { if better(self.total(i), self.total(best)) { best = i; } }
    best as i32
  }
  pub fn neighbor(&self, tank: usize, dir: i32) -> i32 {
    let mut i = tank as i32 + dir;
    while i >= 0 && (i as usize) < TANKS {
      if self.t[i as usize].is_some() { return i; }
      i += dir;
    }
    -1
  }

  /** the tank, or -1 when every tank is full */
  pub fn add(&mut self, a: u8, r: u8, act: i64, qty: i64) -> i32 {
    let Some(i) = self.t.iter().position(|t| t.is_none()) else {
      self.emit(Event::AddOverflow);
      return -1;
    };
    self.t[i] = Some(create(a, r, act, qty));
    self.emit(Event::Add { tank: i });
    i as i32
  }
  pub fn remove(&mut self, tank: i32) -> Option<Monster> {
    if tank < 0 { return None; }
    let m = self.t[tank as usize]?;
    self.t[tank as usize] = None;
    self.emit(Event::Remove { arch: m.arch });
    Some(m)
  }
  pub fn mutate(&mut self, tank: usize, a: Pick, r: Pick) {
    if self.t[tank].is_none() { return; }
    let arch = match a { Pick::Is(x) => x, Pick::Random => self.rng.arch() };
    self.t[tank].as_mut().unwrap().arch = arch;
    let rarity = match r { Pick::Is(x) => x, Pick::Random => self.rng.rarity() };
    self.t[tank].as_mut().unwrap().rarity = rarity;
    self.emit(Event::Mutate { to: arch });
  }
  pub fn awaken(&mut self, tank: usize, to: Option<u8>, bonus: Option<i64>) {
    let Some(m) = self.t[tank].as_mut() else { return };
    let from = m.rarity;
    let named = to.unwrap_or(next_rarity(from));
    let target = if named < from { from } else { named };
    let gain = if from == BOSS { 0 } else { bonus.unwrap_or(AWAKEN_BONUS[target as usize]) };
    m.rarity = target;
    m.act += gain;
    self.emit(Event::Awaken);
  }
  pub fn fuse(&mut self, sources: &[usize], a: u8, r: u8) -> i32 {
    let (mut act, mut qty) = (0, 0);
    let mut used: Idx = Small::new();
    for &s in sources {
      let Some(m) = self.t[s] else { continue };
      act += m.act;
      qty += m.qty;
      used.push(s);
    }
    if used.is_empty() { return -1; }
    for &s in &used { self.remove(s as i32); }
    // nothing adds a monster when one is removed, so a tank is free
    let i = self.t.iter().position(|t| t.is_none()).expect("a tank to fuse into");
    self.t[i] = Some(Monster { arch: a, rarity: r, act, qty });
    self.emit(Event::Add { tank: i });
    self.emit(Event::Fuse);
    i as i32
  }
  pub fn devour(&mut self, d: usize, p: usize) {
    if d == p { return; }
    let (Some(_), Some(pm)) = (self.t[d], self.t[p]) else { return };
    let dm = self.t[d].as_mut().unwrap();
    dm.act += pm.act;
    dm.qty += pm.qty;
    self.remove(p as i32);
    self.emit(Event::Devour);
  }
  pub fn boost(&mut self, tank: i32, act: i64, qty: i64) {
    if tank < 0 { return; }
    if let Some(m) = self.t[tank as usize].as_mut() {
      m.act += act;
      m.qty += qty;
    }
  }
  fn all(&mut self, act: i64, qty: i64) { for i in self.non_empty() { self.boost(i as i32, act, qty); } }

  // ---------- instruments (src/data/instruments.ts) ----------

  fn react(&mut self, id: u8, e: Event) {
    match id {
      // Incubation Sac
      2 => { if self.by_arch(PEST).len() >= 2 { self.all(0, 45); } }
      // Adherent Metatarsals
      5 => {
        if self.by_arch(BONE).len() < 2 { return; }
        let ne = self.non_empty();
        if let Some(t) = self.rng.pick(&ne) { self.boost(t as i32, 0, 180); }
      }
      // Contracted Claws
      6 => {
        let Event::Remove { arch } = e else { return };
        if arch == BONE { return; }
        let ne = self.non_empty();
        if let Some(t) = self.rng.pick(&ne) { self.boost(t as i32, 0, 150); }
      }
      // Aberrant Sprout
      7 => { if let Event::Mutate { to } = e { if to == AEMBERON { self.all(35, 0); } } }
      // Prismatic Liver
      8 => { if self.by_arch(AEMBERON).len() >= 2 { self.all(20, 0); } }
      // Vermicular Spinal Cord
      12 => {
        let Event::Add { tank } = e else { return };
        if self.t[tank].is_none() || !self.rng.chance(0.75) { return; }
        self.mutate(tank, Pick::Is(AEMBERON), Pick::Random);
        self.boost(tank as i32, 80, 0);
      }
      // Two-Inch Skull Nail
      16 => { let t = self.lowest(); if t >= 0 { self.boost(t, 25, 25); } }
      // Eyelid Speculum
      22 => { let t = self.highest(); if t >= 0 { self.boost(t, 20, 20); } }
      _ => {}
    }
  }

  fn end_of_round(&mut self, id: u8) {
    match id {
      // Chrysalis Specimen
      1 => {
        let x = self.by_arch(PEST).len();
        for _ in 0..x {
          let ne = self.non_empty();
          for i in self.rng.sample(&ne, x) { self.boost(i as i32, 0, 8); }
        }
      }
      // Hyperplastic Frontal Lobe
      3 => {
        if self.by_arch(AGITO).len() < 2 { return; }
        let c: Idx = self.non_empty().into_iter().filter(|&i| rare_or_boss(self.t[i].unwrap().rarity)).collect();
        if let Some(t) = self.rng.pick(&c) { self.boost(t as i32, 80, 0); }
      }
      // Hypertrophic Pituitary
      4 => {
        if !self.by_arch(AGITO).iter().any(|&i| rare_or_boss(self.t[i].unwrap().rarity)) { return; }
        let ne = self.non_empty();
        if let Some(t) = self.rng.pick(&ne) { self.boost(t as i32, 80, 0); }
      }
      // Clustered Eggs
      9 => { if self.by_arch(PEST).len() >= 3 { let r = self.rng.rarity(); self.add(PEST, r, 0, 100); } }
      // Sloughed Cortex
      10 => {
        let magic = self.by_rarity(MAGIC);
        if magic.len() < 2 { return; }
        let two = self.rng.sample(&magic, 2);
        self.fuse(&two, AGITO, RARE);
      }
      // Sinew Garrote
      11 => {
        let bones = self.by_arch(BONE);
        if bones.len() < 2 { return; }
        let others: Idx = self.non_empty().into_iter().filter(|&i| self.t[i].unwrap().arch != BONE).collect();
        if others.is_empty() { return; }
        let mut victim = others[0];
        for &i in &others { if self.total(i) < self.total(victim) { victim = i; } }
        let removed = self.remove(victim as i32);
        let target = self.rng.pick(&bones);
        if let (Some(m), Some(t)) = (removed, target) { self.boost(t as i32, m.act, m.qty); }
      }
      // Rawhide Restraint
      13 => { if self.by_rarity(MAGIC).len() >= 3 { let t = self.highest(); self.boost(t, 0, 100); } }
      // Black Goat Gut Suture
      14 => {
        for r in [NORMAL, MAGIC, RARE] {
          let mut same = self.by_rarity(r);
          while same.len() >= 3 {
            let triple = [same[0], same[1], same[2]];
            let a = self.t[triple[0]].unwrap().arch;
            self.fuse(&triple, a, next_rarity(r));
            same = self.by_rarity(r);
          }
        }
      }
      // Pig Iron Bone Saw
      15 => {
        for i in self.non_empty() {
          let m = self.t[i].unwrap();
          if m.act > 150 && m.qty > 150 { self.boost(i as i32, 15, 15); }
        }
      }
      // Fouled Scraper
      17 => { for i in self.non_empty() { if self.t[i].unwrap().qty > 275 { self.boost(i as i32, 20, 0); } } }
      // Canine Teeth File
      18 => { for i in self.non_empty() { if self.t[i].unwrap().act > 255 { self.boost(i as i32, 0, 30); } } }
      // Lady of the Plague Quarter: every tier picked from before any awakens
      19 => {
        let tiers = [self.by_rarity(0), self.by_rarity(1), self.by_rarity(2), self.by_rarity(3)];
        for c in tiers { if let Some(t) = self.rng.pick(&c) { self.awaken(t, None, None); } }
      }
      // Aberrant Stinger
      20 => { for i in self.non_empty() { self.mutate(i, Pick::Random, Pick::Random); } }
      // Tanned Leather Restraint
      21 => {
        let rs: Small<u8, TANKS> = self.non_empty().iter().map(|&i| self.t[i].unwrap().rarity).collect();
        if rs.contains(&NORMAL) && rs.contains(&MAGIC) && rs.iter().any(|&r| rare_or_boss(r)) { self.all(20, 0); }
      }
      // Beak of the Twice-Born
      23 => {
        let count = self.non_empty().len();
        if (2..=5).contains(&count) {
          let a = self.rng.arch();
          let r = self.rng.rarity();
          self.add(a, r, 0, 0);
        } else if count == 6 {
          let (hi, lo) = (self.highest(), self.lowest());
          if hi != lo { self.devour(hi as usize, lo as usize); }
        }
      }
      // Nettle Toggle
      24 => { if self.by_rarity(NORMAL).len() >= 3 { self.all(0, 30); } }
      // Egg-Burdened Butterfly
      25 => {
        let pests = self.by_arch(PEST);
        if pests.len() < 2 { return; }
        let first = self.rng.pick(&pests).unwrap();
        let rest: Idx = pests.iter().copied().filter(|&t| t != first).collect();
        let second = self.rng.pick(&rest).unwrap();
        let r = self.rng.rarity();
        self.fuse(&[first, second], PEST, r);
      }
      _ => {}
    }
  }

  // ---------- potions (src/data/potions) ----------

  fn potion(&mut self, id: u8, targets: &[usize]) {
    let t0 = targets.first().copied();
    // the selected tank's monster, when there is one
    let at = |c: &Self| t0.and_then(|t| c.t[t]);
    match id {
      // Probiotic Enzyme Solution
      0 => { let p = self.by_arch(PEST); let n = p.len() as i64; for i in p { self.boost(i as i32, 11 * n, 0); } }
      // Slough Solution
      1 => { if !targets.is_empty() { let r = self.rng.rarity(); self.fuse(targets, PEST, r); } }
      // Leptomeningeal Solution
      2 => {
        let Some(m) = at(self) else { return };
        let times = if m.arch == AGITO { if m.rarity == MAGIC { 2 } else if rare_or_boss(m.rarity) { 3 } else { 1 } } else { 1 };
        self.boost(t0.unwrap() as i32, 30 * times, 0);
      }
      // Osteolytic Ointment
      3 => {
        if self.by_arch(BONE).is_empty() { return; }
        let c: Idx = self.non_empty().into_iter().filter(|&i| self.t[i].unwrap().arch != BONE).collect();
        for v in self.rng.sample(&c, 3) {
          self.remove(v as i32);
          for i in self.non_empty() { self.boost(i as i32, 28, 28); }
        }
      }
      // Cleansing Ointment
      4 => {
        let Some(m) = at(self) else { return };
        let t = t0.unwrap();
        self.boost(t as i32, 20, 0);
        if m.arch != BONE { return; }
        self.boost(t as i32, 0, 41);
        let right = self.neighbor(t, 1);
        if right >= 0 { self.remove(right); }
      }
      // Fresh Spinal Powder
      5 => {
        let c: Idx = self.non_empty().into_iter().filter(|&i| self.t[i].unwrap().arch != AEMBERON).collect();
        for p in self.rng.sample(&c, 3) {
          self.mutate(p, Pick::Is(AEMBERON), Pick::Random);
          let a = self.by_arch(AEMBERON);
          for i in self.rng.sample(&a, 3) { self.boost(i as i32, 0, 42); }
        }
      }
      // Petrified Spinal Solution
      6 => {
        let Some(m) = at(self) else { return };
        let t = t0.unwrap();
        self.boost(t as i32, 20, 0);
        if m.arch == AEMBERON { return; }
        self.mutate(t, Pick::Is(AEMBERON), Pick::Random);
        self.boost(t as i32, 30, 0);
      }
      // Viviparous Hormone
      7 => {
        let r = self.rng.rarity();
        self.add(PEST, r, 0, 0);
        if self.rng.chance(0.5) {
          let r = self.rng.rarity();
          self.add(PEST, r, 0, 0);
          let r = self.rng.rarity();
          self.add(PEST, r, 0, 0);
        }
      }
      // Eggshell Powder
      8 => {
        let ne = self.non_empty();
        let Some(t) = self.rng.pick(&ne) else { return };
        let m = self.t[t].unwrap();
        self.boost(t as i32, 0, 25);
        if m.arch == PEST { self.add(PEST, m.rarity, 0, 25); }
      }
      // Brain Fog Tincture
      9 => {
        let ne = self.non_empty();
        let Some(t) = self.rng.pick(&ne) else { return };
        self.boost(t as i32, 41, 0);
        if self.t[t].unwrap().arch == AGITO { self.awaken(t, Some(RARE), None); }
      }
      // Osteogenic Powder
      10 => {
        let ne = self.non_empty();
        let Some(t) = self.rng.pick(&ne) else { return };
        self.boost(t as i32, 0, 40);
        if self.t[t].unwrap().arch != BONE { return; }
        self.boost(t as i32, 0, 127);
        let c: Idx = self.non_empty().into_iter().filter(|&i| self.t[i].unwrap().arch != BONE).collect();
        if let Some(v) = self.rng.pick(&c) { self.remove(v as i32); }
      }
      // Gray Matter Spinal Solution
      11 => {
        let ne = self.non_empty();
        let Some(t) = self.rng.pick(&ne) else { return };
        self.boost(t as i32, 41, 0);
        self.mutate(t, Pick::Random, Pick::Random);
        if self.rng.chance(0.5) {
          self.mutate(t, Pick::Is(AEMBERON), Pick::Random);
          self.boost(t as i32, 30, 0);
        }
      }
      // Hollow Spinal Solution
      12 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.boost(t as i32, 41, 0);
        if self.rng.chance(0.5) { self.mutate(t, Pick::Is(AEMBERON), Pick::Random); }
      }
      // Green Bile Solution
      13 => {
        for &t in targets {
          if self.t[t].is_none() { continue; }
          self.mutate(t, Pick::Random, Pick::Is(MAGIC));
          self.boost(t as i32, 31, 0);
        }
      }
      // Compound Leech Solution
      14 => {
        let Some(m) = at(self) else { return };
        let c = self.by_rarity(m.rarity);
        for i in self.rng.sample(&c, 2) { self.boost(i as i32, 31, 0); }
      }
      // Digestive Enzyme Solution
      15 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.boost(t as i32, 61, 0);
        let left = self.neighbor(t, -1);
        if left >= 0 { self.remove(left); }
      }
      // Vivigenic Powder
      16 => {
        for r in 0..4 {
          let c = self.by_rarity(r);
          if let Some(t) = self.rng.pick(&c) { self.boost(t as i32, 0, 32); }
        }
      }
      // Potent Xenopurge Powder
      17 => {
        let Some(m) = at(self) else { return };
        let t = t0.unwrap();
        self.boost(t as i32, 0, 154);
        let c: Idx = self.non_empty().into_iter().filter(|&i| i != t && self.t[i].unwrap().arch != m.arch).collect();
        for v in self.rng.sample(&c, 2) { self.remove(v as i32); }
      }
      // Xenopurge Powder
      18 => {
        let Some(m) = at(self) else { return };
        let t = t0.unwrap();
        self.boost(t as i32, 0, 127);
        let c: Idx = self.non_empty().into_iter().filter(|&i| i != t && self.t[i].unwrap().arch != m.arch).collect();
        if let Some(v) = self.rng.pick(&c) { self.remove(v as i32); }
      }
      // Pure Leech Solution
      19 => {
        let Some(m) = at(self) else { return };
        let c = self.by_arch(m.arch);
        for i in self.rng.sample(&c, 2) { self.boost(i as i32, 31, 0); }
      }
      // Bewitching Tincture
      20 => { if let Some(t) = t0 { self.awaken(t, None, None); } }
      // Mutagenic Powder
      21 => {
        for &t in targets {
          if self.t[t].is_none() { continue; }
          self.boost(t as i32, 0, 52);
          self.mutate(t, Pick::Random, Pick::Is(RARE));
        }
      }
      // Viscous Bile Solution
      22 => {
        let Some(m) = at(self) else { return };
        let t = t0.unwrap();
        self.boost(t as i32, 31, 0);
        let right = self.neighbor(t, 1);
        if right < 0 { return; }
        self.mutate(right as usize, Pick::Is(m.arch), Pick::Is(m.rarity));
        self.boost(right, 31, 0);
      }
      // Slender-Limb Powder - Pest
      23 => { let r = self.rng.rarity(); self.add(PEST, r, 0, 73); }
      // Twin Hormone - Pest
      24 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.mutate(t, Pick::Is(PEST), Pick::Random);
        if let Some(m) = self.t[t] { self.add(PEST, m.rarity, 0, 0); }
      }
      // Spinal Solution - Agito
      25 => { let r = self.rng.rarity(); self.add(AGITO, r, 31, 0); }
      // Anesthetic Tincture - Agito
      26 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.mutate(t, Pick::Is(AGITO), Pick::Random);
        self.awaken(t, Some(MAGIC), None);
      }
      // Slender-Limb Powder - Bone Sentry
      27 => { let r = self.rng.rarity(); self.add(BONE, r, 0, 73); }
      // Twin Hormone - Bone Sentry
      28 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.mutate(t, Pick::Is(BONE), Pick::Random);
        self.boost(t as i32, 0, 62);
      }
      // Anesthetic Tincture - Aemberon
      29 => {
        if at(self).is_none() { return; }
        let t = t0.unwrap();
        self.mutate(t, Pick::Is(AEMBERON), Pick::Random);
        if !self.rng.chance(0.5) { return; }
        let c: Idx = self.non_empty().into_iter().filter(|&i| i != t).collect();
        if let Some(o) = self.rng.pick(&c) { self.mutate(o, Pick::Is(AEMBERON), Pick::Random); }
      }
      // Spinal Solution - Aemberon
      30 => { let r = self.rng.rarity(); self.add(AEMBERON, r, 31, 0); }
      // Xeno-Hormone
      31 => {
        if targets.is_empty() { return; }
        for &t in targets { self.remove(t as i32); }
        for _ in 0..4 {
          let a = self.rng.arch();
          let r = self.rng.rarity();
          self.add(a, r, 5, 0);
        }
      }
      // Targeted Xeno-Hormone
      32 => {
        let Some(t) = t0 else { return };
        self.remove(t as i32);
        for _ in 0..2 {
          let a = self.rng.arch();
          self.add(a, MAGIC, 0, 25);
        }
      }
      // Compound Revitalizing Pill
      35 => {
        for t in self.non_empty() {
          self.mutate(t, Pick::Is(AEMBERON), Pick::Random);
          let Some(m) = self.t[t] else { continue };
          self.boost(t as i32, 11, 0);
          if m.rarity == MAGIC { self.boost(t as i32, 11, 0); } else if rare_or_boss(m.rarity) { self.boost(t as i32, 0, 11); }
        }
      }
      // Fast-Acting Heart Tonic
      36 => { let t = self.lowest(); if t >= 0 { self.boost(t, 42, 42); } }
      // Plague Quarter Peat Poultice
      37 => {
        if self.by_arch(BONE).is_empty() { return; }
        let c: Idx = self.non_empty().into_iter().filter(|&i| self.t[i].unwrap().arch != BONE).collect();
        for v in c {
          self.remove(v as i32);
          for b in self.by_arch(BONE) { self.boost(b as i32, 20, 39); }
        }
      }
      // Insect Attractant
      38 => {
        let mut overflow = 0;
        for _ in 0..4 {
          let r = self.rng.rarity();
          if self.add(PEST, r, 0, 0) < 0 { overflow += 1; }
        }
        if overflow == 0 { return; }
        for p in self.by_arch(PEST) { self.boost(p as i32, 10 * overflow, 15 * overflow); }
      }
      // Purest Holy Water
      39 => {
        for t in self.by_arch(AGITO) {
          let r = self.t[t].unwrap().rarity;
          if r == BOSS { self.boost(t as i32, 120, 0); } else { self.awaken(t, Some((r + 2).min(BOSS)), Some(120)); }
        }
      }
      // The Holiest Water
      42 => {
        for t in self.by_arch(AGITO) {
          let r = self.t[t].unwrap().rarity;
          self.awaken(t, Some((r + 2).min(BOSS)), None);
        }
      }
      // Xenopanacea: Osteotrophy, Xenopanacea: Brood
      43 | 44 => {
        let ne = self.non_empty();
        let Some(t) = self.rng.pick(&ne) else { return };
        self.mutate(t, Pick::Is(AEMBERON), Pick::Random);
        if id == 43 { self.boost(t as i32, 333, 0); } else { self.boost(t as i32, 0, 333); }
      }
      // Rousing Salts
      41 => {
        let ne = self.non_empty();
        if let Some(t) = self.rng.pick(&ne) { self.boost(t as i32, 111, 111); }
      }
      _ => {}
    }
  }
}

// ---------- dealing (src/engine/draw.ts) ----------

fn deal_potions(rng: &mut Rng, n: usize, from_box: bool) -> Hand {
  let base = if from_box { BOX_POOL } else { NORMAL_POOL };
  let weights: &[f64] = if from_box { &odds().boxed } else { &odds().potion };
  let mut used: Small<u8, 5> = Small::new();
  let mut hand = Hand::new();
  for _ in 0..n {
    let supreme = rng.chance(odds().supreme);
    let fresh = |pool: &[u8], used: &Small<u8, 5>| -> Small<u8, 48> { pool.iter().copied().filter(|p| !used.contains(p)).collect() };
    let mut pool = fresh(if supreme { SUPREME_POOL } else { base }, &used);
    if pool.is_empty() { pool = fresh(if supreme { base } else { SUPREME_POOL }, &used); }
    // a red card by its own odds (all equal: uniformly, as before they were measured)
    let p = if supreme && pool.first().map_or(false, |&p| IS_SUPREME[p as usize]) {
      let red = &odds().red;
      let w0 = red[pool[0] as usize];
      if pool.iter().all(|&p| red[p as usize] == w0) { rng.pick(&pool) } else { Some(rng.weighted(&pool, |p| red[p as usize])) }
    } else if pool.is_empty() {
      None
    } else {
      let w0 = weights[pool[0] as usize];
      if pool.iter().all(|&p| weights[p as usize] == w0) { rng.pick(&pool) } else { Some(rng.weighted(&pool, |p| weights[p as usize])) }
    };
    let Some(p) = p else { break };
    used.push(p);
    hand.push(Card::Potion(p));
  }
  hand
}

fn deal_instruments(rng: &mut Rng, s: &State) -> Hand {
  let basic = s.instruments.is_empty();
  let pool = if basic { BASIC_POOL } else { ADVANCED_POOL };
  let weights: &[f64] = if basic { &odds().basic } else { &odds().advanced };
  let available: Small<u8, 24> = pool.iter().copied().filter(|&d| !s.instruments.iter().any(|i| i.0 == d)).collect();
  if available.is_empty() { return Hand::new(); }
  let w0 = weights[available[0] as usize];
  if available.iter().all(|&d| weights[d as usize] == w0) {
    return rng.sample(&available, 3).into_iter().map(Card::Instrument).collect();
  }
  let mut left = available;
  let mut out = Hand::new();
  while out.len() < 3 && !left.is_empty() {
    let d = rng.weighted(&left, |d| weights[d as usize]);
    let at = left.iter().position(|&x| x == d).unwrap();
    left.remove(at);
    out.push(Card::Instrument(d));
  }
  out
}

// ---------- the game's flow (src/engine/game.ts) ----------

fn targeting(s: &State) -> Option<T> {
  if s.phase != Phase::PotionSelect { return None; }
  match s.selected.and_then(|i| s.hand.get(i)) { Some(Card::Potion(id)) => Some(TARGETING[*id as usize]), _ => None }
}

/** the selected card's targeting when it needs targets (and the board isn't empty) */
pub fn needs_targets(s: &State) -> Option<T> {
  match targeting(s) {
    Some(t @ (T::One | T::OneOrTwo)) if s.tanks.iter().any(|t| t.is_some()) => Some(t),
    _ => None,
  }
}

pub fn can_confirm(s: &State) -> bool {
  if s.phase == Phase::RoundEnd { return true; }
  if s.phase == Phase::GameOver { return false; }
  match s.selected { Some(i) if i < s.hand.len() => {} _ => return false }
  if needs_targets(s).is_some() { !s.targets.is_empty() } else { true }
}

pub fn can_refresh(s: &State) -> bool {
  match s.phase { Phase::PotionSelect => s.potion_refreshes > 0, Phase::InstrumentSelect => s.instrument_refreshes > 0, _ => false }
}

fn clear(s: &mut State) {
  s.selected = None;
  s.targets.clear();
}

fn start_instrument_pick(s: &mut State, rng: &mut Rng) {
  s.phase = Phase::InstrumentSelect;
  s.hand = deal_instruments(rng, s);
  clear(s);
}

fn begin_round(s: &mut State, rng: &mut Rng) {
  s.open_box = None;
  clear(s);
  if s.round > LAST_POTION_ROUND {
    s.phase = Phase::RoundEnd;
    s.hand.clear();
    return;
  }
  s.phase = Phase::PotionSelect;
  s.hand = deal_potions(rng, 3, false);
}

fn end_round(s: &mut State, rng: &mut Rng) {
  {
    let mut eq = s.instruments;
    eq.sort_by_key(|i| i.0);
    let round = s.round;
    let mut c = Ctx::new(&mut s.tanks, rng, &eq);
    for (id, acquired) in eq.iter().copied() {
      if !HAS_END[id as usize] { continue; }
      match TIMING[id as usize] {
        Timing::Every(every) => {
          let elapsed = round as i64 - acquired as i64;
          if elapsed <= 0 || elapsed % every as i64 != 0 { continue; }
        }
        Timing::End => {}
        Timing::On(_) => continue,
      }
      c.end_of_round(id);
    }
  }
  let ua = s.ua();
  for (k, value) in [(0, 8000), (1, 28000)] {
    let hit = if k == 0 { &mut s.t8000 } else { &mut s.t28000 };
    if *hit || ua < value { continue; }
    *hit = true;
    if s.instruments.len() + (s.pending as usize) < MAX_INSTRUMENTS { s.pending += 1; }
  }
  if s.round >= LAST_ROUND {
    s.phase = Phase::GameOver;
    s.hand.clear();
    s.open_box = None;
    clear(s);
    return;
  }
  s.round += 1;
  if s.pending > 0 { return start_instrument_pick(s, rng); }
  begin_round(s, rng);
}

fn confirm(s: &mut State, rng: &mut Rng) {
  if s.phase == Phase::RoundEnd { return end_round(s, rng); }
  match s.hand[s.selected.unwrap()] {
    Card::Instrument(id) => {
      s.instruments.push((id, s.round));
      if s.pending > 0 { s.pending -= 1; }
      if s.pending > 0 && s.instruments.len() < MAX_INSTRUMENTS { return start_instrument_pick(s, rng); }
      s.pending = 0;
      begin_round(s, rng);
    }
    Card::Potion(id) => {
      if let T::Box(n) = TARGETING[id as usize] {
        s.open_box = Some(id);
        s.hand = deal_potions(rng, n, true);
        clear(s);
        return;
      }
      let targets = if needs_targets(s).is_some() { s.targets } else { Small::new() };
      {
        let eq = s.instruments;
        let mut c = Ctx::new(&mut s.tanks, rng, &eq);
        c.potion(id, &targets);
      }
      s.open_box = None;
      clear(s);
      end_round(s, rng);
    }
  }
}

fn refresh(s: &mut State, rng: &mut Rng) {
  if s.phase == Phase::PotionSelect {
    s.potion_refreshes -= 1;
    let n = match s.open_box.map(|b| TARGETING[b as usize]) { Some(T::Box(n)) => Some(n), _ => None };
    s.hand = match n { Some(n) => deal_potions(rng, n, true), None => deal_potions(rng, 3, false) };
  } else {
    s.instrument_refreshes -= 1;
    s.hand = deal_instruments(rng, s);
  }
  clear(s);
}

/** One action, in place; an action the game doesn't allow now changes nothing. */
pub fn dispatch(s: &mut State, a: Action) {
  match a {
    Action::Select(i) => {
      if s.phase == Phase::GameOver || i >= s.hand.len() { return; }
      s.selected = Some(i);
      s.targets.clear();
    }
    Action::Toggle(t) => {
      let Some(mode) = needs_targets(s) else { return };
      if t >= TANKS || s.tanks[t].is_none() { return; }
      if mode == T::One { s.targets = Small::from(&[t]); } else if let Some(at) = s.targets.iter().position(|&x| x == t) { s.targets.remove(at); } else if s.targets.len() < 2 { s.targets.push(t); }
    }
    Action::Confirm => {
      if !can_confirm(s) { return; }
      let mut rng = Rng { s: s.rng };
      confirm(s, &mut rng);
      s.rng = rng.s;
    }
    Action::Refresh => {
      if !can_refresh(s) { return; }
      let mut rng = Rng { s: s.rng };
      refresh(s, &mut rng);
      s.rng = rng.s;
    }
  }
}
