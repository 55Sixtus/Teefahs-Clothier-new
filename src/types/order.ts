export type OrderStatus =
  | 'order_received'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; stepIndex: number; badgeClass: string }
> = {
  order_received: {
    label: 'Order Received',
    description: 'Your order request has been logged.',
    stepIndex: 0,
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
  },
  awaiting_confirmation: {
    label: 'Awaiting Confirmation',
    description: 'Queued for WhatsApp stylist & availability confirmation.',
    stepIndex: 1,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Availability & delivery details verified by our boutique desk.',
    stepIndex: 2,
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  },
  processing: {
    label: 'Processing / Tailoring Check',
    description: 'Garment inspection, steaming, and boutique packaging in progress.',
    stepIndex: 3,
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
  },
  ready_for_dispatch: {
    label: 'Ready for Dispatch',
    description: 'Packed and awaiting courier handover.',
    stepIndex: 4,
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
  },
  dispatched: {
    label: 'Dispatched',
    description: 'Handed over to courier carrier with dispatch tracking.',
    stepIndex: 5,
    badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-300',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    description: 'Courier is en route to your destination address.',
    stepIndex: 6,
    badgeClass: 'bg-teal-50 text-teal-900 border-teal-300',
  },
  delivered: {
    label: 'Delivered',
    description: 'Confirmed received at destination.',
    stepIndex: 7,
    badgeClass: 'bg-emerald-900 text-white border-emerald-900',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Order cancelled prior to dispatch.',
    stepIndex: -1,
    badgeClass: 'bg-red-50 text-red-900 border-red-300',
  },
  returned: {
    label: 'Returned',
    description: 'Garment returned and recorded by boutique admin.',
    stepIndex: -1,
    badgeClass: 'bg-stone-200 text-stone-900 border-stone-400',
  },
};

export const ORDER_TIMELINE_STEPS: OrderStatus[] = [
  'order_received',
  'awaiting_confirmation',
  'confirmed',
  'processing',
  'ready_for_dispatch',
  'dispatched',
  'out_for_delivery',
  'delivered',
];

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id?: string | null;
  product_name_snapshot: string;
  product_image_snapshot?: string;
  sku_snapshot?: string;
  selected_colour?: string;
  selected_size?: string;
  quantity: number;
  unit_price_ngn: number;
  line_total_ngn: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id?: string;
  status: OrderStatus;
  note?: string;
  updated_by?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_reference: string;
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
  subtotal_ngn: number;
  confirmed_delivery_fee_ngn?: number | null;
  status: OrderStatus;
  tracking_reference?: string;
  carrier_name?: string;
  whatsapp_dispatched_at?: string;
  confirmed_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistoryEntry[];
}

export interface TrackedOrderResult {
  order_reference: string;
  customer_first_name: string;
  delivery_country: string;
  delivery_city?: string;
  display_currency: string;
  subtotal_ngn: number;
  confirmed_delivery_fee_ngn?: number | null;
  status: OrderStatus;
  carrier_name?: string;
  tracking_reference?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  items: OrderItem[];
  history: OrderStatusHistoryEntry[];
}

export interface DeliveryZone {
  id: string;
  country_code: string;
  country_name: string;
  is_approved: boolean;
  delivery_fee_ngn?: number | null;
  estimated_timeline?: string;
  customs_note?: string;
  policy_note?: string;
  updated_at?: string;
}
