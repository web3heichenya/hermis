export type AppNavItem = {
  href: string;
  labelKey: string;
  icon: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "icon-dashboard" },
  { href: "/tasks", labelKey: "nav.tasks", icon: "icon-tasks" },
  { href: "/review", labelKey: "nav.review", icon: "icon-review" },
  { href: "/market", labelKey: "nav.market", icon: "icon-market" },
  { href: "/profile", labelKey: "nav.profile", icon: "icon-profile" },
];
