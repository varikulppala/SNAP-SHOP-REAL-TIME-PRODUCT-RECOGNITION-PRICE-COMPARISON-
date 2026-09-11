import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="border-t mt-8 py-4 text-center text-sm text-slate-500">
        Snap&Shop &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

