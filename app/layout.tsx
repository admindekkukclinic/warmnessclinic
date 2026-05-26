import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>

        <div className="flex min-h-screen bg-gray-100">

          {/* Sidebar */}
          <aside className="w-64 bg-blue-700 text-white p-6">

            <h1 className="text-2xl font-bold mb-10">
              Dental Clinic
            </h1>

            <nav className="space-y-4">

              <Link
                href="/"
                className="block hover:text-blue-200"
              >
                Dashboard
              </Link>

              <Link
                href="/income"
                className="block hover:text-blue-200"
              >
                Income
              </Link>

              <Link
                href="/expenses"
                className="block hover:text-blue-200"
              >
                Expenses
              </Link>

              <Link
                href="/inventory"
                className="block hover:text-blue-200"
              >
                Inventory
              </Link>

            </nav>

          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}