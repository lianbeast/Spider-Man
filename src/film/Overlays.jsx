import { useLayoutEffect, useRef } from 'react';
import { registerOverlay, film } from './state.js';

// Copy is almost none: two phrases, repeated, and nothing else but the
// title. The copy stops being information and becomes rhythm — the figure,
// the cage and the web do all of the work.
const Title = () => (
  <h1 className="t-title" aria-label="BRAND NEW DAY">
    {['BRAND', 'NEW', 'DAY'].map((word, li) => (
      <span className="t-line" key={li} aria-hidden="true">
        {[...word].map((ch, ci) => (
          <span className="l" key={ci}>
            {ch}
          </span>
        ))}
      </span>
    ))}
  </h1>
);

const Phrase = ({ text }) => (
  <p className="t-phrase" aria-hidden="true">
    {[...text].map((ch, i) =>
      ch === ' ' ? (
        <span className="l sp" key={i}>
          &nbsp;
        </span>
      ) : (
        <span className="l" key={i}>
          {ch}
        </span>
      ),
    )}
  </p>
);

// Every overlay: absolute, inset 0, pointer-events none; shown only in its
// own window by a smoothstep opacity ramp (handled in the driver), visibility
// hidden under 0.01. Windows sit on the ACT axis — with DOM on p while acts
// run on sp, every overlay fires roughly a third of the page late.
function Overlay({ axis, a, b, hold, className, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const root = ref.current;
    return registerOverlay({
      root,
      letters: Array.from(root.querySelectorAll('.l')),
      axis,
      a,
      b,
      hold,
      hidden: true,
      vis: false,
    });
  }, [axis, a, b, hold]);
  return (
    <div ref={ref} className={`ov ${className || ''}`}>
      {children}
    </div>
  );
}

function Wipe() {
  const ref = useRef(null);
  useLayoutEffect(() => registerOverlay({ wipe: true, el: ref.current, vis: false }), []);
  return <div ref={ref} className="wipe" aria-hidden="true" />;
}

export function Overlays() {
  return (
    <>
      <Overlay axis="sp" a={0.0} b={0.165} className="ov-open">
        <Title />
      </Overlay>
      <Overlay axis="sp" a={0.295} b={0.43} className="ov-phrase">
        <Phrase text="LET GO" />
      </Overlay>
      <Overlay axis="sp" a={0.56} b={0.665} className="ov-phrase">
        <Phrase text="LET GO" />
      </Overlay>
      <Overlay axis="sp" a={0.675} b={0.8} className="ov-phrase">
        <Phrase text="BEGIN AGAIN" />
      </Overlay>
      <Wipe />
      <Overlay axis="p" a={0.855} b={1.01} hold className="ov-close">
        <div className="card">
          <Title />
          <button
            className="btn"
            type="button"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: film.reduce ? 'auto' : 'smooth' })
            }
          >
            DAY ONE
          </button>
        </div>
      </Overlay>
    </>
  );
}
