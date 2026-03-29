"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import SplashScreen from "@/components/SplashScreen";

export default function Home() {
  const router = useRouter();
  const { profile } = useUser();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    if (!profile.visaType) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  }, [profile, router]);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return null;
}