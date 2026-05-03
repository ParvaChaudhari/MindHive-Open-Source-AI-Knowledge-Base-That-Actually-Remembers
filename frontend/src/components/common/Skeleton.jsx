import React from 'react';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-stone-200 dark:bg-stone-800 rounded-md ${className}`}
      {...props}
    />
  );
};

export const DocumentSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border border-outline-variant rounded-xl bg-surface-container-lowest">
    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="w-20 h-8 rounded-lg" />
  </div>
);

export const CollectionSkeleton = () => (
  <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden p-6 space-y-4">
    <div className="flex items-start gap-4">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Skeleton className="w-16 h-8 rounded-lg" />
        <Skeleton className="w-16 h-8 rounded-lg" />
      </div>
    </div>
  </div>
);

export default Skeleton;
