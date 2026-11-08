import React from "react";
import { 
  Laptop, 
  Keyboard, 
  Headphones, 
  BookOpen, 
  Footprints, 
  Cpu, 
  Cable, 
  Package, 
  Sparkles,
  ShoppingBag
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
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const containerSizes = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-12 w-12 rounded-xl",
    lg: "h-16 w-16 rounded-2xl",
  };

  let IconComponent = Package;
  let bgGradient = "from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-blue-400";

  if (/keyboard/i.test(lowerTitle)) {
    IconComponent = Keyboard;
    bgGradient = "from-cyan-600/20 to-blue-600/20 border-cyan-500/30 text-cyan-400";
  } else if (/headphone|audio|sound/i.test(lowerTitle)) {
    IconComponent = Headphones;
    bgGradient = "from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-400";
  } else if (/cable|wire/i.test(lowerTitle)) {
    IconComponent = Cable;
    bgGradient = "from-emerald-600/20 to-teal-600/20 border-emerald-500/30 text-emerald-400";
  } else if (/hub|adapter|multitool/i.test(lowerTitle)) {
    IconComponent = Cpu;
    bgGradient = "from-blue-600/20 to-violet-600/20 border-blue-500/30 text-blue-400";
  } else if (lowerCat === "books" || /book|guide|manual/i.test(lowerTitle)) {
    IconComponent = BookOpen;
    bgGradient = "from-amber-600/20 to-orange-600/20 border-amber-500/30 text-amber-400";
  } else if (lowerCat === "apparel" || /shoes|clothing|sneaker/i.test(lowerTitle)) {
    IconComponent = Footprints;
    bgGradient = "from-rose-600/20 to-red-600/20 border-rose-500/30 text-rose-400";
  } else if (lowerCat === "electronics") {
    IconComponent = Laptop;
    bgGradient = "from-blue-600/20 to-sky-600/20 border-blue-500/30 text-blue-400";
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br border flex-shrink-0 shadow-inner ${containerSizes[size]} ${bgGradient} ${className}`}
    >
      <IconComponent className={sizeClasses[size]} />
    </div>
  );
}
