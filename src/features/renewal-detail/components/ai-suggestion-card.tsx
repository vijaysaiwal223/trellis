import { Text } from "@medusajs/ui";

import { AssetIcon } from "@/components/ui/asset-icon";
import { iconPath } from "@/lib/assets";

const GRADIENT_BG = "linear-gradient(90deg, #ffedd5 0%, #ffe4e6 33%, #ede9fe 66%, #dbeafe 100%)";
const GRADIENT_TEXT = "linear-gradient(90deg, #9a3412 0%, #9f1239 33%, #5b21b6 66%, #1e40af 100%)";

export function AiSuggestionCard({ text }: { text: string }) {
  return (
    <div
      className="flex w-full items-center rounded-lg border-[0.5px] border-black/10 px-3 py-3"
      style={{ backgroundImage: GRADIENT_BG }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex w-full items-center gap-2">
          <AssetIcon src={iconPath("ai-bloom")} alt="" size={17} />
          <Text
            as="span"
            className="flex-1 bg-clip-text text-[14px] font-medium leading-[1.6] text-transparent"
            style={{ backgroundImage: GRADIENT_TEXT }}
          >
            Trellis AI suggestion based on the data
          </Text>
        </div>
        <Text
          as="span"
          className="w-full bg-clip-text text-[14px] leading-5 tracking-[-0.07px] text-transparent"
          style={{ backgroundImage: GRADIENT_TEXT }}
        >
          {text}
        </Text>
      </div>
    </div>
  );
}
