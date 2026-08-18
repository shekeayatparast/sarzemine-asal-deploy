import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TrackOrdersView } from "@/components/site/TrackOrdersView";

// Force dynamic — we read query params
export const dynamic = "force-dynamic";

// GET /track?orderNumber=HN-12345
// Standalone track page so admin/agent panels can deep-link to it.
// (The home page also has a "track" view via the Zustand nav store, but that
// can only be reached by in-app navigation, not a direct URL.)
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; phone?: string }>;
}) {
  const params = await searchParams;
  const orderNumber =
    typeof params.orderNumber === "string"
      ? params.orderNumber.trim()
      : "";
  const phone =
    typeof params.phone === "string" ? params.phone.trim() : "";

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Header />
      <main className="flex-1">
        <TrackOrdersView
          initialOrderNumber={orderNumber || undefined}
          initialPhone={phone || undefined}
        />
      </main>
      <Footer />
    </div>
  );
}
