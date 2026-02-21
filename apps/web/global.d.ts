/* eslint-disable @typescript-eslint/no-explicit-any */
import "@types/react";

declare module "three";
declare module "@react-three/fiber";
declare module "three/examples/jsm/postprocessing/EffectComposer.js";
declare module "three/examples/jsm/postprocessing/RenderPass.js";
declare module "three/examples/jsm/postprocessing/UnrealBloomPass.js";

declare global {
  interface Window {
    __hermisLanguage?: "en" | "zh";
  }

  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}

export {};
