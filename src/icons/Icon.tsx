// React twin of Icon.astro (same paths, same stroke rules).
import { ICONS, type IconName } from "./set";

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon${className ? ` ${className}` : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}
