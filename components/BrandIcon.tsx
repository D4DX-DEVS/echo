import { icons, type IconName } from "@/lib/icons";

export default function BrandIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}
