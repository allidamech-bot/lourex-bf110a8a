import { forwardRef } from "react";
import { MessageCircle } from "lucide-react";

const WhatsAppButton = forwardRef<HTMLAnchorElement>((_props, ref) => {
  const phone = "905392411642";
  const message = encodeURIComponent(
    "Hello LOUREX, I'm interested in sourcing from Turkish factories."
  );
  const url = `https://wa.me/${phone}?text=${message}`;

  return (
    <a ref={ref}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 end-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200"
      style={{ backgroundColor: "#C5A059" }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 text-background" fill="currentColor" />
    </a>
  );
});
WhatsAppButton.displayName = "WhatsAppButton";

export default WhatsAppButton;
