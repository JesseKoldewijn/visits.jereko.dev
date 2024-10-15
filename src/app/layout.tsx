import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  title: "Jereko Visits",
  description: "A simple application with a lot of jank.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(GeistSans.variable, "dark")}>
      <body>{children}</body>
    </html>
  );
}
