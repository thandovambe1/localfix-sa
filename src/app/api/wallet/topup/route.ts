import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { walletTransactions } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { walletReference } from "@/lib/wallet";
import { createWalletTopupCheckout } from "@/lib/yoco";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/topup
 *
 * Starts a Yoco checkout that credits the customer's LocalFix wallet.
 *
 * Body:
 * {
 *   amount: number
 * }
 *
 * Amount is supplied in whole South African rands.
 */
export async function POST(request: Request) {
  try {
    /*
     * Initialise the database first.
     *
     * This is deliberately inside the try/catch so that a database
     * initialisation error still produces a valid JSON response instead
     * of an empty/HTML server error response.
     */
    await ready();

    const session = await getCustomerSession();

    if (!session) {
      return Response.json(
        {
          ok: false,
          error: "Please sign in to top up your wallet.",
        },
        { status: 401 },
      );
    }

    /*
     * Read and validate the request body safely.
     */
    let body: { amount?: number } = {};

    try {
      body = (await request.json()) as {
        amount?: number;
      };
    } catch (error) {
      console.error(
        "[Wallet Top-up] Invalid JSON request body:",
        error,
      );

      return Response.json(
        {
          ok: false,
          error: "Invalid request. Please enter a top-up amount and try again.",
        },
        { status: 400 },
      );
    }

    const amount = Number(body.amount);

    /*
     * Validate minimum top-up.
     */
    if (!Number.isFinite(amount) || amount < 50) {
      return Response.json(
        {
          ok: false,
          error: "Minimum top-up is R50.",
        },
        { status: 400 },
      );
    }

    /*
     * Validate maximum top-up.
     */
    if (amount > 100000) {
      return Response.json(
        {
          ok: false,
          error: "Maximum single top-up is R100 000.",
        },
        { status: 400 },
      );
    }

    /*
     * Convert rands to cents.
     *
     * Example:
     * R50 -> 5000
     * R250 -> 25000
     */
    const amountCents = Math.round(amount * 100);

    if (amountCents < 5000) {
      return Response.json(
        {
          ok: false,
          error: "Minimum top-up is R50.",
        },
        { status: 400 },
      );
    }

    const reference = walletReference();

    /*
     * Create the hosted Yoco checkout.
     *
     * The secret Yoco key is used inside createWalletTopupCheckout()
     * and never exposed to the browser.
     */
    const result = await createWalletTopupCheckout({
      amountCents,
      reference,
      customerId: session.id,
    });

    /*
     * Yoco rejected the checkout request.
     */
    if (!result.success) {
      console.error(
        "[Wallet Top-up] Yoco checkout creation failed:",
        result.error,
      );

      /*
       * Record the failed attempt where possible.
       *
       * If this insert itself fails, the outer catch will still return
       * a valid JSON response to the browser.
       */
      try {
        await db.insert(walletTransactions).values({
          customerId: session.id,
          type: "topup",
          amountCents,
          balanceAfterCents: 0,
          description: "Failed wallet top-up attempt via Yoco",
          reference,
          status: "failed",
          failureReason: result.error,
        });
      } catch (dbError) {
        console.error(
          "[Wallet Top-up] Failed to record failed transaction:",
          dbError,
        );
      }

      return Response.json(
        {
          ok: false,
          error: result.error || "Yoco could not create the payment checkout.",
        },
        { status: 502 },
      );
    }

    /*
     * Make sure Yoco actually returned a usable redirect URL.
     *
     * Without this check we could create a pending wallet transaction
     * and then send the browser nowhere.
     */
    if (!result.checkout?.id) {
      console.error(
        "[Wallet Top-up] Yoco response did not contain a checkout ID:",
        result.checkout,
      );

      return Response.json(
        {
          ok: false,
          error:
            "Yoco did not return a valid checkout. Please try again.",
        },
        { status: 502 },
      );
    }

    if (!result.checkout?.redirectUrl) {
      console.error(
        "[Wallet Top-up] Yoco response did not contain redirectUrl:",
        result.checkout,
      );

      return Response.json(
        {
          ok: false,
          error:
            "Yoco did not return a payment link. Please try again.",
        },
        { status: 502 },
      );
    }

    /*
     * Record the pending wallet transaction.
     *
     * The wallet should NOT be credited here.
     *
     * The transaction remains pending until the Yoco webhook confirms
     * that the payment actually succeeded.
     */
    try {
      await db.insert(walletTransactions).values({
        customerId: session.id,
        type: "topup",
        amountCents,
        balanceAfterCents: 0,
        description: "Wallet top-up via Yoco",
        reference,
        status: "pending",
        yocoCheckoutId: result.checkout.id,
      });
    } catch (dbError) {
      /*
       * This is particularly important.
       *
       * Yoco has already created the checkout at this point. If the
       * LocalFix database insert fails, we must return JSON rather than
       * allowing the route to crash with an HTML/empty server response.
       */
      console.error(
        "[Wallet Top-up] Failed to create pending wallet transaction:",
        dbError,
      );

      return Response.json(
        {
          ok: false,
          error:
            "The payment checkout was created, but LocalFix could not prepare your wallet transaction. Please try again.",
        },
        { status: 500 },
      );
    }

    /*
     * Remove older pending top-up records for this customer.
     *
     * The newly-created checkout is excluded from the delete.
     */
    try {
      await db
        .delete(walletTransactions)
        .where(
          and(
            eq(
              walletTransactions.customerId,
              session.id,
            ),
            eq(
              walletTransactions.status,
              "pending",
            ),
            eq(
              walletTransactions.type,
              "topup",
            ),
            ne(
              walletTransactions.yocoCheckoutId,
              result.checkout.id,
            ),
          ),
        );
    } catch (dbError) {
      /*
       * This cleanup failure should NOT prevent the customer from
       * receiving the valid Yoco checkout link.
       */
      console.error(
        "[Wallet Top-up] Failed to clean up older pending transactions:",
        dbError,
      );
    }

    /*
     * Always return valid JSON on success.
     */
    return Response.json({
      ok: true,
      reference,
      redirectUrl: result.checkout.redirectUrl,
    });
  } catch (error) {
    /*
     * FINAL SAFETY NET
     *
     * Nothing escaping this handler should result in an empty/non-JSON
     * response. This is what prevents the browser from throwing:
     *
     * "Unexpected end of JSON input"
     */
    console.error(
      "[Wallet Top-up] Unexpected server error:",
      error,
    );

    return Response.json(
      {
        ok: false,
        error:
          "We could not start your wallet top-up right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
