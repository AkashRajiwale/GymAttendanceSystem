import type { MetadataRoute } from "next";
import { GYM_NAME } from "@/lib/brand";

/** Makes the site installable as an app ("Install app" on Android, "Add to Home Screen" on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: GYM_NAME,
    short_name: GYM_NAME.split(" ")[0],
    description: `Attendance and monthly fees for ${GYM_NAME}`,
    id: "/",
    start_url: "/",
    // Every page of the site belongs to the app, so in-app navigation never shows browser UI.
    scope: "/",
    display: "standalone",
    // Android: links to this site (e.g. the poster QR) open in the installed app, reusing its window.
    launch_handler: { client_mode: "navigate-existing" },
    orientation: "portrait",
    background_color: "#0b0d0c",
    theme_color: "#0b0d0c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Padded so Android's circle/squircle crop doesn't cut the logo.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
