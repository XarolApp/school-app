import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS } from "./timeline";
import { VideoB } from "./Video";

// 9:16 for TikTok first, Instagram Reels second. Pass {"music":false} for the no-music export.
export const Root: React.FC = () => (
  <Composition id="VideoB" component={VideoB} durationInFrames={DURATION} fps={FPS} width={1080} height={1920}
    defaultProps={{ music: true }} />
);
