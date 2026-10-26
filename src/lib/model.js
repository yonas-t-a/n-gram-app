
const BOS = 1, UNK = 0;
let M = null, W2I = new Map(), TOPUNI = [], BANNED = new Set([0, 1, 2]);
let unigramCounts = [], unigramTotal = 0;

function mapVariants(s) {                       // same letter-series merge as the Python preprocessing
  const ranges = [[0x1210, 0x1200], [0x1280, 0x1200], [0x1220, 0x1230], [0x12D0, 0x12A0], [0x1340, 0x1338]];
  let out = "";
  for (const ch of s) {
    let c = ch.codePointAt(0);
    for (const [src, dst] of ranges) { if (c >= src && c < src + 7) { c = dst + (c - src); break; } }
    out += String.fromCodePoint(c);
  }
  return out;
}
const ETH = "\\u1200-\\u135A";
const reSingle = new RegExp("^[" + ETH + "]$");
const reGlue1 = new RegExp("(?<=[\\d\\u1369-\\u137C])(?=[" + ETH + "])", "g");
const reGlue2 = new RegExp("(?<=[" + ETH + "])(?=[\\d\\u1369-\\u137C])", "g");
const WB = "(?<![\\p{L}\\p{N}_])", WA = "(?![\\p{L}\\p{N}_])";
const reTok = new RegExp("<URL>|<EMAIL>|<NUM>|" + WB + "[" + ETH + "](?:\\.[" + ETH + "])+" + WA + "|[" + ETH + "]/[" + ETH + "]{2,6}|[\\p{L}\\p{N}]+", "gu");

function tokenize(text) {
  let t = mapVariants(text.normalize("NFC").toLowerCase());
  t = t.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, " <EMAIL> ").replace(/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi, " <URL> ");
  t = t.replace(reGlue1, " ").replace(reGlue2, " ");
  t = t.replace(/(?<![\p{L}\p{N}_])(?:\d+(?:[.,]\d+)*|[\u1369-\u137C]+)(?![\p{L}\p{N}_])/gu, " <NUM> ");
  const toks = t.match(reTok) || [], out = []; let run = [];
  const flush = () => { if (run.length) { out.push(run.join(".")); run = []; } };
  for (let tok of toks) {                        // runs of single Ethiopic letters (abbreviations) become ONE token
    if (reSingle.test(tok)) { run.push(tok); continue; }
    flush(); out.push(tok);
  }
  flush(); return out;
}

function entry(m, hist) {                        // statistics of the context made of the last m-1 words
  const e = M.ctx[String(m)]; if (!e) return null;
  const key = hist.slice(hist.length - (m - 1)).join("_");
  const v = e[key]; if (!v) return null;
  const cnt = new Map(); for (let i = 0; i < v[2].length; i += 2) cnt.set(v[2][i], v[2][i + 1]);
  return { total: v[0], types: v[1], cnt };
}

function score(method, order, hist, w) {
  let p = M.uni[w] || 0;
  if (method === "laplace" || method === "addk") {
    const k = method === "laplace" ? 1 : 0.1;
    const e = order === 1 ? null : entry(order, hist);
    const count = order === 1 ? unigramCounts[w] : (e?.cnt.get(w) || 0);
    const total = order === 1 ? unigramTotal : (e?.total || 0);
    return (count + k) / (total + k * M.vocab.length);
  }
  if (method === "interp") {
    let levels = 1;
    for (let m = 2; m <= order; m++) {
      const e = entry(m, hist);
      if (e) {
        p += (e.cnt.get(w) || 0) / e.total;
        levels++;
      }
    }
    return p / levels;
  }
  if (method === "mle") {
    if (order === 1) return p;
    const e = entry(order, hist); return e ? (e.cnt.get(w) || 0) / e.total : 0;
  }
  for (let m = 2; m <= order; m++) {
    const e = entry(m, hist); const c = e ? (e.cnt.get(w) || 0) : 0;
    if (method === "absdisc") { if (e) { const D = M.D[String(m)]; p = Math.max(c - D, 0) / e.total + D * e.types / e.total * p; } }
    else p = c > 0 ? c / e.total : M.alpha * p;  // stupid backoff
  }
  return p;
}

function suggest(text, k, order, method) {
  const trimmed = text.replace(/\s+$/, "");
  const newSentence = /(።|፧|!|\?|፡፡)$/.test(trimmed);
  const ids = newSentence ? [] : tokenize(text).map(t => W2I.has(t) ? W2I.get(t) : UNK);
  const hist = [BOS, BOS, BOS].concat(ids).slice(-3);
  const cands = new Set();
  for (let m = 4; m >= 2; m--) { const e = entry(m, hist); if (e) for (const w of e.cnt.keys()) cands.add(w); }
  for (const w of TOPUNI) cands.add(w);
  const res = [];
  for (const w of cands) { if (BANNED.has(w)) continue; const s = score(method, order, hist, w); if (s > 0) res.push([w, s]); }
  res.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return { items: res.slice(0, k).map(([w, s]) => [M.vocab[w], s]), context: (order === 1 ? [] : hist.slice(-(order - 1))).map(i => M.vocab[i]) };
}

function setModel(obj) {
  M = obj; W2I = new Map(M.vocab.map((w, i) => [w, i]));
  // Recover unigram counts from all observed bigram successors.
  unigramCounts = new Array(M.vocab.length).fill(0);
  unigramTotal = 0;
  for (const context of Object.values(M.ctx["2"])) {
    for (let i = 0; i < context[2].length; i += 2) {
      const count = context[2][i + 1];
      unigramCounts[context[2][i]] += count;
      unigramTotal += count;
    }
  }
  BANNED = new Set([0, 1, 2]); for (const p of M.placeholders || []) BANNED.add(W2I.get(p));
  TOPUNI = M.uni.map((p, i) => [i, p]).sort((a, b) => b[1] - a[1]).slice(0, 60).map(x => x[0]);
}

export { setModel, suggest };
