'use client'

import { type ReactNode } from 'react'
import {
  Bot,
  FileText,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import './legal-dialog.css'

export interface LegalDialogProps {
  trigger: ReactNode
  title: string
  sections: { title: string; content: string | string[] }[]
}

const SECTION_ICONS: LucideIcon[] = [
  ShieldCheck,
  FileText,
  Bot,
  UserRoundCheck,
]

export function LegalDialog({ trigger, title, sections }: LegalDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="legal-dialog flex max-h-[min(760px,84vh)] max-w-[480px] flex-col gap-0 overflow-hidden rounded-[20px] p-0 [&>button:last-child]:hidden">
        <DialogHeader className="gap-0 space-y-0 px-8 pb-5 pt-7 text-left">
          <FileText className="legal-dialog__hero-icon mx-auto mb-4 size-9" strokeWidth={1.6} />
          <DialogTitle className="legal-dialog__title text-[22px] font-semibold leading-7 tracking-[-0.01em]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 pb-6">
          <div className="legal-dialog__document max-h-[390px] overflow-y-auto rounded-xl p-5">
            <DialogDescription asChild>
              <div className="legal-dialog__copy space-y-6 text-[14px] leading-5">
                  {sections.map((section, i) => (
                    <div key={i} className="grid grid-cols-[20px_1fr] gap-x-3">
                      {(() => {
                        const Icon = SECTION_ICONS[i % SECTION_ICONS.length]
                        return (
                          <Icon
                            className="legal-dialog__section-icon mt-0.5 size-5"
                            strokeWidth={1.7}
                            aria-hidden="true"
                          />
                        )
                      })()}
                      <div className="space-y-2">
                        <p className="legal-dialog__section-title font-semibold">
                          {section.title}
                        </p>
                      {Array.isArray(section.content) ? (
                          <ul className="list-disc space-y-1 pl-5">
                          {section.content.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{section.content}</p>
                      )}
                      </div>
                    </div>
                  ))}
              </div>
            </DialogDescription>
          </div>
        </div>

        <DialogFooter className="!flex-col gap-3 px-8 pb-8">
          <DialogClose asChild>
            <Button
              type="button"
              className="legal-dialog__primary h-11 w-full rounded-full cursor-pointer"
            >
              我知道了
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <button
              type="button"
              className="legal-dialog__secondary h-11 w-full rounded-full text-sm font-medium cursor-pointer"
            >
              关闭
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
