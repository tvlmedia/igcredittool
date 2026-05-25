import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TransactionAttachment } from "@/lib/types/domain";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: attachment, error } = await supabase
    .from("transaction_attachments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !attachment) {
    return NextResponse.redirect(new URL("/transactions", request.url));
  }

  const row = attachment as TransactionAttachment;
  const { data: signedUrl } = await supabase.storage
    .from("transaction-attachments")
    .createSignedUrl(row.file_path, 60);

  if (!signedUrl?.signedUrl) {
    return NextResponse.redirect(new URL("/transactions", request.url));
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}
