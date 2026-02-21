"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";

import { useHermisStore } from "@/store/hermis-store";
import { useLanguageStore } from "@/store/language-store";

import { APP_NAV_ITEMS } from "./app-navigation";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Avatar from "boring-avatars";

type Language = "en" | "zh";

export function AppHeader() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const [languageOpen, setLanguageOpen] = useState(false);
  const pathname = usePathname() ?? "/dashboard";

  const { address } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const user = useHermisStore((state) => state.user);
  const setWalletAddress = useHermisStore((state) => state.setWalletAddress);

  useEffect(() => {
    if (address) {
      setWalletAddress(address);
    }
  }, [address, setWalletAddress]);

  const languageOptions = useMemo(
    () => [{ value: "en" as Language }, { value: "zh" as Language }],
    []
  );

  const navItems = useMemo(() => APP_NAV_ITEMS, []);

  const handleLanguageChange = (nextLocale: Language) => {
    if (nextLocale === language) {
      setLanguageOpen(false);
      return;
    }

    // This will trigger i18n.changeLanguage through the store
    setLanguage(nextLocale);
    setLanguageOpen(false);
  };

  return (
    <header className="border-border/40 from-background/95 via-background/80 to-background/95 sticky top-0 z-40 w-full border-b bg-gradient-to-br backdrop-blur">
      <div className="mx-auto flex w-full items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10 xl:px-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold tracking-[0.28em] uppercase"
        >
          <Image
            src="/logo.png"
            alt="Hermis logo"
            width={32}
            height={32}
            className="size-8 rounded-lg"
            priority
          />
          <span className="border-border/40 bg-background/60 text-primary rounded-xl border px-3 py-1">
            Hermis
          </span>
          <span className="text-muted-foreground/80 hidden sm:inline">Atlas</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t("header.language.label")}
                className="border-border/40 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-xs tracking-[0.2em] uppercase"
              >
                <svg className="size-4" aria-hidden>
                  <use href="#icon-globe" />
                </svg>
                <span className="hidden sm:inline">{t(`header.language.short.${language}`)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="border-border/40 bg-background/95 w-44 rounded-2xl border p-2 text-xs shadow-lg backdrop-blur"
            >
              {languageOptions.map((option) => {
                const isActive = option.value === language;
                const optionLabel = t(`header.language.options.${option.value}`);
                return (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    aria-pressed={isActive}
                    className={`w-full justify-between rounded-xl tracking-[0.18em] uppercase ${
                      isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}
                    onClick={() => handleLanguageChange(option.value)}
                  >
                    {optionLabel}
                    {isActive && <span>•</span>}
                  </Button>
                );
              })}
            </PopoverContent>
          </Popover>
          <ThemeToggle />
          <ConnectArea
            username={user.username}
            onDisconnect={async () => {
              await disconnectAsync();
              setWalletAddress(null);
            }}
          />
        </div>
      </div>
    </header>
  );
}

type ConnectAreaProps = {
  username: string;
  onDisconnect: () => Promise<void>;
};

function ConnectArea({ username, onDisconnect }: ConnectAreaProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        authenticationStatus,
        openAccountModal,
        openConnectModal,
        openChainModal,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!connected) {
          return (
            <Button
              type="button"
              onClick={openConnectModal}
              className="border-primary/60 shadow-primary/30 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.24em] uppercase shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              {t("header.wallet.connect")}
            </Button>
          );
        }

        const unsupported = chain?.unsupported;

        return (
          <div className="flex items-center gap-2">
            {unsupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openChainModal}
                className="border-destructive/60 bg-background/60 text-destructive hover:border-destructive hover:text-destructive/80 rounded-full px-3 py-2 text-xs tracking-[0.2em] uppercase"
              >
                {t("wallet.statusBar.wrongNetwork")}
              </Button>
            )}
            <Popover open={accountOpen} onOpenChange={setAccountOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border/40 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center gap-2 rounded-full px-3 text-xs"
                >
                  <span className="hidden truncate text-sm font-medium sm:inline">{username}</span>
                  <Avatar name={username ?? "0x"} className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="border-border/40 bg-background/95 w-56 rounded-2xl border p-2 text-sm shadow-xl backdrop-blur"
              >
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary mt-1 flex w-full items-center justify-between rounded-xl px-4 py-2"
                  onClick={() => {
                    setAccountOpen(false);
                    router.push("/profile");
                  }}
                >
                  <span>{t("header.user.profile")}</span>
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary mt-1 flex w-full items-center justify-between rounded-xl px-4 py-2"
                  onClick={() => {
                    setAccountOpen(false);
                    openAccountModal();
                  }}
                >
                  <span>{t("header.user.manageWallet")}</span>
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 mt-1 flex w-full items-center justify-between rounded-xl px-4 py-2"
                  onClick={async () => {
                    setAccountOpen(false);
                    await onDisconnect();
                  }}
                >
                  <span>{t("header.user.logout")}</span>
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
