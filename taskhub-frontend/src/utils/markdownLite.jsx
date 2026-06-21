// Render markdown "nhẹ": chỉ tô đậm cụm **...**; xuống dòng để CSS `whitespace-pre-wrap` lo.
export const renderMarkdownLite = (text) => {
  if (!text) return null;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part
  );
};
