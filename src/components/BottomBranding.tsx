const BottomBranding = () => {
  const quickLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-8 px-6">
      <div className="container mx-auto text-center">
        {/* Large Stylized Name */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-playfair text-primary mb-2">
          Heidi Simelius
        </h2>
        
        {/* Quick Navigation Links */}
        <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted">
          {quickLinks.map((link, index) => (
            <span key={link.label} className="flex items-center gap-2">
              <a
                href={link.href}
                className="uppercase tracking-wider hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </a>
              {index < quickLinks.length - 1 && (
                <span className="text-muted">/</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomBranding;
