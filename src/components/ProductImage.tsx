import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: string;
}

const ProductImage = ({ src, alt, className, iconSize = "w-8 h-8" }: ProductImageProps) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("bg-secondary/50 flex items-center justify-center", className)}>
        <Package className={cn("text-muted-foreground/20", iconSize)} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
};

export default ProductImage;
