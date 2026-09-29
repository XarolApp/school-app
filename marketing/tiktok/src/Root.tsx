import { Composition } from "remotion";
import { Promo } from "./Promo";

// 10 s vertical for TikTok / Reels / Shorts.
export const Root: React.FC = () => (
  <Composition id="Promo" component={Promo} durationInFrames={300} fps={30} width={1080} height={1920} />
);
