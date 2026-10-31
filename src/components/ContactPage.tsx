import { useState } from 'react';
import { MessageCircle, Instagram, Mail, Clock, MapPin, Send, CheckCircle2, Globe, Navigation } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { SHOP_CONFIG } from '../config/shopConfig';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [inquiryType, setInquiryType] = useState('Order & Delivery');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [preparedWaUrl, setPreparedWaUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    const whatsappPayload = encodeURIComponent(
      `Assalamu Alaikum Teefahs Clothier!\n\n*NEW CUSTOMER INQUIRY*\n- Full Name: ${name.trim()}\n- Contact: ${contactInfo.trim() || 'Not specified'}\n- Inquiry: ${inquiryType}\n\n*Message:*\n${message.trim()}`
    );

    const waLink = `https://wa.me/${SHOP_CONFIG.whatsappNumber}?text=${whatsappPayload}`;
    setPreparedWaUrl(waLink);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Page Banner */}
        <section className="bg-stone-900 text-stone-100 py-16 px-6 border-b border-stone-800">
          <div className="max-w-7xl mx-auto text-center">
            <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-medium block mb-3">
              Direct Assistance &amp; Boutique Location
            </span>
            <h1 className="text-4xl md:text-5xl font-serif tracking-tight">Connect With Us</h1>
            <p className="text-stone-300 text-sm md:text-base mt-3 max-w-xl mx-auto font-light leading-relaxed">
              Have questions regarding sizing, custom hem lengths, bridal wear, or nationwide delivery? Our client care desk is at your service.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="py-16 px-6 max-w-6xl mx-auto space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left: Official Verified Channels */}
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-serif text-stone-900 mb-6">Verified Business Channels</h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-8">
                  For immediate order assistance, personalized styling recommendations, or dispatch tracking, connect with us through our official verified touchpoints.
                </p>

                <div className="space-y-4 mb-8">
                  {/* WhatsApp Direct Chat */}
                  <a
                    href={SHOP_CONFIG.whatsappChatUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-sm hover:border-[#25D366] hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-emerald-50 text-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                      <MessageCircle size={22} />
                    </div>
                    <div>
                      <h4 className="font-medium text-stone-900 text-sm">Official WhatsApp Desk</h4>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">{SHOP_CONFIG.whatsappDisplay}</p>
                      <span className="text-[11px] text-stone-400">Instant chat &amp; order confirmation</span>
                    </div>
                  </a>

                  {/* Official Email */}
                  <a
                    href={`mailto:${SHOP_CONFIG.email}`}
                    className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-sm hover:border-stone-800 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-stone-100 text-stone-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                      <Mail size={22} />
                    </div>
                    <div>
                      <h4 className="font-medium text-stone-900 text-sm">Official Email Address</h4>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">{SHOP_CONFIG.email}</p>
                      <span className="text-[11px] text-stone-400">Formal inquiries &amp; corporate partnerships</span>
                    </div>
                  </a>

                  {/* Physical Address */}
                  <div className="flex items-start gap-4 p-4 bg-white border border-stone-200 rounded-sm">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h4 className="font-medium text-stone-900 text-sm">Physical Boutique &amp; Workshop</h4>
                      <p className="text-xs text-stone-700 leading-relaxed mt-1 font-medium">
                        {SHOP_CONFIG.address}
                      </p>
                    </div>
                  </div>

                  {/* Instagram & Official Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <a
                      href={SHOP_CONFIG.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-sm hover:border-pink-500 hover:shadow-xs transition-all group"
                    >
                      <div className="w-9 h-9 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                        <Instagram size={18} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-medium text-stone-900 text-xs truncate">Instagram</h5>
                        <p className="text-[11px] text-stone-500 truncate">{SHOP_CONFIG.instagramHandle}</p>
                      </div>
                    </a>

                    <a
                      href={SHOP_CONFIG.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-sm hover:border-stone-800 hover:shadow-xs transition-all group"
                    >
                      <div className="w-9 h-9 bg-stone-100 text-stone-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                        <Globe size={18} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-medium text-stone-900 text-xs truncate">Official Website</h5>
                        <p className="text-[11px] text-stone-500 truncate">teefahsclothier.bumpa.shop</p>
                      </div>
                    </a>
                  </div>

                  {/* Hours */}
                  <div className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-sm">
                    <div className="w-12 h-12 bg-stone-100 text-stone-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-stone-900 text-sm">Customer Care Hours</h4>
                      <p className="text-xs text-stone-600 mt-0.5">{SHOP_CONFIG.businessHours}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-stone-100 border border-stone-200 rounded-sm">
                <h4 className="font-serif text-stone-900 text-sm mb-1 font-semibold">Insured Nationwide Delivery</h4>
                <p className="text-xs text-stone-600 leading-relaxed font-light">
                  All orders are packaged in protective dust bags and fulfilled with trusted logistics partners across Lagos, Abuja, Port Harcourt, and every state in Nigeria.
                </p>
              </div>
            </div>

            {/* Right: Message Form */}
            <div className="bg-white p-8 md:p-10 border border-stone-200 shadow-sm rounded-sm">
              <h3 className="font-serif text-2xl text-stone-900 mb-2">Send an Enquiry</h3>
              <p className="text-xs text-stone-500 mb-6">
                Fill out the form below to prepare an immediate tailored inquiry for our customer care desk.
              </p>

              {isSubmitted ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-4" />
                  <h4 className="font-serif text-xl text-stone-900 mb-2">Inquiry Formatted</h4>
                  <p className="text-xs text-stone-600 mb-6 max-w-sm mx-auto leading-relaxed">
                    Your inquiry has been prepared. Click below to connect directly with our WhatsApp styling desk:
                  </p>
                  
                  <div className="flex flex-col gap-3 max-w-xs mx-auto mb-6">
                    <a
                      href={preparedWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 rounded-xs shadow-sm transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Send to WhatsApp</span>
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage('');
                    }}
                    className="text-xs font-semibold uppercase tracking-wider text-stone-500 underline hover:text-stone-900 cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Aisha Bello"
                      className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1">
                      Phone Number or Email
                    </label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={e => setContactInfo(e.target.value)}
                      placeholder="e.g. +234 802 000 0000 or aisha@example.com"
                      className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1">
                      Enquiry Subject
                    </label>
                    <select
                      value={inquiryType}
                      onChange={e => setInquiryType(e.target.value)}
                      className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none text-stone-700 font-medium"
                    >
                      <option value="Order & Delivery">Order &amp; Delivery Timeline</option>
                      <option value="Sizing Advice">Sizing &amp; Length Guidance</option>
                      <option value="Custom Bespoke Abaya">Custom Bespoke Tailoring</option>
                      <option value="Wholesale / Bridal">Wholesale / Bridal Occasion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1">
                      Your Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Please specify garment name, preferred size, colour or delivery city..."
                      className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Send size={14} />
                    Dispatch Message via WhatsApp
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* PART 6: GOOGLE MAPS EMBED & GET DIRECTIONS BUTTON */}
          <div className="bg-white border border-stone-200 rounded-sm overflow-hidden shadow-xs">
            <div className="p-6 md:p-8 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-1">
                  Visit Our Store &amp; Workshop
                </span>
                <h3 className="text-2xl font-serif text-stone-900">Boutique Location in Lagos</h3>
                <p className="text-xs text-stone-600 mt-1 max-w-xl font-light">
                  {SHOP_CONFIG.address}
                </p>
              </div>

              {/* GET DIRECTIONS BUTTON */}
              <a
                href={SHOP_CONFIG.mapsDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-stone-900 hover:bg-emerald-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs whitespace-nowrap self-start sm:self-auto"
                title="Open Google Maps Directions"
              >
                <Navigation size={15} className="text-emerald-400" />
                <span>Get Directions</span>
              </a>
            </div>

            {/* Responsive Map Container */}
            <div className="w-full h-80 sm:h-96 bg-stone-100 relative">
              <iframe
                title="Teefahs Clothier Location - 165 Ekoro Road, Ekoro Junction, Abule Egba, Ikeja, Lagos"
                src={SHOP_CONFIG.mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
