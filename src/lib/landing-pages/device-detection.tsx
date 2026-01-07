"use client";

import { useState, useEffect } from "react";

type Platform = "ios" | "android" | "desktop";

interface AppLinks {
  ios: string;
  android: string;
}

const DEFAULT_APP_LINKS: AppLinks = {
  ios: "https://apps.apple.com/us/app/letstruck/id1613223362",
  android: "https://play.google.com/store/apps/details?id=com.letstruck.gauges&pli=1",
};

export function useDevicePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setPlatform("ios");
      return;
    }

    // Android detection
    if (/android/i.test(userAgent)) {
      setPlatform("android");
      return;
    }

    // Default to desktop
    setPlatform("desktop");
  }, []);

  return platform;
}

export function getAppStoreLink(platform: Platform, links: AppLinks = DEFAULT_APP_LINKS): string {
  switch (platform) {
    case "ios":
      return links.ios;
    case "android":
      return links.android;
    default:
      // Desktop users get iOS link by default (can change to a landing page later)
      return links.ios;
  }
}

export function getAppStoreName(platform: Platform): string {
  switch (platform) {
    case "ios":
      return "App Store";
    case "android":
      return "Google Play";
    default:
      return "App Store";
  }
}

interface AppDownloadButtonProps {
  className?: string;
  links?: AppLinks;
  children?: React.ReactNode;
}

export function AppDownloadButton({ 
  className = "", 
  links = DEFAULT_APP_LINKS,
  children 
}: AppDownloadButtonProps) {
  const platform = useDevicePlatform();
  const link = getAppStoreLink(platform, links);
  const storeName = getAppStoreName(platform);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children || `Download on ${storeName}`}
    </a>
  );
}

interface SmartAppLinksProps {
  links?: AppLinks;
  primaryClassName?: string;
  secondaryClassName?: string;
  showBothOnDesktop?: boolean;
}

export function SmartAppLinks({
  links = DEFAULT_APP_LINKS,
  primaryClassName = "inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors",
  secondaryClassName = "inline-flex items-center gap-2 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors",
  showBothOnDesktop = true,
}: SmartAppLinksProps) {
  const platform = useDevicePlatform();

  // Mobile: show only relevant store
  if (platform === "ios") {
    return (
      <a
        href={links.ios}
        target="_blank"
        rel="noopener noreferrer"
        className={primaryClassName}
      >
        <AppleIcon />
        <span>Download on App Store</span>
      </a>
    );
  }

  if (platform === "android") {
    return (
      <a
        href={links.android}
        target="_blank"
        rel="noopener noreferrer"
        className={primaryClassName}
      >
        <PlayStoreIcon />
        <span>Get it on Google Play</span>
      </a>
    );
  }

  // Desktop: show both options
  if (showBothOnDesktop) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={links.ios}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryClassName}
        >
          <AppleIcon />
          <span>App Store</span>
        </a>
        <a
          href={links.android}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryClassName}
        >
          <PlayStoreIcon />
          <span>Google Play</span>
        </a>
      </div>
    );
  }

  // Desktop with single link preference
  return (
    <a
      href={links.ios}
      target="_blank"
      rel="noopener noreferrer"
      className={primaryClassName}
    >
      <AppleIcon />
      <span>Download the App</span>
    </a>
  );
}

// Icon components
function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
    </svg>
  );
}

export { DEFAULT_APP_LINKS };
export type { AppLinks, Platform };
