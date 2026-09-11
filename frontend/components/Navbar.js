import Link from "next/link";
import { useAuth } from "@/src/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="rounded-full bg-primary text-white w-8 h-8 flex items-center justify-center font-bold">
            S
          </span>
          <span className="font-semibold text-slate-800">
            Snap<span className="text-primary">&</span>Shop
          </span>
        </Link>
        <nav className="flex items-center space-x-4 text-sm">
          <Link href="/upload" className="hover:text-primary">
            Upload
          </Link>
          <Link href="/price-comparison" className="hover:text-primary">
            Quick Search
          </Link>
          <Link href="/nearby-stores" className="hover:text-primary">
            Find Nearby Stores
          </Link>
          {user && (
            <Link href="/history" className="hover:text-primary">
              History
            </Link>
          )}
          {!user ? (
            <Link
              href="/login"
              className="px-3 py-1 rounded-full bg-primary text-white"
            >
              Login
            </Link>
          ) : (
            <button
              onClick={logout}
              className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

