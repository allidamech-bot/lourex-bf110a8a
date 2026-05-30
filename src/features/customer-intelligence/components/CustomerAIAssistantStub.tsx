import { useState } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PurchaseRequest, DealOperation } from "@/types/lourex";
import { estimateETA } from "../lib/etaEstimator";

interface CustomerAIAssistantStubProps {
  requests: PurchaseRequest[];
  deals: DealOperation[];
}

export const CustomerAIAssistantStub = ({ requests, deals }: CustomerAIAssistantStubProps) => {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; text: string }>>([
    {
      role: "bot",
      text: lang === "ar"
        ? "مرحباً! أنا مساعد لوركس الذكي. كيف يمكنني مساعدتك اليوم؟"
        : "Hello! I am Lourex AI Assistant. How can I help you today?"
    },
  ]);

  const getFallbackResponse = (input: string): string => {
    const text = input.toLowerCase();

    if (text.includes("shipment") || text.includes("شحنة") || text.includes("وين")) {
      const activeDeal = deals.find(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed");
      if (!activeDeal) return lang === "ar" ? "لا توجد شحنات نشطة حالياً." : "No active shipments found at the moment.";
      return lang === "ar"
        ? `شحنتك (${activeDeal.dealNumber}) حالياً في مرحلة: ${activeDeal.shipmentStage}.`
        : `Your shipment (${activeDeal.dealNumber}) is currently in stage: ${activeDeal.shipmentStage}.`;
    }

    if (text.includes("pay") || text.includes("كم") || text.includes("دفع") || text.includes("money") || text.includes("remaining")) {
      const totalRemaining = deals.reduce((sum, d) => sum + (d.accountingSummary?.net || 0), 0);
      if (totalRemaining >= 0) return lang === "ar" ? "لا توجد مستحقات معلقة حالياً." : "No outstanding payments at the moment.";
      const formattedTotal = formatMoney(Math.abs(totalRemaining));
      return lang === "ar"
        ? `إجمالي المبلغ المتبقي للدفع هو ${formattedTotal}.`
        : `Total remaining amount to pay is ${formattedTotal}.`;
    }

    if (text.includes("eta") || text.includes("delivery") || text.includes("متى") || text.includes("وصل")) {
      const activeDeal = deals.find(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed");
      if (!activeDeal) return lang === "ar" ? "لا يمكن تحديد موعد وصول لعدم وجود شحنات نشطة." : "Cannot estimate delivery time as there are no active shipments.";
      const eta = estimateETA(activeDeal.shipmentStage);
      if (!eta) return lang === "ar" ? "جاري معالجة البيانات لتحديد موعد الوصول." : "Processing data to estimate delivery time.";
      return lang === "ar"
        ? `من المتوقع وصول شحنتك خلال ${eta.estimateDaysMin}-${eta.estimateDaysMax} أيام عمل.`
        : `Estimated delivery for your shipment is within ${eta.estimateDaysMin}–${eta.estimateDaysMax} business days.`;
    }

    if (text.includes("next") || text.includes("step") || text.includes("خطوة") || text.includes("ايش") || text.includes("ماذا")) {
      const pendingRequest = requests.find(r => r.status === "awaiting_clarification" || r.status === "transfer_proof_pending");
      if (pendingRequest) {
        return lang === "ar"
          ? `الخطوة التالية هي معالجة طلبك (${pendingRequest.requestNumber}) المطلوب فيه: ${pendingRequest.status}.`
          : `The next step is to address your request (${pendingRequest.requestNumber}) currently at: ${pendingRequest.status}.`;
      }
      return lang === "ar" ? "حالياً كل شيء مستقر، سنقوم بإبلاغك بأي تحديثات عبر الإشعارات." : "Everything is stable. We will notify you of any updates via notifications.";
    }

    return lang === "ar"
      ? "عذراً، لم أفهم سؤالك تماماً. يمكنك سؤالي عن موقع الشحنة، المبالغ المتبقية، موعد الوصول المتوقع، أو الخطوة التالية."
      : "I'm sorry, I didn't quite catch that. You can ask me about shipment location, remaining payments, estimated delivery, or the next step.";
  };

  const handleSend = () => {
    if (!query.trim()) return;
    const userMsg = query;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setQuery("");

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "bot", text: getFallbackResponse(userMsg) }]);
    }, 600);
  };

  const quickQuestions = [
    { q: "Where is my shipment?", qAr: "أين شحنتي؟" },
    { q: "How much remains to pay?", qAr: "كم المتبقي للدفع؟" },
    { q: "When is estimated delivery?", qAr: "متى موعد الوصول المتوقع؟" },
    { q: "What is the next step?", qAr: "ما هي الخطوة التالية؟" },
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_8px_30px_rgb(245,158,11,0.3)] flex items-center justify-center border-4 border-stone-950"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[400px] h-[500px] flex flex-col rounded-[2rem] border border-amber-200/20 bg-stone-900 shadow-2xl shadow-black overflow-hidden backdrop-blur-xl">
          <div className="p-5 bg-gradient-to-br from-stone-800 to-stone-900 border-b border-amber-200/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <Bot className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-serif font-bold text-stone-100">LOUREX Assistant</p>
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Online Intelligence</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-stone-500 hover:text-stone-300">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-amber-500 text-stone-950 font-medium"
                    : "bg-stone-800 text-stone-200 border border-stone-700"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-amber-200/10 bg-stone-950/40">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
              {quickQuestions.map((qq, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(lang === "ar" ? qq.qAr : qq.q); }}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-widest bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 px-3 py-1.5 rounded-full border border-stone-700 transition-colors"
                >
                  {lang === "ar" ? qq.qAr : qq.q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={lang === "ar" ? "اسألني أي شيء..." : "Ask me anything..."}
                className="bg-stone-800 border-stone-700 text-stone-200 h-10 rounded-xl"
              />
              <Button onClick={handleSend} size="icon" className="h-10 w-10 shrink-0 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
