import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { StatsSection } from "@/components/home/StatsSection";
import ChatBox from "@/components/chat/ChatBox";
 

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedCategories />
        <FlashSaleSection />
        <FeaturedProducts />
        <StatsSection />
      </main>
      <Footer />
      <ChatBox />
    </div>
  );
};

export default Index;
