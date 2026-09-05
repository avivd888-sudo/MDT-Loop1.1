import { PATIENTS, futurePatientIds } from "@/lib/data";
import PatientDetail from "./detail";

export function generateStaticParams() {
  return [...PATIENTS.map((p) => p.id), ...futurePatientIds].map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetail id={id} />;
}
