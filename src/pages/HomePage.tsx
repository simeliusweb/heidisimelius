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
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Centered Portrait Placeholder - vertically centered between top and BottomBranding */}
        <div className="flex-1 flex items-center justify-center pb-32">
          <div className="w-64 h-96 md:w-80 md:h-[30rem] bg-card/50 backdrop-blur-sm border-2 border-primary/30 rounded-lg flex items-center justify-center">
            <span className="text-muted text-sm">Portrait Placeholder</span>
          </div>
        </div>
        
        {/* Bottom Branding Overlay */}
        <BottomBranding />
      </div>
    </div>
  );
};

export default HomePage;
