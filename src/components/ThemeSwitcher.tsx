import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type ThemeName, useTheme } from "@/contexts/ThemeContext";

type ThemeOption = {
  value: ThemeName;
  label: string;
  swatch: [string, string];
};

const themeOptions: ThemeOption[] = [
  { value: "default-dark", label: "Default Dark", swatch: ["#0f172a", "#1e293b"] },
  { value: "midnight", label: "Midnight", swatch: ["#0a0f2c", "#1e1b4b"] },
  { value: "forest", label: "Forest", swatch: ["#0f2418", "#1f3b2a"] },
  { value: "blood-moon", label: "Blood Moon", swatch: ["#2b0f12", "#4c1d1d"] },
  { value: "azorius", label: "Azorius", swatch: ["#eef3ff", "#c7d7ff"] },
  { value: "dimir", label: "Dimir", swatch: ["#140f1f", "#2a1b3d"] },
  { value: "selesnya", label: "Selesnya", swatch: ["#f4f1e6", "#cbe6c4"] },
];

function ThemeSwatch({ colors }: { colors: [string, string] }) {
  return (
    <span
      className="h-3.5 w-3.5 rounded-sm border border-border"
      style={{
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}
    />
  );
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const active = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("w-full justify-between", className)}
        >
          <span className="flex items-center gap-2">
            <ThemeSwatch colors={active.swatch} />
            <span className="text-sm">{active.label}</span>
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeName)}>
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <ThemeSwatch colors={option.swatch} />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
