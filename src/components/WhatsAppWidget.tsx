import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';

export default function WhatsAppWidget() {
  const location = useLocation();

  // Hide floating widget in admin management portal to prevent UI overlap
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const chatNumber = getActiveWhatsAppChatNumber();
  const whatsappUrl = `https://wa.me/${chatNumber}?text=${encodeURIComponent('Assalamu Alaikum Teefahs Clothier! I would like to make an inquiry about your garments.')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-3.5 sm:p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer"
      aria-label="Contact Teefahs Clothier on WhatsApp"
      title="Chat with Teefahs Clothier Stylist on WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  );
}
