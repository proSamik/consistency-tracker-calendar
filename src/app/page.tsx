import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import CalendarPreviewSection from '@/components/CalendarPreviewSection';
import Footer from '@/components/Footer';

/**
 * Home page that showcases the consistency calendar app features
 * and provides login/signup options
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <HeroSection />
      <FeaturesSection />
      <CalendarPreviewSection />
      <Footer />
    </div>
  );
}
