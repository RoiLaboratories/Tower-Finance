import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SwapCard from "@/components/SwapCard";
import TokenTicker from "@/components/TokenTicker";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <TokenTicker />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <SwapCard />
      </main>
      <Footer />
    </div>
  );
}
