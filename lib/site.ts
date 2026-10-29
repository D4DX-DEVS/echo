// Fill in `href` to show a social link in the header and footer; empty ones are hidden.
import type { IconName } from "./icons";

export const email = "mailtheecho.in@gmail.com";

export const social: { name: string; icon: IconName; href: string }[] = [
  { name: "YouTube", icon: "youtube", href: "" },
  { name: "Email", icon: "gmail", href: `mailto:${email}` },
  { name: "Facebook", icon: "facebook", href: "https://www.facebook.com/TheEcho.in" },
  { name: "Instagram", icon: "instagram", href: "https://www.instagram.com/thechodotin/" },
  { name: "WhatsApp", icon: "whatsapp", href: "" },
];
