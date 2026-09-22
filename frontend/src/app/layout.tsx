import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import "./thinkerstreet.css";
import { Providers } from "@/app/components/providers";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
    variable: "--font-eb-garamond",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://thinkerstreet.com"),
    title: "ThinkerStreet Law — powered by MikeOSS",
    description:
        "Private-first legal document analysis, drafting, and research from ThinkerStreet AI, powered by MikeOSS.",
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/favicon.ico" },
        ],
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        url: "https://thinkerstreet.com/law",
        siteName: "ThinkerStreet Law",
        title: "ThinkerStreet Law — powered by MikeOSS",
        description:
            "Private-first legal document analysis, drafting, and research from ThinkerStreet AI.",
        images: [
            {
                url: "/link-image.jpg",
                width: 1200,
                height: 651,
                alt: "ThinkerStreet Law",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "ThinkerStreet Law — powered by MikeOSS",
        description:
            "Private-first legal document analysis, drafting, and research from ThinkerStreet AI.",
        images: ["/link-image.jpg"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
