"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth(requiredRole?: string) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (requiredRole && payload.role !== requiredRole) {
        router.push("/login");
        return;
      }
      setAuthorized(true);
    } catch {
      router.push("/login");
    }
  }, [requiredRole, router]);

  return { loading: !authorized };
}
