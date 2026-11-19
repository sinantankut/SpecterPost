/**
 * SpecterPost design tokens: "paper and ink".
 *
 * A quiet editorial palette: paper ground, ink text, one brick accent.
 * Square photographs, hairline rules, condensed titles over a serif body.
 * Light ("paper") and dark ("night") follow the system setting.
 */
import { useColorScheme } from 'react-native';

export const palettes = {
  light: {
    mode: 'light',
    paper: '#F4F3F0',
    paperRaised: '#FFFFFF',
    paperSunken: '#E7E5E0',
    ink: '#15171A',
    inkMuted: '#4A4F57',
    inkFaint: '#8A8780',
    rule: '#D4D2CC',
    edge: '#8A8780',
    brick: '#A23724',
    brickDeep: '#7A2B22',
    onBrick: '#FFFFFF',
    brickTint: '#EFDAD5',
    amber: '#BE7A18',
    amberTint: '#F3E4C9',
    dusk: '#2B6AA8',
    duskTint: '#E3ECF5',
    moss: '#5E7A2A',
    scrim: 'rgba(21,23,26,0.45)',
  },
  dark: {
    mode: 'dark',
    paper: '#14161A',
    paperRaised: '#1C1F25',
    paperSunken: '#0E1013',
    ink: '#ECEBE7',
    inkMuted: '#A5A9B1',
    inkFaint: '#7C818B',
    rule: '#2F333B',
    edge: '#7C818B',
    brick: '#E58B77',
    brickDeep: '#F2B3A3',
    onBrick: '#1A0F0C',
    brickTint: '#3A211C',
    amber: '#E0A04A',
    amberTint: '#3A2D14',
    dusk: '#7FA7D6',
    duskTint: '#1D2A3A',
    moss: '#A9B96A',
    scrim: 'rgba(0,0,0,0.6)',
  },
};

export const fonts = {
  display: 'FiraSansCondensed_700Bold',
  displaySemi: 'FiraSansCondensed_600SemiBold',
  sans: 'FiraSans_400Regular',
  sansSemi: 'FiraSans_600SemiBold',
  serif: 'SourceSerif4_400Regular',
  serifItalic: 'SourceSerif4_400Regular_Italic',
  serifSemi: 'SourceSerif4_600SemiBold',
};

export const type = {
  titleL: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  titleM: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  titleS: { fontFamily: fonts.displaySemi, fontSize: 21, lineHeight: 26 },
  lede: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
  body: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26 },
  ui: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  uiSemi: { fontFamily: fonts.sansSemi, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, textTransform: 'uppercase' },
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };
export const radius = { none: 0, sm: 2, md: 4, pill: 999 };

export const useTheme = () => {
  const scheme = useColorScheme();
  return palettes[scheme === 'dark' ? 'dark' : 'light'];
};
