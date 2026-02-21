"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider, useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";

import { useHermisStore } from "@/store/hermis-store";
import { useLanguageStore } from "@/store/language-store";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo";

const wagmiConfig = getDefaultConfig({
  appName: "Hermis Atlas",
  projectId,
  chains: [baseSepolia],
  ssr: true,
});

const rainbowkitLocaleMap: Record<string, Parameters<typeof RainbowKitProvider>[0]["locale"]> = {
  en: "en",
  zh: "zh-CN",
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { language } = useLanguageStore();

  const theme = useMemo(
    () =>
      lightTheme({
        accentColor: "#7c5cff",
        accentColorForeground: "#0c1224",
        borderRadius: "large",
        overlayBlur: "large",
      }),
    []
  );

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{ appName: "Hermis Atlas" }}
          locale={rainbowkitLocaleMap[language]}
          modalSize="compact"
          theme={theme}
        >
          <WalletStateBridge />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function WalletStateBridge() {
  const { address } = useAccount();
  const setWalletAddress = useHermisStore((state) => state.setWalletAddress);

  useEffect(() => {
    setWalletAddress(address ?? null);
  }, [address, setWalletAddress]);

  return null;
}
