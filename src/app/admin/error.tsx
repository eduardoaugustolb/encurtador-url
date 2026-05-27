"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-destructive">
        Something went wrong loading this page.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {error.message}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 text-sm text-muted-foreground underline hover:text-foreground"
      >
        Try again
      </button>
    </div>
  );
}
