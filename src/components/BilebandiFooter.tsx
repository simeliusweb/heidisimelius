import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";

const BilebandiFooter = () => {
  return (
    <footer className="w-full mt-16">
      {/* Image Section - Full width, no overlays */}
      <div className="w-full h-64 md:h-80 lg:h-96">
        <img 
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=2070&auto=format&fit=crop"
          alt="Band performing live"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Links Bar with Custom Gradient */}
      <div className="w-full bg-[linear-gradient(270deg,hsl(234deg_23.8%_8.2%)_0%,hsl(234deg_22%_9%)_8%,hsl(234deg_21%_10%)_17%,hsl(233deg_20%_10%)_25%,hsl(234deg_20%_11%)_33%,hsl(234deg_19%_12%)_42%,hsl(235deg_18.8%_12.5%)_50%,hsl(234deg_19%_12%)_58%,hsl(234deg_20%_11%)_67%,hsl(233deg_20%_10%)_75%,hsl(234deg_21%_10%)_83%,hsl(234deg_22%_9%)_92%,hsl(234deg_23.8%_8.2%)_100%)] p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Homepage Link */}
          <Link 
            to="/"
            className="uppercase tracking-wider hover:text-primary transition-colors font-medium text-sm text-muted"
          >
            • ETUSIVULLE •
          </Link>

          {/* Instagram Icon */}
          <a
            href="https://www.instagram.com/heidiandthehotstuff/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Seuraa Heidi & The Hot Stuff Instagramissa"
          >
            <FaInstagram size={28} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default BilebandiFooter;
