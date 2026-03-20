import { isAdminAuthed } from "@/lib/auth";
import { notFound } from "next/navigation";
import DnUploadForm from "./DnUploadForm";

export default async function DnUploadPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  if (!(await isAdminAuthed())) notFound();

  return <DnUploadForm orderNumber={orderNumber} />;
}
