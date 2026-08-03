import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CalendarCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { confirmBooking } from "@/lib/payments.server";

export const Route = createFileRoute("/app/booking/success")({
  head: () => ({ meta: [{ title: "Booking Confirmed — Agrisynapse" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    booking_id: String(s.booking_id ?? ""),
    payment_id: String(s.payment_id ?? ""),
    mock: s.mock === "1" || s.mock === 1,
  }),
  component: BookingSuccessPage,
});

function BookingSuccessPage() {
  const { booking_id, payment_id, mock } = Route.useSearch();
  const confirm = useServerFn(confirmBooking);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!booking_id) { setLoading(false); return; }
    confirm({ data: { bookingId: booking_id, paymentId: payment_id || undefined } })
      .then(r => setBooking(r.booking))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [booking_id]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirming your booking…</p>
          </div>
        ) : booking ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h1 className="mt-5 font-serif text-2xl font-semibold">Booking Confirmed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your service has been booked and the provider has been notified.</p>

            <div className="mt-6 rounded-xl bg-muted/50 px-5 py-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{booking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span>{booking.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-primary" />{booking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span>{booking.qty} {booking.unit}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-serif text-xl text-primary">₹{booking.total.toLocaleString("en-IN")}</span>
              </div>
              {(payment_id && !mock) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment ID</span><span className="font-mono">{payment_id}</span>
                </div>
              )}
              {mock && <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 pt-1">⚠ Test mode — no real payment charged</p>}
            </div>

            <Link to="/app/booking" className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition">
              <ArrowLeft className="h-4 w-4" /> Back to Bookings
            </Link>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-serif text-2xl">Payment Received</h1>
            <p className="mt-2 text-sm text-muted-foreground">We could not load booking details, but your payment was recorded. Check your dashboard shortly.</p>
            <Link to="/app/booking" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
              <ArrowLeft className="h-4 w-4" /> My Bookings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
