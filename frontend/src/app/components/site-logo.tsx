import Link from "next/link";
import { MikeIcon } from "@/app/components/chat/mike-icon";

interface SiteLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    iconClassName?: string;
    animate?: boolean;
    asLink?: boolean;
}

export function SiteLogo({
    size = "md",
    className = "",
    iconClassName = "",
    animate = false,
    asLink = false,
}: SiteLogoProps) {
    const landingHref =
        process.env.NEXT_PUBLIC_THINKERSTREET_HOME_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://thinkerstreet.com"
            : "http://localhost:5000");
    const sizeClasses = {
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-6xl",
    };

    const iconSizes = {
        sm: 20,
        md: 22,
        lg: 30,
        xl: 48,
    };

    const logo = (
        <h1
            className={`flex items-center gap-1.5 ${sizeClasses[size]} font-light font-serif ${
                animate ? "sidebar-fade-in" : ""
            } ${className}`}
        >
            <span
                className={`inline-flex shrink-0 items-center leading-none ${iconClassName}`}
            >
                <MikeIcon size={iconSizes[size]} />
            </span>
            <span className="tracking-[-0.045em]">ThinkerStreet</span>
            <span className="font-sans text-[0.34em] font-semibold uppercase tracking-[0.2em] text-fuchsia-500">
                Law
            </span>
            <span className="sr-only"> powered by MikeOSS</span>
        </h1>
    );

    if (asLink) {
        return (
            <Link
                href={landingHref}
                aria-label="ThinkerStreet AI home"
                className="cursor-pointer hover:opacity-80 transition-opacity"
            >
                {logo}
            </Link>
        );
    }

    return logo;
}
