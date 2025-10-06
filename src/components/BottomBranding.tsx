const BottomBranding = () => {
  const quickLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border py-6 px-6 bottom-branding">
      {/* Quick Navigation Links */}
      <div className="flex justify-center sm:justify-end items-center gap-2 text-sm md:text-base text-muted">
        {quickLinks.map((link, index) => (
          <span key={link.label} className="flex items-center gap-2">
            <a
              href={link.href}
              className="uppercase tracking-wider text-secondary font-medium"
            >
              {link.label}
            </a>
            {index < quickLinks.length - 1 && (
              <span className="text-secondary">/</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BottomBranding;
