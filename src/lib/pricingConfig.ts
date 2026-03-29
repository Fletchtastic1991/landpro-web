export interface PricingConfig {
  baseRate: number;
  vegetation: {
    light: number;
    medium: number;
    heavy: number;
  };
  terrain: {
    flat: number;
    slight_slope: number;
    steep: number;
  };
  accessibility: {
    easy: number;
    moderate: number;
    difficult: number;
  };
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  baseRate: 0.10,
  vegetation: {
    light: 1.0,
    medium: 1.5,
    heavy: 2.5,
  },
  terrain: {
    flat: 1.0,
    slight_slope: 1.25,
    steep: 1.75,
  },
  accessibility: {
    easy: 1.0,
    moderate: 1.25,
    difficult: 1.5,
  },
};
