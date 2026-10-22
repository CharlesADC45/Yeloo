"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBell,
  FiCheckCircle,
  FiCompass,
  FiGrid,
  FiMapPin,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { adminNavItems } from "@/lib/adminNav";
import { getApiBaseUrl } from "@/lib/api";
import { showDeviceNotification } from "@/lib/deviceNotifications";
import { ownerNavItems } from "@/lib/ownerNav";
import { useAuthStore } from "@/stores/authStore";
import {
  getNotificationPrefs,
  getUnreadNotifications,
  useNotificationStore,
} from "@/stores/notificationStore";
import { SiteMenu, SiteMenuButton, type SiteMenuEntry } from "@/components/SiteMenu";
import { YelooWordmark } from "@/components/YelooWordmark";
import { useT } from "@/lib/i18n";

const RECENT_DESTINATIONS_STORAGE_KEY = "yeloo-recent-destinations";

type HomeSearchConfig = {
  compact: boolean;
  value: string;
  showFilterButton: boolean;
  showSuggestions?: boolean;
  suggestions?: Array<{
    value: string;
    title: string;
    subtitle: string;
    tone?: "blue" | "amber" | "emerald";
    kind?: "nearby" | "place";
  }>;
  nearbyRadiusOptions?: number[];
  nearbySearching?: boolean;
  nearbyRadiusKm?: number | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onOpenFilters: () => void;
  onSubmit: () => void;
  onClear?: () => void;
  onSuggestionSelect?: (value: string) => void;
  onNearbyRadiusSelect?: (radiusKm: number) => void;
};

type TopBarProps = {
  homeSearch?: HomeSearchConfig;
  homeTitle?: ReactNode;
  homeSubtitle?: ReactNode;
  ownerShell?: boolean;
  adminShell?: boolean;
};

type ReverseGeocodeResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
  };
};

function YelooBrand() {
  return <YelooWordmark href="/" replace className="shrink-0" />;
}

function LocationBadgeIcon() {
  return (
    <img
      src="/icons/address.png"
      alt=""
      aria-hidden="true"
      className="h-7 w-7 object-contain sm:h-8 sm:w-8"
    />
  );
}

function TopBarContent({
  homeSearch,
  homeTitle,
  homeSubtitle,
  ownerShell = false,
  adminShell = false,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const notificationItems = useNotificationStore((state) => state.items);
  const readByUser = useNotificationStore((state) => state.readByUser);
  const prefsByUser = useNotificationStore((state) => state.prefsByUser);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);
  const isAdminRole = user?.role === "admin";
  const isOwnerRole = user?.role === "proprietaire";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);
  const isOwnerRoute =
    isOwnerRole && (Boolean(ownerShell) || Boolean(pathname?.startsWith("/proprietaire")));
  const isAdminRoute =
    isAdminRole && (Boolean(adminShell) || Boolean(pathname?.startsWith("/admin")));
  const t = useT();
  const isHomeRoute = pathname === "/";
  const showHomeSearch = isHomeRoute && Boolean(homeSearch);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const compactHomeSearch = Boolean(homeSearch?.compact) && (viewportWidth ?? 0) >= 1380;
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const lastDeviceNotificationIdRef = useRef<string | null>(null);

  const actionHref = isAdminRole
    ? "/admin"
    : isOwnerRole
      ? "/proprietaire"
      : "/proprietaire/nouveau";
  const actionLabel = isAdminRole ? "Super admin" : isOwnerRole ? t("ownerSpace") : t("becomeOwner");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Localisation");
  const [recentDestinations, setRecentDestinations] = useState<string[]>([]);
  const notificationPrefs = getNotificationPrefs(prefsByUser, user?.id);
  const notificationsEnabled = notificationPrefs.ownerPostNotifications;
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    router.replace("/connexion?logged_out=1");
  };

  const menuEntries: SiteMenuEntry[] = isAdminRoute
    ? adminNavItems.map(({ href, label, isActive }) => ({ kind: "link", href, label, isActive }))
    : isOwnerRoute
      ? ownerNavItems.map(({ href, label, isActive }) => ({ kind: "link", href, label, isActive }))
      : [
          { kind: "link", href: "/", label: t("homeNav") },
          { kind: "link", href: "/carte", label: t("map"), isActive: (path) => path.startsWith("/carte") },
          isAuthenticated
            ? {
                kind: "group",
                label: t("myYeloo"),
                links: [
                  { href: "/favoris", label: t("favorites") },
                  { href: "/messages", label: t("messages"), isActive: (path) => path.startsWith("/messages") },
                  { href: "/compte", label: t("profile") },
                  { href: "/compte/parametres", label: t("settings") },
                ],
              }
            : { kind: "link", href: "/connexion", label: t("loginOrRegister") },
          {
            kind: "group",
            label: t("forOwners"),
            links: [
              { href: "/proprietaire/nouveau", label: t("publishListing") },
              ...(isOwnerRole ? [{ href: "/proprietaire", label: t("ownerSpace") }] : []),
              ...(isAdminRole ? [{ href: "/admin", label: "Super admin" }] : []),
            ],
          },
        ];
  const menuCta = isOwnerRoute
    ? { href: "/proprietaire/nouveau", label: t("publishListing") }
    : isAdminRoute
      ? { href: "/", label: t("explore") }
      : { href: actionHref, label: actionLabel };

  const visibleNotifications = useMemo(() => {
    if (!user?.id) return [];
    const messageNotifications = notificationItems.filter(
      (item) => item.type === "message" && item.targetUserId === user.id
    );
    const targetedNotifications = notificationItems.filter(
      (item) =>
        (item.type === "visit_request" ||
          item.type === "visit_update" ||
          item.type === "property_status") &&
        item.targetUserId === user.id
    );
    if (isAdminRole) return messageNotifications.concat(targetedNotifications);
    if (isOwnerRole) {
      return notificationItems.filter(
        (item) => item.type === "owner_verification" && item.targetUserId === user.id
      ).concat(messageNotifications, targetedNotifications);
    }
    const ownerPostNotifications = notificationsEnabled
      ? notificationItems.filter((item) => item.type === "owner_post")
      : [];
    return ownerPostNotifications.concat(messageNotifications, targetedNotifications);
  }, [isAdminRole, isOwnerRole, notificationItems, notificationsEnabled, user?.id]);
  const unreadNotifications = useMemo(() => {
    if (!user?.id) return [];
    return getUnreadNotifications(visibleNotifications, readByUser, user.id);
  }, [readByUser, user?.id, visibleNotifications]);

  const notificationPanelState = useMemo(() => {
    if (isOwnerRole) return `${unreadNotifications.length} non lue(s)`;
    if (unreadNotifications.length > 0) return `${unreadNotifications.length} non lue(s)`;
    return notificationsEnabled ? "Aucune alerte non lue" : "Annonces désactivées";
  }, [isOwnerRole, notificationsEnabled, unreadNotifications.length]);

  const showNotificationPreferenceNotice =
    !isAdminRole &&
    !isOwnerRole &&
    !notificationsEnabled &&
    visibleNotifications.length === 0;

  useEffect(() => {
    const [latest] = unreadNotifications;
    if (!latest || latest.id === lastDeviceNotificationIdRef.current) return;
    if (latest.type === "message") return;
    lastDeviceNotificationIdRef.current = latest.id;
    void showDeviceNotification({
      title: latest.title,
      body: latest.message,
      tag: latest.id,
      url: latest.href || (latest.propertyId ? `/logements/${latest.propertyId}` : "/"),
      icon: latest.imageUrl || "/icons/icon-192.png",
    });
  }, [unreadNotifications]);

  useEffect(() => {
    if (!token || !user?.id) return;
    let isMounted = true;

    const refreshUser = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;
        const nextUser = await response.json();
        if (!isMounted) return;

        setUser({
          id: nextUser.id,
          email: nextUser.email,
          full_name: nextUser.full_name,
          phone: nextUser.phone,
          role: nextUser.role,
          profile_image_url: nextUser.profile_image_url,
          is_verified: nextUser.is_verified,
          owner_verification_status: nextUser.owner_verification_status,
        });
      } catch {}
    };

    void refreshUser();

    return () => {
      isMounted = false;
    };
  }, [setUser, token, user?.id]);

  useEffect(() => {
    setIsNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationPanelRef.current?.contains(target)) return;
      if (notificationButtonRef.current?.contains(target)) return;
      setIsNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_DESTINATIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentDestinations(
          parsed.filter((item): item is string => typeof item === "string").slice(0, 4)
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    const formatCoordinate = (value: number) =>
      value.toFixed(2).replace(".", ",");

    const toCoordinateLabel = (latitude: number, longitude: number) =>
      `${formatCoordinate(latitude)} · ${formatCoordinate(longitude)}`;

    const updateLocation = (latitude: number, longitude: number) => {
      setLocationLabel(toCoordinateLabel(latitude, longitude));
    };

    const lastLocation = window.localStorage.getItem("yeloo-last-location");
    if (lastLocation) {
      setLocationLabel(lastLocation);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordinateLabel = toCoordinateLabel(latitude, longitude);
        window.localStorage.setItem("yeloo-last-location", coordinateLabel);
        updateLocation(latitude, longitude);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) return;

          const data = (await response.json()) as ReverseGeocodeResponse;
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.municipality ||
            data.address?.county ||
            data.address?.state;
          const district = data.address?.suburb || data.address?.neighbourhood;
          const nextLabel = [district, city].filter(Boolean).join(", ") || city;

          if (nextLabel) {
            setLocationLabel(nextLabel);
            window.localStorage.setItem("yeloo-last-location", nextLabel);
          }
        } catch {}
      },
      () => {
        if (!lastLocation) {
          setLocationLabel("Ma position");
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 20,
        timeout: 7000,
      }
    );
  }, []);

  const saveRecentDestination = (value: string) => {
    const normalized = value.trim();
    if (!normalized || typeof window === "undefined") return;

    setRecentDestinations((current) => {
      const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 4);
      window.localStorage.setItem(RECENT_DESTINATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderHomeSearchBar = () => {
    if (!homeSearch) return null;

    const hasSuggestions = Boolean(homeSearch.suggestions?.length);
    const hasRecentDestinations = recentDestinations.length > 0;
    const showSuggestionsPanel =
      Boolean(homeSearch.showSuggestions) && (hasSuggestions || hasRecentDestinations);
    const expandedSearchWidth = showSuggestionsPanel || homeSearch.showFilterButton ? 800 : 760;
    const panelMaxWidth = compactHomeSearch ? 760 : expandedSearchWidth;
    const popularSuggestions = homeSearch.suggestions ?? [];

    return (
      <motion.div
        initial={false}
        animate={{
          scale: compactHomeSearch ? 0.91 : 1,
          opacity: 1,
          y: compactHomeSearch ? -8 : 0,
          maxWidth: panelMaxWidth,
        }}
        transition={{ type: "spring", stiffness: 125, damping: 22, mass: 0.84 }}
        className="pointer-events-none mx-auto w-full"
        style={{ transformOrigin: "center center" }}
      >
        <div className="pointer-events-auto relative">
          <div
            className={`bg-white/94 backdrop-blur-md shadow-[0_18px_45px_rgba(10,23,42,0.10)] ${
              compactHomeSearch
                ? "rounded-full border border-neutral-200/70 p-0"
                : "rounded-[2rem] p-0"
            }`}
          >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveRecentDestination(homeSearch.value);
              homeSearch.onSubmit();
            }}
            className={`flex w-full flex-nowrap items-center gap-2 rounded-full bg-white px-4 text-sm ${
              compactHomeSearch ? "py-2" : "py-2.5"
            }`}
          >
            <div className="min-w-0 flex-1 px-2">
              <motion.div
                key="home-field"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-800">
                  Destination
                </p>
                <input
                  value={homeSearch.value}
                  onChange={homeSearch.onChange}
                  onFocus={homeSearch.onFocus}
                  onBlur={homeSearch.onBlur}
                  placeholder={compactHomeSearch ? "N'importe où" : "Rechercher une destination"}
                  className={`mt-0.5 min-w-0 w-full bg-transparent outline-none ${
                    compactHomeSearch
                      ? "text-[13px] font-medium text-neutral-800 placeholder:text-neutral-500"
                      : "text-sm text-neutral-700 placeholder:text-neutral-400"
                  }`}
                />
              </motion.div>
            </div>

            {homeSearch.value.trim() && (
              <button
                type="button"
                onClick={homeSearch.onClear}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="Effacer la recherche"
                title="Effacer"
              >
                <FiX className="h-4.5 w-4.5" />
              </button>
            )}

            <AnimatePresence initial={false}>
              {homeSearch.showFilterButton && (
                <motion.button
                  key="home-filter-btn"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={homeSearch.onOpenFilters}
                  initial={{ width: 0, opacity: 0, scale: 0.9 }}
                  animate={{
                    width: compactHomeSearch ? 0 : 92,
                    opacity: compactHomeSearch ? 0 : 1,
                    scale: compactHomeSearch ? 0.9 : 1,
                  }}
                  exit={{ width: 0, opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 overflow-hidden rounded-full border border-neutral-200 px-0 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Filtres
                </motion.button>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              aria-label="Rechercher"
              title="Rechercher"
            >
              <FiSearch className="h-5 w-5" />
            </button>
          </form>
          </div>

          <AnimatePresence initial={false}>
            {showSuggestionsPanel ? (
              <motion.div
                key="home-suggestions-panel"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 10, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.985 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
              >
                <div className="max-h-[24rem] overflow-y-auto px-3 py-3">
                  <div className="space-y-4">
                    {recentDestinations.length > 0 ? (
                      <div>
                        <p className="px-3 pb-2 text-xs font-semibold text-neutral-700 sm:text-sm">
                          Recherches récentes
                        </p>
                        <div className="space-y-1">
                          {recentDestinations.map((value) => (
                            <button
                              key={`recent-${value}`}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                saveRecentDestination(value);
                                homeSearch.onSuggestionSelect?.(value);
                              }}
                              className="flex w-full items-center gap-4 rounded-[1.4rem] px-3 py-3 text-left transition hover:bg-neutral-50"
                            >
                              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-blue-50 text-blue-600">
                                <FiSearch className="h-5 w-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold leading-tight text-neutral-900 sm:text-base">
                                  {value}
                                </span>
                                <span className="mt-1 block text-xs text-neutral-500 sm:text-sm">
                                  Votre dernière recherche
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {popularSuggestions.length > 0 ? (
                      <div>
                        <p className="px-3 pb-2 text-xs font-semibold text-neutral-700 sm:text-sm">
                          Suggestions de destinations
                        </p>
                        <div className="space-y-1">
                          {popularSuggestions.map((suggestion) => {
                            const isNearbySuggestion = suggestion.kind === "nearby";
                            const toneClass =
                              suggestion.tone === "amber"
                                ? "bg-amber-50 text-amber-600"
                                : suggestion.tone === "emerald"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-blue-50 text-blue-600";

                            if (isNearbySuggestion) {
                              return (
                                <div
                                  key={`${suggestion.value}-${suggestion.title}`}
                                  className="overflow-hidden rounded-[1.5rem] bg-neutral-50 p-3"
                                >
                                  <button
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      homeSearch.onNearbyRadiusSelect?.(
                                        homeSearch.nearbyRadiusKm ||
                                          homeSearch.nearbyRadiusOptions?.[0] ||
                                          1
                                      );
                                    }}
                                    className="flex w-full items-center gap-4 text-left"
                                  >
                                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-blue-50 text-blue-600">
                                      {homeSearch.nearbySearching && (
                                        <>
                                          <motion.span
                                            className="absolute inset-0 rounded-[1.2rem] border border-blue-600/35"
                                            animate={{
                                              scale: [0.82, 1.35, 1.65],
                                              opacity: [0.8, 0.25, 0],
                                            }}
                                            transition={{
                                              duration: 1.35,
                                              repeat: Infinity,
                                              ease: "easeOut",
                                            }}
                                          />
                                          <motion.span
                                            className="absolute inset-1 rounded-[1rem] bg-blue-600/10"
                                            animate={{
                                              scale: [0.8, 1.25, 1.5],
                                              opacity: [0.75, 0.28, 0],
                                            }}
                                            transition={{
                                              duration: 1.35,
                                              repeat: Infinity,
                                              delay: 0.42,
                                              ease: "easeOut",
                                            }}
                                          />
                                        </>
                                      )}
                                      <FiCompass className="relative h-5 w-5" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-base font-semibold leading-tight text-neutral-900 sm:text-lg">
                                        {homeSearch.nearbySearching
                                          ? `Recherche ${homeSearch.nearbyRadiusKm ?? ""} km`
                                          : suggestion.title}
                                      </span>
                                      <span className="mt-1 block text-xs text-neutral-500 sm:text-sm">
                                        {homeSearch.nearbySearching
                                          ? "La carte se prépare avec les logements proches."
                                          : suggestion.subtitle}
                                      </span>
                                    </span>
                                  </button>
                                  <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
                                    {(homeSearch.nearbyRadiusOptions ?? [1, 5, 15, 30]).map((radius) => (
                                      <button
                                        key={radius}
                                        type="button"
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          homeSearch.onNearbyRadiusSelect?.(radius);
                                        }}
                                        className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                                          homeSearch.nearbyRadiusKm === radius
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-blue-50 hover:text-blue-700"
                                        }`}
                                      >
                                        {radius} km
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={`${suggestion.value}-${suggestion.title}`}
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  saveRecentDestination(suggestion.value);
                                  homeSearch.onSuggestionSelect?.(suggestion.value);
                                }}
                                className="flex w-full items-center gap-4 rounded-[1.4rem] px-3 py-3 text-left transition hover:bg-neutral-50"
                              >
                                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] ${toneClass}`}>
                                  {suggestion.tone === "amber" ? (
                                    <FiGrid className="h-5 w-5" />
                                  ) : suggestion.tone === "emerald" ? (
                                    <FiMapPin className="h-5 w-5" />
                                  ) : (
                                    <FiCompass className="h-5 w-5" />
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-base font-semibold leading-tight text-neutral-900 sm:text-lg">
                                    {suggestion.title}
                                  </span>
                                  <span className="mt-1 block text-xs text-neutral-500 sm:text-sm">
                                    {suggestion.subtitle}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[999] bg-white/90 backdrop-blur-md ${
          showHomeSearch || !isHomeRoute ? "border-b border-neutral-200" : ""
        }`}
      >
        <div className="w-full px-4 sm:px-8 lg:px-10">
          <div className={`flex items-center justify-between py-4 ${isOwnerRoute ? "lg:px-0" : ""}`}>
            <div
              className={`flex items-center gap-2 ${
                isOwnerRoute ? "lg:w-72 lg:px-6" : ""
              }`}
            >
              <YelooBrand />
              <Link
                href="/carte"
                replace
                className="ml-1 inline-flex items-center rounded-full px-1.5 py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-50 sm:pr-2.5"
              >
                <span className="mr-1 flex shrink-0 items-center justify-center rounded-full text-blue-600">
                  <LocationBadgeIcon />
                </span>
                {(viewportWidth === null || viewportWidth >= 445) && (
                  <span className="whitespace-nowrap">{locationLabel}</span>
                )}
              </Link>
            </div>
            <div
              className={`relative z-20 flex items-center gap-2 ${
                isOwnerRoute ? "lg:pr-8" : ""
              }`}
            >
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    ref={notificationButtonRef}
                    type="button"
                    onClick={() => setIsNotificationsOpen((value) => !value)}
                    className="relative flex h-12 w-12 items-center justify-center text-blue-700 sm:h-[3.25rem] sm:w-[3.25rem]"
                    aria-label="Notifications"
                  >
                    <FiBell className="h-6 w-6" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                        {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        ref={notificationPanelRef}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="fixed left-3 right-3 top-20 z-[1100] mx-auto max-w-sm overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:mx-0 sm:w-[min(24rem,calc(100vw-2rem))]"
                      >
                      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{t("notifications")}</p>
                          <p className="text-xs text-neutral-500">
                            {notificationPanelState}
                          </p>
                        </div>
                        {visibleNotifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => user?.id && markAllRead(user.id)}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Tout lire
                          </button>
                        )}
                      </div>

                      <div className="max-h-[24rem] overflow-y-auto p-3">
                        {showNotificationPreferenceNotice ? (
                          <div className="rounded-2xl bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
                            Activez les notifications dans <Link href="/compte/parametres" className="font-semibold text-blue-700">Paramètres</Link> pour recevoir les nouvelles annonces.
                          </div>
                        ) : visibleNotifications.length === 0 ? (
                          <div className="rounded-2xl bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
                            {isOwnerRole
                              ? "Aucune notification propriétaire pour le moment."
                              : "Aucune nouvelle annonce pour le moment."}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {visibleNotifications.map((item) => {
                              const isUnread = unreadNotifications.some((notification) => notification.id === item.id);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    if (user?.id) {
                                      markRead(user.id, item.id);
                                    }
                                    setIsNotificationsOpen(false);
                                    router.push(item.href || (item.propertyId ? `/logements/${item.propertyId}` : "/"));
                                  }}
                                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                                    isUnread
                                      ? "border-blue-200 bg-blue-50/60"
                                      : "border-neutral-100 bg-white hover:bg-neutral-50"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                      {isUnread ? <FiBell className="text-sm" /> : <FiCheckCircle className="text-sm" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold text-neutral-900">
                                          {item.title}
                                        </p>
                                        {isUnread && (
                                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                                        )}
                                      </div>
                                      <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                                        {item.message}
                                      </p>
                                      <p className="mt-2 text-[11px] text-neutral-400">
                                        {new Date(item.createdAt).toLocaleString("fr-FR", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}

              <SiteMenuButton onClick={() => setIsMenuOpen(true)} />
            </div>
          </div>

          {showHomeSearch && (
            <div className={`${compactHomeSearch ? "pb-0" : "pb-4"}`}>
              <motion.div
                initial={false}
                animate={{
                  opacity: compactHomeSearch ? 0 : 1,
                  height: compactHomeSearch ? 0 : "auto",
                  marginBottom: compactHomeSearch ? 0 : 20,
                  y: compactHomeSearch ? -22 : 0,
                }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="hidden overflow-hidden text-center md:block"
              >
                <div className="mx-auto w-full max-w-3xl">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {homeTitle || "Commencez votre recherche"}
                  </h1>
                  {/* <p className="mt-2 text-sm text-neutral-600 sm:text-base">
                    {homeSubtitle || "Explore les logements populaires à Abidjan et dans toute la Côte d'Ivoire."}
                  </p> */}
                </div>
              </motion.div>
              <motion.div
                initial={false}
                animate={{
                  opacity: 1,
                  scale: compactHomeSearch ? 0.97 : 1,
                  y: compactHomeSearch ? -56 : 0,
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                {renderHomeSearchBar()}
              </motion.div>
            </div>
          )}
        </div>
      </header>

      <SiteMenu
        open={isMenuOpen}
        onClose={closeMenu}
        entries={menuEntries}
        cta={menuCta}
        onLogout={isAuthenticated ? handleLogout : undefined}
      />
    </>
  );
}

export function TopBar(props: TopBarProps) {
  return <TopBarContent {...props} />;
}
