import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Truck,
  Mail,
  PackageCheck,
  MapPin,
  X,
} from 'lucide-react';
import { adminGetOrders, adminUpdateOrderStatus } from '../lib/ordersApi';
import { sendOrderStatusEmail, EmailNotificationResult } from '../lib/notifications';
import { Order, OrderStatus, ORDER_STATUS_META } from '../types/order';

const ALL_STATUSES: OrderStatus[] = [
  'order_received',
  'awaiting_confirmation',
  'confirmed',
  'processing',
  'ready_for_dispatch',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Update form state for selected order
  const [nextStatus, setNextStatus] = useState<OrderStatus>('confirmed');
  const [carrierName, setCarrierName] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [confirmedFeeInput, setConfirmedFeeInput] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<EmailNotificationResult | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await adminGetOrders();
      setOrders(res.orders);
      setMigrationPending(res.migrationPending);
      if (res.orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res.orders[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) return;
    setNextStatus(selectedOrder.status);
    setCarrierName(selectedOrder.carrier_name || '');
    setTrackingRef(selectedOrder.tracking_reference || '');
    setConfirmedFeeInput(
      selectedOrder.confirmed_delivery_fee_ngn !== null &&
        selectedOrder.confirmed_delivery_fee_ngn !== undefined
        ? String(selectedOrder.confirmed_delivery_fee_ngn)
        : ''
    );
    setStatusNote('');
    setEmailFeedback(null);
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        order.order_reference.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        order.customer_phone.toLowerCase().includes(q) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(q)) ||
        order.delivery_country.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, searchQuery]);

  const handleApplyStatusUpdate = async (
    targetStatus: OrderStatus,
    quickNote?: string
  ) => {
    if (!selectedOrder) return;
    setUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');
    setEmailFeedback(null);

    try {
      const trimmedFee = confirmedFeeInput.trim();
      const parsedFee = trimmedFee !== '' ? Math.max(0, Number(trimmedFee)) : null;

      const updated = await adminUpdateOrderStatus(selectedOrder.id, targetStatus, {
        carrier_name: carrierName,
        tracking_reference: trackingRef,
        confirmed_delivery_fee_ngn: Number.isFinite(parsedFee as number) ? parsedFee : null,
        note: quickNote || statusNote || undefined,
      });

      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSuccessMsg(
        `Order ${updated.order_reference} updated to "${ORDER_STATUS_META[updated.status]?.label || updated.status}".`
      );
      setStatusNote('');

      if (sendEmailOnSave) {
        const eventType =
          targetStatus === 'confirmed'
            ? 'confirmed'
            : targetStatus === 'dispatched'
            ? 'dispatched'
            : targetStatus === 'delivered'
            ? 'delivered'
            : 'status_update';
        const mailRes = await sendOrderStatusEmail(updated, eventType, quickNote || statusNote);
        setEmailFeedback(mailRes);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update order status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-stone-200 gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold block mb-1">
            Order Fulfilment &amp; Dispatch
          </span>
          <h1 className="text-3xl font-serif text-stone-900">Customer Orders</h1>
          <p className="text-xs text-stone-500 mt-1">
            Track logged WhatsApp-confirmed orders, assign courier tracking, and confirm delivery status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {migrationPending && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-sm flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              Order tables are not yet provisioned in live Supabase
            </p>
            <p className="mt-1 text-amber-900 leading-relaxed">
              Run <code className="font-mono bg-amber-100 px-1.5 py-0.5">database/ecommerce-transformation-migration.sql</code> in the Supabase SQL Editor to create <code className="font-mono">orders</code>, <code className="font-mono">order_items</code>, <code className="font-mono">order_status_history</code>, and <code className="font-mono">store_delivery_zones</code> with strict RLS policies.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 font-medium">
            <AlertCircle size={15} />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg('')} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-sm flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 size={15} />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order reference (TC-...), customer, phone, or country..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-stone-200 rounded-sm"
        >
          <option value="all">All Order Statuses ({orders.length})</option>
          {ALL_STATUSES.map((st) => (
            <option key={st} value={st}>
              {ORDER_STATUS_META[st].label}
            </option>
          ))}
        </select>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-sm overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-600">
              Logged Orders ({filteredOrders.length})
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-stone-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-stone-500">
              <ClipboardList size={28} className="mx-auto text-stone-300" />
              <p className="text-xs">
                {migrationPending
                  ? 'Awaiting SQL migration before orders can be queried.'
                  : 'No orders match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-[640px] overflow-y-auto">
              {filteredOrders.map((order) => {
                const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.order_received;
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                      isSelected ? 'bg-emerald-50/60 border-l-4 border-l-emerald-900' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {order.order_reference}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-xs ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-900 truncate">
                      {order.customer_name} · {order.delivery_country}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-stone-500">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="font-mono font-semibold text-stone-900 tabular-nums">
                        ₦{order.subtotal_ngn.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-sm p-6 space-y-6">
          {!selectedOrder ? (
            <div className="py-16 text-center text-stone-500 text-xs">
              Select a logged order from the list to inspect items and update dispatch tracking.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-stone-200">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 block">
                    Order Reference
                  </span>
                  <h2 className="text-xl font-mono font-bold text-stone-900">
                    {selectedOrder.order_reference}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Logged {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>

                {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleApplyStatusUpdate('delivered', 'Order confirmed delivered by admin.')
                    }
                    className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PackageCheck size={14} />
                    <span>Confirm Delivered</span>
                  </button>
                )}
              </div>

              {/* Customer & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-stone-50 p-4 border border-stone-200 rounded-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 block">
                    Customer Contact
                  </span>
                  <p className="font-semibold text-stone-900">{selectedOrder.customer_name}</p>
                  <p className="font-mono text-stone-700">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && (
                    <p className="text-stone-700">{selectedOrder.customer_email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 flex items-center gap-1">
                    <MapPin size={11} /> Destination
                  </span>
                  <p className="font-semibold text-stone-900">
                    {selectedOrder.delivery_country}
                    {selectedOrder.delivery_city ? ` — ${selectedOrder.delivery_city}` : ''}
                  </p>
                  <p className="text-stone-700 leading-relaxed">{selectedOrder.delivery_address}</p>
                  {selectedOrder.delivery_notes && (
                    <p className="text-[11px] text-amber-900 italic">
                      Note: {selectedOrder.delivery_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Snapshot */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                  Order Items ({selectedOrder.order_items?.length || 0})
                </h3>
                <div className="border border-stone-200 rounded-sm divide-y divide-stone-100">
                  {(selectedOrder.order_items || []).map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3 text-xs">
                      <div className="w-12 h-14 bg-stone-100 border border-stone-200 rounded-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.product_image_snapshot ? (
                          <img
                            src={item.product_image_snapshot}
                            alt={item.product_name_snapshot}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] text-stone-400">Item</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 truncate">
                          {item.product_name_snapshot}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Size: {item.selected_size || 'Standard'} · Colour:{' '}
                          {item.selected_colour || 'Standard'} · Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="font-semibold text-stone-900">
                          ₦{Number(item.line_total_ngn).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          ₦{Number(item.unit_price_ngn).toLocaleString()} ea
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Dispatch Form */}
              <div className="p-4 border border-stone-200 rounded-sm space-y-4 bg-stone-50/50">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-900">
                  <Truck size={14} className="text-emerald-800" />
                  <span>Update Status, Dispatch &amp; Confirmed Delivery Fee</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Order Lifecycle Status
                    </label>
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                      className="w-full p-2 text-xs bg-white border border-stone-300 rounded-sm"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_META[st].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Confirmed Delivery Fee (₦ NGN — Optional)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={confirmedFeeInput}
                      onChange={(e) => setConfirmedFeeInput(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="Leave blank if pending quote"
                      className="w-full p-2 text-xs font-mono bg-white border border-stone-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Courier / Dispatch Carrier
                    </label>
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="e.g. DHL Express, GIG Logistics"
                      className="w-full p-2 text-xs bg-white border border-stone-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Tracking Number / Waybill
                    </label>
                    <input
                      type="text"
                      value={trackingRef}
                      onChange={(e) => setTrackingRef(e.target.value)}
                      placeholder="e.g. DHL-948271625"
                      className="w-full p-2 text-xs font-mono bg-white border border-stone-300 rounded-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Customer Timeline Note
                  </label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Optional update message visible on /track-order"
                    className="w-full p-2 text-xs bg-white border border-stone-300 rounded-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailOnSave}
                      onChange={(e) => setSendEmailOnSave(e.target.checked)}
                      className="w-4 h-4 text-emerald-800"
                    />
                    <Mail size={13} className="text-stone-500" />
                    <span>Attempt customer email update via Edge Function</span>
                  </label>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleApplyStatusUpdate(nextStatus)}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Order Update'}
                  </button>
                </div>

                {emailFeedback && (
                  <div
                    className={`p-3 rounded-sm text-xs border ${
                      emailFeedback.status === 'sent'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : emailFeedback.status === 'not_configured' ||
                          emailFeedback.status === 'skipped_no_email'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <strong className="uppercase text-[10px] tracking-wider block mb-0.5">
                      Email Notification ({emailFeedback.status})
                    </strong>
                    <span>{emailFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Status History */}
              {selectedOrder.order_status_history &&
                selectedOrder.order_status_history.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Status Audit History
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.order_status_history.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2.5 bg-stone-50 border border-stone-200 rounded-xs text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <span className="font-semibold text-stone-900">
                              {ORDER_STATUS_META[entry.status]?.label || entry.status}
                            </span>
                            {entry.note && (
                              <p className="text-[11px] text-stone-600 mt-0.5">{entry.note}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
