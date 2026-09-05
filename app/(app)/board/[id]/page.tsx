import { SESSIONS } from "@/lib/data";
import BoardSession from "./session";

export function generateStaticParams() {
  return SESSIONS.map((s) => ({ id: s.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardSession id={id} />;
}
