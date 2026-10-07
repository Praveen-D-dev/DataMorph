import { Injectable, signal } from "@angular/core";

export type ThemeId = "dark-modern" | "one-dark" | "dracula" | "monokai";

export interface CustomPalette {
  bgBase: string;
  bgSurface: string;
  accentPrimary: string;
  accentSecondary: string;
  accentCyan: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tag: string;
  description: string;
  baseBg: string;
  cardBg: string;
  accent: string;
  accentSecondary: string;
  swatches: string[];
}

export interface WallpaperPreset {
  id: string;
  name: string;
  previewGradient: string;
  backgroundCss: string;
}

export const THEME_DEFAULT_PALETTES: Record<ThemeId, CustomPalette> = {
  "dark-modern": {
    bgBase: "#080c14",
    bgSurface: "#0f172a",
    accentPrimary: "#0284c7",
    accentSecondary: "#6366f1",
    accentCyan: "#06b6d4"
  },
  "one-dark": {
    bgBase: "#181a1f",
    bgSurface: "#21252b",
    accentPrimary: "#61afef",
    accentSecondary: "#98c379",
    accentCyan: "#56b6c2"
  },
  "dracula": {
    bgBase: "#191a21",
    bgSurface: "#21222c",
    accentPrimary: "#bd93f9",
    accentSecondary: "#ff79c6",
    accentCyan: "#8be9fd"
  },
  "monokai": {
    bgBase: "#141414",
    bgSurface: "#1e1f1c",
    accentPrimary: "#e6db74",
    accentSecondary: "#fd971f",
    accentCyan: "#66d9ef"
  }
};

@Injectable({
  providedIn: "root"
})
export class ThemeService {
  readonly themes: ThemeOption[] = [
    {
      id: "dark-modern",
      name: "Dark Modern",
      tag: "VS Code Classic",
      description: "Default cool slate glass with vibrant electric blue & indigo accents",
      baseBg: "#080c14",
      cardBg: "rgba(15, 23, 42, 0.75)",
      accent: "#0284c7",
      accentSecondary: "#6366f1",
      swatches: ["#080c14", "#0f172a", "#0284c7", "#6366f1", "#06b6d4"]
    },
    {
      id: "one-dark",
      name: "One Dark Pro",
      tag: "Cyber Obsidian",
      description: "Atom / One Dark deep charcoal with neon cyan, emerald & coral glows",
      baseBg: "#181a1f",
      cardBg: "rgba(33, 37, 43, 0.80)",
      accent: "#61afef",
      accentSecondary: "#98c379",
      swatches: ["#181a1f", "#21252b", "#61afef", "#98c379", "#56b6c2"]
    },
    {
      id: "dracula",
      name: "Dracula",
      tag: "Vampire Purple",
      description: "Iconic gothic dark theme with electric violet, hot pink & mint highlights",
      baseBg: "#191a21",
      cardBg: "rgba(40, 42, 54, 0.82)",
      accent: "#bd93f9",
      accentSecondary: "#ff79c6",
      swatches: ["#191a21", "#21222c", "#bd93f9", "#ff79c6", "#8be9fd"]
    },
    {
      id: "monokai",
      name: "Monokai Pro",
      tag: "High Contrast",
      description: "Warm charcoal with vivid amber gold, chartreuse lime & magenta punch",
      baseBg: "#141414",
      cardBg: "rgba(39, 40, 34, 0.84)",
      accent: "#e6db74",
      accentSecondary: "#fd971f",
      swatches: ["#141414", "#1e1f1c", "#e6db74", "#fd971f", "#66d9ef"]
    }
  ];

  readonly presets: WallpaperPreset[] = [
    {
      id: "cosmic",
      name: "Cosmic Nebula",
      previewGradient: "linear-gradient(135deg, #090a1a, #1f1147, #0d2847)",
      backgroundCss: "radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.25), transparent 60%), radial-gradient(ellipse at bottom right, rgba(236, 72, 153, 0.20), transparent 60%), radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15), transparent 70%)"
    },
    {
      id: "cyber-grid",
      name: "Cyber Matrix",
      previewGradient: "linear-gradient(135deg, #050b14, #0a2540, #04101e)",
      backgroundCss: "linear-gradient(rgba(6, 182, 212, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.08) 1px, transparent 1px), radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.20), transparent 70%)"
    },
    {
      id: "aurora",
      name: "Aurora Glow",
      previewGradient: "linear-gradient(135deg, #03141e, #0a332a, #05241b)",
      backgroundCss: "radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.22), transparent 50%), radial-gradient(circle at 80% 40%, rgba(6, 182, 212, 0.20), transparent 55%), radial-gradient(circle at 50% 90%, rgba(139, 92, 246, 0.18), transparent 60%)"
    }
  ];

  currentTheme = signal<ThemeId>("dark-modern");
  activePalette = signal<CustomPalette>({ ...THEME_DEFAULT_PALETTES["dark-modern"] });

  wallpaperImage = signal<string | null>(null);
  wallpaperPresetId = signal<string | null>("cosmic");
  wallpaperBlur = signal<number>(6); // px
  wallpaperOpacity = signal<number>(0.25);

  constructor() {
    this.initThemeFromStorage();
  }

  private initThemeFromStorage() {
    if (typeof window === "undefined") return;

    try {
      const savedTheme = localStorage.getItem("datamorph_theme") as ThemeId | null;
      const targetTheme: ThemeId = (savedTheme && this.themes.some((t) => t.id === savedTheme)) ? savedTheme : "dark-modern";
      this.setTheme(targetTheme);

      const savedWallpaper = localStorage.getItem("datamorph_wallpaper");
      if (savedWallpaper) {
        this.wallpaperImage.set(savedWallpaper);
        this.wallpaperPresetId.set(null);
      } else {
        const savedPreset = localStorage.getItem("datamorph_wallpaper_preset");
        if (savedPreset) {
          this.wallpaperPresetId.set(savedPreset);
        }
      }

      const savedBlur = localStorage.getItem("datamorph_wallpaper_blur");
      if (savedBlur) this.wallpaperBlur.set(parseInt(savedBlur, 10) || 6);

      const savedOpacity = localStorage.getItem("datamorph_wallpaper_opacity");
      if (savedOpacity) this.wallpaperOpacity.set(parseFloat(savedOpacity) || 0.25);
    } catch {}
  }

  setTheme(themeId: ThemeId) {
    this.currentTheme.set(themeId);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeId);
      document.body.setAttribute("data-theme", themeId);
    }

    // Load custom palette for this theme if user previously tailored it
    let loadedPalette = { ...THEME_DEFAULT_PALETTES[themeId] };
    try {
      localStorage.setItem("datamorph_theme", themeId);
      const savedCustom = localStorage.getItem(`datamorph_palette_${themeId}`);
      if (savedCustom) {
        loadedPalette = { ...loadedPalette, ...JSON.parse(savedCustom) };
      }
    } catch {}

    this.activePalette.set(loadedPalette);
    this.applyPaletteToDom(loadedPalette);
  }

  updatePaletteColor(key: keyof CustomPalette, color: string) {
    const updated = {
      ...this.activePalette(),
      [key]: color
    };
    this.activePalette.set(updated);
    this.applyPaletteToDom(updated);

    try {
      const themeId = this.currentTheme();
      localStorage.setItem(`datamorph_palette_${themeId}`, JSON.stringify(updated));
    } catch {}
  }

  resetActivePalette() {
    const themeId = this.currentTheme();
    const defaultPal = { ...THEME_DEFAULT_PALETTES[themeId] };
    this.activePalette.set(defaultPal);
    this.applyPaletteToDom(defaultPal);

    try {
      localStorage.removeItem(`datamorph_palette_${themeId}`);
    } catch {}
  }

  private applyPaletteToDom(palette: CustomPalette) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--bg-base", palette.bgBase);
    root.style.setProperty("--bg-surface", palette.bgSurface);
    root.style.setProperty("--bg-glass", `${palette.bgSurface}cc`);
    root.style.setProperty("--accent-primary", palette.accentPrimary);
    root.style.setProperty("--accent-primary-glow", `${palette.accentPrimary}40`);
    root.style.setProperty("--accent-secondary", palette.accentSecondary);
    root.style.setProperty("--accent-cyan", palette.accentCyan);

    // Update the swatches for the current theme option dynamically
    const currentTh = this.themes.find((t) => t.id === this.currentTheme());
    if (currentTh) {
      currentTh.swatches = [
        palette.bgBase,
        palette.bgSurface,
        palette.accentPrimary,
        palette.accentSecondary,
        palette.accentCyan
      ];
    }
  }

  applyPresetWallpaper(presetId: string) {
    this.wallpaperPresetId.set(presetId);
    this.wallpaperImage.set(null);
    try {
      localStorage.setItem("datamorph_wallpaper_preset", presetId);
      localStorage.removeItem("datamorph_wallpaper");
    } catch {}
  }

  setCustomImageWallpaper(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        return reject(new Error("Selected file must be an image (PNG, JPG, WEBP, SVG, etc.)."));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return reject(new Error("Failed to read image file."));

        this.wallpaperImage.set(dataUrl);
        this.wallpaperPresetId.set(null);

        try {
          localStorage.setItem("datamorph_wallpaper", dataUrl);
          localStorage.removeItem("datamorph_wallpaper_preset");
        } catch {
          console.warn("Wallpaper image stored in memory session (exceeds local storage quota)");
        }
        resolve(dataUrl);
      };
      reader.onerror = () => reject(new Error("FileReader encountered an error reading the image."));
      reader.readAsDataURL(file);
    });
  }

  removeWallpaper() {
    this.wallpaperImage.set(null);
    this.wallpaperPresetId.set(null);
    try {
      localStorage.removeItem("datamorph_wallpaper");
      localStorage.removeItem("datamorph_wallpaper_preset");
    } catch {}
  }

  setWallpaperBlur(blurPx: number) {
    this.wallpaperBlur.set(blurPx);
    try {
      localStorage.setItem("datamorph_wallpaper_blur", blurPx.toString());
    } catch {}
  }

  setWallpaperOpacity(opacity: number) {
    this.wallpaperOpacity.set(opacity);
    try {
      localStorage.setItem("datamorph_wallpaper_opacity", opacity.toString());
    } catch {}
  }

  getActiveTheme(): ThemeOption {
    return this.themes.find((t) => t.id === this.currentTheme()) || this.themes[0];
  }

  getBackgroundStyle(): string {
    const customImg = this.wallpaperImage();
    if (customImg) {
      return `url('${customImg}') center center / cover no-repeat fixed`;
    }

    const presetId = this.wallpaperPresetId();
    if (presetId) {
      const p = this.presets.find((pr) => pr.id === presetId);
      if (p) return p.backgroundCss;
    }

    return "radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.05) 0px, transparent 50%)";
  }
}
