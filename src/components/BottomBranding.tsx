const BottomBranding = () => {
  const quickLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
    { label: "BILEBÄNDI", href: "/bilebandi-heidi-and-the-hot-stuff" },
  ];

  return (
    <div className="bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border py-6 px-6 bottom-branding">
      {/* Quick Navigation Links */}
      <div className="flex justify-end items-center gap-2 text-sm md:text-base text-muted">
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
  );
};

export default BottomBranding;
