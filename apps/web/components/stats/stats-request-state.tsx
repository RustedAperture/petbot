import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsLoading({ label }: { label: string }) {
  return (
    <div className="w-full space-y-4">
      <p role="status" className="text-sm text-muted-foreground">
        {label}
      </p>
      <div aria-hidden="true" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 motion-reduce:animate-none" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-80 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsError({
  onRetry,
  hasData = false,
}: {
  onRetry: () => void;
  hasData?: boolean;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn&apos;t load stats</AlertTitle>
      <AlertDescription>
        <p>
          {hasData
            ? "Showing the previously loaded stats. Try again to get the latest numbers."
            : "Please try again in a moment."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function StatsEmpty() {
  return (
    <div className="rounded-xl border p-6 text-center">
      <p className="font-medium">No stats available yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Stats will appear here once PetBot has recorded activity.
      </p>
    </div>
  );
}
