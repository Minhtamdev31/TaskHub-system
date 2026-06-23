// Khối "xương" nhấp nháy thay cho màn "Đang tải…" trơ — cảm giác nhanh & dễ nhìn hơn.
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`} />
);

// Skeleton chung cho trang dạng: tiêu đề + vài thẻ + khối lớn.
export const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-32 rounded-2xl" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="lg:col-span-2 h-80 rounded-3xl" />
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
    </div>
  </div>
);

// Skeleton danh sách (thẻ/hàng) — cho trang dự án, công việc của tôi…
export const ListSkeleton = ({ rows = 6 }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-11 w-32 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
    </div>
  </div>
);

// Skeleton bảng Kanban — header + 4 cột.
export const BoardSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, c) => (
        <div key={c} className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);
