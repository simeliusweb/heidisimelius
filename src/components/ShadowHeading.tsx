interface ShadowHeadingProps {
  title: string;
  shadowColorClass: string; // e.g., "accent" or "primary"
  shadowOpacity: number; // A number from 0 to 100 in steps of 10
}

const ShadowHeading = ({
  title,
  shadowColorClass,
  shadowOpacity,
}: ShadowHeadingProps) => {
  // Construct the dynamic Tailwind class for the shadow
  const shadowClass = `text-${shadowColorClass} opacity-${shadowOpacity}`;

  return (
    <div className="relative mb-8 sm:mb-12 mx-auto w-fit">
      {/* Shadow Layer */}
      <h2
        className={`absolute top-[3px] left-[-2px] xs:top-[5px] xs:left-[-3px] lg:top-[6px] lg:left-[-4px] text-4xl xs:text-5xl lg:text-6xl font-sans font-extrabold text-center ${shadowClass}`}
        aria-hidden="true" // Hide from screen readers as it's decorative
      >
        {title}
      </h2>

      {/* Foreground Layer */}
      <h2 className="relative z-10 text-4xl xs:text-5xl lg:text-6xl font-sans font-extrabold text-foreground text-center">
        {title}
      </h2>
    </div>
  );
};

export default ShadowHeading;
