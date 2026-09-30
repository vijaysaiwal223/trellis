import Image from "next/image";
import { clx } from "@medusajs/ui";

type AssetIconProps = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
};

export function AssetIcon({ src, alt, size = 20, className }: AssetIconProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={clx("shrink-0", className)}
    />
  );
}
