import { Metadata } from "next";
import { NewsPageClient } from "./NewsPageClient";

export const metadata: Metadata = {
  title: "Today's Ledger | You Inc.",
  description: "Daily business & economy news tagged to MBA curriculum with GD & interview perspectives.",
};

export default function NewsPage() {
  return <NewsPageClient />;
}
