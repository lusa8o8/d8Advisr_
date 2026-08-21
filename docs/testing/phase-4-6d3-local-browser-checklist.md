# Phase 4.6D3 Local Browser Checklist

Run the admin/consumer clients against staging and use disposable event data.

## One high-level journey - D8-managed event lifecycle

1. As the staging admin, create an event draft and publish it. Confirm the modal
   shows policy v1.1 and the event becomes visible to the staging consumer.
2. As the consumer, mark the event interested. As admin, edit at least one
   material field, including a price increase or free-to-paid change. Confirm
   the before/after preview appears and that keeping editing does not mutate the
   public event.
3. Confirm the change. Verify it is live, appears in event history with the
   admin actor, and produces a consumer notification.
4. Make a description-only edit. Verify it applies without a material modal and
   is still recorded in event history.
5. Cancel the disposable event. Verify the strong confirmation, immediate
   cancelled state, consumer notification, and recent cancelled presentation.

Passing this journey closes browser acceptance for Phase 4.6D3.

Browser evidence on 21 August 2026 confirms the v1.1 publication modal,
free-to-paid material preview, interested-recipient count, immediate apply, and
consumer entry-price notification. That run exposed and led to fixes for local
time drift, currency-formatted attendance, and manual end-time setup. Retest
that choosing/changing a start keeps a valid end time and does not shift the
displayed schedule, then complete cancellation to close the journey.
