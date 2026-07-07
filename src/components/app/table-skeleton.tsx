import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Esqueleto de carregamento da tabela — mesma moldura da `DataTable`, evitando
 * "saltos" de layout enquanto os dados chegam.
 */
export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  const cols = Math.max(1, columns);

  return (
    <div
      className="overflow-hidden rounded-md border"
      role="status"
      aria-label="Carregando registros"
    >
      <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
