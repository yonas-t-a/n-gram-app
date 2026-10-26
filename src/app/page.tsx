"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Prediction = { items: [string, number][]; context: string[] };
const methods = [
  ["mle", "maximum likelihood estimation"],
  ["laplace", "Laplace smoothing"],
  ["addk", "add-k smoothing"],
  ["absdisc", "absolute discounting"],
  ["interp", "linear interpolation"],
  ["backoff", "stupid backoff"],
];
const orders = ["unigram", "bigram", "trigram", "4-gram"];

export default function Home() {
  const [text, setText] = useState("");
  const [order, setOrder] = useState(3);
  const [method, setMethod] = useState("absdisc");
  const [result, setResult] = useState<Prediction>({ items: [], context: [] });
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, order, method }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Prediction failed");
        setResult(await response.json());
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) {
          setStatus("error");
          setResult({ items: [], context: [] });
        }
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, order, method, retry]);

  const changeText = (value: string) => {
    setText(value);
    setResult({ items: [], context: [] });
    setStatus("loading");
  };
  const pick = (word: string) => {
    changeText(
      text.replace(/\s+$/, "") + (text.trim() ? " " : "") + word + " ",
    );
    input.current?.focus();
  };
  const reset = () => {
    changeText("");
    input.current?.focus();
  };
  const top = result.items[0]?.[0];

  return (
    <div className="app-shell">
      <header className="masthead">
        <Link href="/" className="brand">
          <span>
            <span className="brand-name">n-gram</span>
            <span className="brand-sub"> / group 10</span>
          </span>
        </Link>
        <span className="masthead-note">a little context. the next word.</span>
        <span className="project-label">
          <span className="status-dot" />
        </span>
      </header>

      <main>
        <nav className="controls" aria-label="Prediction settings">
          <div className="control-group order-group" aria-label="N-gram order">
            <span className="control-symbol" aria-hidden="true">
              n
            </span>
            {orders.map((name, i) => (
              <button
                key={name}
                aria-pressed={order === i + 1}
                onClick={() => {
                  setOrder(i + 1);
                  setResult({ items: [], context: [] });
                  setStatus("loading");
                }}
                title={`${i + 1}-gram order`}
              >
                <span className="order-number">{i + 1}</span> {name}
              </button>
            ))}
          </div>
          <span className="control-divider" />
          <div className="control-group" aria-label="Smoothing method">
            <span className="control-symbol" aria-hidden="true">
              ⌁
            </span>
            {methods.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={method === value}
                onClick={() => {
                  setMethod(value);
                  setResult({ items: [], context: [] });
                  setStatus("loading");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <section
          className="writing-section"
          aria-label="Amharic predictive writing"
        >
          <div className="language-label">
            <span aria-hidden="true">◎</span> አማርኛ{" "}
            <span className="label-slash">/</span> amharic
          </div>
          <div className="editor">
            <div ref={mirror} className="text-mirror" aria-hidden="true">
              <span className="written">{text}</span>
              {top && (
                <span className="ghost">
                  {text && !/\s$/.test(text) ? " " : ""}
                  {top}
                </span>
              )}
              {!text && !top && (
                <span className="placeholder">እዚህ መጻፍ ይጀምሩ…</span>
              )}
            </div>
            <textarea
              ref={input}
              value={text}
              maxLength={20000}
              spellCheck={false}
              autoFocus
              aria-label="Write in Amharic"
              onChange={(event) => changeText(event.target.value)}
              onScroll={(event) => {
                if (mirror.current)
                  mirror.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onKeyDown={(event) => {
                if (event.key === "Tab" && top) {
                  event.preventDefault();
                  pick(top);
                }
                if (event.altKey && /^[1-5]$/.test(event.key)) {
                  const item = result.items[Number(event.key) - 1];
                  if (item) {
                    event.preventDefault();
                    pick(item[0]);
                  }
                }
                if (event.key === "Escape") reset();
              }}
            />
          </div>
          <div className="editor-meta">
            <span>
              {text.trim() ? text.trim().split(/\s+/).length : 0} words{" "}
              <span className="meta-dot">·</span> {orders[order - 1]}
            </span>
            <button
              className="reset"
              onClick={reset}
              title="Clear writing (Escape)"
              aria-label="Clear writing"
            >
              ↻
            </button>
            <span className="inline-hint">
              <kbd>tab</kbd> to accept
            </span>
          </div>
        </section>

        <section
          className="recommendations"
          aria-label="Top five recommendations"
          aria-busy={status === "loading"}
        >
          <div className="recommendation-heading">
            <span>
              THE NEXT WORD <span className="heading-dash">/</span> TOP 5
            </span>
            <span className="context">
              context{" "}
              <span className="context-value">
                {result.context.length
                  ? result.context.join(" ")
                  : "sentence start"}
              </span>
            </span>
          </div>
          <div className="suggestion-grid">
            {result.items.map(([word, probability], i) => (
              <button
                className={`suggestion ${i === 0 ? "first" : ""}`}
                key={word}
                onClick={() => pick(word)}
              >
                <span className="suggestion-number">0{i + 1}</span>
                <span className="suggestion-word" lang="am">
                  {word}
                </span>
                <span className="suggestion-probability">
                  {method === "backoff" ? "score " : ""}
                  {method === "backoff"
                    ? probability.toFixed(4)
                    : `${(probability * 100).toFixed(2)}%`}
                </span>
                <span className="probability-track">
                  <span
                    style={{
                      width: `${(100 * probability) / result.items[0][1]}%`,
                    }}
                  />
                </span>
              </button>
            ))}
            {!result.items.length && (
              <div className="empty-state" role="status">
                {status === "error" ? (
                  <>
                    <span>Couldn’t load predictions.</span>{" "}
                    <button onClick={() => setRetry(retry + 1)}>
                      try again ↻
                    </button>
                  </>
                ) : status === "loading" ? (
                  "finding the next word…"
                ) : (
                  "No words found for this context. Try a lower order or absolute discounting."
                )}
              </div>
            )}
          </div>
          <p className="recommendation-note">
            {method === "backoff"
              ? "ranked by backoff score"
              : "ranked by probability"}
            <span>choose a word to keep your thought going</span>
          </p>
        </section>
      </main>

      <footer>
        <div className="keyboard-hints">
          <span>
            <kbd>tab</kbd> accept first word
          </span>
          <span>
            <kbd>alt</kbd> + <kbd>1–5</kbd> choose suggestion
          </span>
          <span>
            <kbd>esc</kbd> clear
          </span>
        </div>
        <div className="footer-bottom">
          <span>built on language. guided by context.</span>
          <span>
            GPAC CORPUS <span className="meta-dot">·</span> N-GRAM LANGUAGE
            MODEL
          </span>
        </div>
      </footer>
    </div>
  );
}
