export const GYM_NAME = process.env.NEXT_PUBLIC_GYM_NAME || "Varasgav Fitness";

/** Where members pay fees. The QR image lives in /public; override the ID/name with env vars. */
export const UPI = {
  id: process.env.NEXT_PUBLIC_UPI_ID || "rakeshsanap88@okicici",
  name: process.env.NEXT_PUBLIC_UPI_NAME || "Rakesh Sanap",
  qrImage: "/rakeshscanner.jpeg",
};
