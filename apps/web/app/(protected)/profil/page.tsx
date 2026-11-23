import ProfileDetails from "@/components/ProfileDetails";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon profil · EventHub",
  description: "Consulte les informations de ton compte EventHub.",
};

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-1 items-center bg-[#f6f1e7] px-6 py-14 text-[#1a120e] sm:px-12">
      <div className="mx-auto w-full max-w-lg">
        <ProfileDetails />
      </div>
    </main>
  );
}
