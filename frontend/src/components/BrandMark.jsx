/** The Střední na míru mark (graduation cap). Single-colour, follows currentColor. */
function BrandMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 12L59 26L32 40L5 26Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 36V46C17 53 47 53 47 46V36" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M59 26V43" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="59" cy="46" r="3.5" fill="currentColor" />
    </svg>
  );
}

export default BrandMark;
