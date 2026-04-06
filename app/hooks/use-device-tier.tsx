import * as React from "react";

export const PHONE_MAX_WIDTH = 767;
export const TABLET_MAX_WIDTH = 1023;

export type DeviceTier = "phone" | "tablet" | "desktop";

function resolveTier(width: number): DeviceTier {
  if (width <= PHONE_MAX_WIDTH) return "phone";
  if (width <= TABLET_MAX_WIDTH) return "tablet";
  return "desktop";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = React.useState<DeviceTier>(() => {
    if (typeof window === "undefined") return "desktop";
    return resolveTier(window.innerWidth);
  });

  React.useEffect(() => {
    const phoneQuery = window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`);
    const tabletQuery = window.matchMedia(`(max-width: ${TABLET_MAX_WIDTH}px)`);

    const onChange = () => setTier(resolveTier(window.innerWidth));

    phoneQuery.addEventListener("change", onChange);
    tabletQuery.addEventListener("change", onChange);
    onChange();

    return () => {
      phoneQuery.removeEventListener("change", onChange);
      tabletQuery.removeEventListener("change", onChange);
    };
  }, []);

  return tier;
}
