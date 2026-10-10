import React, { useEffect, useRef, useState } from "react";
import { Rich } from "./Exercises.jsx";

const JP = /[぀-ヿ㐀-鿿]/;
const LATIN = /[A-Za-z]/;

function Cell({ text }) {
  const [first, ...rest] = String(text).split("\n");
  return (
    <>
      <span className="l1" lang={JP.test(first) && !LATIN.test(first) ? "ja" : undefined}><Rich text={first} /></span>
      {rest.map((r, i) => <span className="l2" key={i}><Rich text={r} /></span>)}
    </>
  );
}

/** A reference table inside a lesson. The first column becomes a row label when it holds labels, not Japanese. */
export function LessonTable({ t }) {
  const scroller = useRef(null);
  const [more, setMore] = useState(false); // more columns to the right: show a fade so it is clear the table scrolls
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const check = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 6);
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const t0 = setTimeout(check, 400); // fonts and furigana settle after the first paint
    return () => { el.removeEventListener("scroll", check); window.removeEventListener("resize", check); clearTimeout(t0); };
  }, [t]);
  const labels = t.rows.filter((r) => LATIN.test(String(r[0]).split("\n")[0])).length >= t.rows.length / 2;
  const jpOnly = (c) => JP.test(String(c).split("\n")[0]) && !LATIN.test(String(c).split("\n")[0]);
  return (
    <figure className="tbl" data-more={more ? "1" : undefined}>
      {t.cap && <figcaption>{t.cap}</figcaption>}
      <div className="tbl-scroll" ref={scroller} role="region" aria-label={t.cap || "Table"} tabIndex={0}>
        <table>
          <thead>
            <tr>{t.head.map((h, i) => <th key={i} scope="col" className={t.hl === i ? "hl" : ""}><Rich text={h} /></th>)}</tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (j === 0 && labels
                  ? <th key={j} scope="row"><Cell text={c} /></th>
                  : <td key={j} className={`${t.hl === j ? "hl" : ""} ${jpOnly(c) ? "jp" : ""}`}><Cell text={c} /></td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.note && <p className="tbl-note"><Rich text={t.note} /></p>}
    </figure>
  );
}
