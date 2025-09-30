import BottomBranding from "@/components/BottomBranding";
import heroBg from "@/assets/hero-bg.jpg";

const HomePage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${heroBg})`,
          filter: 'blur(2px)',
        }}
      />
      
      {/* Dark overlay for better text visibility */}
      <div className="fixed inset-0 bg-background/40" />
      
      {/* Content Container */}
      <div className="relative z-10 min-h-screen">
        {/* Main page content will go here */}
        
        {/* Bottom Branding Overlay */}
        <BottomBranding />
      </div>
    </div>
  );
};

export default HomePage;
