import Link from "next/link";
import Layout from "@/components/Layout";
import DemoProductsGrid from "@/components/DemoProductsGrid";

export default function HomePage() {
  return (
    <Layout>
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Snap&Shop
          </h1>
          <p className="text-slate-600">
            Upload or snap a photo of any product and instantly get AI-powered
            recognition, online price comparison, and nearby store availability.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-sm"
            >
              Get Started – Upload Product
            </Link>
            <Link
              href="/price-comparison"
              className="px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
            >
              Quick Search
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 pt-4">
            <div>
              <p className="font-semibold text-slate-800 mb-1">1. Recognize</p>
              <p>YOLOv8 model detects the product in your image.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">2. Compare</p>
              <p>Compare prices across Amazon, Flipkart, and JioMart.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">3. Locate</p>
              <p>Find nearby stores that may stock the product.</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border p-6 space-y-4">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Live product snapshot
          </p>
          <div className="aspect-video rounded-xl bg-gradient-to-br from-sky-100 via-white to-emerald-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">
              Upload your first product on the Upload page
            </p>
          </div>
        </div>
      </section>

      <DemoProductsGrid />
    </Layout>
  );
}

