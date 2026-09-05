import { LOOPS, futureLoopIds } from "@/lib/data";
import LoopDetail from "./detail";

export function generateStaticParams() {
  return [...LOOPS.map((l) => l.id), ...futureLoopIds].map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoopDetail id={id} />;
}
