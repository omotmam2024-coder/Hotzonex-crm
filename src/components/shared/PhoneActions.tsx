import { CheckIcon, CopyIcon, PhoneIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatPhoneLocal, telLink, whatsappLink } from '@/lib/format'

interface PhoneActionsProps {
  phone: string
  whatsappMessage?: string
  size?: 'sm' | 'default'
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 5.001L2 22l5.123-1.334a9.955 9.955 0 0 0 4.881 1.243h.004c5.514 0 9.997-4.483 9.997-9.997C21.997 6.483 17.518 2 12.004 2zm0 18.226h-.003a8.24 8.24 0 0 1-4.2-1.15l-.301-.179-3.04.792.812-2.965-.196-.304a8.22 8.22 0 0 1-1.267-4.415c0-4.55 3.703-8.254 8.257-8.254 2.204 0 4.276.86 5.836 2.421a8.203 8.203 0 0 1 2.415 5.837c0 4.552-3.703 8.256-8.256 8.256z" />
    </svg>
  )
}

export function PhoneActions({ phone, whatsappMessage, size = 'sm' }: PhoneActionsProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied by the browser; nothing to recover.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-text">{formatPhoneLocal(phone)}</span>
      <Button asChild variant="ghost" size="icon" className={size === 'sm' ? 'h-8 w-8' : undefined} aria-label="Call">
        <a href={telLink(phone)}>
          <PhoneIcon className="size-4" />
        </a>
      </Button>
      <Button asChild variant="ghost" size="icon" className={size === 'sm' ? 'h-8 w-8' : undefined} aria-label="WhatsApp">
        <a href={whatsappLink(phone, whatsappMessage)} target="_blank" rel="noreferrer">
          <WhatsAppIcon className="size-4 text-success" />
        </a>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={size === 'sm' ? 'h-8 w-8' : undefined}
        aria-label="Copy phone number"
        onClick={() => void copy()}
      >
        {copied ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
      </Button>
    </div>
  )
}
