import { notFound } from "next/navigation";
import CatalogueViewer from "@/components/CatalogueViewer";
import { CHAINS } from "@/lib/data/stores";
import { Chain } from "@/lib/types";

export function generateStaticParams() {
  return Object.keys(CHAINS).map((chain) => ({ chain }));
}

export default async function ChainCataloguePage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  if (!(chain in CHAINS)) notFound();
  return <CatalogueViewer chain={chain as Chain} />;
}
