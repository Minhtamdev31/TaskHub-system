import { useState } from 'react';

const initials = (name) => (name || 'NA').substring(0, 2).toUpperCase();

/**
 * Avatar dùng chung: hiện ảnh đại diện nếu có `src`, ngược lại hiện chữ cái đầu.
 * `className` mang kích thước/bo góc/màu (áp cho cả ảnh lẫn vòng chữ cái).
 * Ảnh lỗi (404…) sẽ tự rớt về chữ cái.
 */
const Avatar = ({ src, name, className = '' }) => {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || ''}
        title={name || ''}
        onError={() => setBroken(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div title={name || ''} className={`flex items-center justify-center ${className}`}>
      {initials(name)}
    </div>
  );
};

export default Avatar;
