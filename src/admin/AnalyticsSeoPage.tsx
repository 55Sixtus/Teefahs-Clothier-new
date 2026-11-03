import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Save, 
  Search, 
  TrendingUp, 
  FileCode, 
  Globe, 
  ShieldCheck, 
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  getActiveGaMeasurementId, 
  setActiveGaMeasurementId, 
  trackEvent, 
  DEFAULT_GA_ID 
} from '../utils/analytics';

export default function AnalyticsSeoPage() {
  const [gaId, setGaId] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setGaId(getActiveGaMeasurementId());
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveGaId = (e: React.FormEvent) => {
    e.preventDefault();
    if (gaId.trim()) {
      setActiveGaMeasurementId(gaId.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleSendTestEvent = () => {
    trackEvent('test_ad_performance_ping', {
      timestamp: new Date().toISOString(),
      source: 'admin_dashboard_tester',
      store: 'Teefahs Clothier',
      domain: 'https://www.teefahsclothier.com',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const verificationMeta = '<meta name="google-site-verification" content="b0fepoZUciC_WKMna-NQCLzHPpwPxLCibhrGNtMm1gU" />';
  const fileUrl = 'https://www.teefahsclothier.com/google616a7805306b17ab.html';
  const sitemapUrl = 'https://www.teefahsclothier.com/sitemap.xml';

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold">
              Marketing &amp; Search Visibility
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[11px] font-medium text-stone-500">
              Domain: <strong className="text-stone-800 font-semibold">www.teefahsclothier.com</strong>
            </span>
          </div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-emerald-800" size={32} />
            Google Analytics &amp; SEO Center
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light max-w-2xl leading-relaxed">
            Monitor ad campaign performance, track customer sales leads, and manage Google Search Console indexing for Teefahs Clothier.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSendTestEvent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-emerald-900 transition-colors shadow-xs border border-emerald-800 cursor-pointer"
            title="Dispatch a real-time event to Google Analytics"
          >
            {testSent ? <Check size={14} className="text-emerald-400" /> : <Zap size={14} className="text-amber-400" />}
            <span>{testSent ? 'Test Ping Sent!' : 'Send Test Ping'}</span>
          </button>
        </div>
      </div>

      {/* 2. Verification Status Summary */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-sm p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-950 uppercase tracking-wider">
              Google Site Ownership Verification Configured
            </h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              All 4 official Google Search Console verification protocols are installed and live on your custom domain:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
              <div className="flex items-center gap-2 text-xs text-stone-700 bg-white/80 p-2.5 rounded border border-emerald-200/60">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span><strong>HTML File:</strong> google616a7805306b17ab.html</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-700 bg-white/80 p-2.5 rounded border border-emerald-200/60">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span><strong>HTML Meta Tag:</strong> in &lt;head&gt; container</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-700 bg-white/80 p-2.5 rounded border border-emerald-200/60">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span><strong>gtag.js:</strong> Google tag installed in &lt;head&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-700 bg-white/80 p-2.5 rounded border border-emerald-200/60">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span><strong>Google Tag Manager:</strong> Container ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Google Analytics 4 Measurement ID Configuration */}
      <div className="bg-white border border-stone-200 rounded-sm p-6 shadow-2xs space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
            <TrendingUp size={16} className="text-emerald-700" />
            <span>Google Analytics 4 &amp; Google Ads Measurement ID</span>
          </div>
          <h2 className="text-xl font-serif text-stone-900">
            Ad Campaign Performance &amp; Traffic Tracking
          </h2>
          <p className="text-xs text-stone-500 font-light mt-1 max-w-3xl leading-relaxed">
            Your website automatically logs customer browsing, bag additions, and WhatsApp orders. Enter your Google Analytics 4 Measurement ID (formatted like <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono">G-XXXXXXXXXX</code>) from your Google Analytics console.
          </p>
        </div>

        <form onSubmit={handleSaveGaId} className="flex flex-col sm:flex-row gap-3 items-stretch max-w-2xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={gaId}
              onChange={e => setGaId(e.target.value)}
              placeholder="e.g. G-B0FEPOZUCI or G-1234567890"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-stone-300 rounded-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-2xs"
          >
            {savedSuccess ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
            <span>{savedSuccess ? 'Saved & Activated!' : 'Save ID'}</span>
          </button>
        </form>

        {/* Ad Performance Events Table */}
        <div className="pt-4 border-t border-stone-100">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-3">
            Active E-Commerce &amp; Ad Conversion Events
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-[11px] font-mono text-emerald-800 font-bold block">page_view</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                Tracks each garment category &amp; storefront view for retargeting.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-[11px] font-mono text-emerald-800 font-bold block">view_item</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                Emitted when a customer clicks to inspect garment details &amp; size options.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-[11px] font-mono text-emerald-800 font-bold block">add_to_cart</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                Fires with garment price, size, and quantity for ad purchase intent.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-[11px] font-mono text-emerald-800 font-bold block">generate_lead</span>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                Fires when customer confirms bag order and enters WhatsApp with stylist desk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Verification Credentials & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Meta Tag */}
        <div className="bg-white border border-stone-200 rounded-sm p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-stone-700" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                Google Site Verification Tag
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(verificationMeta, 'meta')}
              className="text-stone-500 hover:text-stone-800 text-xs flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'meta' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedKey === 'meta' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-3 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded break-all select-all">
            {verificationMeta}
          </div>
          <p className="text-[11px] text-stone-500 font-light leading-relaxed">
            Embedded inside the <code className="font-mono text-stone-700">&lt;head&gt;</code> container of your storefront HTML, before the body.
          </p>
        </div>

        {/* Verification File Link */}
        <div className="bg-white border border-stone-200 rounded-sm p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-stone-700" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                Verification HTML File
              </h3>
            </div>
            <a
              href="/google616a7805306b17ab.html"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold flex items-center gap-1"
            >
              <span>Test Live URL</span>
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="p-3 bg-stone-100 text-stone-800 font-mono text-[11px] rounded truncate">
            {fileUrl}
          </div>
          <p className="text-[11px] text-stone-500 font-light leading-relaxed">
            Content: <code className="font-mono text-stone-700">google-site-verification: google616a7805306b17ab.html</code>
          </p>
        </div>
      </div>

      {/* 5. Google Services Direct Links */}
      <div className="bg-stone-900 text-stone-100 rounded-sm p-6 shadow-md border border-stone-800">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          Verify &amp; Index on Google
        </h3>
        <p className="text-xs text-stone-400 mb-4 max-w-2xl leading-relaxed">
          Open the Google consoles below to finish your site ownership check and request immediate crawling for Teefahs Clothier:
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
          >
            <span>Open Google Search Console</span>
            <ExternalLink size={14} />
          </a>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors border border-stone-700"
          >
            <span>Open Google Analytics</span>
            <ExternalLink size={14} />
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors border border-stone-700"
          >
            <span>View XML Sitemap</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
