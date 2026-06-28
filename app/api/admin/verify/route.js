import { verifyAdminPassword } from "@/lib/adminAuth";

export async function POST(request) {
  try {
    const { password } = await request.json();
    const result = verifyAdminPassword(password);

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 401 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Nieprawidłowe żądanie." }, { status: 400 });
  }
}
