"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const role = JSON.parse(atob(token.split(".")[1])).role as string;
      if (role === "ADMIN") router.replace("/admin");
      else if (role === "AGENT") router.replace("/agent");
      else router.replace("/customer");
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
