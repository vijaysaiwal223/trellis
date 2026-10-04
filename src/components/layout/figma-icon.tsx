/** A Figma-exported icon, placed with the same inset and nesting as the design file. */
export function FigmaIcon({
  src,
  outer,
  inner,
  className,
}: {
  src: string;
  /** Absolute inset of the artwork inside its 20px box, from the design. */
  outer: string;
  /** Optional nested wrapper for icons whose artwork overflows its box. */
  inner?: string;
  className?: string;
}) {
  return (
    <div className={`absolute ${outer}`}>
      {inner ? (
        <div className={`absolute ${inner}`}>
          <img alt="" className={`block max-w-none size-full ${className ?? ""}`} src={src} />
        </div>
      ) : (
        <img alt="" className={`absolute block inset-0 max-w-none size-full ${className ?? ""}`} src={src} />
      )}
    </div>
  );
}
