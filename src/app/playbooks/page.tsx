import type { Metadata } from "next";
import { PlaybookLibrary } from "@/features/playbooks/playbook-library";

export const metadata: Metadata = { title: "Playbooks" };

export default function PlaybooksPage() {
  return <PlaybookLibrary />;
}
