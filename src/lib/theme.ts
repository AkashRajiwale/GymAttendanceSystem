// Shared by the server layout (pre-paint script) and the client ThemeToggle.

/** localStorage key for the saved theme ("light" or "dark"; missing = dark). */
export const THEME_KEY = "vf-theme";

export const THEME_COLORS = { dark: "#0b0d0c", light: "#f4f6f4" } as const;

/** Runs in <head> before the page draws, so a saved light theme never flashes dark first. */
export const themeScript = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){document.documentElement.dataset.theme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${THEME_COLORS.light}")}}catch(e){}`;
