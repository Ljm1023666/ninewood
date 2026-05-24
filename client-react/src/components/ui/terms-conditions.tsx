'use client'

import { type ReactNode } from 'react'
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

export interface LegalDialogProps {
  trigger: ReactNode
  title: string
  sections: { title: string; content: string | string[] }[]
}

export function LegalDialog({ trigger, title, sections }: LegalDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-h-[min(640px,80vh)] sm:max-w-[400px] sm:rounded-xl [&>button:last-child]:top-3.5 bg-black text-white">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b border-white/10 px-6 py-4 text-base text-white">
            {title}
          </DialogTitle>
          <div className="overflow-y-auto">
            <DialogDescription asChild>
              <div className="px-6 py-4">
                <div className="space-y-4 text-sm text-white/60 leading-relaxed [&_strong]:text-white [&_strong]:font-semibold">
                  {sections.map((section, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>{section.title}</strong>
                      </p>
                      {Array.isArray(section.content) ? (
                        <ul className="list-disc pl-6 space-y-1">
                          {section.content.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{section.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="border-t border-white/10 px-6 py-4 sm:items-center sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-white text-black hover:bg-white/90 cursor-pointer"
            >
              我知道了
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
