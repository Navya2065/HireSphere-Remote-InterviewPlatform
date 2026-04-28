/**
 * Skeleton loader components — all use the .skeleton shimmer class
 * defined in index.css.
 */

/** Generic rectangle skeleton */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

/** Thin text-line skeleton */
export function SkeletonText({ className = '' }) {
  return <div className={`skeleton h-3.5 rounded ${className}`} aria-hidden="true" />;
}

/** Mirrors the StatCard in Dashboard */
export function SkeletonStatCard() {
  return (
    <div className="card relative overflow-hidden p-5" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-[3px] skeleton rounded-l-2xl" />
      <div className="flex items-start justify-between">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-9 w-9 rounded-lg" />
      </div>
      <div className="skeleton h-10 w-16 rounded mt-3" />
      <div className="skeleton h-3 w-32 rounded mt-2" />
    </div>
  );
}

/** Mirrors an interview row in the Dashboard upcoming list */
export function SkeletonInterviewRow() {
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-4" aria-hidden="true">
      <div className="flex items-center gap-3 min-w-0">
        <div className="skeleton h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 min-w-0">
          <div className="skeleton h-4 w-44 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      </div>
      <div className="skeleton h-9 w-20 rounded-lg shrink-0" />
    </li>
  );
}

/** Mirrors a row in the InterviewList table */
export function SkeletonTableRow() {
  return (
    <tr aria-hidden="true">
      <td className="px-6 py-4">
        <div className="skeleton h-4 w-40 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="skeleton h-7 w-7 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <div className="skeleton h-3.5 w-24 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="skeleton h-5 w-20 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end">
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

/** Candidate select skeleton for ScheduleInterview */
export function SkeletonSelect() {
  return (
    <div className="skeleton h-10 w-full rounded-lg" aria-hidden="true" />
  );
}
