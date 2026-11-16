import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Mail,
} from 'lucide-react';
import {
  adminGetDeliveryZones,
  adminSaveDeliveryZone,
  checkOrdersSchemaStatus,
} from '../lib/ordersApi';
import { DeliveryZone } from '../types/order';
import { useLocale } from '../context/LocaleContext';

export default function DeliveryZonesPage() {
  const { refreshDeliveryZones } = useLocale();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [migrationPending, setMigrationPending] = useState(false);
  const [schemaDiag, setSchemaDiag] = useState<{
    ordersReady: boolean;
    deliveryZonesReady: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add new country form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [zRes, sRes] = await Promise.all([
        adminGetDeliveryZones(),
        checkOrdersSchemaStatus(),
      ]);
      setZones(zRes.zones);
      setMigrationPending(zRes.migrationPending);
      setSchemaDiag(sRes);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not load delivery zones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateZoneLocal = (code: string, patch: Partial<DeliveryZone>) => {
    setZones((prev) =>
      prev.map((z) => (z.country_code === code ? { ...z, ...patch } : z))
    );
  };

  const handleSaveZone = async (zone: DeliveryZone) => {
    setSavingCode(zone.country_code);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const saved = await adminSaveDeliveryZone(zone);
      setZones((prev) =>
        prev.map((z) => (z.country_code === saved.country_code ? saved : z))
      );
      await refreshDeliveryZones();
      setSuccessMsg(`Saved ${saved.country_name} (${saved.country_code}) dispatch policy.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save delivery zone.');
    } finally {
      setSavingCode(null);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      setErrorMsg('Enter both ISO country code (e.g. GH) and country name.');
      return;
    }
    setAdding(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const saved = await adminSaveDeliveryZone({
        country_code: newCode.trim().toUpperCase(),
        country_name: newName.trim(),
        is_approved: true,
        delivery_fee_ngn: null,
        estimated_timeline: 'Confirmed via WhatsApp dispatch desk before payment',
      });
      setZones((prev) => [...prev, saved]);
      setNewCode('');
      setNewName('');
      await refreshDeliveryZones();
      setSuccessMsg(`Added ${saved.country_name} to approved dispatch regions.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not add delivery zone.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      <div className="border-b border-stone-200 pb-5">
        <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold block mb-1">
          Nigeria &amp; Diaspora Dispatch
        </span>
        <h1 className="text-3xl font-serif text-stone-900">
          Delivery Zones &amp; Infrastructure Diagnostics
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Configure approved destination countries, dispatch timelines, customs advisories, and optional confirmed delivery fees. Leave unconfirmed fees blank so estimates are never fabricated.
        </p>
      </div>

      {/* Infrastructure Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-stone-200 rounded-sm flex items-start gap-3">
          <Database size={18} className="text-emerald-800 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-stone-900 uppercase tracking-wider text-[11px] block">
              Orders &amp; Delivery Zones Schema
            </strong>
            {schemaDiag ? (
              schemaDiag.ordersReady && schemaDiag.deliveryZonesReady ? (
                <p className="text-emerald-800 font-medium">
                  Live tables (`orders`, `store_delivery_zones`) active in Supabase.
                </p>
              ) : (
                <p className="text-amber-800">
                  Migration pending: run <code className="font-mono bg-amber-50 px-1">database/ecommerce-transformation-migration.sql</code> in Supabase SQL Editor.
                </p>
              )
            ) : (
              <p className="text-stone-500">Checking live tables...</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-sm flex items-start gap-3">
          <Mail size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-stone-900 uppercase tracking-wider text-[11px] block">
              Order Email Edge Function
            </strong>
            <p className="text-stone-600">
              Template at <code className="font-mono bg-stone-100 px-1">supabase/functions/send-order-email/index.ts</code>. Requires deployment &amp; server-side <code className="font-mono bg-stone-100 px-1">RESEND_API_KEY</code> secret in Supabase.
            </p>
          </div>
        </div>
      </div>

      {migrationPending && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-sm flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <span>
            `store_delivery_zones` has not been created yet in live Supabase. Execute{' '}
            <code className="font-mono bg-amber-100 px-1">database/ecommerce-transformation-migration.sql</code> to enable editing approved international zones directly in the database.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-sm flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Zones List */}
      {!migrationPending && (
        <>
          <form
            onSubmit={handleAddZone}
            className="bg-white p-4 border border-stone-200 rounded-sm flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                Country Code (ISO)
              </label>
              <input
                type="text"
                maxLength={6}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. GH"
                className="w-24 p-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                Country / Region Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ghana"
                className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>{adding ? 'Adding...' : 'Add Region'}</span>
            </button>
          </form>

          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500">Loading delivery zones...</div>
            ) : (
              zones.map((zone) => (
                <div
                  key={zone.country_code}
                  className="bg-white border border-stone-200 rounded-sm p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <Globe size={16} className="text-emerald-800" />
                      <h2 className="font-serif text-lg text-stone-900">
                        {zone.country_name}{' '}
                        <span className="font-mono text-xs text-stone-500">
                          ({zone.country_code})
                        </span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={zone.is_approved}
                          onChange={(e) =>
                            updateZoneLocal(zone.country_code, { is_approved: e.target.checked })
                          }
                          className="w-4 h-4 text-emerald-800"
                        />
                        <span>Approved for Checkout</span>
                      </label>

                      <button
                        type="button"
                        disabled={savingCode === zone.country_code}
                        onClick={() => handleSaveZone(zone)}
                        className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save size={12} />
                        <span>
                          {savingCode === zone.country_code ? 'Saving...' : 'Save Zone'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                        Confirmed Delivery Fee (₦ NGN — Optional)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          zone.delivery_fee_ngn !== null && zone.delivery_fee_ngn !== undefined
                            ? String(zone.delivery_fee_ngn)
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          updateZoneLocal(zone.country_code, {
                            delivery_fee_ngn: raw === '' ? null : Number(raw),
                          });
                        }}
                        placeholder="Leave blank (Quote via WhatsApp)"
                        className="w-full p-2 font-mono bg-stone-50 border border-stone-300 rounded-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                        Estimated Dispatch Timeline
                      </label>
                      <input
                        type="text"
                        value={zone.estimated_timeline || ''}
                        onChange={(e) =>
                          updateZoneLocal(zone.country_code, {
                            estimated_timeline: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-stone-50 border border-stone-300 rounded-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                        Customs / Duties Advisory
                      </label>
                      <input
                        type="text"
                        value={zone.customs_note || ''}
                        onChange={(e) =>
                          updateZoneLocal(zone.country_code, { customs_note: e.target.value })
                        }
                        className="w-full p-2 bg-stone-50 border border-stone-300 rounded-sm"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
