//src/components/shared/navLinks.ts
import {
  Home,
  User,
  MessageCircle,
  ShieldAlert,
  LucideIcon,
  User2,
  Files,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: User },
  { href: "/contact", label: "Contact", icon: MessageCircle },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldAlert,
    ownerOnly: true,
  },
  { href: "/me", label: "Profile", icon: User2, ownerOnly: true },
  {
    href: "/posts/my-posts",
    label: "Manage Posts",
    icon: Files,
    ownerOnly: true,
  },
];
