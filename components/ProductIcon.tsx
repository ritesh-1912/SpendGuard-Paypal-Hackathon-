import React from "react";
import { 
  Laptop, 
  Keyboard, 
  Headphones, 
  BookOpen, 
  Footprints, 
  Cpu, 
  Cable, 
  Package
} from "lucide-react";

interface Props {
  category: string;
  title?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ProductIcon({ category, title = "", className = "", size = "md" }: Props) {
  const lowerCat = category.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const containerSizes = {
    sm: "h-7 w-7 rounded-md",
    md: "h-10 w-10 rounded-lg",
    lg: "h-12 w-12 rounded-xl",
  };

  let IconComponent = Package;

  if (/keyboard/i.test(lowerTitle)) {
    IconComponent = Keyboard;
  } else if (/headphone|audio|sound/i.test(lowerTitle)) {
    IconComponent = Headphones;
  } else if (/cable|wire/i.test(lowerTitle)) {
    IconComponent = Cable;
  } else if (/hub|adapter|multitool/i.test(lowerTitle)) {
    IconComponent = Cpu;
  } else if (lowerCat === "books" || /book|guide|manual/i.test(lowerTitle)) {
    IconComponent = BookOpen;
  } else if (lowerCat === "apparel" || /shoes|clothing|sneaker/i.test(lowerTitle)) {
    IconComponent = Footprints;
  } else if (lowerCat === "electronics") {
    IconComponent = Laptop;
  }

  return (
    <div
      className={`flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 flex-shrink-0 ${containerSizes[size]} ${className}`}
    >
      <IconComponent className={sizeClasses[size]} />
    </div>
  );
}
