import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { profile } from "@/lib/profile";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const title = `${profile.fullName} (${profile.preferredName}): AI Engineer and Full Stack Tech Lead`;
const description =
  "Software engineer with nine-plus years building secure APIs and cloud-native systems, now building agentic AI. Explore the work and talk to an AI twin grounded in a verified profile.";

export const metadata: Metadata = {
  metadataBase: new URL(profile.links.site),
  title: { default: title, template: `%s | ${profile.fullName}` },
  description,
  applicationName: `${profile.fullName} · AI Digital Twin`,
  authors: [{ name: profile.fullName, url: profile.links.site }],
  keywords: ["AI engineer", "full stack", "Java", "Spring Boot", "React", "agentic AI", "MCP", "LLM applications", "AWS"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: profile.links.site,
    siteName: `${profile.fullName} · AI Digital Twin`,
    title,
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#12110E" },
  ],
};

// Runs before first paint so the saved or system theme is applied without a flash.
const themeScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t}catch(e){d.dataset.theme='light'}})()`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.fullName,
  alternateName: profile.preferredName,
  jobTitle: profile.headline,
  url: profile.links.site,
  image: `${profile.links.site}/portrait.webp`,
  email: `mailto:${profile.links.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Dallas", addressRegion: "TX", addressCountry: "US" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Xinjiang University" },
  sameAs: [profile.links.linkedin, profile.links.github],
  knowsAbout: ["Java", "Spring Boot", "React", "Next.js", "AWS", "Kubernetes", "LLM agents", "Model Context Protocol"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
