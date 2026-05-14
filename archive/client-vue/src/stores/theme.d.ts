export interface ThemeConfig {
    name: string;
    label: string;
    type: 'preset' | 'custom';
    dark: boolean;
    primaryStart: string;
    primaryEnd: string;
    accentColor: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgCard: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    borderColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    glassBlur: string;
    glassOpacity: string;
    borderRadius: string;
    borderRadiusSm: string;
    borderWidth: string;
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
    glowPrimary: string;
    transitionFast: string;
    transitionNormal: string;
    animationEnable: boolean;
    fontFamily: string;
}
export declare const presetThemes: Record<string, ThemeConfig>;
export declare const useThemeStore: any;
//# sourceMappingURL=theme.d.ts.map