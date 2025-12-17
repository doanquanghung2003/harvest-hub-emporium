import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthTest } from "@/components/AuthTest";

export default function TestAuth() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted py-16">
        <div className="container mx-auto px-4">
          <AuthTest />
        </div>
      </main>
      <Footer />
    </div>
  );
}
