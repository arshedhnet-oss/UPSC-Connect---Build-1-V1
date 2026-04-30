// Generates an invoice PDF for a confirmed booking, uploads to private storage,
// and inserts the invoice row. Idempotent: re-invocations return the existing row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pad(n: number, w = 4) { return n.toString().padStart(w, "0"); }

function buildInvoiceNumber(createdAt: Date, seq: number) {
  const yy = createdAt.getFullYear().toString().slice(-2);
  const mm = (createdAt.getMonth() + 1).toString().padStart(2, "0");
  return `UC-${yy}${mm}-${pad(seq, 5)}`;
}

async function renderPdf(opts: {
  invoiceNumber: string;
  issuedAt: Date;
  bookingId: string;
  mentorName: string;
  menteeName: string;
  menteeEmail: string;
  sessionDate: string;
  sessionTime: string;
  amount: number;
  paymentId: string | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.145, 0.337, 0.725); // #2556b9
  const ink = rgb(0.102, 0.122, 0.18);
  const muted = rgb(0.58, 0.62, 0.69);

  let y = 800;
  page.drawText("UPSC Connect", { x: 40, y, size: 22, font: bold, color: navy });
  page.drawText("INVOICE", { x: width - 40 - bold.widthOfTextAtSize("INVOICE", 22), y, size: 22, font: bold, color: ink });
  y -= 18;
  page.drawText("upscconnect.in  •  admin@upscconnect.in", { x: 40, y, size: 10, font, color: muted });

  y -= 40;
  const labelVal = (label: string, value: string) => {
    page.drawText(label, { x: 40, y, size: 9, font, color: muted });
    page.drawText(value, { x: 160, y, size: 11, font: bold, color: ink });
    y -= 18;
  };
  labelVal("Invoice No.", opts.invoiceNumber);
  labelVal("Issued", opts.issuedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }));
  labelVal("Booking ID", opts.bookingId);
  if (opts.paymentId) labelVal("Payment ID", opts.paymentId);

  y -= 16;
  page.drawText("Billed To", { x: 40, y, size: 10, font: bold, color: navy });
  y -= 14;
  page.drawText(opts.menteeName, { x: 40, y, size: 11, font, color: ink });
  y -= 13;
  page.drawText(opts.menteeEmail, { x: 40, y, size: 10, font, color: muted });

  y -= 30;
  // Table header
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: rgb(0.96, 0.97, 0.99) });
  page.drawText("Description", { x: 50, y: y + 3, size: 10, font: bold, color: ink });
  page.drawText("Amount (INR)", { x: width - 140, y: y + 3, size: 10, font: bold, color: ink });
  y -= 24;

  const desc1 = `1:1 Mentorship Session with ${opts.mentorName}`;
  const desc2 = `${opts.sessionDate} • ${opts.sessionTime}`;
  page.drawText(desc1, { x: 50, y, size: 11, font, color: ink });
  page.drawText(`Rs. ${opts.amount.toLocaleString("en-IN")}`, { x: width - 140, y, size: 11, font, color: ink });
  y -= 14;
  page.drawText(desc2, { x: 50, y, size: 9, font, color: muted });

  y -= 30;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 22;
  page.drawText("Total Paid", { x: width - 240, y, size: 12, font: bold, color: ink });
  page.drawText(`Rs. ${opts.amount.toLocaleString("en-IN")}`, { x: width - 140, y, size: 12, font: bold, color: navy });

  y -= 60;
  page.drawText("Thank you for booking with UPSC Connect.", { x: 40, y, size: 10, font, color: ink });
  y -= 14;
  page.drawText("This is a system-generated invoice and does not require a signature.", { x: 40, y, size: 9, font, color: muted });

  // Footer
  page.drawText(`© ${opts.issuedAt.getFullYear()} UPSC Connect`, { x: 40, y: 40, size: 9, font, color: muted });
  page.drawText("Support: admin@upscconnect.in", { x: width - 40 - font.widthOfTextAtSize("Support: admin@upscconnect.in", 9), y: 40, size: 9, font, color: muted });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: existing invoice for this booking?
    const { data: existing } = await supabase
      .from("invoices")
      .select("id, invoice_number, pdf_path")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (existing && existing.pdf_path) {
      return new Response(JSON.stringify({ status: "exists", invoice: existing }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking + related data
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, status, mentee_id, mentor_id, slot_id")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return new Response(JSON.stringify({ error: "Booking not confirmed yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: mentee }, { data: mentor }, { data: slot }, { data: successTx }, { data: latestTx }, { data: mentorProf }] = await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", booking.mentee_id).single(),
      supabase.from("profiles").select("name, email").eq("id", booking.mentor_id).single(),
      supabase.from("slots").select("date, start_time, end_time").eq("id", booking.slot_id).single(),
      supabase.from("transactions").select("amount, razorpay_order_id, razorpay_payment_id, status")
        .eq("booking_id", booking_id).eq("status", "success")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("transactions").select("amount, razorpay_order_id, razorpay_payment_id, status")
        .eq("booking_id", booking_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("mentor_profiles").select("price_per_session").eq("user_id", booking.mentor_id).maybeSingle(),
    ]);

    if (!mentee || !mentor || !slot) {
      return new Response(JSON.stringify({ error: "Missing related data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer the successful transaction; fall back to mentor's current rate.
    const tx = successTx ?? latestTx;
    const amount = successTx?.amount ?? mentorProf?.price_per_session ?? 0;
    const paymentId = successTx?.razorpay_payment_id ?? tx?.razorpay_payment_id ?? null;
    const orderId = successTx?.razorpay_order_id ?? tx?.razorpay_order_id ?? null;
    const issuedAt = new Date();

    // Build a unique invoice_number using YYMM + count of invoices in this month + 1
    const monthStart = new Date(issuedAt.getFullYear(), issuedAt.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart);
    const invoiceNumber = buildInvoiceNumber(issuedAt, (count ?? 0) + 1);

    const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const sessionTime = `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)} IST`;

    const pdfBytes = await renderPdf({
      invoiceNumber,
      issuedAt,
      bookingId: booking.id,
      mentorName: mentor.name,
      menteeName: mentee.name,
      menteeEmail: mentee.email,
      sessionDate,
      sessionTime,
      amount,
      paymentId,
    });

    const pdfPath = `${booking.mentee_id}/${invoiceNumber}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("invoices")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      console.error("upload_failed", upErr);
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing) {
      await supabase.from("invoices").update({
        pdf_path: pdfPath, amount, payment_id: paymentId, razorpay_order_id: orderId,
      }).eq("id", existing.id);
      return new Response(JSON.stringify({ status: "updated", invoice: { ...existing, pdf_path: pdfPath } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber,
      booking_id: booking.id,
      mentee_id: booking.mentee_id,
      mentor_id: booking.mentor_id,
      amount,
      currency: "INR",
      pdf_path: pdfPath,
      payment_id: paymentId,
      razorpay_order_id: orderId,
      issued_at: issuedAt.toISOString(),
    }).select("id, invoice_number, pdf_path").single();

    if (insErr) {
      console.error("insert_failed", insErr);
      return new Response(JSON.stringify({ error: "Insert failed", detail: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "created", invoice: inserted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate_invoice_error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
