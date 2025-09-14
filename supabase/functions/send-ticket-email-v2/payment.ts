// Payment method retrieval service
import { PaymentMethodInfo } from './types.ts';
import { logStep, EmailServiceError } from './utils.ts';

export class PaymentService {
  // Get payment method information from Stripe
  async getPaymentMethodInfo(
    stripeSessionId: string | null,
    stripeSecretKey: string | null
  ): Promise<PaymentMethodInfo> {
    // Default payment method info
    const defaultInfo: PaymentMethodInfo = { 
      brand: 'Card', 
      last4: '', 
      type: 'card' 
    };

    if (!stripeSessionId || !stripeSecretKey) {
      return defaultInfo;
    }

    try {
      logStep("Fetching Stripe payment details", { sessionId: stripeSessionId });
      
      const stripe = await import('https://esm.sh/stripe@14.21.0');
      const stripeClient = new stripe.default(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      // Handle both checkout session IDs (cs_*) and payment intent IDs (pi_*)
      if (stripeSessionId.startsWith('pi_')) {
        // If it's a payment intent ID, fetch the payment intent directly
        const paymentIntent = await stripeClient.paymentIntents.retrieve(stripeSessionId, {
          expand: ['payment_method']
        });

        if (paymentIntent.payment_method) {
          const pm = paymentIntent.payment_method;
          if (pm.card) {
            const paymentInfo: PaymentMethodInfo = {
              brand: pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1),
              last4: pm.card.last4,
              type: 'card'
            };
            
            logStep("Payment method retrieved from payment intent", paymentInfo);
            return paymentInfo;
          }
        }
      } else {
        // If it's a checkout session ID, fetch the session
        const session = await stripeClient.checkout.sessions.retrieve(stripeSessionId, {
          expand: ['payment_intent.payment_method']
        });

      if (session.payment_intent && session.payment_intent.payment_method) {
        const pm = session.payment_intent.payment_method;
        if (pm.card) {
          const paymentInfo: PaymentMethodInfo = {
            brand: pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1),
            last4: pm.card.last4,
            type: 'card'
          };
          
          logStep("Payment method retrieved", paymentInfo);
          return paymentInfo;
        }
      }
      }

      return defaultInfo;
    } catch (error) {
      logStep("Failed to fetch payment method", { 
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return default info if Stripe fetch fails - this is not critical
      return defaultInfo;
    }
  }
}
