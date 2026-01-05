import { Phone, Mail, TelegramIcon, WhatsappIcon, ViberIcon, OtherMessengerIcon } from "./contact-icons";
import { Button } from "@/components/ui/button";
import type { Birthday } from "@/types/birthday";

// Пример структуры customFields: [{ name: "phone", value: "+123" }, ...]
function getContactIcons(customFields: Array<{ name: string; value: string }>) {
  return customFields.map((field, idx) => {
    if (!field.value) return null;
    switch (field.name) {
      case "phone":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`tel:${field.value}`} title="Телефон">
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        );
      case "email":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`mailto:${field.value}`} title="Email">
              <Mail className="h-4 w-4" />
            </a>
          </Button>
        );
      case "messenger_telegram":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`https://t.me/${field.value}`} target="_blank" rel="noopener noreferrer" title="Telegram">
              <TelegramIcon className="h-4 w-4" />
            </a>
          </Button>
        );
      case "messenger_whatsapp":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`https://wa.me/${field.value}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <WhatsappIcon className="h-4 w-4" />
            </a>
          </Button>
        );
      case "messenger_viber":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`viber://chat?number=${field.value}`} target="_blank" rel="noopener noreferrer" title="Viber">
              <ViberIcon className="h-4 w-4" />
            </a>
          </Button>
        );
      case "messenger_other":
        return (
          <Button key={idx} variant="ghost" size="icon" className="h-8 w-8" asChild>
            <span title={field.value}>
              <OtherMessengerIcon className="h-4 w-4" />
            </span>
          </Button>
        );
      default:
        return null;
    }
  });
}

export function ContactIconsRenderer({ birthday }: { birthday: Birthday }) {
  // Для обратной совместимости: если нет customFields, используем phone/email
  const customFields: Array<{ name: string; value: string }> = (birthday as any).customFields || [];
  if (!customFields.length) {
    const fallback: Array<{ name: string; value: string }> = [];
    if (birthday.phone) fallback.push({ name: "phone", value: birthday.phone });
    if (birthday.email) fallback.push({ name: "email", value: birthday.email });
    return <>{getContactIcons(fallback)}</>;
  }
  return <>{getContactIcons(customFields)}</>;
}