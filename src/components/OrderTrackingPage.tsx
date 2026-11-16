import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  PackageSearch,
  CheckCircle2,
  Truck,
  Clock,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import Header from './Header';
import PromoBanner from './PromoBanner';
import Footer from './Footer';
import SEO from './SEO';
import { trackCustomerOrder } from '../lib/ordersApi';
import {
  ORDER_STATUS_META,
  ORDER_TIMELINE_STEPS,
  TrackedOrderResult,
} from '../types/order';
import { SHOP_CONFIG } from '../config/shopConfig';

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const [orderRef, setOrderRef] = useState(searchParams.get('ref') || '');
  const [contactVerifier, setContactVerifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrderResult | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  useEffect(() => {
    const paramRef = searchParams.get('ref');
    if (paramRef) setOrderRef(paramRef);
  }, [searchParams]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setMigrationPending(false);

    if (!orderRef.trim() || !contactVerifier.trim()) {
      setError('Please enter both your Order Reference (e.g. TC-20261116-4821) and your Email or Phone Number.');
      return;
    }

    setLoading(true);
    try {
      const response = await trackCustomerOrder(orderRef.trim(), contactVerifier.trim());
      if (response.state === 'migration_pending') {
        setMigrationPending(true);
      } else if (response.state === 'not_found') {
        setError(
          'No matching order was found for that Order Reference and Email/Phone combination. Please double-check your details or message our WhatsApp desk.'
        );
      } else {
        setResult(response.order);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  const currentMeta = result ? ORDER_STATUS_META[result.status] : null;
  const currentStepIdx = currentMeta ? currentMeta.stepIndex : -1;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors">
      <SEO
        title="Track Your Order"
        description="Track your Teefahs Clothier order status, courier tracking reference, and dispatch updates securely."
      />

      <div>
        <PromoBanner />
        <Header />

        <section className="bg-stone-900 text-stone-100 py-12 px-6 border-b border-stone-800">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] text-emerald-400 font-medium block mb-2">
              Verified Client Care
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif">Track Your Order</h1>
            <p className="text-stone-300 text-sm mt-2.5 font-light">
              Enter your unique order reference and the email address or phone number used at checkout.
            </p>
          </div>
        </section>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          <form
            onSubmit={handleLookup}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Order Reference *
                </label>
                <input
                  type="text"
                  required
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="e.g. TC-20261116-4821"
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 uppercase focus:outline-none focus:border-stone-900"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Checkout Email or Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={contactVerifier}
                  onChange={(e) => setContactVerifier(e.target.value)}
                  placeholder="you@example.com or +234 801..."
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {migrationPending && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold">Online Order Lookup Database Setup Pending</p>
                <p>
                  Our boutique is completing activation of online self-service tracking. Please message our Lagos concierge desk on WhatsApp with your order reference for an immediate status check.
                </p>
                <a
                  href={`${SHOP_CONFIG.whatsappChatUrl}?text=${encodeURIComponent(
                    `Assalamu Alaikum! Please may I check the dispatch status of my order (${orderRef || 'reference'})?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-amber-300 underline"
                >
                  <MessageCircle size={13} />
                  <span>Check via WhatsApp Concierge &rarr;</span>
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-widest flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <PackageSearch size={16} />
                <span>{loading ? 'Checking Records...' : 'Track Order'}</span>
              </button>

              <a
                href={SHOP_CONFIG.whatsappChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                <span>Need assistance on WhatsApp?</span>
              </a>
            </div>
          </form>

          {result && currentMeta && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-8">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-stone-500 block mb-1">
                    Order Reference
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 dark:text-white">
                    {result.order_reference}
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Placed on {new Date(result.created_at).toLocaleString()} · {result.customer_first_name}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${currentMeta.badgeClass}`}
                  >
                    {currentMeta.label}
                  </span>
                  <p className="text-xs text-stone-500 mt-1.5">{currentMeta.description}</p>
                </div>
              </div>

              {/* Milestone Stepper */}
              {currentStepIdx >= 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-semibold text-stone-500">
                    Dispatch Lifecycle Progress
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ORDER_TIMELINE_STEPS.map((stepKey, idx) => {
                      const meta = ORDER_STATUS_META[stepKey];
                      const reached = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div
                          key={stepKey}
                          className={`p-3 border text-xs ${
                            isCurrent
                              ? 'border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500'
                              : reached
                                ? 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950'
                                : 'border-stone-200 dark:border-stone-800 opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                              Step {idx + 1}
                            </span>
                            {reached ? (
                              <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-400" />
                            ) : (
                              <Clock size={14} className="text-stone-400" />
                            )}
                          </div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                            {meta.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Carrier & Destination Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-white uppercase tracking-wider">
                    <Truck size={14} className="text-emerald-800 dark:text-emerald-400" />
                    <span>Courier &amp; Tracking</span>
                  </div>
                  <p>
                    <span className="text-stone-500">Carrier:</span>{' '}
                    <strong>{result.carrier_name || 'To be assigned on dispatch'}</strong>
                  </p>
                  <p>
                    <span className="text-stone-500">Tracking Number:</span>{' '}
                    <strong className="font-mono">{result.tracking_reference || 'Awaiting dispatch'}</strong>
                  </p>
                </div>

                <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-white uppercase tracking-wider">
                    <MapPin size={14} className="text-emerald-800 dark:text-emerald-400" />
                    <span>Delivery Destination &amp; Total</span>
                  </div>
                  <p>
                    <span className="text-stone-500">Destination:</span>{' '}
                    <strong>
                      {result.delivery_city ? `${result.delivery_city}, ` : ''}
                      {result.delivery_country}
                    </strong>
                  </p>
                  <p className="tabular-nums">
                    <span className="text-stone-500">Garments Subtotal:</span>{' '}
                    <strong>₦{Number(result.subtotal_ngn || 0).toLocaleString()}</strong>
                    {result.confirmed_delivery_fee_ngn !== null &&
                      result.confirmed_delivery_fee_ngn !== undefined && (
                        <>
                          {' '}
                          · Delivery: <strong>₦{Number(result.confirmed_delivery_fee_ngn).toLocaleString()}</strong>
                        </>
                      )}
                  </p>
                </div>
              </div>

              {/* Line Items Snapshot */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-stone-500">
                  Garments in This Order
                </h3>
                <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800">
                  {(result.items || []).map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.product_image_snapshot && (
                          <img
                            src={item.product_image_snapshot}
                            alt={item.product_name_snapshot}
                            referrerPolicy="no-referrer"
                            className="w-12 h-14 object-contain bg-stone-100 dark:bg-stone-800 p-0.5 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 dark:text-white truncate">
                            {item.product_name_snapshot}
                          </p>
                          <p className="text-stone-500">
                            {item.selected_colour || 'Original'} · {item.selected_size || 'Standard'} · Qty{' '}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums whitespace-nowrap">
                        ₦{Number(item.line_total_ngn || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Timeline History */}
              {(result.history || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-semibold text-stone-500">
                    Audit Timeline
                  </h3>
                  <ul className="space-y-2 border-l-2 border-stone-200 dark:border-stone-800 pl-4">
                    {result.history.map((entry) => (
                      <li key={entry.id} className="text-xs">
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {ORDER_STATUS_META[entry.status]?.label || entry.status}
                        </span>{' '}
                        <span className="text-stone-400">
                          · {new Date(entry.created_at).toLocaleString()}
                        </span>
                        {entry.note && (
                          <p className="text-stone-600 dark:text-stone-400 mt-0.5">{entry.note}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap justify-between items-center gap-3">
                <Link
                  to="/shop"
                  className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Continue Shopping</span>
                  <ArrowRight size={13} />
                </Link>
                <a
                  href={`${SHOP_CONFIG.whatsappChatUrl}?text=${encodeURIComponent(
                    `Assalamu Alaikum! Regarding my order ${result.order_reference}, I would like an update.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <MessageCircle size={14} />
                  <span>Message Boutique Desk</span>
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
