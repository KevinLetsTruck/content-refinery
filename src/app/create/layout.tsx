import type { Metadata } from "next";
import { ShowNotesDrawer } from "./components/ShowNotesDrawer";

export const metadata: Metadata = {
  title: "Create Content | Content Refinery",
  description: "AI-powered content creation wizard for Let's Truck",
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {children}
      <ShowNotesDrawer />
    </div>
  );
}
