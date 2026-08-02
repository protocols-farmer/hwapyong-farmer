// src/components/layouts/sidebar/navLinks.ts
import {
  Home,
  User,
  BookOpen,
  Newspaper,
  MessageCircle,
  Send,
  ShieldAlert,
  LucideIcon,
  User2,
  Files,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: User },
  { href: "/contact", label: "Contact", icon: MessageCircle },
  { href: "/admin", label: "Admin", icon: ShieldAlert },
  { href: "/me", label: "Profile", icon: User2 },
  { href: "/posts/my-posts", label: "My Posts", icon: Files },
];
