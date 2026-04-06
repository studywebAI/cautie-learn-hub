import { useDeviceTier } from "@/hooks/use-device-tier";

export function useIsMobile() {
  const tier = useDeviceTier();
  return tier === "phone";
}
