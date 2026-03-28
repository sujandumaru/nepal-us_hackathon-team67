"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";

export default function Home() {
  const router = useRouter();
  const { profile } = useUser();

  useEffect(() => {
    // If no profile set yet, go through onboarding first
    if (!profile.visaType) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  }, [profile, router]);

  return null;
}