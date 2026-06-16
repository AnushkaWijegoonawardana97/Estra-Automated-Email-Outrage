interface UnsubscribePageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { status } = await searchParams;

  const message =
    status === "success"
      ? "You've been removed from our mailing list."
      : status === "not_found"
        ? "We could not find your subscription record."
        : status === "missing"
          ? "Invalid unsubscribe link."
          : "Unsubscribe request processed.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Estra Digital
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Unsubscribe
        </h1>
        <p className="mt-4 text-sm text-zinc-600">{message}</p>
      </div>
    </main>
  );
}
