import { supabase } from './supabase';
import { Order, OrderStatus } from '../types/order';

export interface EmailNotificationResult {
  status: 'sent' | 'not_configured' | 'skipped_no_email' | 'failed';
  message: string;
}

/**
 * Invokes the Supabase Edge Function `send-order-email` for transactional customer
 * order notifications. Secret keys (`RESEND_API_KEY`) reside strictly server-side
 * in Supabase Edge Function secrets — never in frontend source code.
 */
export const sendOrderStatusEmail = async (
  order: Pick<
    Order,
    | 'order_reference'
    | 'customer_name'
    | 'customer_email'
    | 'delivery_country'
    | 'delivery_city'
    | 'subtotal_ngn'
    | 'confirmed_delivery_fee_ngn'
    | 'carrier_name'
    | 'tracking_reference'
    | 'status'
  >,
  eventType:
    | 'order_received'
    | 'confirmed'
    | 'dispatched'
    | 'delivered'
    | 'status_update',
  note?: string
): Promise<EmailNotificationResult> => {
  if (!order.customer_email || !order.customer_email.includes('@')) {
    return {
      status: 'skipped_no_email',
      message: 'Customer email address was not provided on this order.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: {
        order_reference: order.order_reference,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        status: order.status as OrderStatus,
        event_type: eventType,
        subtotal_ngn: order.subtotal_ngn,
        confirmed_delivery_fee_ngn: order.confirmed_delivery_fee_ngn ?? null,
        delivery_country: order.delivery_country,
        delivery_city: order.delivery_city || '',
        carrier_name: order.carrier_name || '',
        tracking_reference: order.tracking_reference || '',
        note: note || '',
      },
    });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('failed to send a request') || msg.includes('404')) {
        return {
          status: 'not_configured',
          message:
            'Supabase Edge Function "send-order-email" is not deployed or RESEND_API_KEY secret is not configured yet.',
        };
      }
      return {
        status: 'failed',
        message: error.message || 'Email dispatch failed.',
      };
    }

    if (data?.status === 'not_configured') {
      return {
        status: 'not_configured',
        message:
          data.message ||
          'Email provider secret (RESEND_API_KEY) is not configured in Supabase Edge Function secrets.',
      };
    }

    if (data?.sent) {
      return {
        status: 'sent',
        message: `Email notification dispatched to ${order.customer_email}.`,
      };
    }

    return {
      status: 'failed',
      message: data?.message || 'Unexpected email response.',
    };
  } catch {
    return {
      status: 'not_configured',
      message: 'Transactional email service requires Edge Function deployment & RESEND_API_KEY configuration.',
    };
  }
};
