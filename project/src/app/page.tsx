"use client";

import { useEffect } from "react";
import { useNav } from "@/lib/store";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { HomeView } from "@/components/site/HomeView";
import { ProductsView } from "@/components/site/ProductsView";
import { AboutView } from "@/components/site/AboutView";
import { BenefitsView } from "@/components/site/BenefitsView";
import { CartView } from "@/components/site/CartView";
import { ContactView } from "@/components/site/ContactView";
import { TrackOrdersView } from "@/components/site/TrackOrdersView";

export default function Home() {
  const view = useNav((s) => s.view);

  // scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "products" && <ProductsView />}
        {view === "about" && <AboutView />}
        {view === "benefits" && <BenefitsView />}
        {view === "cart" && <CartView />}
        {view === "contact" && <ContactView />}
        {view === "track" && <TrackOrdersView />}
      </main>
      <Footer />
    </div>
  );
}
