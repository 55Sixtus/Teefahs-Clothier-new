import { supabase } from './supabase';
import { logAdminAuditEvent } from './api';
import {
  DeliveryZone,
  Order,
  OrderStatus,
  TrackedOrderResult,
} from '../types/order';

export interface CreateOrderItemInput {
  product_id: string;
  selected_colour: string;
  selected_size: string;
  quantity: number;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  delivery_country: string;
  delivery_address: string;
  delivery_city?: string;
  delivery_notes?: string;
  display_currency: string;
  exchange_rate_used?: number | null;
  exchange_rate_timestamp?: string | null;
  items: CreateOrderItemInput[];
}

export interface SubmitOrderResult {
  persisted: boolean;
  migrationPending?: boolean;
  order_reference: string;
  subtotal_ngn?: number;
  confirmed_delivery_fee_ngn?: number | null;
  status?: OrderStatus;
  created_at?: string;
  errorMessage?: string;
}

const isMissingRelationOrRpc = (err: any): boolean => {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    code === '42883' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the function') ||
    msg.includes('could not find the table')
  );
};

export const checkOrdersSchemaStatus = async (): Promise<{
  ordersReady: boolean;
  deliveryZonesReady: boolean;
}> => {
  const [ordersRes, zonesRes] = await Promise.all([
    supabase.from('orders').select('id', { head: true, count: 'exact' }),
    supabase.from('store_delivery_zones').select('id', { head: true, count: 'exact' }),
  ]);

  return {
    ordersReady: !ordersRes.error || !isMissingRelationOrRpc(ordersRes.error),
    deliveryZonesReady: !zonesRes.error || !isMissingRelationOrRpc(zonesRes.error),
  };
};

export const submitStoreOrder = async (input: CreateOrderInput): Promise<SubmitOrderResult> => {
  const { data, error } = await supabase.rpc('create_store_order', { payload: input });

  if (error) {
    if (isMissingRelationOrRpc(error)) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const tempRef = `WA-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        persisted: false,
        migrationPending: true,
        order_reference: tempRef,
        errorMessage:
          'Order database tables are awaiting SQL migration. Proceeding directly to WhatsApp confirmation.',
      };
    }
    throw new Error(error.message || 'Could not log order prior to WhatsApp dispatch.');
  }

  return {
    persisted: true,
    order_reference: data.order_reference,
    subtotal_ngn: Number(data.subtotal_ngn),
    confirmed_delivery_fee_ngn:
      data.confirmed_delivery_fee_ngn !== null && data.confirmed_delivery_fee_ngn !== undefined
        ? Number(data.confirmed_delivery_fee_ngn)
        : null,
    status: data.status as OrderStatus,
    created_at: data.created_at,
  };
};

export const trackCustomerOrder = async (
  orderReference: string,
  contactVerifier: string
): Promise<
  | { state: 'found'; order: TrackedOrderResult }
  | { state: 'not_found' }
  | { state: 'migration_pending' }
> => {
  const { data, error } = await supabase.rpc('track_customer_order', {
    p_order_reference: orderReference.trim(),
    p_contact_verifier: contactVerifier.trim(),
  });

  if (error) {
    if (isMissingRelationOrRpc(error)) {
      return { state: 'migration_pending' };
    }
    throw new Error(error.message || 'Failed to look up order.');
  }

  if (!data) {
    return { state: 'not_found' };
  }

  return { state: 'found', order: data as TrackedOrderResult };
};

export const adminGetOrders = async (): Promise<{
  orders: Order[];
  migrationPending: boolean;
}> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationOrRpc(error)) {
      return { orders: [], migrationPending: true };
    }
    throw new Error(error.message || 'Could not load customer orders.');
  }

  const orders = (data || []).map((row: any) => ({
    ...row,
    subtotal_ngn: Number(row.subtotal_ngn) || 0,
    confirmed_delivery_fee_ngn:
      row.confirmed_delivery_fee_ngn !== null && row.confirmed_delivery_fee_ngn !== undefined
        ? Number(row.confirmed_delivery_fee_ngn)
        : null,
    order_items: Array.isArray(row.order_items) ? row.order_items : [],
    order_status_history: Array.isArray(row.order_status_history)
      ? [...row.order_status_history].sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      : [],
  })) as Order[];

  return { orders, migrationPending: false };
};

export const adminUpdateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  options: {
    note?: string;
    carrier_name?: string;
    tracking_reference?: string;
    confirmed_delivery_fee_ngn?: number | null;
  } = {}
): Promise<Order> => {
  const nowIso = new Date().toISOString();
  const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const actorEmail = userData?.user?.email || 'admin';

  const updateFields: Record<string, any> = {
    status,
    updated_at: nowIso,
  };

  if (options.carrier_name !== undefined) {
    updateFields.carrier_name = options.carrier_name.trim() || null;
  }
  if (options.tracking_reference !== undefined) {
    updateFields.tracking_reference = options.tracking_reference.trim() || null;
  }
  if (options.confirmed_delivery_fee_ngn !== undefined) {
    updateFields.confirmed_delivery_fee_ngn = options.confirmed_delivery_fee_ngn;
  }
  if (status === 'confirmed') {
    updateFields.confirmed_at = nowIso;
  } else if (status === 'dispatched' || status === 'out_for_delivery') {
    updateFields.dispatched_at = nowIso;
  } else if (status === 'delivered') {
    updateFields.delivered_at = nowIso;
  }

  const { error: updErr } = await supabase
    .from('orders')
    .update(updateFields)
    .eq('id', orderId);

  if (updErr) {
    throw new Error(updErr.message || 'Could not update order status.');
  }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status,
    note: options.note?.trim() || `Status updated to ${status.replace(/_/g, ' ')}`,
    updated_by: actorEmail,
  });

  await logAdminAuditEvent('order_status_updated', 'order', orderId, {
    status,
    carrier_name: updateFields.carrier_name,
    tracking_reference: updateFields.tracking_reference,
  });

  const { data: refreshed, error: fetchErr } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !refreshed) {
    throw new Error(fetchErr?.message || 'Updated order could not be reloaded.');
  }

  return refreshed as Order;
};

export const getPublicDeliveryZones = async (): Promise<DeliveryZone[]> => {
  const { data, error } = await supabase
    .from('store_delivery_zones')
    .select('*')
    .eq('is_approved', true)
    .order('country_name');

  if (error) {
    if (isMissingRelationOrRpc(error)) {
      return [];
    }
    throw new Error(error.message || 'Failed to load delivery zones.');
  }

  return (data || []).map((z: any) => ({
    ...z,
    delivery_fee_ngn:
      z.delivery_fee_ngn !== null && z.delivery_fee_ngn !== undefined
        ? Number(z.delivery_fee_ngn)
        : null,
  }));
};

export const adminGetDeliveryZones = async (): Promise<{
  zones: DeliveryZone[];
  migrationPending: boolean;
}> => {
  const { data, error } = await supabase
    .from('store_delivery_zones')
    .select('*')
    .order('country_name');

  if (error) {
    if (isMissingRelationOrRpc(error)) {
      return { zones: [], migrationPending: true };
    }
    throw new Error(error.message || 'Failed to load delivery zones.');
  }

  return {
    zones: (data || []).map((z: any) => ({
      ...z,
      delivery_fee_ngn:
        z.delivery_fee_ngn !== null && z.delivery_fee_ngn !== undefined
          ? Number(z.delivery_fee_ngn)
          : null,
    })),
    migrationPending: false,
  };
};

export const adminSaveDeliveryZone = async (zone: Partial<DeliveryZone>): Promise<DeliveryZone> => {
  const code = String(zone.country_code || '').trim().toUpperCase();
  const name = String(zone.country_name || '').trim();
  if (!code || !name) {
    throw new Error('Country code and country name are required.');
  }

  const payload = {
    country_code: code,
    country_name: name,
    is_approved: zone.is_approved ?? true,
    delivery_fee_ngn:
      zone.delivery_fee_ngn !== null &&
      zone.delivery_fee_ngn !== undefined &&
      String(zone.delivery_fee_ngn) !== ''
        ? Math.max(0, Number(zone.delivery_fee_ngn))
        : null,
    estimated_timeline: zone.estimated_timeline?.trim() || null,
    customs_note: zone.customs_note?.trim() || null,
    policy_note: zone.policy_note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('store_delivery_zones')
    .upsert(payload, { onConflict: 'country_code' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Could not save delivery zone.');
  }

  await logAdminAuditEvent('delivery_zone_saved', 'delivery_zone', code, payload);
  return data as DeliveryZone;
};
