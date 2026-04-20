import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import FullPageSpinner from "@/components/FullPageSpinner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GenderProvider } from "@/contexts/GenderContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { PartnerProvider } from "@/contexts/PartnerContext";
import AuthModal from "@/components/AuthModal";
import BottomNav from "@/components/BottomNav";
import CartPill from "@/components/CartPill";
import SalonSwitchModal from "@/components/SalonSwitchModal";
import SalonSwitchSuccessWrapper from "@/components/SalonSwitchSuccessWrapper";
import GenderBackground from "@/components/GenderBackground";
import FlutterBridge from "@/components/FlutterBridge";
import PullToRefresh from "@/components/PullToRefresh";
import LocationGate from "@/components/LocationGate";

/* Route-level code splitting — reduces initial JS parse time */
const Index = lazy(() => import("./pages/Index"));
const SalonDetail = lazy(() => import("./pages/SalonDetail"));
const BookingFlow = lazy(() => import("./pages/BookingFlow"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Offers = lazy(() => import("./pages/Offers"));
const Explore = lazy(() => import("./pages/Explore"));
const Profile = lazy(() => import("./pages/Profile"));
const AtHome = lazy(() => import("./pages/AtHome"));
const ArtistProfile = lazy(() => import("./pages/ArtistProfile"));
const AtHomeBooking = lazy(() => import("./pages/AtHomeBooking"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* Partner (Staff & Owner) — isolated from customer shell */
const StaffLayout = lazy(() => import("./layouts/StaffLayout"));
const OwnerLayout = lazy(() => import("./layouts/OwnerLayout"));
const OwnerDashboard = lazy(() => import("./pages/partner/OwnerDashboard"));
const OwnerBookings = lazy(() => import("./pages/partner/OwnerBookings"));
const OwnerGrowth = lazy(() => import("./pages/partner/OwnerGrowth"));
const OwnerStaff = lazy(() => import("./pages/partner/OwnerStaff"));
const OwnerMenu = lazy(() => import("./pages/partner/OwnerMenu"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GenderProvider>
    <LocationProvider>
      <CustomerAuthProvider>
      <CartProvider>
      <FavoritesProvider>
      <PartnerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FlutterBridge />
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              {/* Partner routes — isolated, no customer shell */}
              <Route path="/staff" element={<StaffLayout />} />
              <Route path="/staff/profile" element={<StaffLayout />} />
              <Route path="/owner" element={<OwnerLayout />}>
                <Route index element={<OwnerDashboard />} />
                <Route path="bookings" element={<OwnerBookings />} />
                <Route path="growth" element={<OwnerGrowth />} />
                <Route path="staff" element={<OwnerStaff />} />
                <Route path="menu" element={<OwnerMenu />} />
              </Route>

              {/* Customer routes — wrapped in customer shell */}
              <Route
                path="/*"
                element={
                  <LocationGate>
                    <div className="relative flex flex-col h-full overflow-hidden">
                      <div className="absolute inset-0 -z-10 pointer-events-none">
                        <GenderBackground />
                      </div>
                      <div id="scroll-container" className="relative z-0 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <PullToRefresh>
                          <div className="max-w-7xl mx-auto md:px-8">
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/salon/:id" element={<SalonDetail />} />
                              <Route path="/booking/:id" element={<BookingFlow />} />
                              <Route path="/bookings" element={<Bookings />} />
                              <Route path="/offers" element={<Offers />} />
                              <Route path="/explore" element={<Explore />} />
                              <Route path="/profile" element={<Profile />} />
                              <Route path="/at-home" element={<AtHome />} />
                              <Route path="/artist/:id" element={<ArtistProfile />} />
                              <Route path="/at-home-booking/:id" element={<AtHomeBooking />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </PullToRefresh>
                      </div>
                      <div id="page-floating-footer-root" className="pointer-events-none absolute inset-0 z-[60]" />
                      <CartPill />
                      <BottomNav />
                    </div>
                  </LocationGate>
                }
              />
            </Routes>
          </Suspense>
          <SalonSwitchModal />
          <SalonSwitchSuccessWrapper />
          <AuthModal />
        </BrowserRouter>
      </TooltipProvider>
      </PartnerProvider>
      </FavoritesProvider>
      </CartProvider>
      </CustomerAuthProvider>
    </LocationProvider>
    </GenderProvider>
  </QueryClientProvider>
);

export default App;
