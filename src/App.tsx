import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Marketplace from "./pages/MarketplaceNew";
import About from "./pages/About";
import Auth from "./pages/Auth";
import TestAuth from "./pages/TestAuth";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import Sell from "./pages/Sell";
import Contact from "./pages/Contact";
import Vegetables from "./pages/categories/Vegetables";
import Fruits from "./pages/categories/Fruits";
import Grains from "./pages/categories/Grains";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Search from "./pages/Search";
import Wishlist from "./pages/Wishlist";
import Notifications from "./pages/Notifications";
import Seeds from "./pages/categories/Seeds";
import FarmTools from "./pages/categories/FarmTools";
import Admin from "./pages/Admin";
import SellerDashboard from "./pages/SellerDashboard";
import SellerProfile from "./pages/SellerProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentReturn from "./pages/PaymentReturn";
import MockPayment from "./pages/MockPayment";
import QrPay from "./pages/QrPay";
import Wallet from "./pages/Wallet";
import MyVouchers from "./pages/MyVouchers";
import AdminVoucherManagement from "./pages/AdminVoucherManagement";
import SellerVoucherManagement from "./pages/SellerVoucherManagement";
import NotFound from "./pages/NotFound";
import FlashSalePage from "./components/flashsale/FlashSalePage";
import CategoryPage from "./pages/CategoryPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/test-auth" element={<TestAuth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/contact" element={<Contact />} />
          {/* Specific category routes (English slugs) */}
          <Route path="/categories/vegetables" element={<Vegetables />} />
          <Route path="/categories/fruits" element={<Fruits />} />
          <Route path="/categories/grains" element={<Grains />} />
          <Route path="/categories/seeds" element={<Seeds />} />
          <Route path="/categories/farm-tools" element={<FarmTools />} />
          {/* Legacy farm-tools routes */}
          <Route path="/farm-tools" element={<FarmTools />} />
          {/* Vietnamese slug redirects to English routes */}
          <Route path="/categories/rau-cu" element={<Vegetables />} />
          <Route path="/categories/trai-cay" element={<Fruits />} />
          <Route path="/categories/ngu-coc" element={<Grains />} />
          <Route path="/categories/hat-giong" element={<Seeds />} />
          <Route path="/categories/dung-cu-nong-nghiep" element={<FarmTools />} />
          <Route path="/categories/dung-cu-nong-san" element={<FarmTools />} />
          {/* Dynamic category route - must be after specific routes */}
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment/return" element={<PaymentReturn />} />
          <Route path="/payment/mock" element={<MockPayment />} />
          <Route path="/payment/qr" element={<QrPay />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/vouchers" element={<MyVouchers />} />
          <Route path="/admin/vouchers" element={<AdminVoucherManagement />} />
          <Route path="/seller/vouchers" element={<SellerVoucherManagement />} />
          <Route path="/flashsale" element={<FlashSalePage />} />
          {/* Redirect legacy paths to new farm tools path */}
          <Route path="/categories/farm-tools" element={<FarmTools />} />
          <Route path="/categories/tools" element={<FarmTools />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
