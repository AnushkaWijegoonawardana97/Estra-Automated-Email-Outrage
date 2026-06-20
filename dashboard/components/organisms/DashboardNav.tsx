import Link from "next/link";

const navItems = [
  { href: "/leads", label: "Leads" },
  { href: "/campaigns/new", label: "Campaigns" },
  { href: "/emails", label: "Emails" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
  { href: "/unsubscribed", label: "Unsubscribed" },
];

export function DashboardNav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Estra Outreach
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">
            Cold Email Dashboard
          </h1>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
