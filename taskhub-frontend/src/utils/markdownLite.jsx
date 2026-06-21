import { Fragment } from 'react';

// Tô đậm cụm **...** trong 1 dòng.
const inline = (text, key) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={`${key}-${i}`} className="font-semibold text-slate-900">{part}</strong>
      : <Fragment key={`${key}-${i}`}>{part}</Fragment>
  );

/**
 * Render markdown "nhẹ" theo khối: tiêu đề (#/##/###), gạch đầu dòng (- hoặc *), đậm (**...**).
 * Đủ cho output AI; không cần thư viện markdown đầy đủ.
 */
export const MarkdownLite = ({ text }) => {
  if (!text) return null;
  const lines = String(text).split('\n');
  const blocks = [];
  let bullets = null;

  const flush = () => {
    if (bullets) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-1.5">{bullets}</ul>);
      bullets = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flush(); return; }

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push(
        <h4 key={idx} className="font-bold text-slate-900 mt-3 first:mt-0 mb-1">{inline(heading[1], idx)}</h4>
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      bullets = bullets || [];
      bullets.push(<li key={idx}>{inline(bullet[1], idx)}</li>);
      return;
    }

    flush();
    blocks.push(<p key={idx} className="my-1">{inline(line, idx)}</p>);
  });
  flush();

  return <div className="text-sm text-slate-700 leading-relaxed">{blocks}</div>;
};
