import { Badge } from "@medusajs/ui";

import { riskColor } from "../constants";
import type { Risk } from "../types";

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge
      size="2xsmall"
      rounded="full"
      color={riskColor[risk]}
      className="!h-6 !items-center !border-[0.5px] px-2.5 text-[14px] font-normal leading-5 tracking-[-0.06px]"
    >
      {risk}
    </Badge>
  );
}
