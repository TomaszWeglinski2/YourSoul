import { verifyAdminPassword } from "@/lib/adminAuth";
import { buildSampleXlsx, getSampleTypes } from "@/lib/adminSamples";

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, type } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    if (!getSampleTypes().includes(type)) {
      return Response.json({ error: "Nieznany typ próbki." }, { status: 400 });
    }

    const sample = buildSampleXlsx(type);
    if (!sample) {
      return Response.json({ error: "Brak próbki." }, { status: 404 });
    }

    return new Response(sample.buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${sample.filename}"`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nie udało się wygenerować pliku." },
      { status: 500 }
    );
  }
}
