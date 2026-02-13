import type { ManaColor } from "@/types";

const WUBRG_ORDER: ManaColor[] = ["W", "U", "B", "R", "G"];

const COLOR_CLASS: Record<string, string> = {
  W: "ms-w",
  U: "ms-u",
  B: "ms-b",
  R: "ms-r",
  G: "ms-g",
  C: "ms-c",
};

interface ManaSymbolsProps {
  colorIdentity: ManaColor[];
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
} as const;

export function ManaSymbols({ colorIdentity, size = "md" }: ManaSymbolsProps) {
  const colors =
    colorIdentity.length === 0
      ? ["C"]
      : WUBRG_ORDER.filter((c) => colorIdentity.includes(c));

  return (
    <span className={`inline-flex items-center gap-0.5 ${SIZE_CLASS[size]}`}>
      {colors.map((color) => (
        <i
          key={color}
          className={`ms ${COLOR_CLASS[color]} inline-block leading-none`}
        />
      ))}
    </span>
  );
}
